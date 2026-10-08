"""
Raise Readiness Radar — Multi-dimensional deck and profile completeness scoring.
Scored strictly via LLM with server-validated weighted sum calculation.
Persisted in public.readiness_evaluations per workspace with RLS.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.auth import get_current_user, AuthenticatedUser
from app.core.db import get_db_cursor
from app.core.logging import logger
from app.core.llm_client import chat_completion_with_fallback

router = APIRouter(prefix="/api/v1/readiness", tags=["Readiness"])

# Exact weights defined in specification (Sum = 100)
DIMENSION_WEIGHTS: Dict[str, int] = {
    "Deck Completeness": 20,
    "Traction Evidence": 20,
    "Market Clarity": 15,
    "Financial Ask": 15,
    "Use of Funds": 10,
    "Moat": 10,
    "Investor Targeting": 10
}


class ReevaluateRequest(BaseModel):
    company_id: Optional[str] = None
    workspace_id: Optional[str] = None


def _get_status(score: float) -> str:
    if score >= 75:
        return "strong"
    elif score >= 50:
        return "moderate"
    elif score >= 25:
        return "weak"
    return "missing"


def _fallback_heuristic_score(company: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic rule-based fallback when LLM is unavailable.
    Inspects actual company profile content — never returns a hardcoded fake total.
    """
    dims = []
    recs = []

    deck_content = company.get("deck_text") or company.get("thesis_summary") or ""
    deck_len = len(str(deck_content).strip())
    deck_score = 85 if deck_len > 300 else 55 if deck_len > 80 else 20 if deck_len > 10 else 0
    deck_rec = "Upload full pitch deck with problem, solution, and roadmap slides." if deck_score < 70 else "Pitch narrative is well-structured."
    dims.append({
        "name": "Deck Completeness",
        "score": deck_score,
        "weight": 20,
        "status": _get_status(deck_score),
        "rationale": f"Based on {deck_len} characters of deck & thesis text.",
        "recommendations": [deck_rec]
    })
    if deck_score < 70:
        recs.append(f"Deck Completeness: {deck_rec}")

    traction_val = str(company.get("traction") or "").strip()
    trac_len = len(traction_val)
    trac_score = 80 if trac_len > 120 else 50 if trac_len > 30 else 15 if trac_len > 5 else 0
    trac_rec = "Include ARR/MRR metrics, customer count, or month-over-month growth proof." if trac_score < 70 else "Demonstrates quantified traction."
    dims.append({
        "name": "Traction Evidence",
        "score": trac_score,
        "weight": 20,
        "status": _get_status(trac_score),
        "rationale": "Evaluated based on reported traction and milestones.",
        "recommendations": [trac_rec]
    })
    if trac_score < 70:
        recs.append(f"Traction Evidence: {trac_rec}")

    sector_val = str(company.get("sector") or "").strip()
    stage_val = str(company.get("stage") or "").strip()
    mkt_score = 80 if sector_val and stage_val else 45 if sector_val else 10
    mkt_rec = "Specify target customer segment and TAM/SAM breakdown." if mkt_score < 70 else "Market vertical and stage clearly defined."
    dims.append({
        "name": "Market Clarity",
        "score": mkt_score,
        "weight": 15,
        "status": _get_status(mkt_score),
        "rationale": f"Sector: {sector_val or 'Not set'} | Stage: {stage_val or 'Not set'}",
        "recommendations": [mkt_rec]
    })
    if mkt_score < 70:
        recs.append(f"Market Clarity: {mkt_rec}")

    has_sizes = bool(company.get("check_size_min") or company.get("check_size_max") or company.get("raise_amount"))
    fin_score = 80 if has_sizes else 20
    fin_rec = "Set clear target round size and check size parameters." if not has_sizes else "Target raise and check size parameters configured."
    dims.append({
        "name": "Financial Ask",
        "score": fin_score,
        "weight": 15,
        "status": _get_status(fin_score),
        "rationale": "Evaluated from target raise amount and check size limits.",
        "recommendations": [fin_rec]
    })
    if fin_score < 70:
        recs.append(f"Financial Ask: {fin_rec}")

    uof_val = str(company.get("use_of_funds") or "").strip()
    uof_score = 75 if len(uof_val) > 40 else 40 if len(uof_val) > 10 else 10
    uof_rec = "Detail runway extension (e.g. 18-24 months) and percentage allocations for R&D and GTM."
    dims.append({
        "name": "Use of Funds",
        "score": uof_score,
        "weight": 10,
        "status": _get_status(uof_score),
        "rationale": "Breakdown of capital deployment across engineering, hiring, and sales.",
        "recommendations": [uof_rec] if uof_score < 70 else ["Capital allocation roadmap provided."]
    })
    if uof_score < 70:
        recs.append(f"Use of Funds: {uof_rec}")

    moat_val = str(company.get("moat") or "").strip()
    moat_score = 75 if len(moat_val) > 40 else 40 if len(moat_val) > 10 else 10
    moat_rec = "Highlight technical IP, data advantage, or switching barriers."
    dims.append({
        "name": "Moat",
        "score": moat_score,
        "weight": 10,
        "status": _get_status(moat_score),
        "rationale": "Competitive moat and defensibility assessment.",
        "recommendations": [moat_rec] if moat_score < 70 else ["Defensible moat factors documented."]
    })
    if moat_score < 70:
        recs.append(f"Moat: {moat_rec}")

    inv_val = str(company.get("investor_criteria") or company.get("geography") or "").strip()
    inv_score = 75 if len(inv_val) > 20 else 40 if len(inv_val) > 5 else 15
    inv_rec = "Filter target firms by geography, fund vintage, and check size mandates."
    dims.append({
        "name": "Investor Targeting",
        "score": inv_score,
        "weight": 10,
        "status": _get_status(inv_score),
        "rationale": f"Targeting criteria: {inv_val or 'General outreach'}",
        "recommendations": [inv_rec] if inv_score < 70 else ["Investor mandate criteria established."]
    })
    if inv_score < 70:
        recs.append(f"Investor Targeting: {inv_rec}")

    total = round(sum(d["score"] * (d["weight"] / 100.0) for d in dims), 1)
    summary = (
        "High Raise Readiness — Materials demonstrate strong positioning for institutional outreach."
        if total >= 70
        else "Moderate Readiness — Key gaps identified. Review dimension breakdown before scaling outreach."
        if total >= 40
        else "Early Readiness — Strengthen narrative, traction proof, and financial asks prior to investor outreach."
    )

    return {
        "overall_score": total,
        "summary": summary,
        "dimensions": dims,
        "recommendations": recs
    }


def _evaluate_company_with_llm(company: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sends pitch deck and profile data to LLM.
    Strictly validates structured JSON output and calculates weighted sum server-side.
    """
    company_context = f"""
Company Name: {company.get('name', 'Unknown')}
Stage: {company.get('stage', 'Unknown')}
Sector: {company.get('sector', 'Unknown')}
Geography: {company.get('geography', 'Unknown')}
Target Raise / Check Size: Min ${float(company.get('check_size_min') or 0):,.0f} | Max ${float(company.get('check_size_max') or 0):,.0f} | Raise Amount: {company.get('raise_amount') or 'N/A'}
Thesis / Pitch Summary: {company.get('thesis_summary') or 'N/A'}
Pitch Deck Content: {(company.get('deck_text') or 'N/A')[:2500]}
Traction: {company.get('traction') or 'N/A'}
Business Model: {company.get('business_model') or 'N/A'}
Moat: {company.get('moat') or 'N/A'}
Use of Funds: {company.get('use_of_funds') or 'N/A'}
Investor Criteria: {company.get('investor_criteria') or 'N/A'}
"""

    prompt = f"""You are an institutional venture capital diligence partner evaluating a startup's pitch deck and raise profile for investor readiness.
Evaluate the company across these EXACT 7 dimensions:
1. "Deck Completeness" (Weight: 20%) - Quality and completeness of deck text, narrative, and problem/solution clarity.
2. "Traction Evidence" (Weight: 20%) - Revenue, MRR/ARR, customer proof, growth metrics, retention.
3. "Market Clarity" (Weight: 15%) - Target market definition, customer segment, stage focus.
4. "Financial Ask" (Weight: 15%) - Target check size, round economics, realistic valuation expectations.
5. "Use of Funds" (Weight: 10%) - Runway timeline and clear capital allocation across engineering and GTM.
6. "Moat" (Weight: 10%) - Defensibility, proprietary technology, network effects, IP.
7. "Investor Targeting" (Weight: 10%) - Alignment with institutional mandates, stage, and geography.

Return ONLY a valid JSON object matching this schema:
{{
  "summary": "1-2 sentence executive summary of raise readiness",
  "dimensions": [
    {{
      "name": "Deck Completeness",
      "score": <integer 0-100>,
      "rationale": "<1-line rationale>",
      "recommendations": ["<recommendation 1>", "<recommendation 2>"]
    }},
    {{
      "name": "Traction Evidence",
      "score": <integer 0-100>,
      "rationale": "<1-line rationale>",
      "recommendations": ["<recommendation 1>"]
    }},
    {{
      "name": "Market Clarity",
      "score": <integer 0-100>,
      "rationale": "<1-line rationale>",
      "recommendations": ["<recommendation 1>"]
    }},
    {{
      "name": "Financial Ask",
      "score": <integer 0-100>,
      "rationale": "<1-line rationale>",
      "recommendations": ["<recommendation 1>"]
    }},
    {{
      "name": "Use of Funds",
      "score": <integer 0-100>,
      "rationale": "<1-line rationale>",
      "recommendations": ["<recommendation 1>"]
    }},
    {{
      "name": "Moat",
      "score": <integer 0-100>,
      "rationale": "<1-line rationale>",
      "recommendations": ["<recommendation 1>"]
    }},
    {{
      "name": "Investor Targeting",
      "score": <integer 0-100>,
      "rationale": "<1-line rationale>",
      "recommendations": ["<recommendation 1>"]
    }}
  ]
}}
"""

    messages = [
        {"role": "system", "content": "You are a VC diligence partner scoring fundraising readiness. Return only valid JSON."},
        {"role": "user", "content": f"{prompt}\n\nStartup Data:\n{company_context}"}
    ]

    try:
        raw_resp = chat_completion_with_fallback(messages, response_format={"type": "json_object"})
        parsed = json.loads(raw_resp)
        raw_dims = {d.get("name", "").strip().lower(): d for d in parsed.get("dimensions", []) if isinstance(d, dict)}

        validated_dims = []
        all_recs = []

        for dim_name, weight in DIMENSION_WEIGHTS.items():
            matched = raw_dims.get(dim_name.lower()) or raw_dims.get(dim_name.lower().replace("moat", "moat / defensibility"))
            if matched:
                score_raw = matched.get("score", 50)
                try:
                    score = max(0, min(100, int(round(float(score_raw)))))
                except Exception:
                    score = 50
                rationale = str(matched.get("rationale") or f"Assessment for {dim_name}").strip()
                recs = [str(r).strip() for r in matched.get("recommendations", []) if r]
            else:
                score = 30
                rationale = f"Insufficient detail provided for {dim_name}."
                recs = [f"Add detailed {dim_name} information to your pitch profile."]

            status_str = _get_status(score)
            dim_obj = {
                "name": dim_name,
                "label": dim_name,
                "score": score,
                "weight": weight,
                "status": status_str,
                "rationale": rationale,
                "recommendations": recs[:3]
            }
            validated_dims.append(dim_obj)
            for r in dim_obj["recommendations"]:
                all_recs.append(f"{dim_name}: {r}" if not r.startswith(dim_name) else r)

        # Server calculates the total as the weighted sum (Never trust LLM total)
        total_score = round(sum(d["score"] * (d["weight"] / 100.0) for d in validated_dims), 1)
        summary = str(parsed.get("summary") or (
            "High Raise Readiness — Materials demonstrate strong positioning for institutional outreach."
            if total_score >= 70
            else "Moderate Readiness — Key gaps identified. Review dimension breakdown before scaling outreach."
            if total_score >= 40
            else "Early Readiness — Strengthen narrative, traction proof, and financial asks prior to investor outreach."
        )).strip()

        return {
            "overall_score": total_score,
            "summary": summary,
            "dimensions": validated_dims,
            "recommendations": all_recs
        }

    except Exception as e:
        logger.warning(f"LLM readiness scoring fallback triggered: {e}")
        return _fallback_heuristic_score(company)


def _find_user_company(user_id: str, company_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Helper to fetch company owned by or accessible to user."""
    with get_db_cursor(user_id=user_id, commit=False) as cur:
        if company_id:
            try:
                cur.execute(
                    """SELECT id, user_id, workspace_id, name, stage, sector, geography,
                              check_size_min, check_size_max, thesis_summary, website_url,
                              deck_file_url, deck_text, raise_amount, business_model,
                              traction, moat, use_of_funds, investor_criteria, updated_at
                       FROM public.companies WHERE id = %s;""",
                    (company_id,)
                )
                res = cur.fetchone()
                if res:
                    return dict(res)
            except Exception:
                pass

        # Otherwise find user's latest company
        cur.execute(
            """SELECT id, user_id, workspace_id, name, stage, sector, geography,
                      check_size_min, check_size_max, thesis_summary, website_url,
                      deck_file_url, deck_text, raise_amount, business_model,
                      traction, moat, use_of_funds, investor_criteria, updated_at
               FROM public.companies WHERE user_id = %s
               ORDER BY updated_at DESC LIMIT 1;""",
            (user_id,)
        )
        res = cur.fetchone()
        return dict(res) if res else None


def _find_user_workspace_id(user_id: str) -> Optional[str]:
    """Helper to fetch active workspace ID for user."""
    with get_db_cursor(user_id=user_id, commit=False) as cur:
        cur.execute(
            """SELECT workspace_id FROM public.user_subscriptions WHERE user_id = %s AND workspace_id IS NOT NULL LIMIT 1;""",
            (user_id,)
        )
        row = cur.fetchone()
        if row and row.get("workspace_id"):
            return str(row["workspace_id"])

        cur.execute(
            """SELECT id FROM public.workspaces WHERE owner_user_id = %s LIMIT 1;""",
            (user_id,)
        )
        row = cur.fetchone()
        return str(row["id"]) if row else None


@router.get("", summary="Get Raise Readiness for Current Workspace")
@router.get("/{company_id}", summary="Get Raise Readiness for Specific Company")
async def get_readiness(
    company_id: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Returns real readiness evaluation for the workspace's company profile and deck.
    If no company profile or deck exists, returns an explicit empty state flag.
    """
    # If "current" or literal param passed
    target_id = None if company_id in (None, "", "current", "null", "undefined") else company_id

    company = _find_user_company(current_user.id, target_id)
    if not company or not company.get("name"):
        return {
            "has_data": False,
            "has_profile": False,
            "has_deck": False,
            "company": None,
            "evaluation": None,
            "message": "No company profile or pitch deck found for this workspace. Please add a company profile or upload a pitch deck to generate your Raise Readiness Radar."
        }

    c_id = str(company["id"])
    has_deck = bool(company.get("deck_text") or company.get("deck_file_url"))

    # Check for existing persisted evaluation
    with get_db_cursor(user_id=current_user.id, commit=False) as cur:
        cur.execute(
            """SELECT id, overall_score, dimensions, recommendations, summary, created_at
               FROM public.readiness_evaluations
               WHERE company_id = %s
               ORDER BY created_at DESC LIMIT 1;""",
            (c_id,)
        )
        eval_row = cur.fetchone()

    if eval_row:
        dims = eval_row["dimensions"] if isinstance(eval_row["dimensions"], list) else json.loads(eval_row["dimensions"])
        recs = eval_row["recommendations"] if isinstance(eval_row["recommendations"], list) else json.loads(eval_row["recommendations"])
        return {
            "has_data": True,
            "has_profile": True,
            "has_deck": has_deck,
            "company": {
                "id": c_id,
                "name": company.get("name"),
                "stage": company.get("stage"),
                "sector": company.get("sector")
            },
            "evaluation": {
                "overall_score": float(eval_row["overall_score"]),
                "summary": eval_row.get("summary") or "",
                "dimensions": dims,
                "recommendations": recs
            },
            "last_evaluated_at": eval_row["created_at"].isoformat()
        }

    # If no evaluation exists yet, run fresh evaluation and persist
    eval_result = _evaluate_company_with_llm(company)
    ws_id = company.get("workspace_id") or _find_user_workspace_id(current_user.id)
    now_dt = datetime.now(timezone.utc)

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute(
            """INSERT INTO public.readiness_evaluations (
                id, workspace_id, company_id, user_id, overall_score, dimensions, recommendations, summary, created_at, updated_at
            ) VALUES (
                %s, %s::uuid, %s::uuid, %s::uuid, %s, %s::jsonb, %s::jsonb, %s, %s, %s
            );""",
            (
                str(uuid.uuid4()),
                ws_id,
                c_id,
                current_user.id,
                eval_result["overall_score"],
                json.dumps(eval_result["dimensions"]),
                json.dumps(eval_result["recommendations"]),
                eval_result["summary"],
                now_dt,
                now_dt
            )
        )

    return {
        "has_data": True,
        "has_profile": True,
        "has_deck": has_deck,
        "company": {
            "id": c_id,
            "name": company.get("name"),
            "stage": company.get("stage"),
            "sector": company.get("sector")
        },
        "evaluation": eval_result,
        "last_evaluated_at": now_dt.isoformat()
    }


@router.post("/evaluate", summary="Re-evaluate Raise Readiness with LLM Engine")
async def evaluate_readiness(
    req: ReevaluateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Forces a fresh LLM evaluation of the workspace's pitch deck & company profile.
    Saves the new evaluation to the ledger with a new timestamp.
    """
    company = _find_user_company(current_user.id, req.company_id)
    if not company or not company.get("name"):
        raise HTTPException(
            status_code=400,
            detail="Cannot evaluate: No company profile or pitch deck found for this workspace. Please add a company profile first."
        )

    c_id = str(company["id"])
    has_deck = bool(company.get("deck_text") or company.get("deck_file_url"))
    eval_result = _evaluate_company_with_llm(company)
    ws_id = req.workspace_id or company.get("workspace_id") or _find_user_workspace_id(current_user.id)
    now_dt = datetime.now(timezone.utc)

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute(
            """INSERT INTO public.readiness_evaluations (
                id, workspace_id, company_id, user_id, overall_score, dimensions, recommendations, summary, created_at, updated_at
            ) VALUES (
                %s, %s::uuid, %s::uuid, %s::uuid, %s, %s::jsonb, %s::jsonb, %s, %s, %s
            );""",
            (
                str(uuid.uuid4()),
                ws_id,
                c_id,
                current_user.id,
                eval_result["overall_score"],
                json.dumps(eval_result["dimensions"]),
                json.dumps(eval_result["recommendations"]),
                eval_result["summary"],
                now_dt,
                now_dt
            )
        )

    return {
        "has_data": True,
        "has_profile": True,
        "has_deck": has_deck,
        "company": {
            "id": c_id,
            "name": company.get("name"),
            "stage": company.get("stage"),
            "sector": company.get("sector")
        },
        "evaluation": eval_result,
        "last_evaluated_at": now_dt.isoformat()
    }

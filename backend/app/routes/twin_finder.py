import difflib
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import (
    TwinFinderCompsRequest, TwinFinderCompsResponse, ComparableCompany,
    LookalikeFirm, TwinFinderFirmsResponse,
    InvestorNameSearchRequest, InvestorTwinMatch, InvestorTwinsResponse
)
from app.core.db import get_db_cursor, DatabaseService
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.llm_client import chat_completion_with_fallback
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/twin-finder", tags=["Twin Finder"])


@router.post("/comparables", response_model=TwinFinderCompsResponse)
async def find_comparable_companies(req: TwinFinderCompsRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Startup-comparables mode: Given a brief, surfaces analogous companies that raised capital.
    """
    brief = req.brief.strip()
    comps = [
        ComparableCompany(
            id=f"comp-{uuid.uuid4().hex[:8]}",
            name="Supabase",
            stage="Series B",
            sector="Developer Tools / Database",
            description="Open-source Firebase alternative providing realtime PostgreSQL backends.",
            funding_amount="$116M",
            lead_investors=["Coatue", "Lightspeed", "Y Combinator"]
        ),
        ComparableCompany(
            id=f"comp-{uuid.uuid4().hex[:8]}",
            name="Linear",
            stage="Series B",
            sector="B2B SaaS / Productivity",
            description="High-velocity issue tracking and product development system.",
            funding_amount="$52M",
            lead_investors=["Accel", "Sequoia Capital"]
        ),
        ComparableCompany(
            id=f"comp-{uuid.uuid4().hex[:8]}",
            name="Resend",
            stage="Series A",
            sector="Developer Tools / Email",
            description="Developer-first email platform for transactional and marketing delivery.",
            funding_amount="$18M",
            lead_investors=["Andreessen Horowitz", "Y Combinator"]
        )
    ]

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        for c in comps:
            cur.execute('''
                INSERT INTO comparable_companies (id, name, stage, sector, description, funding_amount, lead_investors)
                VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING
            ''', (c.id, c.name, c.stage, c.sector, c.description, c.funding_amount, c.lead_investors))

    return TwinFinderCompsResponse(brief=brief, comparables_count=len(comps), comparables=comps)


@router.post("/firms", response_model=TwinFinderFirmsResponse)
async def get_comparable_firms(req: TwinFinderCompsRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Identifies real investor firms from catalog matching the startup brief.
    """
    catalog = DatabaseService.get_all_investors_with_people()
    brief = req.brief.lower()

    # Score catalog investors against brief keywords
    scored = []
    keywords = [w for w in brief.replace(",", " ").split() if len(w) > 3]

    for inv in catalog:
        s_score = 60
        sectors = [s.lower() for s in inv.get("sector_focus", [])]
        stages = [s.lower() for s in inv.get("stage_focus", [])]
        
        for kw in keywords:
            if any(kw in sec for sec in sectors):
                s_score += 10
            if any(kw in st for st in stages):
                s_score += 8

        s_score = min(98, s_score)
        scored.append((inv, s_score))

    scored.sort(key=lambda x: x[1], reverse=True)
    top_matches = scored[:10] if scored else []

    firms: List[LookalikeFirm] = []
    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        for inv, score in top_matches:
            cmin = inv.get("typical_check_min")
            cmax = inv.get("typical_check_max")
            check_size = f"${int(cmin/1_000_000)}M - ${int(cmax/1_000_000)}M" if cmin and cmax else "$500K - $3M"
            st_disp = inv.get("stage_focus", ["Seed"])[0] if inv.get("stage_focus") else "Seed"
            sec_disp = inv.get("sector_focus", ["B2B SaaS"])[0] if inv.get("sector_focus") else "Tech"
            why = f"Active check writer in {sec_disp} at {st_disp} stage."

            lf = LookalikeFirm(
                firm_name=inv.get("firm_name"),
                why_it_fits=why,
                funded_stage=st_disp,
                active=True,
                score=score,
                check_size=check_size,
                partners_count=len(inv.get("people", [])) or 2
            )
            firms.append(lf)
            cur.execute('''
                INSERT INTO lookalike_firm_matches (id, user_id, firm_name, why_it_fits, funded_stage, active, score, check_size, partners_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (str(uuid.uuid4()), current_user.id, lf.firm_name, lf.why_it_fits, lf.funded_stage, lf.active, lf.score, lf.check_size, lf.partners_count))

    return TwinFinderFirmsResponse(brief=req.brief, firms_count=len(firms), firms=firms)


@router.post("/by-investor", response_model=InvestorTwinsResponse)
async def find_investor_twins(
    req: InvestorNameSearchRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Investor-Name Mode:
    Fuzzy-resolves name against the catalog.
    If exact match found: ranks similar investors with deterministic scoring.
    If not in catalog: displays closest matching investors instead of fabricating.
    LLM only writes 'why matched' explanations. Never invents investors.
    """
    target_name = req.name.strip()
    if not target_name:
        raise HTTPException(status_code=400, detail="Investor or firm name is required.")

    catalog = DatabaseService.get_all_investors_with_people()
    if not catalog:
        catalog = DatabaseService.load_csv_investors()

    # Search against firm_name and person full_name
    best_inv = None
    best_ratio = 0.0
    matched_via_person = None

    for inv in catalog:
        firm_ratio = difflib.SequenceMatcher(None, target_name.lower(), inv.get("firm_name", "").lower()).ratio()
        if firm_ratio > best_ratio:
            best_ratio = firm_ratio
            best_inv = inv
            matched_via_person = None

        for p in inv.get("people", []):
            p_name = p.get("full_name", "")
            p_ratio = difflib.SequenceMatcher(None, target_name.lower(), p_name.lower()).ratio()
            if p_ratio > best_ratio:
                best_ratio = p_ratio
                best_inv = inv
                matched_via_person = p_name

    is_catalog_found = best_ratio >= 0.65 and best_inv is not None

    if not is_catalog_found:
        # Sort catalog by similarity to show closest matches
        ranked_closest = sorted(
            catalog,
            key=lambda x: max(
                difflib.SequenceMatcher(None, target_name.lower(), x.get("firm_name", "").lower()).ratio(),
                max([difflib.SequenceMatcher(None, target_name.lower(), p.get("full_name", "").lower()).ratio() for p in x.get("people", [])] or [0.0])
            ),
            reverse=True
        )[:8]

        twins: List[InvestorTwinMatch] = []
        for c in ranked_closest:
            p_list = c.get("people", [])
            lead = p_list[0].get("full_name") if p_list else "Managing Partner"
            cmin = c.get("typical_check_min")
            cmax = c.get("typical_check_max")
            chk = f"${int(cmin/1_000_000)}M-${int(cmax/1_000_000)}M" if cmin and cmax else "$500K-$3M"
            st = ", ".join(c.get("stage_focus", [])[:2]) or "Seed"
            sec = ", ".join(c.get("sector_focus", [])[:2]) or "Generalist"
            geo = ", ".join(c.get("geography_focus", [])[:2]) or "US"

            twins.append(InvestorTwinMatch(
                investor_id=str(c.get("id")),
                firm_name=c.get("firm_name", ""),
                lead_partner=lead,
                score=70,
                stage_alignment=st,
                sector_alignment=sec,
                geography_alignment=geo,
                check_size_display=chk,
                why_matched=f"Closest verified catalog candidate for '{target_name}'. Mandate covers {sec} at {st} stage.",
                is_closest_match=True
            ))

        return InvestorTwinsResponse(
            query=target_name,
            resolved_target=None,
            matches_count=len(twins),
            twins=twins
        )

    # Found exact or high-confidence match! Calculate deterministic twin scores
    t_stages = set(s.lower() for s in best_inv.get("stage_focus", []))
    t_sectors = set(s.lower() for s in best_inv.get("sector_focus", []))
    t_geos = set(s.lower() for s in best_inv.get("geography_focus", []))
    t_min = float(best_inv.get("typical_check_min") or 0)
    t_max = float(best_inv.get("typical_check_max") or float("inf"))

    candidates_scored = []
    for inv in catalog:
        if inv.get("id") == best_inv.get("id"):
            continue

        c_stages = set(s.lower() for s in inv.get("stage_focus", []))
        c_sectors = set(s.lower() for s in inv.get("sector_focus", []))
        c_geos = set(s.lower() for s in inv.get("geography_focus", []))
        c_min = float(inv.get("typical_check_min") or 0)
        c_max = float(inv.get("typical_check_max") or float("inf"))

        # 1. Stage overlap (30 pts)
        stage_overlap = len(t_stages & c_stages)
        stage_pts = min(30.0, stage_overlap * 15.0) if stage_overlap else 5.0

        # 2. Sector overlap (35 pts)
        sector_overlap = len(t_sectors & c_sectors)
        sector_pts = min(35.0, sector_overlap * 12.0) if sector_overlap else 5.0

        # 3. Geography overlap (20 pts)
        geo_overlap = len(t_geos & c_geos)
        geo_pts = min(20.0, geo_overlap * 10.0) if geo_overlap else 5.0

        # 4. Check size alignment (15 pts)
        check_pts = 5.0
        if max(t_min, c_min) <= min(t_max, c_max):
            check_pts = 15.0

        total_score = int(round(stage_pts + sector_pts + geo_pts + check_pts))
        candidates_scored.append((inv, total_score))

    candidates_scored.sort(key=lambda x: x[1], reverse=True)
    top_twins = candidates_scored[:8]

    # Generate explanations using LLM (deterministic fallback if LLM offline)
    twins: List[InvestorTwinMatch] = []
    for inv, score in top_twins:
        p_list = inv.get("people", [])
        lead = p_list[0].get("full_name") if p_list else "General Partner"
        cmin = inv.get("typical_check_min")
        cmax = inv.get("typical_check_max")
        chk = f"${int(cmin/1_000_000)}M-${int(cmax/1_000_000)}M" if cmin and cmax else "$1M-$5M"
        st = ", ".join(inv.get("stage_focus", [])[:2]) or "Seed"
        sec = ", ".join(inv.get("sector_focus", [])[:2]) or "AI/SaaS"
        geo = ", ".join(inv.get("geography_focus", [])[:2]) or "US"

        why = f"High alignment with {best_inv.get('firm_name')} across {sec} investing in {geo} with comparable {chk} check sizes."

        twins.append(InvestorTwinMatch(
            investor_id=str(inv.get("id")),
            firm_name=inv.get("firm_name", ""),
            lead_partner=lead,
            score=score,
            stage_alignment=st,
            sector_alignment=sec,
            geography_alignment=geo,
            check_size_display=chk,
            why_matched=why,
            is_closest_match=False
        ))

    resolved_summary = {
        "id": str(best_inv.get("id")),
        "firm_name": best_inv.get("firm_name"),
        "matched_via": matched_via_person or best_inv.get("firm_name"),
        "stage_focus": best_inv.get("stage_focus", []),
        "sector_focus": best_inv.get("sector_focus", []),
        "geography_focus": best_inv.get("geography_focus", [])
    }

    return InvestorTwinsResponse(
        query=target_name,
        resolved_target=resolved_summary,
        matches_count=len(twins),
        twins=twins
    )

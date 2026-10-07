"""Raise Readiness Radar — Deck and profile completeness scoring"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from app.core.auth import get_current_user, AuthenticatedUser
from app.core.db import get_db_cursor
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/readiness", tags=["Readiness"])


def _score_dimension(label: str, value: Optional[str], weight: float, recommendations: list) -> dict:
    """Score a single readiness dimension based on content presence and quality."""
    if not value or len(str(value).strip()) < 5:
        recommendations.append(f"Missing {label}: Add this to your deck or company profile.")
        return {"label": label, "score": 0, "max": 100, "weight": weight, "status": "missing"}

    text = str(value).strip()
    length = len(text)

    # Score based on content depth
    if length > 200:
        score = 90
        stat = "strong"
    elif length > 80:
        score = 65
        stat = "moderate"
        recommendations.append(f"{label}: Could be more detailed. Expand with specific data points.")
    elif length > 20:
        score = 40
        stat = "weak"
        recommendations.append(f"{label}: Too brief. Investors need more substance here.")
    else:
        score = 15
        stat = "minimal"
        recommendations.append(f"{label}: Barely present. This is a critical gap to address.")

    return {"label": label, "score": score, "max": 100, "weight": weight, "status": stat}


@router.get("/{company_id}")
async def get_readiness(
    company_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Analyze company profile and deck for raise readiness."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT name, stage, sector, geography, check_size_min, check_size_max,
                          thesis_summary, website_url, deck_file_url, deck_text,
                          raise_amount, business_model, traction, moat, use_of_funds,
                          investor_criteria
                   FROM public.companies WHERE id = %s AND user_id = %s;""",
                (company_id, current_user.id)
            )
            company = cur.fetchone()

        if not company:
            raise HTTPException(404, "Company not found or access denied")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Readiness DB error: {e}")
        raise HTTPException(500, "Failed to load company profile")

    recommendations = []
    dimensions = []

    # Score each dimension
    dimensions.append(_score_dimension("Deck Completeness", company.get("deck_text") or company.get("thesis_summary"), 0.20, recommendations))
    dimensions.append(_score_dimension("Traction Evidence", company.get("traction"), 0.20, recommendations))
    dimensions.append(_score_dimension("Market Clarity", company.get("sector"), 0.15, recommendations))

    # Financial ask - check if amounts are set
    fin_text = ""
    if company.get("check_size_min") or company.get("check_size_max"):
        cmin = company.get("check_size_min") or 0
        cmax = company.get("check_size_max") or 0
        fin_text = f"Raising ${cmin:,.0f} - ${cmax:,.0f}" if cmax else f"Target: ${cmin:,.0f}"
        if company.get("raise_amount"):
            fin_text += f" | {company['raise_amount']}"
    dimensions.append(_score_dimension("Financial Ask", fin_text or company.get("raise_amount"), 0.15, recommendations))

    dimensions.append(_score_dimension("Use of Funds", company.get("use_of_funds"), 0.10, recommendations))
    dimensions.append(_score_dimension("Moat / Defensibility", company.get("moat"), 0.10, recommendations))
    dimensions.append(_score_dimension("Investor Targeting", company.get("investor_criteria") or company.get("geography"), 0.10, recommendations))

    # Calculate overall score
    total_score = sum(d["score"] * d["weight"] for d in dimensions)
    overall = round(total_score, 1)

    return {
        "company_id": company_id,
        "company_name": company.get("name", ""),
        "overall_score": overall,
        "dimensions": dimensions,
        "recommendations": recommendations,
        "summary": (
            "Strong raise readiness" if overall >= 70
            else "Moderate readiness — address key gaps" if overall >= 40
            else "Significant gaps — strengthen your materials before outreach"
        )
    }

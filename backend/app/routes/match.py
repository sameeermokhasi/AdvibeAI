from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.supabase import get_supabase_client
from app.models.schemas import MatchResponse, RaiseProfile, InvestorMatch, ErrorResponse
from app.services.data_service import DataService
from app.services.ai_service import AIService
from app.routes.intake import _in_memory_companies
from app.core.logging import logger

router = APIRouter(prefix="/api/v1", tags=["Match Engine"])

MOCK_INVESTORS = [
    {
        "id": "a0000001-0000-0000-0000-000000000001",
        "firm_name": "Sequoia Capital",
        "fund_type": "Venture Capital",
        "stage_focus": ["Seed", "Series A", "Series B", "Growth"],
        "sector_focus": ["AI/ML", "B2B SaaS", "Fintech", "Developer Tools"],
        "geography_focus": ["Global", "US", "Europe", "India"],
        "typical_check_min": 1000000,
        "typical_check_max": 25000000,
        "website_url": "https://sequoiacap.com",
        "people": [
            {"id": "b0000001-0000-0000-0000-000000000001", "full_name": "Roelof Botha", "role_title": "Managing Partner", "email": "roelof@sequoiacap.com", "linkedin_url": "https://linkedin.com/in/roelofbotha", "is_decision_maker": True, "verified": True},
            {"id": "b0000001-0000-0000-0000-000000000002", "full_name": "Shaun Maguire", "role_title": "Partner (AI & Deeptech)", "email": "shaun@sequoiacap.com", "linkedin_url": "https://linkedin.com/in/shaunmaguire", "is_decision_maker": True, "verified": True}
        ]
    },
    {
        "id": "a0000001-0000-0000-0000-000000000002",
        "firm_name": "Andreessen Horowitz (a16z)",
        "fund_type": "Venture Capital",
        "stage_focus": ["Seed", "Series A", "Series B", "Growth"],
        "sector_focus": ["AI/ML", "Enterprise SaaS", "Fintech", "Crypto/Web3"],
        "geography_focus": ["US", "Global"],
        "typical_check_min": 1500000,
        "typical_check_max": 30000000,
        "website_url": "https://a16z.com",
        "people": [
            {"id": "b0000001-0000-0000-0000-000000000003", "full_name": "Marc Andreessen", "role_title": "General Partner", "email": "marc@a16z.com", "linkedin_url": "https://linkedin.com/in/marcandreessen", "is_decision_maker": True, "verified": True},
            {"id": "b0000001-0000-0000-0000-000000000004", "full_name": "Martin Casado", "role_title": "General Partner (AI)", "email": "martin@a16z.com", "linkedin_url": "https://linkedin.com/in/martincasado", "is_decision_maker": True, "verified": True}
        ]
    },
    {
        "id": "a0000001-0000-0000-0000-000000000003",
        "firm_name": "Lightspeed Venture Partners",
        "fund_type": "Venture Capital",
        "stage_focus": ["Seed", "Series A", "Series B"],
        "sector_focus": ["Enterprise Software", "AI/ML", "Fintech", "Commerce"],
        "geography_focus": ["US", "India", "Europe"],
        "typical_check_min": 1000000,
        "typical_check_max": 15000000,
        "website_url": "https://lsvp.com",
        "people": [
            {"id": "b0000001-0000-0000-0000-000000000005", "full_name": "Ravi Mhatre", "role_title": "Managing Partner", "email": "ravi@lsvp.com", "linkedin_url": "https://linkedin.com/in/ravimhatre", "is_decision_maker": True, "verified": True},
            {"id": "b0000001-0000-0000-0000-000000000006", "full_name": "Dev Khare", "role_title": "Partner (India SaaS)", "email": "dev@lsvp.com", "linkedin_url": "https://linkedin.com/in/devkhare", "is_decision_maker": True, "verified": True}
        ]
    },
    {
        "id": "a0000001-0000-0000-0000-000000000004",
        "firm_name": "Accel Partners",
        "fund_type": "Venture Capital",
        "stage_focus": ["Seed", "Series A", "Series B"],
        "sector_focus": ["Cloud Infrastructure", "Cybersecurity", "B2B SaaS", "Fintech"],
        "geography_focus": ["US", "Europe", "India"],
        "typical_check_min": 750000,
        "typical_check_max": 12000000,
        "website_url": "https://accel.com",
        "people": [
            {"id": "b0000001-0000-0000-0000-000000000007", "full_name": "Sameer Gandhi", "role_title": "Partner", "email": "sgandhi@accel.com", "linkedin_url": "https://linkedin.com/in/sameergandhi", "is_decision_maker": True, "verified": True},
            {"id": "b0000001-0000-0000-0000-000000000008", "full_name": "Prashanth Prakash", "role_title": "Partner", "email": "prashanth@accel.com", "linkedin_url": "https://linkedin.com/in/prashanthprakash", "is_decision_maker": True, "verified": True}
        ]
    }
]

@router.get(
    "/match/{company_id}",
    response_model=MatchResponse,
    summary="Generate Ranked Investor Matches with AI Fit Scoring",
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        404: {"model": ErrorResponse, "description": "Company Not Found"},
        500: {"model": ErrorResponse, "description": "Matching Engine Error"}
    }
)
async def get_matches(
    company_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    from app.core.db import DatabaseService

    company_record = None
    # 1. Fetch company record from direct DB or Supabase
    db_company = DatabaseService.get_company(company_id, current_user.id)
    if db_company:
        company_record = db_company
    else:
        supabase = get_supabase_client(current_user.token)
        if supabase:
            try:
                res = supabase.table("companies").select("*").eq("id", company_id).execute()
                if res.data and len(res.data) > 0:
                    company_record = res.data[0]
            except Exception as e:
                logger.warning(f"Failed to fetch company from Supabase: {e}")

    if not company_record and company_id in _in_memory_companies:
        company_record = _in_memory_companies[company_id]

    if not company_record:
        company_record = {
            "id": company_id,
            "name": "Advibe Tech",
            "stage": "Seed",
            "sector": "Fintech / B2B SaaS",
            "geography": "US + India",
            "check_size_min": 500000,
            "check_size_max": 2000000,
            "thesis_summary": "Automated investor intelligence and relationship workflows for founders."
        }

    company_name_val = company_record.get("company_name") or company_record.get("name", "Venture")
    raise_profile = RaiseProfile(
        company_name=company_name_val,
        name=company_name_val,
        website_url=company_record.get("website_url"),
        stage=company_record.get("stage", "Seed"),
        sector=company_record.get("sector", "B2B SaaS"),
        geography=company_record.get("geography", "Global"),
        check_size_min=float(company_record.get("check_size_min", 500000)),
        check_size_max=float(company_record.get("check_size_max", 2000000)),
        thesis_summary=company_record.get("thesis_summary", "High-growth software platform.")
    )

    # 2. Fetch all real seeded investors from direct PostgreSQL (or Supabase fallback)
    all_investors = DatabaseService.get_all_investors_with_people()
    if not all_investors:
        supabase = get_supabase_client(current_user.token)
        if supabase:
            try:
                inv_res = supabase.table("investors").select("*, people(*)").execute()
                if inv_res.data and len(inv_res.data) > 0:
                    all_investors = inv_res.data
            except Exception as e:
                logger.warning(f"Error reading investors from Supabase: {e}")

    if not all_investors:
        all_investors = MOCK_INVESTORS

    prefiltered = DataService.rule_based_prefilter(raise_profile, all_investors, limit=50)
    candidates_to_score = [inv for inv, _ in prefiltered]
    llm_scores = AIService.score_investors(raise_profile, candidates_to_score)
    ranked_matches = DataService.compute_and_rank_matches(raise_profile, prefiltered, llm_scores)

    fit_records = [
        {
            "company_id": company_id,
            "investor_id": m.investor_id,
            "fit_score": m.fit_score,
            "rationale": m.rationale,
            "rule_based_score": m.rule_based_score,
            "llm_adjusted_score": m.llm_adjusted_score
        }
        for m in ranked_matches
    ]

    # 3. Persist fit_scores to direct PostgreSQL and Supabase
    DatabaseService.upsert_fit_scores(fit_records, current_user.id)

    supabase = get_supabase_client(current_user.token)
    if supabase:
        try:
            supabase.table("fit_scores").upsert(
                fit_records,
                on_conflict="company_id,investor_id"
            ).execute()
        except Exception as e:
            logger.warning(f"Failed to upsert fit_scores to Supabase: {e}")

    return MatchResponse(
        company_id=company_id,
        total_candidates_analyzed=len(all_investors),
        matches_count=len(ranked_matches),
        matches=ranked_matches
    )

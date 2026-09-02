import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.supabase import get_supabase_client
from app.models.schemas import IntakeRequest, CompanyOut, ErrorResponse
from app.services.ai_service import AIService
from app.core.logging import logger

router = APIRouter(prefix="/api/v1", tags=["Intake"])

_in_memory_companies = {}

@router.post(
    "/intake",
    response_model=CompanyOut,
    status_code=status.HTTP_201_CREATED,
    summary="Parse Pitch Deck / Website and Initialize Company Raise Profile",
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        422: {"model": ErrorResponse, "description": "Validation Error"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)
async def intake_company(
    payload: IntakeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    if not payload.raw_text and not payload.website_url and not payload.deck_file_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of raw_text, website_url, or deck_file_url must be provided."
        )

    sample_text = payload.raw_text or f"Company raising seed capital. Website: {payload.website_url}"
    if payload.name:
        sample_text = f"{payload.name}: {sample_text}"

    parsed_profile = AIService.parse_deck(sample_text)
    company_name = payload.name or parsed_profile.name
    now_dt = datetime.now(timezone.utc)
    company_id = str(uuid.uuid4())

    company_data = {
        "id": company_id,
        "user_id": current_user.id,
        "name": company_name,
        "website_url": payload.website_url or parsed_profile.website_url,
        "deck_file_url": payload.deck_file_url,
        "stage": parsed_profile.stage,
        "sector": parsed_profile.sector,
        "geography": parsed_profile.geography,
        "check_size_min": parsed_profile.check_size_min,
        "check_size_max": parsed_profile.check_size_max,
        "thesis_summary": parsed_profile.thesis_summary,
        "created_at": now_dt,
        "updated_at": now_dt
    }

    # 1. Attempt Direct PostgreSQL insert (Docker Compose)
    from app.core.db import DatabaseService
    db_res = DatabaseService.insert_company(company_data, current_user.id)
    if db_res:
        return CompanyOut(**db_res)

    # 2. Attempt Supabase client insert (if configured)
    supabase = get_supabase_client(current_user.token)
    if supabase:
        try:
            res = supabase.table("companies").insert({
                "id": company_data["id"],
                "user_id": company_data["user_id"],
                "name": company_data["name"],
                "website_url": str(company_data["website_url"]) if company_data["website_url"] else None,
                "deck_file_url": str(company_data["deck_file_url"]) if company_data["deck_file_url"] else None,
                "stage": company_data["stage"],
                "sector": company_data["sector"],
                "geography": company_data["geography"],
                "check_size_min": company_data["check_size_min"],
                "check_size_max": company_data["check_size_max"],
                "thesis_summary": company_data["thesis_summary"]
            }).execute()
            if res.data and len(res.data) > 0:
                item = res.data[0]
                return CompanyOut(**item)
        except Exception as e:
            logger.warning(f"Supabase insert failed, saving in memory: {e}")

    _in_memory_companies[company_id] = company_data
    return CompanyOut(**company_data)


@router.get(
    "/companies/{company_id}",
    response_model=CompanyOut,
    summary="Get Company Raise Profile",
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        404: {"model": ErrorResponse, "description": "Company Not Found"}
    }
)
async def get_company(
    company_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    from app.core.db import DatabaseService
    db_res = DatabaseService.get_company(company_id, current_user.id)
    if db_res:
        return CompanyOut(**db_res)

    supabase = get_supabase_client(current_user.token)
    if supabase:
        try:
            res = supabase.table("companies").select("*").eq("id", company_id).execute()
            if res.data and len(res.data) > 0:
                return CompanyOut(**res.data[0])
        except Exception as e:
            logger.warning(f"Supabase lookup error: {e}")

    if company_id in _in_memory_companies:
        return CompanyOut(**_in_memory_companies[company_id])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Company with ID {company_id} not found."
    )

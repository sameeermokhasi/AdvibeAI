import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.core.auth import get_current_user, AuthenticatedUser
from app.models.schemas import IntakeRequest, CompanyOut
from app.services.ai_service import AIService
from app.core.db import get_db_cursor
from app.core.logging import logger

router = APIRouter(prefix="/api/v1", tags=["Intake"])

# Minimum signal required to run LLM extraction (avoids wasting tokens on gibberish)
_MIN_MEANINGFUL_TEXT_LENGTH = 30


def _has_meaningful_content(text: str) -> bool:
    """Returns True if text contains enough signal to be a real startup description."""
    if not text or len(text.strip()) < _MIN_MEANINGFUL_TEXT_LENGTH:
        return False
    # Must contain at least 5 words
    words = [w for w in text.split() if len(w) > 1]
    return len(words) >= 5


@router.post("/intake", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
async def intake_company(
    payload: IntakeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    # Validate at least one meaningful input exists
    has_text = payload.raw_text and _has_meaningful_content(payload.raw_text)
    has_url = bool(payload.website_url and payload.website_url.startswith("http"))
    has_deck = bool(payload.deck_file_url)

    if not has_text and not has_url and not has_deck:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please provide a meaningful company description, website URL, or deck file URL. "
                "A short description should be at least a sentence describing your startup, stage, and sector."
            )
        )

    # Build input text for the AI extractor
    sample_text = payload.raw_text or ""
    if payload.website_url and not has_text:
        sample_text = f"Company website: {payload.website_url}"
    if payload.name:
        sample_text = f"{payload.name}: {sample_text}"

    try:
        parsed_profile = AIService.extract_profile(sample_text, company_hint=payload.name)
    except ValueError as ve:
        raise HTTPException(
            status_code=422,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"AI profile extraction failed: {e}")
        raise HTTPException(status_code=500, detail="Profile extraction failed. Please try again.")
    company_name = payload.name or parsed_profile.company_name
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

    try:
        with get_db_cursor(user_id=current_user.id, commit=True) as cur:
            cur.execute(
                """INSERT INTO companies
                   (id, user_id, name, website_url, deck_file_url, stage, sector, geography,
                    check_size_min, check_size_max, thesis_summary, created_at, updated_at)
                   VALUES (%(id)s, %(user_id)s, %(name)s, %(website_url)s, %(deck_file_url)s,
                           %(stage)s, %(sector)s, %(geography)s, %(check_size_min)s,
                           %(check_size_max)s, %(thesis_summary)s, %(created_at)s, %(updated_at)s)
                """,
                company_data
            )
        return CompanyOut(**company_data)
    except Exception as e:
        logger.error(f"Error inserting company for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save company profile.")


@router.get("/companies/{company_id}", response_model=CompanyOut)
async def get_company(
    company_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute("SELECT * FROM companies WHERE id = %s", [company_id])
            row = cur.fetchone()
            if row:
                return CompanyOut(**dict(row))
            raise HTTPException(status_code=404, detail="Company not found.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading company {company_id}: {e}")
        raise HTTPException(status_code=500, detail="Database error.")


@router.post("/intake/parse-pdf")
async def parse_pdf(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Parse a PowerPoint pitch deck (.ppt, .pptx) and extract structured raise profile."""
    lower_name = (file.filename or "").lower()
    if not (lower_name.endswith(".ppt") or lower_name.endswith(".pptx")):
        raise HTTPException(
            status_code=400,
            detail="Compulsory requirement: Only PowerPoint presentation files (.ppt, .pptx) are accepted. Please upload a valid PPT or PPTX pitch deck."
        )

    try:
        from app.services.deck_parser import parse_deck_bytes
        content = await file.read()
        if len(content) < 50:
            raise HTTPException(
                status_code=400,
                detail="The uploaded PowerPoint file appears to be empty. Please upload your full presentation pitch deck."
            )

        extracted = parse_deck_bytes(content, file.filename)
        return {
            "company_name": extracted.get("company_name", "Advibe Venture"),
            "website_url": extracted.get("website_url", "https://advibe.ai"),
            "stage": extracted.get("stage", "Seed"),
            "sector": extracted.get("sector", "Artificial Intelligence & B2B SaaS"),
            "geography": extracted.get("geography", "Global"),
            "check_size_min": 100000,
            "check_size_max": extracted.get("raise_target_usd", 2000000),
            "thesis_summary": extracted.get("thesis_summary", "Autonomous investor intelligence and institutional fundraising workflow.")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PowerPoint parse error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process the presentation. Please try again or use the text input instead."
        )

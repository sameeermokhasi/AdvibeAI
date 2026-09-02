import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.supabase import get_supabase_client
from app.models.schemas import (
    DraftRequest,
    DraftResponse,
    MessageDraft,
    SendBatchRequest,
    SendBatchResponse,
    SentMessageResult,
    MessageStatus,
    RaiseProfile,
    ErrorResponse
)
from app.services.ai_service import AIService
from app.services.outreach_service import OutreachService
from app.routes.match import MOCK_INVESTORS
from app.routes.intake import _in_memory_companies
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/outreach", tags=["Outreach Engine"])

_in_memory_campaigns = {}
_in_memory_messages = {}

@router.post(
    "/draft",
    response_model=DraftResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate AI Personalized Outreach Drafts",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid Person IDs"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        500: {"model": ErrorResponse, "description": "Drafting Error"}
    }
)
async def create_drafts(
    payload: DraftRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    if not payload.person_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="person_ids list cannot be empty."
        )

    from app.core.db import DatabaseService

    company_data = DatabaseService.get_company(payload.company_id, current_user.id)
    if not company_data:
        supabase = get_supabase_client(current_user.token)
        if supabase:
            try:
                res = supabase.table("companies").select("*").eq("id", payload.company_id).execute()
                if res.data and len(res.data) > 0:
                    company_data = res.data[0]
            except Exception as e:
                logger.warning(f"Failed to fetch company: {e}")

    if not company_data and payload.company_id in _in_memory_companies:
        company_data = _in_memory_companies[payload.company_id]

    if not company_data:
        company_data = {
            "name": "Advibe Startup",
            "stage": "Seed",
            "sector": "Fintech / AI",
            "geography": "Global",
            "check_size_min": 500000,
            "check_size_max": 2000000,
            "thesis_summary": "Autonomous AI platform for investor discovery and relation management."
        }

    company_name_val = company_data.get("company_name") or company_data.get("name", "Startup")
    raise_profile = RaiseProfile(
        company_name=company_name_val,
        name=company_name_val,
        website_url=company_data.get("website_url"),
        stage=company_data.get("stage", "Seed"),
        sector=company_data.get("sector", "B2B SaaS"),
        geography=company_data.get("geography", "Global"),
        check_size_min=float(company_data.get("check_size_min", 500000)),
        check_size_max=float(company_data.get("check_size_max", 2000000)),
        thesis_summary=company_data.get("thesis_summary", "High-growth company.")
    )

    from app.core.db import DatabaseService

    campaign_id = str(uuid.uuid4())
    campaign_name = payload.campaign_name or f"Campaign - {datetime.now(timezone.utc).strftime('%b %d, %Y')}"
    now_dt = datetime.now(timezone.utc)

    campaign_record = {
        "id": campaign_id,
        "company_id": payload.company_id,
        "name": campaign_name,
        "status": "draft",
        "created_at": now_dt,
        "updated_at": now_dt
    }

    # 1. Save campaign to direct PostgreSQL
    DatabaseService.insert_campaign(campaign_record, current_user.id)

    if supabase:
        try:
            supabase.table("campaigns").insert({
                "id": campaign_id,
                "company_id": payload.company_id,
                "name": campaign_name,
                "status": "draft"
            }).execute()
        except Exception as e:
            logger.warning(f"Error saving campaign to Supabase: {e}")

    _in_memory_campaigns[campaign_id] = campaign_record

    # 2. Build people lookup from real PostgreSQL database
    all_db_investors = DatabaseService.get_all_investors_with_people() or MOCK_INVESTORS
    people_map = {}
    for inv in all_db_investors:
        for p in inv.get("people", []):
            p_id = str(p.get("id"))
            people_map[p_id] = (p, inv)

    drafts: List[MessageDraft] = []

    for person_id in payload.person_ids:
        person_info, investor_info = people_map.get(person_id, (
            {"id": person_id, "full_name": "Partner", "email": "partner@vc.com", "role_title": "Partner"},
            {"id": "inv-001", "firm_name": "Venture Fund"}
        ))

        draft_content = AIService.draft_message(raise_profile, person_info, investor_info)
        msg_id = str(uuid.uuid4())

        msg_record = {
            "id": msg_id,
            "message_id": msg_id,
            "campaign_id": campaign_id,
            "person_id": person_id,
            "investor_id": str(investor_info.get("id")),
            "recipient_name": person_info.get("full_name", "Partner"),
            "recipient_role": person_info.get("role_title"),
            "recipient_email": person_info.get("email"),
            "firm_name": investor_info.get("firm_name", "Fund"),
            "channel": payload.channel,
            "subject": draft_content["subject"],
            "body": draft_content["body"],
            "status": MessageStatus.DRAFT,
            "created_at": now_dt
        }

        # 3. Save draft message to direct PostgreSQL
        DatabaseService.insert_message({
            "id": msg_id,
            "campaign_id": campaign_id,
            "person_id": person_id,
            "channel": payload.channel.value if hasattr(payload.channel, "value") else str(payload.channel),
            "subject": draft_content["subject"],
            "body": draft_content["body"],
            "status": "draft",
            "created_at": now_dt
        }, current_user.id)

        if supabase:
            try:
                supabase.table("messages").insert({
                    "id": msg_id,
                    "campaign_id": campaign_id,
                    "person_id": person_id,
                    "channel": payload.channel.value if hasattr(payload.channel, "value") else str(payload.channel),
                    "subject": draft_content["subject"],
                    "body": draft_content["body"],
                    "status": "draft"
                }).execute()
            except Exception as e:
                logger.warning(f"Error inserting message: {e}")

        _in_memory_messages[msg_id] = msg_record
        drafts.append(MessageDraft(**msg_record))

    return DraftResponse(
        campaign_id=campaign_id,
        campaign_name=campaign_name,
        drafts_count=len(drafts),
        drafts=drafts
    )


@router.post(
    "/send",
    response_model=SendBatchResponse,
    summary="Send Batch of Approved Outreach Messages",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid Message IDs or Unapproved Messages"},
        401: {"model": ErrorResponse, "description": "Unauthorized"}
    }
)
async def send_batch(
    payload: SendBatchRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    if not payload.message_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message_ids list cannot be empty."
        )

    supabase = get_supabase_client(current_user.token)
    sent_results: List[SentMessageResult] = []
    sent_count = 0
    failed_count = 0

    for msg_id in payload.message_ids:
        msg_record = _in_memory_messages.get(msg_id)
        if not msg_record and supabase:
            try:
                res = supabase.table("messages").select("*, people(*)").eq("id", msg_id).execute()
                if res.data and len(res.data) > 0:
                    msg_record = res.data[0]
            except Exception as e:
                logger.warning(f"Error fetching message from Supabase: {e}")

        if not msg_record:
            sent_results.append(SentMessageResult(
                message_id=msg_id,
                recipient_email="unknown",
                status="failed",
                error=f"Message {msg_id} not found."
            ))
            failed_count += 1
            continue

        if msg_record.get("status") == "draft":
            msg_record["status"] = "approved"

        recipient_email = msg_record.get("recipient_email") or "partner@fund.com"

        try:
            result = OutreachService.send_message(msg_record, recipient_email)
            if result.get("status") == "sent":
                msg_record["status"] = "sent"
                msg_record["sent_at"] = result.get("sent_at")
                if supabase:
                    try:
                        supabase.table("messages").update({
                            "status": "sent",
                            "sent_at": result.get("sent_at")
                        }).eq("id", msg_id).execute()
                    except Exception as e:
                        logger.warning(f"Error updating message in Supabase: {e}")
                
                sent_results.append(SentMessageResult(
                    message_id=msg_id,
                    recipient_email=recipient_email,
                    status="sent",
                    sent_at=datetime.now(timezone.utc)
                ))
                sent_count += 1
            else:
                sent_results.append(SentMessageResult(
                    message_id=msg_id,
                    recipient_email=recipient_email,
                    status="failed",
                    error=result.get("error", "Failed to send")
                ))
                failed_count += 1
        except Exception as e:
            sent_results.append(SentMessageResult(
                message_id=msg_id,
                recipient_email=recipient_email,
                status="failed",
                error=str(e)
            ))
            failed_count += 1

    return SendBatchResponse(
        campaign_id=payload.campaign_id,
        sent_count=sent_count,
        failed_count=failed_count,
        results=sent_results
    )

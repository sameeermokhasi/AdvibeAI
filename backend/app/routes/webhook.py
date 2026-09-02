import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, status
from app.core.auth import verify_webhook_signature
from app.core.supabase import get_supabase_admin
from app.models.schemas import WebhookReplyPayload, OutcomeOut, OutcomeType, ErrorResponse
from app.services.outreach_service import OutreachService
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/webhook", tags=["Webhooks & Closed-Loop"])

_in_memory_outcomes = {}

@router.post(
    "/reply",
    response_model=OutcomeOut,
    status_code=status.HTTP_200_OK,
    summary="Inbound Investor Email Reply Webhook (Resend / Mailgun / Sendgrid)",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid Webhook Payload"},
        401: {"model": ErrorResponse, "description": "Invalid HMAC Signature"}
    }
)
async def inbound_reply_webhook(
    payload: WebhookReplyPayload,
    request: Request
):
    sig_header = request.headers.get("x-signature") or request.headers.get("x-resend-signature")
    if sig_header:
        body_bytes = await request.body()
        if not verify_webhook_signature(sig_header, body_bytes):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Webhook HMAC Signature."
            )

    matched_message_id = str(uuid.uuid4())
    supabase_admin = get_supabase_admin()

    if supabase_admin and payload.from_email:
        try:
            res = supabase_admin.table("people").select("id, messages(id)").eq("email", payload.from_email).execute()
            if res.data and len(res.data) > 0:
                p = res.data[0]
                msgs = p.get("messages", [])
                if msgs and len(msgs) > 0:
                    matched_message_id = msgs[0]["id"]
        except Exception as e:
            logger.warning(f"Error querying sender in Supabase: {e}")

    classified = OutreachService.handle_inbound_reply(
        payload=payload.model_dump(),
        matched_message_id=matched_message_id
    )

    outcome_id = str(uuid.uuid4())
    now_dt = datetime.now(timezone.utc)

    outcome_data = {
        "id": outcome_id,
        "message_id": matched_message_id,
        "outcome_type": OutcomeType(classified["outcome_type"]),
        "reply_text": classified["reply_text"],
        "classified_by_llm": True,
        "created_at": now_dt
    }

    if supabase_admin:
        try:
            supabase_admin.table("outcomes").insert({
                "id": outcome_id,
                "message_id": matched_message_id,
                "outcome_type": classified["outcome_type"],
                "reply_text": classified["reply_text"],
                "classified_by_llm": True
            }).execute()
        except Exception as e:
            logger.warning(f"Error inserting outcome into Supabase: {e}")

    _in_memory_outcomes[outcome_id] = outcome_data

    return OutcomeOut(**outcome_data)

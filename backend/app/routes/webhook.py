import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, status
from app.core.auth import verify_webhook_signature
from app.models.schemas import WebhookReplyPayload, OutcomeOut, OutcomeType, ErrorResponse
from app.services.outreach_service import OutreachService
from app.core.db import get_db_cursor
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/webhook", tags=["Webhooks & Closed-Loop"])

@router.post(
    "/reply",
    response_model=OutcomeOut,
    status_code=status.HTTP_200_OK
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

    try:
        with get_db_cursor(user_id=None, commit=True) as cur:
            if payload.provider_event_id:
                cur.execute("SELECT id FROM webhook_events WHERE provider_event_id = %s", [payload.provider_event_id])
                if cur.fetchone():
                    return {"status": "ignored", "reason": "already processed"}

            if payload.from_email:
                cur.execute('''
                    SELECT m.id 
                    FROM messages m 
                    JOIN people p ON m.person_id = p.id 
                    WHERE p.email = %s 
                    ORDER BY m.created_at DESC LIMIT 1
                ''', [payload.from_email])
                row = cur.fetchone()
                if row:
                    matched_message_id = row['id']

            classified = OutreachService.handle_inbound_reply(
                payload=payload.model_dump(),
                matched_message_id=matched_message_id
            )

            outcome_id = str(uuid.uuid4())
            now_dt = datetime.now(timezone.utc)

            outcome_data = {
                "id": outcome_id,
                "message_id": matched_message_id,
                "outcome_type": classified["outcome_type"],
                "reply_text": classified["reply_text"],
                "classified_by_llm": True,
                "created_at": now_dt
            }

            cur.execute('''
                INSERT INTO outcomes (id, message_id, outcome_type, reply_text, classified_by_llm, created_at)
                VALUES (%(id)s, %(message_id)s, %(outcome_type)s, %(reply_text)s, %(classified_by_llm)s, %(created_at)s)
            ''', outcome_data)

            if payload.provider_event_id:
                cur.execute("INSERT INTO webhook_events (provider_event_id) VALUES (%s)", [payload.provider_event_id])

            return OutcomeOut(**outcome_data)

    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

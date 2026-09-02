"""
Advibe Outreach Dispatch & Inbound Reply Service
------------------------------------------------
Handles human-approved email dispatch via Resend and inbound reply classification.
"""

import datetime
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logging import log_outreach_send, logger
from app.core.exceptions import ExternalServiceError
from app.models.schemas import MessageStatus, OutcomeType
from app.services.ai_service import AIService

try:
    import resend
    if settings.RESEND_API_KEY and settings.RESEND_API_KEY != "re_mock_key":
        resend.api_key = settings.RESEND_API_KEY
        _resend_available = True
    else:
        _resend_available = False
except Exception as e:
    logger.warning(f"Resend SDK initialization warning: {e}")
    _resend_available = False


class OutreachService:
    @classmethod
    def send_message(cls, message_record: Dict[str, Any], recipient_email: str) -> Dict[str, Any]:
        msg_id = str(message_record.get("id"))
        camp_id = str(message_record.get("campaign_id", ""))
        status = message_record.get("status")

        # Invariant: Never dispatch an unapproved message
        if status != MessageStatus.APPROVED and status != "approved":
            err_msg = f"Cannot send message {msg_id}: Message must be explicitly approved first (current status: {status})."
            logger.error(err_msg, extra={"props": {"message_id": msg_id, "campaign_id": camp_id}})
            log_outreach_send(msg_id, recipient_email, message_record.get("channel", "email"), "rejected", campaign_id=camp_id, error=err_msg)
            raise ValueError(err_msg)

        subject = message_record.get("subject", "Advibe Founder Introduction")
        body = message_record.get("body", "")

        send_params = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [recipient_email],
            "subject": subject,
            "text": body,
            "headers": {
                "X-Advibe-Message-ID": msg_id,
                "X-Advibe-Campaign-ID": camp_id
            }
        }

        if _resend_available:
            try:
                response = resend.Emails.send(send_params)
                resend_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", "sent")
                now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
                log_outreach_send(msg_id, recipient_email, "email", "sent", campaign_id=camp_id)
                return {
                    "status": "sent",
                    "sent_at": now_iso,
                    "provider_id": resend_id
                }
            except Exception as e:
                err_msg = f"Resend API send failed for {msg_id}: {str(e)}"
                logger.error(err_msg, extra={"props": {"message_id": msg_id, "campaign_id": camp_id}})
                log_outreach_send(msg_id, recipient_email, "email", "failed", campaign_id=camp_id, error=err_msg)
                return {
                    "status": "failed",
                    "error": err_msg
                }
        else:
            # Dev simulation mode
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            log_outreach_send(msg_id, recipient_email, "email", "simulated_sent", campaign_id=camp_id)
            return {
                "status": "sent",
                "sent_at": now_iso,
                "provider_id": f"sim_resend_{msg_id[:8]}"
            }

    @classmethod
    def handle_inbound_reply(
        cls,
        payload: Dict[str, Any],
        matched_message_id: Optional[str] = None
    ) -> Dict[str, Any]:
        from_email = payload.get("from_email") or payload.get("from", "investor@fund.com")
        reply_text = payload.get("text") or payload.get("body") or payload.get("snippet", "")
        subject = payload.get("subject", "")

        outcome_type = AIService.classify_reply(reply_text or subject)
        logger.info(
            f"Inbound reply classified as: {outcome_type.value}",
            extra={"props": {"outcome_type": outcome_type.value, "message_id": matched_message_id}}
        )

        return {
            "message_id": matched_message_id,
            "outcome_type": outcome_type.value,
            "reply_text": reply_text,
            "classified_by_llm": True,
            "from_email": from_email
        }

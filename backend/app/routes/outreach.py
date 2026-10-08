import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user, AuthenticatedUser
from app.models.schemas import (
    DraftRequest, DraftResponse, MessageDraft, SendBatchRequest, SendBatchResponse,
    SentMessageResult, MessageStatus, RaiseProfile, ErrorResponse
)
from app.services.ai_service import AIService
from app.services.outreach_service import OutreachService
from app.core.db import get_db_cursor
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/outreach", tags=["Outreach Engine"])

@router.post("/draft", response_model=DraftResponse, status_code=201)
async def create_drafts(payload: DraftRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    if not payload.person_ids:
        raise HTTPException(status_code=400, detail="person_ids list cannot be empty.")

    campaign_id = str(uuid.uuid4())
    campaign_name = payload.campaign_name or f"Campaign - {datetime.now(timezone.utc).strftime('%b %d, %Y')}"
    now_dt = datetime.now(timezone.utc)
    drafts = []

    try:
        with get_db_cursor(user_id=current_user.id, commit=True) as cur:
            # 1. Get Company
            cur.execute("SELECT * FROM companies WHERE id = %s", [payload.company_id])
            company_data = cur.fetchone()
            if not company_data:
                raise HTTPException(status_code=404, detail="Company not found")

            raise_profile = RaiseProfile(
                company_name=company_data.get("name"),
                name=company_data.get("name"),
                website_url=company_data.get("website_url"),
                stage=company_data.get("stage", "Seed"),
                sector=company_data.get("sector", "B2B SaaS"),
                geography=company_data.get("geography", "Global"),
                check_size_min=float(company_data.get("check_size_min", 500000) or 500000),
                check_size_max=float(company_data.get("check_size_max", 2000000) or 2000000),
                thesis_summary=company_data.get("thesis_summary", "")
            )

            # 2. Insert Campaign
            cur.execute('''
                INSERT INTO campaigns (id, company_id, name, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (campaign_id, payload.company_id, campaign_name, 'draft', now_dt, now_dt))

            # 3. Create Drafts
            for person_id in payload.person_ids:
                cur.execute('''
                    SELECT p.*, i.firm_name, i.id as inv_id
                    FROM people p
                    JOIN investors i ON p.investor_id = i.id
                    WHERE p.id = %s
                ''', [person_id])
                p_row = cur.fetchone()

                if p_row:
                    person_info = dict(p_row)
                    investor_info = {"id": p_row['inv_id'], "firm_name": p_row['firm_name']}
                    draft_content = AIService.draft_message(raise_profile, person_info, investor_info)
                    msg_id = str(uuid.uuid4())

                    channel_str = payload.channel.value if hasattr(payload.channel, "value") else str(payload.channel)

                    cur.execute('''
                        INSERT INTO messages (id, campaign_id, person_id, investor_id, channel, subject, body, status, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (msg_id, campaign_id, person_id, p_row['inv_id'], channel_str, draft_content["subject"], draft_content["body"], 'draft', now_dt))

                    from app.core.security import mask_email, get_unlocked_person_ids
                    unlocked_ids = get_unlocked_person_ids(current_user.id)
                    is_unlocked = str(person_id) in unlocked_ids
                    safe_email = p_row['email'] if is_unlocked else mask_email(p_row['email'])

                    drafts.append(MessageDraft(
                        id=msg_id, message_id=msg_id, campaign_id=campaign_id, person_id=person_id,
                        investor_id=p_row['inv_id'], recipient_name=p_row['full_name'], recipient_role=p_row['role_title'],
                        recipient_email=safe_email, firm_name=p_row['firm_name'], channel=payload.channel,
                        subject=draft_content["subject"], body=draft_content["body"], status=MessageStatus.DRAFT, created_at=now_dt
                    ))

        return DraftResponse(campaign_id=campaign_id, campaign_name=campaign_name, drafts_count=len(drafts), drafts=drafts)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error drafting: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send", response_model=SendBatchResponse)
async def send_batch(payload: SendBatchRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    if not payload.message_ids:
        raise HTTPException(status_code=400, detail="message_ids list cannot be empty.")

    sent_results = []
    sent_count = failed_count = 0

    try:
        with get_db_cursor(user_id=current_user.id, commit=True) as cur:
            for msg_id in payload.message_ids:
                cur.execute('''
                    SELECT m.*, p.email, p.full_name, i.firm_name 
                    FROM messages m
                    JOIN people p ON m.person_id = p.id
                    JOIN investors i ON m.investor_id = i.id
                    WHERE m.id = %s
                ''', [msg_id])
                msg = cur.fetchone()

                if not msg:
                    sent_results.append(SentMessageResult(message_id=msg_id, recipient_email="unknown", status="failed", error="Message not found."))
                    failed_count += 1
                    continue

                if msg['status'] != 'approved':
                    sent_results.append(SentMessageResult(message_id=msg_id, recipient_email=msg['email'], status="failed", error="Status not approved."))
                    failed_count += 1
                    continue

                # Idempotency check
                if msg.get('provider_message_id'):
                    sent_results.append(SentMessageResult(message_id=msg_id, recipient_email=msg['email'], status="sent", sent_at=msg['sent_at']))
                    continue

                try:
                    result = OutreachService.send_message(dict(msg), msg['email'])
                    if result.get("status") == "sent":
                        now_dt = datetime.now(timezone.utc)
                        provider_id = result.get("provider_id", str(uuid.uuid4()))
                        cur.execute('''
                            UPDATE messages 
                            SET status = 'sent', sent_at = %s, provider_message_id = %s 
                            WHERE id = %s
                        ''', (now_dt, provider_id, msg_id))

                        # Deduct sparks
                        cur.execute("UPDATE sparks_ledger SET balance = balance - 1 WHERE user_id = %s", [current_user.id])

                        sent_results.append(SentMessageResult(message_id=msg_id, recipient_email=msg['email'], status="sent", sent_at=now_dt))
                        sent_count += 1
                    else:
                        sent_results.append(SentMessageResult(message_id=msg_id, recipient_email=msg['email'], status="failed", error=result.get("error")))
                        failed_count += 1
                except Exception as e:
                    sent_results.append(SentMessageResult(message_id=msg_id, recipient_email=msg['email'], status="failed", error=str(e)))
                    failed_count += 1

        return SendBatchResponse(campaign_id=payload.campaign_id, sent_count=sent_count, failed_count=failed_count, results=sent_results)
    except Exception as e:
        logger.error(f"Error sending batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

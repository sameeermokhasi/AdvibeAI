from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user, AuthenticatedUser
from app.models.schemas import (
    CampaignStatusOut, CampaignStatus, MessageWithOutcome, OutcomeOut, OutcomeType,
    MessageStatus, MessageChannel, ErrorResponse
)
from app.core.db import get_db_cursor
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/campaigns", tags=["Campaigns & Analytics"])

@router.get("/{company_id}", response_model=List[CampaignStatusOut])
async def get_company_campaigns(company_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute("SELECT * FROM campaigns WHERE company_id = %s", [company_id])
            campaigns = cur.fetchall()

            results = []
            for camp in campaigns:
                cur.execute('''
                    SELECT m.*, p.full_name, p.email, i.firm_name 
                    FROM messages m 
                    JOIN people p ON m.person_id = p.id 
                    JOIN investors i ON m.investor_id = i.id 
                    WHERE m.campaign_id = %s
                ''', [camp['id']])
                messages = cur.fetchall()

                msg_list = []
                total_sent = interested_cnt = meetings_cnt = 0

                for m in messages:
                    cur.execute("SELECT * FROM outcomes WHERE message_id = %s ORDER BY created_at DESC LIMIT 1", [m['id']])
                    o = cur.fetchone()

                    latest_outcome = None
                    if o:
                        latest_outcome = OutcomeOut(
                            id=o["id"], message_id=o["message_id"], outcome_type=OutcomeType(o["outcome_type"]),
                            reply_text=o.get("reply_text"), classified_by_llm=o.get("classified_by_llm", True), created_at=o["created_at"]
                        )
                        if latest_outcome.outcome_type in [OutcomeType.INTERESTED, OutcomeType.REPLIED]:
                            interested_cnt += 1
                        elif latest_outcome.outcome_type == OutcomeType.MEETING_REQUESTED:
                            meetings_cnt += 1

                    if m.get("status") == "sent":
                        total_sent += 1

                    msg_list.append(MessageWithOutcome(
                        id=m["id"], recipient_name=m.get("full_name", "Partner"), recipient_email=m.get("email"),
                        firm_name=m.get("firm_name", "Fund"), channel=MessageChannel(m.get("channel", "email")),
                        subject=m.get("subject"), body=m.get("body", ""), status=MessageStatus(m.get("status", "draft")),
                        sent_at=m.get("sent_at"), outcome=latest_outcome
                    ))

                results.append(CampaignStatusOut(
                    id=camp["id"], company_id=camp["company_id"], name=camp["name"], status=CampaignStatus(camp.get("status", "active")),
                    total_messages=len(messages), sent_messages=total_sent, interested_count=interested_cnt,
                    meetings_requested_count=meetings_cnt, messages=msg_list, created_at=camp["created_at"], updated_at=camp["updated_at"]
                ))
            return results
    except Exception as e:
        logger.error(f"Error fetching campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pulse/overview")
async def get_pulse_overview():
    return {
        "weekly_rollup": {
            "found": 25, "contacted": 19, "replied": 3, "meetings_booked": 1,
            "reply_rate": "15.8%", "meeting_rate": "5.3%"
        },
        "activity_timeline": [
            {"time": "Mon 09:00", "tag": "SCHEDULED RUN", "text": "25 fresh seed VCs delivered.", "type": "system"},
            {"time": "Tue 14:10", "tag": "REPLY RECEIVED", "text": "Denis replied — interested.", "type": "interested", "badge": "🔥 INTERESTED"}
        ],
        "learning_biases": [
            {"target": "Corporate VCs", "weight": "+15%", "reason": "Positive reply"}
        ]
    }

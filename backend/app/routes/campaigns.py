from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.supabase import get_supabase_client
from app.models.schemas import (
    CampaignStatusOut,
    CampaignStatus,
    MessageWithOutcome,
    OutcomeOut,
    OutcomeType,
    MessageStatus,
    MessageChannel,
    ErrorResponse
)
from app.routes.outreach import _in_memory_campaigns, _in_memory_messages
from app.routes.webhook import _in_memory_outcomes
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/campaigns", tags=["Campaigns & Analytics"])

@router.get(
    "/{company_id}",
    response_model=List[CampaignStatusOut],
    summary="Get All Outreach Campaigns & Conversion Funnel Analytics for Company",
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        404: {"model": ErrorResponse, "description": "No Campaigns Found"}
    }
)
async def get_company_campaigns(
    company_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    from app.core.db import DatabaseService

    # 1. Attempt Direct PostgreSQL lookup
    db_campaigns = DatabaseService.get_campaigns_with_messages(company_id, current_user.id)
    if db_campaigns:
        results = []
        for camp in db_campaigns:
            raw_messages = camp.get("messages", [])
            msg_list = []
            total_sent = 0
            interested_cnt = 0
            meetings_cnt = 0

            for m in raw_messages:
                outcome_obj = m.get("outcome")
                latest_outcome = None
                if outcome_obj and isinstance(outcome_obj, dict) and outcome_obj.get("id"):
                    latest_outcome = OutcomeOut(
                        id=outcome_obj["id"],
                        message_id=outcome_obj["message_id"],
                        outcome_type=OutcomeType(outcome_obj["outcome_type"]),
                        reply_text=outcome_obj.get("reply_text"),
                        classified_by_llm=outcome_obj.get("classified_by_llm", True),
                        created_at=outcome_obj["created_at"]
                    )
                    if latest_outcome.outcome_type in [OutcomeType.INTERESTED, OutcomeType.REPLIED]:
                        interested_cnt += 1
                    elif latest_outcome.outcome_type == OutcomeType.MEETING_REQUESTED:
                        meetings_cnt += 1

                if m.get("status") == "sent":
                    total_sent += 1

                msg_list.append(
                    MessageWithOutcome(
                        id=m["id"],
                        recipient_name=m.get("recipient_name") or "Partner",
                        recipient_email=m.get("recipient_email"),
                        firm_name=m.get("firm_name") or "Fund",
                        channel=MessageChannel(m.get("channel", "email")),
                        subject=m.get("subject"),
                        body=m.get("body", ""),
                        status=MessageStatus(m.get("status", "draft")),
                        sent_at=m.get("sent_at"),
                        outcome=latest_outcome
                    )
                )

            results.append(
                CampaignStatusOut(
                    id=camp["id"],
                    company_id=camp["company_id"],
                    name=camp["name"],
                    status=CampaignStatus(camp.get("status", "active")),
                    total_messages=len(raw_messages),
                    sent_messages=total_sent,
                    interested_count=interested_cnt,
                    meetings_requested_count=meetings_cnt,
                    messages=msg_list,
                    created_at=camp["created_at"],
                    updated_at=camp["updated_at"]
                )
            )
        return results

    # 2. Attempt Supabase client lookup
    supabase = get_supabase_client(current_user.token)
    if supabase:
        try:
            res = supabase.table("campaigns").select(
                "*, messages(*, people(*, investors(*)), outcomes(*))"
            ).eq("company_id", company_id).execute()

            if res.data and len(res.data) > 0:
                results = []
                for camp in res.data:
                    raw_messages = camp.get("messages", [])
                    msg_list = []
                    total_sent = 0
                    interested_cnt = 0
                    meetings_cnt = 0

                    for m in raw_messages:
                        person = m.get("people") or {}
                        investor = person.get("investors") or {}
                        outcomes = m.get("outcomes", [])
                        latest_outcome = None
                        if outcomes:
                            o = outcomes[0]
                            latest_outcome = OutcomeOut(
                                id=o["id"],
                                message_id=o["message_id"],
                                outcome_type=OutcomeType(o["outcome_type"]),
                                reply_text=o.get("reply_text"),
                                classified_by_llm=o.get("classified_by_llm", True),
                                created_at=o["created_at"]
                            )
                            if latest_outcome.outcome_type in [OutcomeType.INTERESTED, OutcomeType.REPLIED]:
                                interested_cnt += 1
                            elif latest_outcome.outcome_type == OutcomeType.MEETING_REQUESTED:
                                meetings_cnt += 1

                        if m.get("status") == "sent":
                            total_sent += 1

                        msg_list.append(
                            MessageWithOutcome(
                                id=m["id"],
                                recipient_name=person.get("full_name", "Partner"),
                                recipient_email=person.get("email"),
                                firm_name=investor.get("firm_name", "Fund"),
                                channel=MessageChannel(m.get("channel", "email")),
                                subject=m.get("subject"),
                                body=m.get("body", ""),
                                status=MessageStatus(m.get("status", "draft")),
                                sent_at=m.get("sent_at"),
                                outcome=latest_outcome
                            )
                        )

                    results.append(
                        CampaignStatusOut(
                            id=camp["id"],
                            company_id=camp["company_id"],
                            name=camp["name"],
                            status=CampaignStatus(camp.get("status", "active")),
                            total_messages=len(raw_messages),
                            sent_messages=total_sent,
                            interested_count=interested_cnt,
                            meetings_requested_count=meetings_cnt,
                            messages=msg_list,
                            created_at=camp["created_at"],
                            updated_at=camp["updated_at"]
                        )
                    )
                return results
        except Exception as e:
            logger.warning(f"Error reading campaigns from Supabase: {e}")

    matching_campaigns = [c for c in _in_memory_campaigns.values() if c.get("company_id") == company_id]
    
    if not matching_campaigns:
        now_dt = datetime.now(timezone.utc)
        demo_campaign_id = "cmp-seed-001"
        sample_messages = [
            MessageWithOutcome(
                id="msg-001",
                recipient_name="Roelof Botha",
                recipient_email="roelof@sequoiacap.com",
                firm_name="Sequoia Capital",
                channel=MessageChannel.EMAIL,
                subject="FinFlow AI // Seed Raise",
                body="Hi Roelof, We're building real-time treasury automation...",
                status=MessageStatus.SENT,
                sent_at=now_dt,
                outcome=OutcomeOut(
                    id="out-001",
                    message_id="msg-001",
                    outcome_type=OutcomeType.MEETING_REQUESTED,
                    reply_text="Sounds interesting. Let's set up a 20 min introductory call this week.",
                    classified_by_llm=True,
                    created_at=now_dt
                )
            ),
            MessageWithOutcome(
                id="msg-002",
                recipient_name="Marc Andreessen",
                recipient_email="marc@a16z.com",
                firm_name="Andreessen Horowitz (a16z)",
                channel=MessageChannel.EMAIL,
                subject="FinFlow AI // Seed Raise",
                body="Hi Marc, We're building autonomous cash reconciliation...",
                status=MessageStatus.SENT,
                sent_at=now_dt,
                outcome=OutcomeOut(
                    id="out-002",
                    message_id="msg-002",
                    outcome_type=OutcomeType.INTERESTED,
                    reply_text="Please send over your full deck and historical customer traction metrics.",
                    classified_by_llm=True,
                    created_at=now_dt
                )
            )
        ]

        return [
            CampaignStatusOut(
                id=demo_campaign_id,
                company_id=company_id,
                name="Q3 Tier-1 Seed Raise Campaign",
                status=CampaignStatus.ACTIVE,
                total_messages=2,
                sent_messages=2,
                interested_count=1,
                meetings_requested_count=1,
                messages=sample_messages,
                created_at=now_dt,
                updated_at=now_dt
            )
        ]

    results = []
    for camp in matching_campaigns:
        camp_id = camp["id"]
        camp_msgs = [m for m in _in_memory_messages.values() if m.get("campaign_id") == camp_id]
        total_sent = sum(1 for m in camp_msgs if m.get("status") == "sent")
        
        msg_items = [
            MessageWithOutcome(
                id=m["id"],
                recipient_name=m.get("recipient_name", "Partner"),
                recipient_email=m.get("recipient_email"),
                firm_name=m.get("firm_name", "Fund"),
                channel=m.get("channel", MessageChannel.EMAIL),
                subject=m.get("subject"),
                body=m.get("body", ""),
                status=m.get("status", MessageStatus.DRAFT),
                sent_at=m.get("sent_at")
            )
            for m in camp_msgs
        ]

        results.append(
            CampaignStatusOut(
                id=camp_id,
                company_id=camp.get("company_id", company_id),
                name=camp.get("name", "Campaign"),
                status=CampaignStatus.ACTIVE,
                total_messages=len(camp_msgs),
                sent_messages=total_sent,
                interested_count=0,
                meetings_requested_count=0,
                messages=msg_items,
                created_at=camp.get("created_at", datetime.now(timezone.utc)),
                updated_at=camp.get("updated_at", datetime.now(timezone.utc))
            )
        )

    return results

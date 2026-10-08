"""Fundraising Command Center — Pipeline aggregation and commitment tracking from real DB tables"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional

from app.core.auth import get_current_user, AuthenticatedUser
from app.core.db import get_db_cursor
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/command-center", tags=["Command Center"])


class CommitmentCreate(BaseModel):
    investor_name: str = Field(..., max_length=200)
    amount: float = Field(..., gt=0)
    status: str = Field("soft_circle", pattern="^(verbal|soft_circle|term_sheet|committed|closed)$")
    notes: Optional[str] = Field(None, max_length=1000)


@router.get("")
async def get_command_center(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Aggregate fundraising pipeline metrics from real commitments, campaigns, and messages."""
    result = {
        "raise_target": 2000000.0,
        "total_committed": 0.0,
        "soft_circles": 0.0,
        "pipeline": {"contacted": 0, "replied": 0, "meetings": 0, "committed": 0},
        "response_rate": "0%",
        "meeting_rate": "0%",
        "commitments": [],
        "recent_activity": []
    }

    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            # 1. Company raise target
            cur.execute(
                """SELECT id, name, check_size_min, check_size_max
                   FROM public.companies WHERE user_id = %s ORDER BY created_at DESC LIMIT 1;""",
                (current_user.id,)
            )
            company = cur.fetchone()
            company_id = str(company["id"]) if company else None
            if company:
                cmin = float(company.get("check_size_min") or 0)
                cmax = float(company.get("check_size_max") or 0)
                if cmax > 0:
                    result["raise_target"] = cmax
                elif cmin > 0:
                    result["raise_target"] = cmin

            # 2. Real commitments from public.commitments table
            cur.execute(
                """SELECT id, investor_name, amount, status, notes, created_at
                   FROM public.commitments
                   WHERE user_id = %s
                   ORDER BY created_at DESC;""",
                (current_user.id,)
            )
            commit_rows = cur.fetchall()
            commitments_list = []
            total_committed = 0.0
            soft_circles = 0.0

            for c in commit_rows:
                amt = float(c["amount"])
                st = c["status"]
                if st in ["committed", "closed"]:
                    total_committed += amt
                elif st in ["soft_circle", "term_sheet", "verbal"]:
                    soft_circles += amt

                commitments_list.append({
                    "id": str(c["id"]),
                    "investor_name": c["investor_name"],
                    "amount": amt,
                    "status": st,
                    "notes": c.get("notes"),
                    "created_at": c["created_at"].isoformat() if c.get("created_at") else ""
                })

            result["total_committed"] = total_committed
            result["soft_circles"] = soft_circles
            result["commitments"] = commitments_list

            # 3. Pipeline stats from real messages
            if company_id:
                cur.execute(
                    """SELECT
                        COUNT(DISTINCT m.person_id) as contacted,
                        COUNT(DISTINCT CASE WHEN o.outcome_type IN ('replied','interested','meeting_requested') THEN m.person_id END) as replied,
                        COUNT(DISTINCT CASE WHEN o.outcome_type = 'meeting_requested' THEN m.person_id END) as meetings
                       FROM public.campaigns c
                       JOIN public.messages m ON c.id = m.campaign_id
                       LEFT JOIN public.outcomes o ON m.id = o.message_id
                       WHERE c.company_id = %s;""",
                    (company_id,)
                )
                stats = cur.fetchone()
                if stats:
                    contacted = int(stats.get("contacted") or 0)
                    replied = int(stats.get("replied") or 0)
                    meetings = int(stats.get("meetings") or 0)
                    result["pipeline"] = {
                        "contacted": contacted,
                        "replied": replied,
                        "meetings": meetings,
                        "committed": len([c for c in commitments_list if c["status"] in ["committed", "closed"]])
                    }
                    result["response_rate"] = f"{(replied/contacted*100):.1f}%" if contacted > 0 else "0%"
                    result["meeting_rate"] = f"{(meetings/contacted*100):.1f}%" if contacted > 0 else "0%"

                # 4. Recent activity timeline
                cur.execute(
                    """SELECT m.subject, m.status, m.sent_at, m.created_at as msg_created,
                              p.full_name, i.firm_name,
                              o.outcome_type, o.created_at as reply_at
                       FROM public.campaigns c
                       JOIN public.messages m ON c.id = m.campaign_id
                       JOIN public.people p ON m.person_id = p.id
                       LEFT JOIN public.investors i ON p.investor_id = i.id
                       LEFT JOIN public.outcomes o ON m.id = o.message_id
                       WHERE c.company_id = %s
                       ORDER BY COALESCE(o.created_at, m.sent_at, m.created_at) DESC
                       LIMIT 20;""",
                    (company_id,)
                )
                activities = cur.fetchall()
                result["recent_activity"] = [
                    {
                        "partner_name": a.get("full_name", ""),
                        "firm_name": a.get("firm_name", ""),
                        "event": a.get("outcome_type") or a.get("status", "draft"),
                        "subject": a.get("subject", ""),
                        "timestamp": (a.get("reply_at") or a.get("sent_at") or a.get("msg_created") or "").isoformat()
                            if hasattr(a.get("reply_at") or a.get("sent_at") or a.get("msg_created") or "", "isoformat") else "",
                        "source": "provider" if a.get("outcome_type") else "self_reported"
                    } for a in activities
                ]

    except Exception as e:
        logger.error(f"Command center error: {e}")

    return result


@router.post("/commitment", status_code=status.HTTP_201_CREATED)
async def record_commitment(
    req: CommitmentCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Record a commitment or soft circle into the commitments table."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=True) as cur:
            item_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO public.commitments
                   (id, user_id, investor_name, amount, status, notes, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                   RETURNING id;""",
                (item_id, current_user.id, req.investor_name, req.amount, req.status, req.notes)
            )
            return {"id": item_id, "status": "recorded"}
    except Exception as e:
        logger.error(f"Record commitment error: {e}")
        raise HTTPException(500, "Failed to record commitment")

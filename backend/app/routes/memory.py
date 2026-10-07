"""Memory & Learnings Routes — Fundraising context persistence"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.auth import get_current_user, AuthenticatedUser
from app.core.db import get_db_cursor
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/memory", tags=["Memory"])


class MemoryItemCreate(BaseModel):
    segment_tag: str = Field(..., max_length=200)
    reply_signal: str = Field("preference", max_length=100)
    bias_weight: float = Field(1.0, ge=0.0, le=5.0)
    notes: Optional[str] = Field(None, max_length=1000)
    learning_type: str = Field("preference", max_length=50)
    key: Optional[str] = Field(None, max_length=200)
    value: Optional[str] = Field(None, max_length=1000)
    company_id: Optional[str] = None


class MemoryItemOut(BaseModel):
    id: str
    segment_tag: str
    reply_signal: str
    bias_weight: float
    notes: Optional[str]
    learning_type: Optional[str]
    key: Optional[str]
    value: Optional[str]
    learned_at: str


@router.get("", response_model=List[MemoryItemOut])
async def get_memory(current_user: AuthenticatedUser = Depends(get_current_user)):
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT id, segment_tag, reply_signal, bias_weight, notes,
                          learning_type, key, value, learned_at
                   FROM public.addy_learnings
                   WHERE user_id = %s
                   ORDER BY learned_at DESC;""",
                (current_user.id,)
            )
            rows = cur.fetchall()
            return [
                MemoryItemOut(
                    id=str(r["id"]),
                    segment_tag=r["segment_tag"],
                    reply_signal=r["reply_signal"],
                    bias_weight=float(r["bias_weight"]),
                    notes=r.get("notes"),
                    learning_type=r.get("learning_type"),
                    key=r.get("key"),
                    value=r.get("value"),
                    learned_at=r["learned_at"].isoformat() if r.get("learned_at") else ""
                ) for r in rows
            ]
    except ConnectionError:
        return []
    except Exception as e:
        logger.error(f"Get memory error: {e}")
        return []


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_memory(
    item: MemoryItemCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    try:
        with get_db_cursor(user_id=current_user.id) as cur:
            cur.execute(
                """INSERT INTO public.addy_learnings
                   (id, user_id, company_id, segment_tag, reply_signal, bias_weight,
                    notes, learning_type, key, value, learned_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   RETURNING id;""",
                (item_id, current_user.id, item.company_id, item.segment_tag,
                 item.reply_signal, item.bias_weight, item.notes,
                 item.learning_type, item.key, item.value, now)
            )
            return {"id": item_id, "status": "created"}
    except Exception as e:
        logger.error(f"Add memory error: {e}")
        raise HTTPException(500, "Failed to save memory item")


@router.delete("/{item_id}")
async def delete_memory(
    item_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    try:
        with get_db_cursor(user_id=current_user.id) as cur:
            cur.execute(
                "DELETE FROM public.addy_learnings WHERE id = %s AND user_id = %s RETURNING id;",
                (item_id, current_user.id)
            )
            if not cur.fetchone():
                raise HTTPException(404, "Memory item not found")
            return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete memory error: {e}")
        raise HTTPException(500, "Failed to delete memory item")

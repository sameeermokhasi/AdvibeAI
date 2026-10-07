"""Exclusion Lists Routes — Firms, people, and domains to skip"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.auth import get_current_user, AuthenticatedUser
from app.core.db import get_db_cursor
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/exclusions", tags=["Exclusions"])


class ExclusionCreate(BaseModel):
    entity_type: str = Field(..., pattern="^(firm|person|domain)$")
    entity_value: str = Field(..., min_length=1, max_length=500)
    reason: Optional[str] = Field(None, max_length=500)


@router.get("")
async def get_exclusions(current_user: AuthenticatedUser = Depends(get_current_user)):
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT id, entity_type, entity_value, reason, created_at
                   FROM public.exclusion_lists
                   WHERE user_id = %s
                   ORDER BY created_at DESC;""",
                (current_user.id,)
            )
            rows = cur.fetchall()
            return [
                {
                    "id": str(r["id"]),
                    "entity_type": r["entity_type"],
                    "entity_value": r["entity_value"],
                    "reason": r.get("reason"),
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else ""
                } for r in rows
            ]
    except ConnectionError:
        return []
    except Exception as e:
        logger.error(f"Get exclusions error: {e}")
        return []


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_exclusion(
    req: ExclusionCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    item_id = str(uuid.uuid4())
    try:
        with get_db_cursor(user_id=current_user.id) as cur:
            cur.execute(
                """INSERT INTO public.exclusion_lists (id, user_id, entity_type, entity_value, reason, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;""",
                (item_id, current_user.id, req.entity_type,
                 req.entity_value, req.reason, datetime.now(timezone.utc))
            )
            return {"id": item_id, "status": "added"}
    except Exception as e:
        logger.error(f"Add exclusion error: {e}")
        raise HTTPException(500, "Failed to add exclusion")


@router.delete("/{item_id}")
async def remove_exclusion(
    item_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    try:
        with get_db_cursor(user_id=current_user.id) as cur:
            cur.execute(
                "DELETE FROM public.exclusion_lists WHERE id = %s AND user_id = %s RETURNING id;",
                (item_id, current_user.id)
            )
            if not cur.fetchone():
                raise HTTPException(404, "Exclusion not found")
            return {"status": "removed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Remove exclusion error: {e}")
        raise HTTPException(500, "Failed to remove exclusion")

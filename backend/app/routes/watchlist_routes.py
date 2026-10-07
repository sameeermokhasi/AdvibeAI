"""Watchlist Routes — Saved leads and firms"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.auth import get_current_user, AuthenticatedUser
from app.core.db import get_db_cursor
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/watchlist", tags=["Watchlist"])


class WatchlistAddRequest(BaseModel):
    item_type: str = Field(..., pattern="^(investor|person)$")
    investor_id: Optional[str] = None
    person_id: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)


@router.get("")
async def get_watchlist(current_user: AuthenticatedUser = Depends(get_current_user)):
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT w.id, w.item_type, w.notes, w.created_at,
                          i.firm_name, i.fund_type, i.aum,
                          p.full_name as partner_name, p.role_title, p.email as partner_email,
                          p.linkedin_url
                   FROM public.watchlist w
                   LEFT JOIN public.investors i ON w.investor_id = i.id
                   LEFT JOIN public.people p ON w.person_id = p.id
                   WHERE w.user_id = %s
                   ORDER BY w.created_at DESC;""",
                (current_user.id,)
            )
            rows = cur.fetchall()
            return [
                {
                    "id": str(r["id"]),
                    "item_type": r["item_type"],
                    "firm_name": r.get("firm_name"),
                    "fund_type": r.get("fund_type"),
                    "aum": float(r["aum"]) if r.get("aum") else None,
                    "partner_name": r.get("partner_name"),
                    "role_title": r.get("role_title"),
                    "partner_email": r.get("partner_email"),
                    "linkedin_url": r.get("linkedin_url"),
                    "notes": r.get("notes"),
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else ""
                } for r in rows
            ]
    except ConnectionError:
        return []
    except Exception as e:
        logger.error(f"Get watchlist error: {e}")
        return []


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    req: WatchlistAddRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    item_id = str(uuid.uuid4())
    try:
        with get_db_cursor(user_id=current_user.id) as cur:
            cur.execute(
                """INSERT INTO public.watchlist (id, user_id, item_type, investor_id, person_id, notes, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id;""",
                (item_id, current_user.id, req.item_type,
                 req.investor_id, req.person_id, req.notes, datetime.now(timezone.utc))
            )
            return {"id": item_id, "status": "added"}
    except Exception as e:
        logger.error(f"Add watchlist error: {e}")
        raise HTTPException(500, "Failed to add to watchlist")


@router.delete("/{item_id}")
async def remove_from_watchlist(
    item_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    try:
        with get_db_cursor(user_id=current_user.id) as cur:
            cur.execute(
                "DELETE FROM public.watchlist WHERE id = %s AND user_id = %s RETURNING id;",
                (item_id, current_user.id)
            )
            if not cur.fetchone():
                raise HTTPException(404, "Watchlist item not found")
            return {"status": "removed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Remove watchlist error: {e}")
        raise HTTPException(500, "Failed to remove from watchlist")

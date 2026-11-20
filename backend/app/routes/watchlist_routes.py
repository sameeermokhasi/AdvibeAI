"""Watchlist Routes — Saved leads (people only, firms removed)"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.auth import get_current_user, AuthenticatedUser
from app.core.db import get_db_cursor
from app.core.logging import logger
from app.core.security import mask_email, get_unlocked_person_ids

router = APIRouter(prefix="/api/v1/watchlist", tags=["Watchlist"])


class WatchlistAddRequest(BaseModel):
    item_type: str = Field("person", pattern="^person$")
    person_id: str = Field(..., description="UUID of the person to save")
    notes: Optional[str] = Field(None, max_length=500)


@router.get("")
async def get_watchlist(current_user: AuthenticatedUser = Depends(get_current_user)):
    unlocked_ids = get_unlocked_person_ids(current_user.id)
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT w.id, w.item_type, w.notes, w.created_at,
                          w.person_id,
                          p.full_name as partner_name, p.role_title, p.email as partner_email,
                          p.linkedin_url,
                          i.id as investor_id, i.firm_name, i.fund_type, i.aum,
                          i.stage_focus, i.sector_focus, i.geography_focus
                   FROM public.watchlist w
                   JOIN public.people p ON w.person_id = p.id
                   LEFT JOIN public.investors i ON p.investor_id = i.id
                   WHERE w.user_id = %s
                   ORDER BY w.created_at DESC;""",
                (current_user.id,)
            )
            rows = cur.fetchall()
            results = []
            for r in rows:
                pid = str(r["person_id"])
                is_unlocked = pid in unlocked_ids
                raw_email = r.get("partner_email")
                display_email = raw_email if is_unlocked else mask_email(raw_email)
                results.append({
                    "id": str(r["id"]),
                    "item_type": "person",
                    "person_id": pid,
                    "investor_id": str(r.get("investor_id")) if r.get("investor_id") else None,
                    "partner_name": r.get("partner_name"),
                    "role_title": r.get("role_title"),
                    "firm_name": r.get("firm_name"),
                    "fund_type": r.get("fund_type"),
                    "aum": float(r["aum"]) if r.get("aum") else None,
                    "stage_focus": r.get("stage_focus") or [],
                    "sector_focus": r.get("sector_focus") or [],
                    "geography_focus": r.get("geography_focus") or [],
                    "partner_email": display_email,
                    "linkedin_url": r.get("linkedin_url"),
                    "is_unlocked": is_unlocked,
                    "notes": r.get("notes"),
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else ""
                })
            return results
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
                """INSERT INTO public.watchlist (id, user_id, item_type, person_id, notes, created_at)
                   VALUES (%s, %s, 'person', %s, %s, %s)
                   ON CONFLICT DO NOTHING
                   RETURNING id;""",
                (item_id, current_user.id, req.person_id, req.notes, datetime.now(timezone.utc))
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
                "DELETE FROM public.watchlist WHERE (id = %s OR person_id = %s) AND user_id = %s RETURNING id;",
                (item_id, item_id, current_user.id)
            )
            if not cur.fetchone():
                raise HTTPException(404, "Watchlist item not found")
            return {"status": "removed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Remove watchlist error: {e}")
        raise HTTPException(500, "Failed to remove from watchlist")


leads_router = APIRouter(prefix="/api/v1/leads", tags=["Leads"])

@leads_router.get("")
async def get_all_leads(
    filter: str = "all",
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    selected_filter = filter.lower() if filter.lower() in {"all", "saved", "unlocked"} else "all"
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """
                WITH user_saved AS (
                    SELECT person_id, MAX(notes) as notes, MAX(created_at) as saved_at
                    FROM public.watchlist
                    WHERE user_id = %s::uuid
                    GROUP BY person_id
                ),
                user_unlocked AS (
                    SELECT person_id, MAX(revealed_email) as revealed_email, MAX(unlocked_at) as unlocked_at
                    FROM public.investor_unlocks
                    WHERE user_id = %s::uuid
                    GROUP BY person_id
                )
                SELECT 
                    p.id as person_id,
                    p.full_name as investor_name,
                    p.role_title,
                    p.email as raw_email,
                    p.linkedin_url,
                    i.id as firm_id,
                    i.firm_name,
                    i.fund_type,
                    i.aum,
                    COALESCE(array_to_string(i.geography_focus, ', '), 'Global') as location,
                    i.stage_focus,
                    i.sector_focus,
                    (s.person_id IS NOT NULL) as is_saved,
                    (u.person_id IS NOT NULL) as is_unlocked,
                    u.revealed_email,
                    s.notes,
                    COALESCE(u.unlocked_at, s.saved_at) as activity_at
                FROM public.people p
                LEFT JOIN public.investors i ON p.investor_id = i.id
                LEFT JOIN user_saved s ON p.id = s.person_id
                LEFT JOIN user_unlocked u ON p.id = u.person_id
                WHERE (
                    CASE 
                        WHEN %s = 'saved' THEN s.person_id IS NOT NULL
                        WHEN %s = 'unlocked' THEN u.person_id IS NOT NULL
                        ELSE (s.person_id IS NOT NULL OR u.person_id IS NOT NULL)
                    END
                )
                ORDER BY COALESCE(u.unlocked_at, s.saved_at) DESC;
                """,
                (current_user.id, current_user.id, selected_filter, selected_filter)
            )
            rows = cur.fetchall()
            results = []
            for r in rows:
                pid = str(r["person_id"])
                is_unlocked = bool(r.get("is_unlocked"))
                is_saved = bool(r.get("is_saved"))
                raw_email = r.get("raw_email")
                revealed_email = r.get("revealed_email")
                display_email = revealed_email or raw_email if is_unlocked else mask_email(raw_email)

                results.append({
                    "id": pid,
                    "person_id": pid,
                    "investor_name": r.get("investor_name") or "Verified Partner",
                    "partner_name": r.get("investor_name") or "Verified Partner",
                    "role_title": r.get("role_title") or "Partner",
                    "firm_name": r.get("firm_name") or "Investment Firm",
                    "fund_type": r.get("fund_type") or "Venture Capital",
                    "aum": float(r["aum"]) if r.get("aum") else None,
                    "location": r.get("location") or "Global",
                    "stage_focus": r.get("stage_focus") or [],
                    "sector_focus": r.get("sector_focus") or [],
                    "linkedin_url": r.get("linkedin_url"),
                    "is_saved": is_saved,
                    "is_unlocked": is_unlocked,
                    "revealed_email": revealed_email if is_unlocked else None,
                    "partner_email": display_email,
                    "notes": r.get("notes"),
                    "activity_at": r["activity_at"].isoformat() if r.get("activity_at") else ""
                })
            return results
    except Exception as e:
        logger.error(f"Get all leads error: {e}")
        return []

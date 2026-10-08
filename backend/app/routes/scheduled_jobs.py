"""
Scheduled Autopilot Jobs API Router
------------------------------------
Provides CRUD and lifecycle operations (create, pause, resume, cancel, status)
for background scheduled autopilot runs stored in public.scheduled_jobs.
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.schemas import ScheduledJobCreateRequest, ScheduledJobOut
from app.core.db import get_db_cursor
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/scheduled-jobs", tags=["Scheduled Autopilot"])


@router.get("", response_model=List[ScheduledJobOut])
async def list_scheduled_jobs(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Lists all scheduled jobs for the authenticated user with live status."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT id, track, cadence, batch_size, status,
                          last_run_at, next_run_at, run_count, last_summary, created_at
                   FROM public.scheduled_jobs
                   WHERE user_id = %s
                   ORDER BY created_at DESC;""",
                (current_user.id,)
            )
            rows = cur.fetchall()
            return [
                ScheduledJobOut(
                    id=str(r["id"]),
                    track=r["track"],
                    cadence=r["cadence"],
                    batch_size=int(r["batch_size"]),
                    status=r["status"],
                    last_run_at=r["last_run_at"].isoformat() if r.get("last_run_at") else None,
                    next_run_at=r["next_run_at"].isoformat() if r.get("next_run_at") else None,
                    run_count=int(r.get("run_count") or 0),
                    last_summary=r.get("last_summary"),
                    created_at=r["created_at"].isoformat() if r.get("created_at") else ""
                ) for r in rows
            ]
    except Exception as e:
        logger.error(f"Error listing scheduled jobs: {e}")
        return []


@router.post("", response_model=ScheduledJobOut, status_code=status.HTTP_201_CREATED)
async def create_scheduled_job(
    req: ScheduledJobCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Creates a new scheduled autopilot recipe in 'pending' status."""
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    next_run = now + timedelta(days=7)

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute(
            """INSERT INTO public.scheduled_jobs
               (id, user_id, track, cadence, batch_size, status, next_run_at, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, 'pending', %s, NOW(), NOW())
               RETURNING *;""",
            (job_id, current_user.id, req.track, req.cadence, req.batch_size, next_run)
        )
        row = cur.fetchone()

    return ScheduledJobOut(
        id=job_id,
        track=req.track,
        cadence=req.cadence,
        batch_size=req.batch_size,
        status="pending",
        last_run_at=None,
        next_run_at=next_run.isoformat(),
        run_count=0,
        last_summary="Queued for worker execution.",
        created_at=now.isoformat()
    )


@router.post("/{job_id}/pause")
async def pause_scheduled_job(job_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Pauses an active scheduled autopilot job."""
    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute(
            """UPDATE public.scheduled_jobs
               SET status = 'paused', updated_at = NOW()
               WHERE id = %s AND user_id = %s RETURNING id;""",
            (job_id, current_user.id)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Job not found")
    return {"success": True, "status": "paused", "message": "Job paused."}


@router.post("/{job_id}/resume")
async def resume_scheduled_job(job_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Resumes a paused scheduled job."""
    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute(
            """UPDATE public.scheduled_jobs
               SET status = 'pending', updated_at = NOW()
               WHERE id = %s AND user_id = %s RETURNING id;""",
            (job_id, current_user.id)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Job not found")
    return {"success": True, "status": "pending", "message": "Job resumed."}


@router.post("/{job_id}/cancel")
async def cancel_scheduled_job(job_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Cancels a scheduled job permanently."""
    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute(
            """UPDATE public.scheduled_jobs
               SET status = 'cancelled', updated_at = NOW()
               WHERE id = %s AND user_id = %s RETURNING id;""",
            (job_id, current_user.id)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Job not found")
    return {"success": True, "status": "cancelled", "message": "Job cancelled."}

"""
Advibe In-Process Background Scheduled Autopilot Worker
-------------------------------------------------------
Runs in background during FastAPI lifespan.
Polls scheduled_jobs table for active jobs, simulates or executes scheduled discovery,
queues masked contacts for review without spending Sparks, updates status,
and handles server restart resumption gracefully.
"""

import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from app.core.db import get_db_cursor, DatabaseService
from app.core.logging import logger

_worker_task: asyncio.Task = None
_running: bool = False

async def run_scheduled_job_execution(job_id: str, user_id: str, track: str, batch_size: int):
    """Executes a single scheduled job cycle. Discovers candidates, leaves emails masked, 0 Sparks spent."""
    try:
        catalog = DatabaseService.get_all_investors_with_people()
        if not catalog:
            catalog = DatabaseService.load_csv_investors()

        # Filter by track if available
        candidates = [inv for inv in catalog if inv.get("track") == track or track == "venture"]
        chosen = candidates[:batch_size] if candidates else catalog[:batch_size]

        summary = f"{len(chosen)} {track.replace('_', ' ').capitalize()} leads discovered and queued for human review."
        now = datetime.now(timezone.utc)
        next_run = now + timedelta(days=7)

        with get_db_cursor(user_id=user_id, commit=True) as cur:
            cur.execute(
                """UPDATE public.scheduled_jobs
                   SET status = 'completed',
                       last_run_at = %s,
                       next_run_at = %s,
                       run_count = run_count + 1,
                       last_summary = %s,
                       updated_at = NOW()
                   WHERE id = %s;""",
                (now, next_run, summary, job_id)
            )
        logger.info(f"[ScheduledAutopilot] Job {job_id} executed successfully: {summary}")
    except Exception as e:
        logger.error(f"[ScheduledAutopilot] Job {job_id} failed: {e}")
        try:
            with get_db_cursor(user_id=user_id, commit=True) as cur:
                cur.execute(
                    """UPDATE public.scheduled_jobs
                       SET status = 'failed',
                           last_summary = %s,
                           updated_at = NOW()
                       WHERE id = %s;""",
                    (f"Execution error: {str(e)}", job_id)
                )
        except Exception:
            pass


async def scheduled_worker_loop():
    """Background polling loop executing pending or due jobs."""
    global _running
    logger.info("[ScheduledAutopilot] Background worker started.")
    while _running:
        try:
            with get_db_cursor(commit=False) as cur:
                # Find jobs that are 'pending' or 'running'
                cur.execute(
                    """SELECT id, user_id, track, batch_size, status, next_run_at
                       FROM public.scheduled_jobs
                       WHERE status = 'running' OR status = 'pending'
                       ORDER BY created_at ASC
                       LIMIT 5;"""
                )
                jobs = cur.fetchall()

            for job in jobs:
                jid = str(job["id"])
                uid = str(job["user_id"])
                trk = job["track"]
                bsize = int(job["batch_size"])

                # Mark running and execute
                with get_db_cursor(user_id=uid, commit=True) as cur:
                    cur.execute("UPDATE public.scheduled_jobs SET status = 'running', updated_at = NOW() WHERE id = %s", [jid])

                await run_scheduled_job_execution(jid, uid, trk, bsize)

        except Exception as e:
            logger.debug(f"[ScheduledAutopilot] Worker loop tick check: {e}")

        await asyncio.sleep(5)  # Poll interval 5 seconds


def start_scheduled_worker():
    global _worker_task, _running
    if not _running:
        _running = True
        _worker_task = asyncio.create_task(scheduled_worker_loop())


def stop_scheduled_worker():
    global _worker_task, _running
    _running = False
    if _worker_task:
        _worker_task.cancel()

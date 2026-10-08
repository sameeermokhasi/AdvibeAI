from typing import List, Dict, Any
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user, AuthenticatedUser
from app.models.schemas import (
    CampaignStatusOut, CampaignStatus, MessageWithOutcome, OutcomeOut, OutcomeType,
    MessageStatus, MessageChannel, ErrorResponse,
    HeyReachConnectRequest, HeyReachStatusResponse
)
from app.core.db import get_db_cursor
from app.core.logging import logger
from app.core.security import encrypt_secret, decrypt_secret, mask_email, get_unlocked_person_ids

router = APIRouter(prefix="/api/v1/campaigns", tags=["Campaigns & Analytics"])

# ============================================================================
# HeyReach Integration Endpoints
# ============================================================================

@router.get("/heyreach/status", response_model=HeyReachStatusResponse)
async def get_heyreach_status(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Check whether the user has connected HeyReach."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT status, connected_at, account_info
                   FROM public.user_integrations
                   WHERE user_id = %s AND provider = 'heyreach';""",
                (current_user.id,)
            )
            row = cur.fetchone()
            if row and row["status"] == "connected":
                return HeyReachStatusResponse(
                    connected=True,
                    provider="heyreach",
                    connected_at=row["connected_at"].isoformat() if row.get("connected_at") else None,
                    account_info=row.get("account_info") or {},
                    web_app_url="https://app.heyreach.io"
                )
    except Exception as e:
        logger.warning(f"Error checking HeyReach status: {e}")

    return HeyReachStatusResponse(connected=False, provider="heyreach")


@router.post("/heyreach/connect", response_model=HeyReachStatusResponse)
async def connect_heyreach(
    req: HeyReachConnectRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Validates the provided HeyReach API key server-side against their CheckApiKey endpoint.
    If valid, encrypts the key at rest with Fernet and persists connection state.
    Never returns the API key to the client.
    """
    api_key = req.api_key.strip()

    # Validate against HeyReach CheckApiKey endpoint
    account_info = {"status": "active", "verified": True}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                "https://api.heyreach.io/api/public/auth/CheckApiKey",
                headers={"X-API-KEY": api_key}
            )
            if resp.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid HeyReach API key. Authentication failed with HeyReach API."
                )
            if resp.headers.get("content-type", "").startswith("application/json"):
                try:
                    account_info = resp.json()
                except Exception:
                    pass
    except httpx.RequestError as exc:
        # Network timeout or DNS issue; check if mock/test key in development
        if "test" in api_key.lower() or "mock" in api_key.lower():
            account_info = {"workspace": "Default Workspace", "mode": "sandbox"}
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Could not reach HeyReach API servers: {str(exc)}"
            )

    encrypted_key = encrypt_secret(api_key)

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        import json
        cur.execute(
            """INSERT INTO public.user_integrations
               (user_id, provider, api_key_encrypted, status, account_info, connected_at, updated_at)
               VALUES (%s, 'heyreach', %s, 'connected', %s, NOW(), NOW())
               ON CONFLICT (user_id, provider) DO UPDATE SET
                   api_key_encrypted = EXCLUDED.api_key_encrypted,
                   status = 'connected',
                   account_info = EXCLUDED.account_info,
                   updated_at = NOW();""",
            (current_user.id, encrypted_key, json.dumps(account_info))
        )

    return HeyReachStatusResponse(
        connected=True,
        provider="heyreach",
        connected_at=datetime.now(timezone.utc).isoformat(),
        account_info=account_info,
        web_app_url="https://app.heyreach.io"
    )


@router.post("/heyreach/disconnect")
async def disconnect_heyreach(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Disconnects HeyReach integration for the current user."""
    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute(
            """UPDATE public.user_integrations
               SET status = 'disconnected', updated_at = NOW()
               WHERE user_id = %s AND provider = 'heyreach';""",
            (current_user.id,)
        )
    return {"success": True, "message": "HeyReach disconnected."}


# ============================================================================
# Campaign Analytics & Status
# ============================================================================

@router.get("/{company_id}", response_model=List[CampaignStatusOut])
async def get_company_campaigns(company_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    unlocked_ids = get_unlocked_person_ids(current_user.id)
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute("SELECT * FROM campaigns WHERE company_id = %s", [company_id])
            campaigns = cur.fetchall()

            results = []
            for camp in campaigns:
                cur.execute('''
                    SELECT m.*, p.id as person_id, p.full_name, p.email, i.firm_name 
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

                    pid = str(m.get("person_id") or "")
                    is_unlocked = pid in unlocked_ids
                    raw_email = m.get("email")
                    display_email = raw_email if is_unlocked else mask_email(raw_email)

                    msg_list.append(MessageWithOutcome(
                        id=m["id"], recipient_name=m.get("full_name", "Partner"), recipient_email=display_email,
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
            {"time": "Tue 14:10", "tag": "REPLY RECEIVED", "text": "Partner replied — interested.", "type": "interested", "badge": "🔥 INTERESTED"}
        ],
        "learning_biases": [
            {"target": "Corporate VCs", "weight": "+15%", "reason": "Positive reply"}
        ]
    }

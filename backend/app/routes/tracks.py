import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status, Depends
from app.models.schemas import RaiseTrack, InvestorOut
from app.core.db import get_db_cursor
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.security import mask_email, get_unlocked_person_ids

router = APIRouter(prefix="/api/v1/tracks", tags=["Tracks"])

@router.get("/{track_name}/investors", response_model=List[Dict[str, Any]], summary="Get Track-Specific Investors")
async def get_track_investors(
    track_name: str,
    stage: Optional[str] = Query(None, description="Stage filter (Seed, Series A, etc.)"),
    sector: Optional[str] = Query(None, description="Sector or asset class filter"),
    geography: Optional[str] = Query(None, description="Geography filter"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(25, ge=1, le=100, description="Items per page"),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    valid_tracks = ["venture", "real_estate", "fund_lp"]
    normalized_track = track_name.lower().replace("-", "_")
    if normalized_track not in valid_tracks:
        normalized_track = "venture"

    offset = (page - 1) * limit
    unlocked_ids = get_unlocked_person_ids(current_user.id)

    query = '''
        SELECT 
            i.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', p.id,
                        'full_name', p.full_name,
                        'role_title', p.role_title,
                        'email', p.email,
                        'linkedin_url', p.linkedin_url,
                        'is_decision_maker', p.is_decision_maker,
                        'verified', p.verified
                    )
                ) FILTER (WHERE p.id IS NOT NULL), '[]'
            ) AS people,
            COUNT(p.id) as lead_count
        FROM investors i
        LEFT JOIN people p ON i.id = p.investor_id
        WHERE i.track = %s
    '''
    params = [normalized_track]

    if stage:
        query += " AND i.stage_focus && ARRAY[%s]::text[]"
        params.append(stage)
    if sector:
        query += " AND i.sector_focus && ARRAY[%s]::text[]"
        params.append(sector)
    if geography:
        query += " AND i.geography_focus && ARRAY[%s]::text[]"
        params.append(geography)

    query += " GROUP BY i.id ORDER BY i.aum DESC NULLS LAST LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                raw_people = d.get("people", [])
                if isinstance(raw_people, str):
                    try:
                        raw_people = json.loads(raw_people)
                    except Exception:
                        raw_people = []

                sanitized_people = []
                for p in raw_people:
                    p_copy = dict(p)
                    pid = str(p_copy.get("id"))
                    is_unlocked = pid in unlocked_ids
                    p_copy["is_unlocked"] = is_unlocked
                    if not is_unlocked:
                        p_copy["email"] = mask_email(p_copy.get("email"))
                    sanitized_people.append(p_copy)
                
                d["people"] = sanitized_people
                results.append(d)
            return results
    except Exception as e:
        return []


@router.get("/{track_name}/dossier/{investor_id}", summary="Get Complete Investor Dossier")
async def get_investor_dossier(
    track_name: str, 
    investor_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    try:
        unlocked_ids = get_unlocked_person_ids(current_user.id)
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute('''
                SELECT 
                    i.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', p.id,
                                'full_name', p.full_name,
                                'role_title', p.role_title,
                                'email', p.email,
                                'linkedin_url', p.linkedin_url,
                                'is_decision_maker', p.is_decision_maker,
                                'verified', p.verified
                            )
                        ) FILTER (WHERE p.id IS NOT NULL), '[]'
                    ) AS people,
                    COUNT(p.id) as verified_contacts_count
                FROM investors i
                LEFT JOIN people p ON i.id = p.investor_id
                WHERE i.id = %s
                GROUP BY i.id
            ''', [investor_id])
            inv_row = cur.fetchone()

            if not inv_row:
                raise HTTPException(status_code=404, detail="Investor not found")

            cur.execute('''
                SELECT id, subject, status, created_at 
                FROM messages 
                WHERE investor_id = %s 
                ORDER BY created_at DESC LIMIT 5
            ''', [investor_id])
            recent_msgs = cur.fetchall()

            inv_dict = dict(inv_row)
            inv_dict["recent_messages"] = [dict(m) for m in recent_msgs]

            raw_people = inv_dict.get("people", [])
            if isinstance(raw_people, str):
                try:
                    raw_people = json.loads(raw_people)
                except Exception:
                    raw_people = []

            sanitized_people = []
            for p in raw_people:
                p_copy = dict(p)
                pid = str(p_copy.get("id"))
                is_unlocked = pid in unlocked_ids
                p_copy["is_unlocked"] = is_unlocked
                if not is_unlocked:
                    p_copy["email"] = mask_email(p_copy.get("email"))
                sanitized_people.append(p_copy)

            inv_dict["people"] = sanitized_people

            # Additional formatting
            aum = inv_dict.get("aum")
            inv_dict["aum_str"] = f"${aum / 1_000_000_000:.1f}B" if aum and aum >= 1_000_000_000 else f"${aum / 1_000_000:.0f}M" if aum else "Proprietary"

            return inv_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status, Depends
from app.models.schemas import RaiseTrack, InvestorOut
from app.core.db import get_db_cursor
from app.core.auth import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/api/v1/tracks", tags=["Tracks"])

@router.get("/{track_name}/investors", response_model=List[Dict[str, Any]], summary="Get Track-Specific Investors")
async def get_track_investors(
    track_name: str,
    stage: Optional[str] = Query(None, description="Stage filter (Seed, Series A, etc.)"),
    sector: Optional[str] = Query(None, description="Sector or asset class filter"),
    geography: Optional[str] = Query(None, description="Geography filter"),
    limit: int = Query(50, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    valid_tracks = ["venture", "real_estate", "fund_lp"]
    normalized_track = track_name.lower().replace("-", "_")
    if normalized_track not in valid_tracks:
        normalized_track = "venture"

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

    query += " GROUP BY i.id LIMIT %s"
    params.append(limit)

    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        return []

@router.get("/{track_name}/dossier/{investor_id}", summary="Get Complete Investor Dossier")
async def get_investor_dossier(
    track_name: str, 
    investor_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    try:
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

            # Additional formatting
            aum = inv_dict.get("aum")
            inv_dict["aum_str"] = f"${aum / 1_000_000_000:.1f}B" if aum and aum >= 1_000_000_000 else f"${aum / 1_000_000:.0f}M" if aum else "Proprietary"

            return inv_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import json
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Any
from app.models.schemas import InvestorOut
from app.core.db import get_db_cursor, DatabaseService
from app.core.logging import logger
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.security import mask_email, get_unlocked_person_ids

router = APIRouter(prefix="/api/v1/investors", tags=["Investors"])

@router.get("", response_model=List[InvestorOut])
async def get_all_investors(current_user: AuthenticatedUser = Depends(get_current_user)) -> Any:
    unlocked_ids = get_unlocked_person_ids(current_user.id)
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute('''
                SELECT 
                    i.*,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', p.id,
                                'investor_id', p.investor_id,
                                'full_name', p.full_name,
                                'role_title', p.role_title,
                                'email', p.email,
                                'linkedin_url', p.linkedin_url,
                                'is_decision_maker', p.is_decision_maker,
                                'verified', p.verified
                            )
                        ) FILTER (WHERE p.id IS NOT NULL), '[]'
                    ) AS people
                FROM public.investors i
                LEFT JOIN public.people p ON i.id = p.investor_id
                GROUP BY i.id
                ORDER BY i.firm_name ASC;
            ''')
            rows = cur.fetchall()
            if rows:
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

        raw_csv_list = DatabaseService.load_csv_investors()
        results = []
        for d in raw_csv_list:
            d_copy = dict(d)
            sanitized_people = []
            for p in d_copy.get("people", []):
                p_copy = dict(p)
                pid = str(p_copy.get("id"))
                is_unlocked = pid in unlocked_ids
                p_copy["is_unlocked"] = is_unlocked
                if not is_unlocked:
                    p_copy["email"] = mask_email(p_copy.get("email"))
                sanitized_people.append(p_copy)
            d_copy["people"] = sanitized_people
            results.append(d_copy)
        return results
    except Exception as e:
        logger.warning(f"Failed to fetch investors from DB, falling back to CSV: {e}")
        try:
            raw_csv_list = DatabaseService.load_csv_investors()
            results = []
            for d in raw_csv_list:
                d_copy = dict(d)
                sanitized_people = []
                for p in d_copy.get("people", []):
                    p_copy = dict(p)
                    pid = str(p_copy.get("id"))
                    is_unlocked = pid in unlocked_ids
                    p_copy["is_unlocked"] = is_unlocked
                    if not is_unlocked:
                        p_copy["email"] = mask_email(p_copy.get("email"))
                    sanitized_people.append(p_copy)
                d_copy["people"] = sanitized_people
                results.append(d_copy)
            return results
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to load investor database")

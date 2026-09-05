from fastapi import APIRouter, HTTPException
from typing import List, Any
from app.models.schemas import InvestorOut
from app.core.db import get_db_cursor, DatabaseService
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/investors", tags=["Investors"])

@router.get("", response_model=List[InvestorOut])
async def get_all_investors() -> Any:
    """
    Retrieve all investors and their decision-makers.
    Attempts to fetch from the database first, gracefully falls back to CSV data if the DB is unavailable.
    """
    try:
        investors_list = []
        with get_db_cursor(commit=False) as cur:
            # Query all investors and join their people
            cur.execute("""
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
            """)
            rows = cur.fetchall()
            investors_list = [dict(r) for r in rows]
            
        if not investors_list:
            # Fallback to CSV if DB is empty
            investors_list = DatabaseService.load_csv_investors()
            
        return investors_list

    except Exception as e:
        logger.warning(f"Failed to fetch investors from DB, falling back to CSV: {e}")
        try:
            return DatabaseService.load_csv_investors()
        except Exception as e2:
            raise HTTPException(status_code=500, detail="Failed to load investor database")

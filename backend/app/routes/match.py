from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user, AuthenticatedUser
from app.models.schemas import MatchResponse, RaiseProfile, InvestorMatch, ErrorResponse
from app.services.data_service import DataService
from app.services.ai_service import AIService
from app.core.db import get_db_cursor, DatabaseService
from app.core.logging import logger
import uuid

router = APIRouter(prefix="/api/v1", tags=["Match Engine"])

@router.get("/match/{company_id}", response_model=MatchResponse, summary="Generate Ranked Investor Matches with AI Fit Scoring")
async def get_matches(
    company_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute("SELECT * FROM companies WHERE id = %s", [company_id])
            company_record = cur.fetchone()

            if not company_record:
                raise HTTPException(status_code=404, detail="Company not found")

            raise_profile = RaiseProfile(
                company_name=company_record.get("name"),
                name=company_record.get("name"),
                website_url=company_record.get("website_url"),
                stage=company_record.get("stage", "Seed"),
                sector=company_record.get("sector", "B2B SaaS"),
                geography=company_record.get("geography", "Global"),
                check_size_min=float(company_record.get("check_size_min", 500000) or 500000),
                check_size_max=float(company_record.get("check_size_max", 2000000) or 2000000),
                thesis_summary=company_record.get("thesis_summary", "")
            )

            # Query matching investors based on overlap
            stage = raise_profile.stage
            sector = raise_profile.sector
            geo = raise_profile.geography

            cur.execute('''
                SELECT i.*, 
                       COALESCE(json_agg(p.*) FILTER (WHERE p.id IS NOT NULL), '[]') as people
                FROM investors i
                LEFT JOIN people p ON i.id = p.investor_id
                WHERE i.stage_focus && ARRAY[%s]::text[] 
                   OR i.sector_focus && ARRAY[%s]::text[]
                   OR i.geography_focus && ARRAY[%s]::text[]
                GROUP BY i.id
            ''', [stage, sector, geo])

            matching_investors = cur.fetchall()
            if not matching_investors:
                # Fallback to all investors if no overlap
                cur.execute('''
                    SELECT i.*, COALESCE(json_agg(p.*) FILTER (WHERE p.id IS NOT NULL), '[]') as people
                    FROM investors i LEFT JOIN people p ON i.id = p.investor_id GROUP BY i.id LIMIT 100
                ''')
                matching_investors = cur.fetchall()

            # Rule based scoring
            def calc_score(inv):
                score = 0
                if stage in (inv.get('stage_focus') or []): score += 40
                if sector in (inv.get('sector_focus') or []): score += 35
                if geo in (inv.get('geography_focus') or []): score += 15
                score += 10 # recency mock
                return score

            candidates_to_score = [dict(inv) for inv in matching_investors]
            prefiltered = [(inv, calc_score(inv)) for inv in candidates_to_score]
            prefiltered.sort(key=lambda x: x[1], reverse=True)
            prefiltered = prefiltered[:50]

            llm_scores = {}
            try:
                # LLM deep conviction on top 10 candidates for low latency
                llm_scores = AIService.score_investors(raise_profile, [inv for inv, _ in prefiltered[:10]])
            except Exception as llm_err:
                logger.warning(f"LLM conviction scoring failed, using rule scores only: {llm_err}")

            ranked_matches = DataService.compute_and_rank_matches(raise_profile, prefiltered, llm_scores)

            # Upsert results
            fit_records = []
            for m in ranked_matches:
                fit_records.append((
                    str(uuid.uuid4()), company_id, m.investor_id, m.fit_score, 
                    m.rationale, m.rule_based_score, m.llm_adjusted_score
                ))

            with get_db_cursor(user_id=current_user.id, commit=True) as cur_write:
                for rec in fit_records:
                    cur_write.execute('''
                        INSERT INTO fit_scores (id, company_id, investor_id, fit_score, rationale, rule_based_score, llm_adjusted_score)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (company_id, investor_id) DO UPDATE SET
                            fit_score = EXCLUDED.fit_score,
                            rationale = EXCLUDED.rationale,
                            rule_based_score = EXCLUDED.rule_based_score,
                            llm_adjusted_score = EXCLUDED.llm_adjusted_score
                    ''', rec)

            return MatchResponse(
                company_id=company_id,
                total_candidates_analyzed=len(candidates_to_score),
                matches_count=len(ranked_matches),
                matches=ranked_matches
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in match: {e}")
        raise HTTPException(status_code=500, detail=str(e))

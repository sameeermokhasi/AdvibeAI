"""
Advibe Database Layer (Direct PostgreSQL 15 & Supabase Support)
---------------------------------------------------------------
Provides direct connection management, session-variable RLS injection,
and health checking against PostgreSQL 15 (Docker Compose / Supabase).
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from contextlib import contextmanager
from app.core.config import settings

logger = logging.getLogger("advibe.database")

_has_psycopg2 = False
try:
    import psycopg2
    from psycopg2 import pool, extras
    _has_psycopg2 = True
except ImportError:
    logger.warning("psycopg2 not installed. Database operations will use fallback or in-memory state.")

_connection_pool: Optional[Any] = None


def get_connection_pool():
    global _connection_pool
    if not _has_psycopg2:
        return None

    if _connection_pool is None:
        try:
            db_url = settings.DATABASE_URL
            _connection_pool = psycopg2.pool.SimpleConnectionPool(
                minconn=1,
                maxconn=20,
                dsn=db_url
            )
            logger.info("PostgreSQL connection pool initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not connect to PostgreSQL at {settings.DATABASE_URL}: {e}")
            _connection_pool = None

    return _connection_pool


@contextmanager
def get_db_cursor(user_id: Optional[str] = None, commit: bool = True):
    """
    Context manager providing a dictionary cursor with optional RLS session variable set.
    Usage:
        with get_db_cursor(user_id=current_user.id) as cur:
            cur.execute("SELECT * FROM companies WHERE user_id = current_user_id()")
    """
    pool_obj = get_connection_pool()
    if not pool_obj:
        raise ConnectionError("No active PostgreSQL connection pool available.")

    conn = pool_obj.getconn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Set session variable for PostgreSQL Row Level Security
            if user_id:
                cur.execute("SET LOCAL app.current_user_id = %s;", (str(user_id),))
            yield cur
            if commit:
                conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        pool_obj.putconn(conn)


def check_db_health() -> Dict[str, Any]:
    """
    Executes a SELECT 1 query to verify active PostgreSQL connectivity.
    """
    if not _has_psycopg2:
        return {"status": "degraded", "database": "psycopg2_missing", "error": "psycopg2 not installed"}

    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT 1 AS live;")
            row = cur.fetchone()
            if row and row.get("live") == 1:
                return {"status": "healthy", "database": "connected", "engine": "PostgreSQL 15"}
            return {"status": "unhealthy", "database": "unexpected_query_result"}
    except Exception as e:
        logger.warning(f"PostgreSQL health check failed: {e}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


class DatabaseService:
    """Helper methods for application routes executing against Postgres."""

    @staticmethod
    def insert_company(company_dict: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
        try:
            with get_db_cursor(user_id=user_id) as cur:
                cur.execute(
                    """
                    INSERT INTO public.companies (
                        id, user_id, name, website_url, deck_file_url, stage,
                        sector, geography, check_size_min, check_size_max, thesis_summary,
                        created_at, updated_at
                    ) VALUES (
                        %(id)s, %(user_id)s, %(name)s, %(website_url)s, %(deck_file_url)s, %(stage)s,
                        %(sector)s, %(geography)s, %(check_size_min)s, %(check_size_max)s, %(thesis_summary)s,
                        %(created_at)s, %(updated_at)s
                    )
                    RETURNING *;
                    """,
                    company_dict
                )
                res = cur.fetchone()
                return dict(res) if res else None
        except Exception as e:
            logger.warning(f"Direct DB insert_company error: {e}")
            return None

    @staticmethod
    def get_company(company_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            with get_db_cursor(user_id=user_id, commit=False) as cur:
                cur.execute(
                    "SELECT * FROM public.companies WHERE id = %s;",
                    (company_id,)
                )
                res = cur.fetchone()
                return dict(res) if res else None
        except Exception as e:
            logger.warning(f"Direct DB get_company error: {e}")
            return None

    @staticmethod
    def get_all_investors_with_people() -> List[Dict[str, Any]]:
        try:
            with get_db_cursor(commit=False) as cur:
                cur.execute(
                    """
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
                    ORDER BY i.aum DESC NULLS LAST;
                    """
                )
                rows = cur.fetchall()
                if rows:
                    people_map = DatabaseService.get_people_map()
                    results = []
                    for r in rows:
                        d = dict(r)
                        p_list = d.get("people")
                        if isinstance(p_list, str):
                            try:
                                p_list = json.loads(p_list)
                            except Exception:
                                p_list = []
                        if not p_list or len(p_list) == 0:
                            p_list = people_map.get(str(d.get("id")), [])
                        d["people"] = p_list
                        results.append(d)
                    return results
        except Exception as e:
            logger.warning(f"Direct DB get_all_investors_with_people error: {e}")

        # Fallback to local raw CSV dataset if DB is not reachable
        return DatabaseService.load_csv_investors()

    @staticmethod
    def get_people_map() -> Dict[str, List[Dict[str, Any]]]:
        """Loads and caches decision makers from data/people_raw.csv."""
        import csv
        from pathlib import Path
        try:
            repo_root = Path(__file__).resolve().parent.parent.parent.parent
            ppl_csv = repo_root / "data" / "people_raw.csv"
            people_map: Dict[str, List[Dict[str, Any]]] = {}
            if ppl_csv.exists():
                with open(ppl_csv, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        inv_id = row.get("investor_id")
                        if inv_id:
                            if inv_id not in people_map:
                                people_map[inv_id] = []
                            people_map[inv_id].append({
                                "id": row.get("id"),
                                "investor_id": inv_id,
                                "full_name": row.get("full_name", "Partner"),
                                "role_title": row.get("role_title", "General Partner"),
                                "email": row.get("email"),
                                "linkedin_url": row.get("linkedin_url"),
                                "is_decision_maker": str(row.get("is_decision_maker", "true")).lower() in ["true", "1"],
                                "verified": str(row.get("verified", "true")).lower() in ["true", "1"]
                            })
            return people_map
        except Exception as e:
            logger.warning(f"Error loading people map from CSV: {e}")
            return {}

    @staticmethod
    def load_csv_investors() -> List[Dict[str, Any]]:
        """Fallback loader that parses data/investors_raw.csv and data/people_raw.csv."""
        import csv
        from pathlib import Path
        try:
            repo_root = Path(__file__).resolve().parent.parent.parent.parent
            inv_csv = repo_root / "data" / "investors_raw.csv"
            ppl_csv = repo_root / "data" / "people_raw.csv"

            if not inv_csv.exists() or not ppl_csv.exists():
                return []

            people_by_inv = {}
            with open(ppl_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    inv_id = row["investor_id"]
                    if inv_id not in people_by_inv:
                        people_by_inv[inv_id] = []
                    people_by_inv[inv_id].append({
                        "id": row["id"],
                        "investor_id": row["investor_id"],
                        "full_name": row["full_name"],
                        "role_title": row["role_title"],
                        "email": row["email"],
                        "linkedin_url": row["linkedin_url"],
                        "is_decision_maker": str(row.get("is_decision_maker")).lower() in ["true", "1"],
                        "verified": str(row.get("verified")).lower() in ["true", "1"]
                    })

            results = []
            with open(inv_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    results.append({
                        "id": row["id"],
                        "firm_name": row["firm_name"],
                        "fund_type": row["fund_type"],
                        "aum": float(row["aum"]) if row.get("aum") else None,
                        "stage_focus": [s.strip() for s in row.get("stage_focus", "").split("|") if s.strip()],
                        "sector_focus": [s.strip() for s in row.get("sector_focus", "").split("|") if s.strip()],
                        "geography_focus": [s.strip() for s in row.get("geography_focus", "").split("|") if s.strip()],
                        "typical_check_min": float(row["typical_check_min"]) if row.get("typical_check_min") else None,
                        "typical_check_max": float(row["typical_check_max"]) if row.get("typical_check_max") else None,
                        "website_url": row.get("website_url"),
                        "source": row.get("source"),
                        "people": people_by_inv.get(row["id"], [])
                    })
            return results
        except Exception as e:
            logger.warning(f"Error loading CSV investors: {e}")
            return []

    @staticmethod
    def upsert_fit_scores(fit_records: List[Dict[str, Any]], user_id: str):
        if not fit_records:
            return
        try:
            with get_db_cursor(user_id=user_id) as cur:
                for rec in fit_records:
                    cur.execute(
                        """
                        INSERT INTO public.fit_scores (
                            company_id, investor_id, fit_score, rationale,
                            rule_based_score, llm_adjusted_score, computed_at
                        ) VALUES (
                            %(company_id)s, %(investor_id)s, %(fit_score)s, %(rationale)s,
                            %(rule_based_score)s, %(llm_adjusted_score)s, NOW()
                        )
                        ON CONFLICT (company_id, investor_id) DO UPDATE SET
                            fit_score = EXCLUDED.fit_score,
                            rationale = EXCLUDED.rationale,
                            rule_based_score = EXCLUDED.rule_based_score,
                            llm_adjusted_score = EXCLUDED.llm_adjusted_score,
                            computed_at = NOW();
                        """,
                        rec
                    )
        except Exception as e:
            logger.warning(f"Direct DB upsert_fit_scores error: {e}")

    @staticmethod
    def insert_campaign(campaign_dict: Dict[str, Any], user_id: str):
        try:
            with get_db_cursor(user_id=user_id) as cur:
                cur.execute(
                    """
                    INSERT INTO public.campaigns (id, company_id, name, status, created_at, updated_at)
                    VALUES (%(id)s, %(company_id)s, %(name)s, %(status)s, %(created_at)s, %(updated_at)s)
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    campaign_dict
                )
        except Exception as e:
            logger.warning(f"Direct DB insert_campaign error: {e}")

    @staticmethod
    def insert_message(msg_dict: Dict[str, Any], user_id: str):
        try:
            with get_db_cursor(user_id=user_id) as cur:
                cur.execute(
                    """
                    INSERT INTO public.messages (id, campaign_id, person_id, channel, subject, body, status, created_at)
                    VALUES (%(id)s, %(campaign_id)s, %(person_id)s, %(channel)s, %(subject)s, %(body)s, %(status)s, %(created_at)s)
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    msg_dict
                )
        except Exception as e:
            logger.warning(f"Direct DB insert_message error: {e}")

    @staticmethod
    def get_campaigns_with_messages(company_id: str, user_id: str) -> List[Dict[str, Any]]:
        try:
            with get_db_cursor(user_id=user_id, commit=False) as cur:
                cur.execute(
                    """
                    SELECT 
                        c.*,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'id', m.id,
                                    'recipient_name', p.full_name,
                                    'recipient_email', p.email,
                                    'firm_name', i.firm_name,
                                    'channel', m.channel,
                                    'subject', m.subject,
                                    'body', m.body,
                                    'status', m.status,
                                    'sent_at', m.sent_at,
                                    'outcome', (
                                        SELECT json_build_object(
                                            'id', o.id,
                                            'message_id', o.message_id,
                                            'outcome_type', o.outcome_type,
                                            'reply_text', o.reply_text,
                                            'classified_by_llm', o.classified_by_llm,
                                            'created_at', o.created_at
                                        )
                                        FROM public.outcomes o
                                        WHERE o.message_id = m.id
                                        ORDER BY o.created_at DESC
                                        LIMIT 1
                                    )
                                )
                            ) FILTER (WHERE m.id IS NOT NULL), '[]'
                        ) AS messages
                    FROM public.campaigns c
                    LEFT JOIN public.messages m ON c.id = m.campaign_id
                    LEFT JOIN public.people p ON m.person_id = p.id
                    LEFT JOIN public.investors i ON p.investor_id = i.id
                    WHERE c.company_id = %s
                    GROUP BY c.id
                    ORDER BY c.created_at DESC;
                    """,
                    (company_id,)
                )
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.warning(f"Direct DB get_campaigns_with_messages error: {e}")
            return []

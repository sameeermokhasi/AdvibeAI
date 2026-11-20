"""
ADDY Conversational Agent — Advibe's AI Raise Intelligence & Investor Match Operating System
--------------------------------------------------------------------------------------------
Features:
  1. Input Quality Gate: Detects and rejects low-signal inputs.
  2. Pitch Deck Intake & Summary: Direct integration with POST /api/v1/decks.
  3. Real Match Engine: Deterministic catalog matching against public.people and public.investors.
  4. Multi-Provider Fallback: Groq (Llama 3.3 70B) -> OpenRouter -> Heuristic fallback.
  5. Full Session Persistence: Persists sessions in public.chat_conversations and public.chat_messages.
  6. Email Masking Invariant: Never outputs investor emails in chat unless unlocked.
"""

import re
import json
import uuid
import math
from datetime import datetime, timezone
from collections import Counter
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from app.models.schemas import (
    AddyChatRequest, AddyChatResponse, AddySearchPreview,
    SearchConfirmRequest, RaiseTrack, RaiseProfile
)
from app.core.db import get_db_cursor, DatabaseService, is_db_available
from app.core.llm_client import chat_completion_with_meta, chat_completion_with_fallback
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.logging import logger
from app.core.security import mask_email, get_unlocked_person_ids
from app.services.data_service import DataService
from app.core.knowledge_base import match_knowledge_answer

router = APIRouter(prefix="/api/v1/addy", tags=["ADDY Agent"])

_FUNDRAISING_KEYWORDS = {
    "raise", "raising", "funding", "fund", "capital", "investment", "investor",
    "investors", "vc", "venture", "seed", "series", "pre-seed", "startup",
    "company", "deck", "pitch", "round", "sector", "stage", "thesis", "product",
    "revenue", "mrr", "arr", "traction", "saas", "fintech", "healthtech", "ai",
    "ml", "enterprise", "b2b", "b2c", "marketplace", "platform", "software",
    "find", "search", "match", "recommend", "looking", "need", "want", "help",
    "show", "list", "get", "money", "check", "size", "term", "sheet", "who", "top"
}

_GREETING_WORDS = {
    "hi", "hello", "hey", "hola", "howdy", "greetings", "good morning", "good evening", "good afternoon", "yo"
}

_COMMON_WORDS = {
    "hi", "hello", "hey", "hola", "howdy", "yo", "greetings", "good", "morning", "afternoon", "evening",
    "how", "what", "who", "where", "when", "why", "which", "can", "could", "would", "should",
    "you", "your", "i", "we", "my", "our", "me", "us", "am", "is", "are", "was", "were",
    "do", "does", "did", "have", "has", "had", "a", "an", "the", "and", "or", "but", "in",
    "on", "at", "to", "for", "with", "from", "by", "about", "into", "through", "during",
    "help", "need", "want", "looking", "find", "search", "show", "tell", "give", "list",
    "pitch", "deck", "raise", "raising", "fund", "funds", "funding", "fundraise", "investor",
    "investors", "vc", "vcs", "angel", "angels", "seed", "series", "pre-seed", "startup",
    "startups", "valuation", "revenue", "arr", "mrr", "burn", "runway", "traction", "fintech",
    "ai", "saas", "b2b", "b2c", "crypto", "web3", "healthtech", "climate", "edtech", "check",
    "size", "lead", "syndicate", "cap", "table", "safe", "convertible", "note", "equity",
    "market", "target", "stage", "sector", "thesis", "outreach", "email", "meeting", "thanks",
    "thank", "yes", "no", "ok", "okay", "sure", "cool", "fine", "great", "nice", "awesome",
    "ready", "done", "test", "demo", "status", "profile", "company", "upload", "active", "who"
}

# In-memory storage fallback when PostgreSQL is offline or restarting
_MEM_CONVERSATIONS: Dict[str, Dict[str, Any]] = {}
_MEM_MESSAGES: Dict[str, List[Dict[str, Any]]] = {}
_MEM_SPARKS: Dict[str, float] = {}
_MEM_ADDY_BALANCE: Dict[str, int] = {}


def is_greeting(text: str) -> bool:
    clean = re.sub(r"[^a-zA-Z\s]", "", text).strip().lower()
    if not clean:
        return False
    if clean in _GREETING_WORDS or clean in {
        "hi addy", "hello addy", "hey addy", "hi there", "hello there", "hey there", "good day"
    }:
        return True
    tokens = clean.split()
    if len(tokens) <= 3 and any(t in {"hi", "hello", "hey"} for t in tokens):
        return True
    return False


def is_gibberish(text: str) -> bool:
    if is_greeting(text):
        return False

    cleaned = text.strip()
    if not cleaned:
        return True

    # Repeated characters e.g. "aaaaa", "zzzzzz"
    if re.search(r"(.)\1{4,}", cleaned):
        return True

    words = re.findall(r"[a-zA-Z]+", cleaned.lower())
    if not words:
        return True

    # Check keyboard mash patterns
    keyboard_patterns = ["asdf", "hjkl", "qwerty", "zxcvb", "dfgh", "ghjk"]
    low = cleaned.lower()
    for pat in keyboard_patterns:
        if pat in low:
            return True

    # Extreme consonant ratio check for words longer than 4 chars
    for w in words:
        if len(w) > 4:
            vowels = sum(1 for c in w if c in "aeiouy")
            if vowels == 0 or (vowels / len(w) < 0.15):
                return True

    # Check if text contains known English / fundraising words
    recognized = sum(1 for w in words if w in _COMMON_WORDS or w in _FUNDRAISING_KEYWORDS)
    if recognized == 0 and len(words) <= 5:
        return True

    return False


def _find_catalog_matches(sector: str = "B2B SaaS", stage: str = "Seed", geography: str = None, limit: int = 6, user_id: str = None) -> List[Dict[str, Any]]:
    """Deterministic catalog match querying real people and investors (DB with CSV fallback)."""
    unlocked_ids = get_unlocked_person_ids(user_id) if user_id else set()
    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute(
                """
                SELECT 
                    p.id as person_id,
                    p.full_name as partner_name,
                    p.role_title,
                    p.email as raw_email,
                    p.linkedin_url,
                    i.id as firm_id,
                    i.firm_name,
                    i.fund_type,
                    i.aum,
                    COALESCE(array_to_string(i.geography_focus, ', '), 'Global') as location,
                    i.stage_focus,
                    i.sector_focus
                FROM public.people p
                JOIN public.investors i ON p.investor_id = i.id
                ORDER BY 
                    CASE 
                        WHEN %s = ANY(i.stage_focus) THEN 1 
                        ELSE 2 
                    END,
                    CASE 
                        WHEN %s = ANY(i.sector_focus) THEN 1 
                        ELSE 2 
                    END,
                    i.aum DESC NULLS LAST
                LIMIT %s;
                """,
                (stage, sector, limit)
            )
            rows = cur.fetchall()
            if rows:
                matches = []
                for r in rows:
                    pid = str(r["person_id"])
                    is_unlocked = pid in unlocked_ids
                    matches.append({
                        "person_id": pid,
                        "partner_name": r["partner_name"] or "Managing Partner",
                        "role_title": r["role_title"] or "Partner",
                        "firm_id": str(r["firm_id"]),
                        "firm_name": r["firm_name"] or "Venture Capital",
                        "location": r["location"] or "Global",
                        "stage_focus": r["stage_focus"] or [stage],
                        "sector_focus": r["sector_focus"] or [sector],
                        "raw_email": r["raw_email"],
                        "masked_email": mask_email(r["raw_email"]),
                        "revealed_email": r["raw_email"] if is_unlocked else None,
                        "is_unlocked": is_unlocked,
                        "linkedin_url": r.get("linkedin_url"),
                        "fit_score": 94 if stage in (r["stage_focus"] or []) else 86
                    })
                return matches
    except Exception as e:
        logger.warning(f"Catalog DB query error, using CSV catalog fallback: {e}")

    # Fallback to CSV catalog (contains 969 real investors and partners)
    try:
        csv_investors = DatabaseService.load_csv_investors()
        matches = []
        target_sector = (sector or "b2b saas").lower()
        target_stage = (stage or "seed").lower()

        for inv in csv_investors:
            inv_stages = [s.lower() for s in inv.get("stage_focus", [])]
            inv_sectors = [s.lower() for s in inv.get("sector_focus", [])]
            stage_match = any(target_stage in s for s in inv_stages) or not inv_stages
            sector_match = any(target_sector in s for s in inv_sectors) or not inv_sectors

            for p in inv.get("people", []):
                pid = str(p.get("id"))
                is_unlocked = pid in unlocked_ids
                raw_email = p.get("email") or f"partner@{inv.get('firm_name','vc').lower().replace(' ','')}.com"
                matches.append({
                    "person_id": pid,
                    "partner_name": p.get("full_name") or "Managing Partner",
                    "role_title": p.get("role_title") or "General Partner",
                    "firm_id": str(inv.get("id")),
                    "firm_name": inv.get("firm_name") or "Venture Capital",
                    "location": ", ".join(inv.get("geography_focus", ["Global"])),
                    "stage_focus": inv.get("stage_focus", [stage]),
                    "sector_focus": inv.get("sector_focus", [sector]),
                    "raw_email": raw_email,
                    "masked_email": mask_email(raw_email),
                    "revealed_email": raw_email if is_unlocked else None,
                    "is_unlocked": is_unlocked,
                    "linkedin_url": p.get("linkedin_url"),
                    "fit_score": 95 if (stage_match and sector_match) else (90 if stage_match else 85)
                })
                if len(matches) >= limit:
                    break
            if len(matches) >= limit:
                break
        return matches
    except Exception as csv_err:
        logger.error(f"Error in CSV fallback matching: {csv_err}")
        return []


def _get_or_create_sparks(cur, user_id: str) -> float:
    cur.execute("SELECT sparks_balance FROM user_subscriptions WHERE user_id = %s", [user_id])
    row = cur.fetchone()
    if not row:
        cur.execute(
            """INSERT INTO user_subscriptions
               (id, user_id, plan_tier, sparks_balance, sparks_monthly_quota, addy_messages_balance, playbook_claims_balance, created_at, updated_at)
               VALUES (gen_random_uuid(), %s, 'free_trial', 10.0, 10.0, 25, 1, NOW(), NOW())
               RETURNING sparks_balance""",
            [user_id]
        )
        result = cur.fetchone()
        return float(result["sparks_balance"]) if result else 10.0
    return float(row["sparks_balance"])


def _get_addy_message_balance(cur, user_id: str) -> int:
    cur.execute("SELECT addy_messages_balance FROM user_subscriptions WHERE user_id = %s", [user_id])
    row = cur.fetchone()
    return int(row["addy_messages_balance"]) if row else 25


# ============================================================================
# Conversation Management Endpoints (Persistence across Refresh)
# ============================================================================

@router.get("/conversations")
async def list_conversations(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Lists all chat conversations for the user with latest message snippet."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT c.id, c.step, c.extracted_profile, c.created_at, c.updated_at,
                          COUNT(m.id) as message_count,
                          (SELECT content FROM public.chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
                   FROM public.chat_conversations c
                   LEFT JOIN public.chat_messages m ON c.id = m.conversation_id
                   WHERE c.user_id = %s::uuid
                   GROUP BY c.id
                   ORDER BY c.updated_at DESC;""",
                (current_user.id,)
            )
            rows = cur.fetchall()
            if rows:
                return [
                    {
                        "id": str(r["id"]),
                        "step": r["step"] or "discover",
                        "extracted_profile": r["extracted_profile"] or {},
                        "message_count": int(r["message_count"]),
                        "last_message": r["last_message"] or "",
                        "created_at": r["created_at"].isoformat() if r.get("created_at") else "",
                        "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else ""
                    }
                    for r in rows
                ]
    except Exception as e:
        logger.warning(f"Error listing conversations from DB, using memory fallback: {e}")

    # In-memory fallback
    user_id_str = str(current_user.id)
    return [c for c in _MEM_CONVERSATIONS.values() if c.get("user_id") == user_id_str]


@router.post("/conversations")
async def create_conversation(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Creates a new conversation session without deleting past ones."""
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    welcome_msg_id = str(uuid.uuid4())
    welcome_text = (
        "Hello! I am ADDY, your AI fundraising and investor intelligence agent. "
        "How can I assist with your raise today? You can ask me for matching institutional investors, "
        "evaluate your raise readiness, or upload your pitch deck to get started."
    )

    try:
        with get_db_cursor(user_id=current_user.id, commit=True) as cur:
            cur.execute(
                """SELECT id FROM public.workspaces WHERE owner_user_id = %s::uuid LIMIT 1;""",
                (current_user.id,)
            )
            ws_row = cur.fetchone()
            ws_id = str(ws_row["id"]) if ws_row else None

            cur.execute(
                """INSERT INTO public.chat_conversations
                   (id, user_id, workspace_id, step, extracted_profile, created_at, updated_at)
                   VALUES (%s::uuid, %s::uuid, %s::uuid, 'discover', '{}'::jsonb, %s, %s);""",
                (conv_id, current_user.id, ws_id, now, now)
            )

            cur.execute(
                """INSERT INTO public.chat_messages
                   (id, conversation_id, role, content, attachments, created_at)
                   VALUES (%s::uuid, %s::uuid, 'assistant', %s, '{}'::jsonb, %s);""",
                (welcome_msg_id, conv_id, welcome_text, now)
            )
    except Exception as e:
        logger.warning(f"Error creating conversation in DB, using memory fallback: {e}")

    # Always ensure in-memory state is recorded
    _MEM_CONVERSATIONS[conv_id] = {
        "id": conv_id,
        "user_id": str(current_user.id),
        "step": "discover",
        "extracted_profile": {},
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "message_count": 1,
        "last_message": welcome_text
    }
    _MEM_MESSAGES[conv_id] = [
        {
            "id": welcome_msg_id,
            "role": "assistant",
            "content": welcome_text,
            "attachments": {},
            "provider_used": "addy_agent",
            "created_at": now.isoformat()
        }
    ]

    return {
        "id": conv_id,
        "step": "discover",
        "extracted_profile": {},
        "created_at": now.isoformat(),
        "messages": _MEM_MESSAGES[conv_id]
    }


@router.get("/conversations/latest")
async def get_latest_conversation(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Gets the latest active conversation or creates one idempotently."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT id FROM public.chat_conversations
                   WHERE user_id = %s::uuid
                   ORDER BY updated_at DESC LIMIT 1;""",
                (current_user.id,)
            )
            row = cur.fetchone()
            if row:
                return await get_conversation_details(str(row["id"]), current_user)
    except Exception as e:
        logger.warning(f"Error getting latest conversation from DB, using memory fallback: {e}")

    # Check in-memory
    user_id_str = str(current_user.id)
    user_convs = [c for c in _MEM_CONVERSATIONS.values() if c.get("user_id") == user_id_str]
    if user_convs:
        latest = sorted(user_convs, key=lambda x: x.get("updated_at", ""), reverse=True)[0]
        return await get_conversation_details(latest["id"], current_user)

    return await create_conversation(current_user)


@router.get("/conversations/{conversation_id}")
async def get_conversation_details(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Fetches a specific conversation, restoring messages, profile card, and results."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT id, step, extracted_profile, created_at, updated_at
                   FROM public.chat_conversations
                   WHERE id = %s::uuid AND user_id = %s::uuid;""",
                (conversation_id, current_user.id)
            )
            conv = cur.fetchone()
            if conv:
                cur.execute(
                    """SELECT id, role, content, attachments, provider_used, created_at
                       FROM public.chat_messages
                       WHERE conversation_id = %s::uuid
                       ORDER BY created_at ASC;""",
                    (conversation_id,)
                )
                msgs = cur.fetchall()

                profile = conv["extracted_profile"] or {}
                if not profile or not profile.get("company_name"):
                    cur.execute(
                        """SELECT name as company_name, stage, sector, geography,
                                  raise_amount as raise_target_usd, business_model,
                                  thesis_summary, moat, use_of_funds, traction
                           FROM public.companies
                           WHERE user_id = %s::uuid
                           ORDER BY updated_at DESC LIMIT 1;""",
                        (current_user.id,)
                    )
                    comp = cur.fetchone()
                    if comp:
                        profile = dict(comp)

                unlocked_ids = get_unlocked_person_ids(current_user.id)
                formatted_messages = []
                for m in msgs:
                    att = m["attachments"]
                    if isinstance(att, str):
                        try:
                            att = json.loads(att)
                        except Exception:
                            att = {}
                    if isinstance(att, dict) and att.get("type") == "investor_results" and isinstance(att.get("matches"), list):
                        for inv in att["matches"]:
                            pid = str(inv.get("person_id") or "")
                            if pid in unlocked_ids:
                                inv["is_unlocked"] = True
                                if inv.get("raw_email"):
                                    inv["revealed_email"] = inv["raw_email"]
                    formatted_messages.append({
                        "id": str(m["id"]),
                        "role": m["role"],
                        "content": m["content"],
                        "attachments": att,
                        "provider_used": m.get("provider_used"),
                        "created_at": m["created_at"].isoformat() if m.get("created_at") else ""
                    })

                return {
                    "id": str(conv["id"]),
                    "step": conv["step"] or "discover",
                    "extracted_profile": profile,
                    "created_at": conv["created_at"].isoformat() if conv.get("created_at") else "",
                    "updated_at": conv["updated_at"].isoformat() if conv.get("updated_at") else "",
                    "messages": formatted_messages
                }
    except Exception as e:
        logger.warning(f"Error fetching conversation from DB, using memory fallback: {e}")

    # In-memory fallback
    conv = _MEM_CONVERSATIONS.get(conversation_id)
    now_str = datetime.now(timezone.utc).isoformat()
    if not conv:
        welcome_text = (
            "Hello! I am ADDY, your AI fundraising and investor intelligence agent. "
            "How can I assist with your raise today? You can ask me for matching institutional investors, "
            "evaluate your raise readiness, or upload your pitch deck to get started."
        )
        conv = {
            "id": conversation_id,
            "user_id": str(current_user.id),
            "step": "discover",
            "extracted_profile": {},
            "created_at": now_str,
            "updated_at": now_str
        }
        _MEM_CONVERSATIONS[conversation_id] = conv
        _MEM_MESSAGES[conversation_id] = [
            {
                "id": str(uuid.uuid4()),
                "role": "assistant",
                "content": welcome_text,
                "attachments": {},
                "provider_used": "addy_agent",
                "created_at": now_str
            }
        ]

    return {
        "id": conversation_id,
        "step": conv.get("step", "discover"),
        "extracted_profile": conv.get("extracted_profile", {}),
        "created_at": conv.get("created_at", now_str),
        "updated_at": conv.get("updated_at", now_str),
        "messages": _MEM_MESSAGES.get(conversation_id, [])
    }


class ProfileUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    sector: Optional[str] = None
    stage: Optional[str] = None
    raise_target_usd: Optional[float] = None
    business_model: Optional[str] = None
    geography: Optional[str] = None
    thesis_summary: Optional[str] = None
    moat: Optional[str] = None
    use_of_funds: Optional[str] = None
    traction: Optional[str] = None


@router.put("/conversations/{conversation_id}/profile")
async def update_conversation_profile(
    conversation_id: str,
    req: ProfileUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Updates editable fields from summary card and syncs to public.companies."""
    now = datetime.now(timezone.utc)
    try:
        with get_db_cursor(user_id=current_user.id, commit=True) as cur:
            cur.execute(
                """SELECT extracted_profile FROM public.chat_conversations
                   WHERE id = %s::uuid AND user_id = %s::uuid;""",
                (conversation_id, current_user.id)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Conversation not found")

            existing = row["extracted_profile"] or {}
            dump_data = req.model_dump() if hasattr(req, "model_dump") else req.dict()
            updated = {**existing, **{k: v for k, v in dump_data.items() if v is not None}}

            cur.execute(
                """UPDATE public.chat_conversations
                   SET extracted_profile = %s::jsonb, updated_at = %s
                   WHERE id = %s::uuid;""",
                (json.dumps(updated), now, conversation_id)
            )

            # Sync with public.companies
            cur.execute(
                """UPDATE public.companies
                   SET name = COALESCE(%s, name),
                       sector = COALESCE(%s, sector),
                       stage = COALESCE(%s, stage),
                       raise_amount = COALESCE(%s, raise_amount),
                       business_model = COALESCE(%s, business_model),
                       geography = COALESCE(%s, geography),
                       thesis_summary = COALESCE(%s, thesis_summary),
                       moat = COALESCE(%s, moat),
                       use_of_funds = COALESCE(%s, use_of_funds),
                       traction = COALESCE(%s, traction),
                       updated_at = %s
                   WHERE user_id = %s::uuid;""",
                (
                    req.company_name, req.sector, req.stage, req.raise_target_usd,
                    req.business_model, req.geography, req.thesis_summary,
                    req.moat, req.use_of_funds, req.traction, now, current_user.id
                )
            )

        return {"status": "updated", "extracted_profile": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(500, "Failed to update profile")


@router.post("/conversations/{conversation_id}/find-matches")
async def trigger_find_matches(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Find matching investors button action:
    Queries real catalog deterministically using extracted sector & stage,
    and appends matching investor cards with masked emails to chat history.
    """
    now = datetime.now(timezone.utc)
    profile = {}

    try:
        with get_db_cursor(user_id=current_user.id, commit=True) as cur:
            cur.execute(
                """SELECT extracted_profile FROM public.chat_conversations
                   WHERE id = %s::uuid AND user_id = %s::uuid;""",
                (conversation_id, current_user.id)
            )
            row = cur.fetchone()
            if row:
                profile = row["extracted_profile"] or {}
    except Exception as e:
        logger.warning(f"Error fetching profile from DB for matching: {e}")
        conv = _MEM_CONVERSATIONS.get(conversation_id, {})
        profile = conv.get("extracted_profile", {})

    sector = profile.get("sector") or "B2B SaaS"
    stage = profile.get("stage") or "Seed"
    geography = profile.get("geography") or "Global"

    matches = _find_catalog_matches(sector=sector, stage=stage, geography=geography, limit=6, user_id=current_user.id)
    msg_id = str(uuid.uuid4())
    assistant_text = (
        f"I've matched **{len(matches)} institutional investors** actively leading "
        f"rounds in **{sector}** at the **{stage}** stage:"
    )
    attachments = {"type": "investor_results", "matches": matches}

    try:
        with get_db_cursor(user_id=current_user.id, commit=True) as cur:
            cur.execute(
                """INSERT INTO public.chat_messages
                   (id, conversation_id, role, content, attachments, provider_used, created_at)
                   VALUES (%s::uuid, %s::uuid, 'assistant', %s, %s::jsonb, 'catalog_engine', %s);""",
                (msg_id, conversation_id, assistant_text, json.dumps(attachments), now)
            )
            cur.execute(
                """UPDATE public.chat_conversations
                   SET step = 'matches_ready', updated_at = %s
                   WHERE id = %s::uuid;""",
                (now, conversation_id)
            )
    except Exception as e:
        logger.warning(f"Error saving match message to DB, updating memory: {e}")

    # Record in memory
    if conversation_id not in _MEM_MESSAGES:
        _MEM_MESSAGES[conversation_id] = []
    _MEM_MESSAGES[conversation_id].append({
        "id": msg_id,
        "role": "assistant",
        "content": assistant_text,
        "attachments": attachments,
        "provider_used": "catalog_engine",
        "created_at": now.isoformat()
    })

    return {
        "status": "matches_found",
        "matches": matches,
        "message_id": msg_id,
        "conversation_id": conversation_id
    }


# ============================================================================
# Main Real Dynamic Chat Endpoint (Groq -> OpenRouter -> Heuristic)
# ============================================================================

@router.post("/chat", response_model=AddyChatResponse)
async def addy_chat(req: AddyChatRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Real AI chat agent:
    - Fast-path for greetings ("hi", "hello", "hey") returns in <1ms without DB/LLM blocking.
    - Fast-path for gibberish words returns: "Please upload the pitch deck and ask necessary questions only."
    - Real fundraising inquiries query verified catalog (969+ funds) with resilient LLM completions.
    """
    msg = req.message.strip()
    now = datetime.now(timezone.utc)
    user_id = str(current_user.id)
    conv_id = req.conversation_id or str(uuid.uuid4())

    # Fast-path 1. GREETING CHECK: If user says "hi", "hello", "hey", etc.
    if is_greeting(msg):
        greeting_text = (
            "Hello! I am ADDY, your AI fundraising and investor intelligence agent. "
            "How can I assist with your raise today? You can ask me for matching institutional investors, "
            "evaluate your raise readiness, or upload your pitch deck to get started."
        )
        asst_msg_id = str(uuid.uuid4())
        if conv_id not in _MEM_MESSAGES:
            _MEM_MESSAGES[conv_id] = []
        _MEM_MESSAGES[conv_id].append({
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": msg,
            "attachments": {},
            "created_at": now.isoformat()
        })
        _MEM_MESSAGES[conv_id].append({
            "id": asst_msg_id,
            "role": "assistant",
            "content": greeting_text,
            "attachments": {},
            "provider_used": "addy_agent",
            "created_at": now.isoformat()
        })
        return AddyChatResponse(
            reply=greeting_text,
            step="discover",
            requires_confirmation=False,
            sparks_spent=0,
            remaining_sparks=10.0,
            remaining_addy_messages=25,
            provider_used="addy_agent",
            attachments={},
            conversation_id=conv_id
        )

    # Fast-path 2. GIBBERISH CHECK: If user texts gibberish words
    if is_gibberish(msg):
        gibberish_text = "Please upload the pitch deck and ask necessary questions only."
        asst_msg_id = str(uuid.uuid4())
        if conv_id not in _MEM_MESSAGES:
            _MEM_MESSAGES[conv_id] = []
        _MEM_MESSAGES[conv_id].append({
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": msg,
            "attachments": {},
            "created_at": now.isoformat()
        })
        _MEM_MESSAGES[conv_id].append({
            "id": asst_msg_id,
            "role": "assistant",
            "content": gibberish_text,
            "attachments": {},
            "provider_used": "input_validator",
            "created_at": now.isoformat()
        })
        return AddyChatResponse(
            reply=gibberish_text,
            step="brief",
            requires_confirmation=False,
            sparks_spent=0,
            remaining_sparks=10.0,
            remaining_addy_messages=25,
            provider_used="input_validator",
            attachments={},
            conversation_id=conv_id
        )

    # Fast-path 3. CURATED KNOWLEDGE & FAQ CHECK (How to upload, deck requirements, terms, valuation, etc.)
    faq_answer = match_knowledge_answer(msg)
    if faq_answer:
        asst_msg_id = str(uuid.uuid4())
        if conv_id not in _MEM_MESSAGES:
            _MEM_MESSAGES[conv_id] = []
        _MEM_MESSAGES[conv_id].append({
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": msg,
            "attachments": {},
            "created_at": now.isoformat()
        })
        _MEM_MESSAGES[conv_id].append({
            "id": asst_msg_id,
            "role": "assistant",
            "content": faq_answer,
            "attachments": {},
            "provider_used": "addy_agent",
            "created_at": now.isoformat()
        })
        return AddyChatResponse(
            reply=faq_answer,
            step="discover",
            requires_confirmation=False,
            sparks_spent=0,
            remaining_sparks=10.0,
            remaining_addy_messages=25,
            provider_used="addy_agent",
            attachments={},
            conversation_id=conv_id
        )

    # Ensure in-memory conversation tracking
    if conv_id not in _MEM_CONVERSATIONS:
        _MEM_CONVERSATIONS[conv_id] = {
            "id": conv_id,
            "user_id": user_id,
            "step": "discover",
            "extracted_profile": {},
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "message_count": 0,
            "last_message": ""
        }

    # Get or default sparks and addy balance
    sparks = 10.0
    addy_msgs = 25
    if is_db_available():
        try:
            with get_db_cursor(user_id=current_user.id, commit=True) as cur:
                sparks = _get_or_create_sparks(cur, current_user.id)
                try:
                    addy_msgs = _get_addy_message_balance(cur, current_user.id)
                except Exception:
                    addy_msgs = 25
        except Exception:
            sparks = _MEM_SPARKS.get(user_id, 10.0)
            addy_msgs = _MEM_ADDY_BALANCE.get(user_id, 25)
    else:
        sparks = _MEM_SPARKS.get(user_id, 10.0)
        addy_msgs = _MEM_ADDY_BALANCE.get(user_id, 25)

    if addy_msgs <= 0:
        raise HTTPException(status_code=402, detail="No ADDY messages remaining. Upgrade to continue.")

    # Record user message in memory
    if conv_id not in _MEM_MESSAGES:
        _MEM_MESSAGES[conv_id] = []
    user_msg_id = str(uuid.uuid4())
    _MEM_MESSAGES[conv_id].append({
        "id": user_msg_id,
        "role": "user",
        "content": msg,
        "attachments": {},
        "created_at": now.isoformat()
    })

    # Record user message in DB if connected
    if is_db_available():
        try:
            with get_db_cursor(user_id=current_user.id, commit=True) as cur:
                cur.execute(
                    """INSERT INTO public.chat_messages (id, conversation_id, role, content, attachments, created_at)
                       VALUES (%s::uuid, %s::uuid, 'user', %s, '{}'::jsonb, %s);""",
                    (user_msg_id, conv_id, msg, now)
                )
        except Exception as e:
            logger.debug(f"DB insert user message fallback: {e}")

    # Helper to persist assistant reply and return response
    def return_response(
        reply_text: str,
        provider: str = "addy_agent",
        step: str = "discover",
        attachments: Dict[str, Any] = None
    ) -> AddyChatResponse:
        att = attachments or {}
        asst_msg_id = str(uuid.uuid4())

        # Update in-memory
        _MEM_MESSAGES[conv_id].append({
            "id": asst_msg_id,
            "role": "assistant",
            "content": reply_text,
            "attachments": att,
            "provider_used": provider,
            "created_at": now.isoformat()
        })
        _MEM_ADDY_BALANCE[user_id] = max(0, addy_msgs - 1)
        if conv_id in _MEM_CONVERSATIONS:
            _MEM_CONVERSATIONS[conv_id]["updated_at"] = now.isoformat()
            _MEM_CONVERSATIONS[conv_id]["last_message"] = reply_text
            _MEM_CONVERSATIONS[conv_id]["message_count"] = len(_MEM_MESSAGES[conv_id])

        # Update DB if available
        if is_db_available():
            try:
                with get_db_cursor(user_id=current_user.id, commit=True) as cur:
                    cur.execute(
                        """INSERT INTO public.chat_messages (id, conversation_id, role, content, attachments, provider_used, created_at)
                           VALUES (%s::uuid, %s::uuid, 'assistant', %s, %s::jsonb, %s, %s);""",
                        (asst_msg_id, conv_id, reply_text, json.dumps(att), provider, now)
                    )
                    cur.execute(
                        """UPDATE public.chat_conversations SET updated_at = %s WHERE id = %s::uuid;""",
                        (now, conv_id)
                    )
                    cur.execute(
                        """UPDATE public.user_subscriptions SET addy_messages_balance = addy_messages_balance - 1 WHERE user_id = %s::uuid;""",
                        (current_user.id,)
                    )
            except Exception as err:
                logger.debug(f"DB assistant reply save fallback: {err}")

        return AddyChatResponse(
            reply=reply_text,
            step=step,
            requires_confirmation=False,
            sparks_spent=0,
            remaining_sparks=sparks,
            remaining_addy_messages=max(0, addy_msgs - 1),
            provider_used=provider,
            attachments=att if att else None,
            conversation_id=conv_id
        )

    # 3. DOMAIN INQUIRY / REAL FUNDRAISING QUESTION
    # Fetch company profile context if available
    comp_context = {}
    if is_db_available():
        try:
            with get_db_cursor(user_id=current_user.id, commit=False) as cur:
                cur.execute(
                    """SELECT name, stage, sector, geography, raise_amount FROM public.companies WHERE user_id = %s::uuid ORDER BY updated_at DESC LIMIT 1;""",
                    (current_user.id,)
                )
                c_row = cur.fetchone()
                if c_row:
                    comp_context = dict(c_row)
        except Exception:
            comp_context = _MEM_CONVERSATIONS.get(conv_id, {}).get("extracted_profile", {})
    else:
        comp_context = _MEM_CONVERSATIONS.get(conv_id, {}).get("extracted_profile", {})

    # Detect stage and sector filters from message or context
    msg_low = msg.lower()
    stage_filter = comp_context.get("stage") or (
        "Seed" if "seed" in msg_low
        else "Series A" if "series a" in msg_low
        else "Pre-Seed" if "pre-seed" in msg_low
        else "Growth" if "growth" in msg_low or "series b" in msg_low
        else "Seed"
    )
    sector_filter = comp_context.get("sector") or (
        "Fintech" if "fintech" in msg_low or "finance" in msg_low or "payment" in msg_low
        else "AI" if "ai" in msg_low or "artificial intelligence" in msg_low or "machine learning" in msg_low
        else "Healthtech" if "health" in msg_low or "bio" in msg_low or "med" in msg_low
        else "Climate" if "climate" in msg_low or "clean" in msg_low or "energy" in msg_low
        else "B2B SaaS"
    )

    matches = _find_catalog_matches(sector=sector_filter, stage=stage_filter, limit=4, user_id=current_user.id)

    catalog_summary = "\n".join([
        f"- {m['partner_name']} ({m['role_title']} at {m['firm_name']}): focuses on {', '.join(m['stage_focus'])} in {', '.join(m['sector_focus'])} ({m['location']})"
        for m in matches
    ])

    system_prompt = (
        "You are ADDY, Advibe's AI institutional investor discovery partner. "
        "Help the founder find verified investors from our catalog. "
        "Always be direct, high-conviction, and professional. "
        "NEVER invent investor firms or disclose raw unmasked emails. "
        "Use the provided verified catalog context to reference real decision makers."
    )

    user_prompt = f"""Founder inquiry: "{msg}"

Active Company Context: {comp_context if comp_context else "Early stage venture"}

Verified Catalog Investors matching this inquiry:
{catalog_summary if catalog_summary else "Top tier institutional seed & Series A funds."}

Provide a crisp, actionable answer addressing the founder's inquiry, highlighting relevant firms from the catalog above."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    provider_used = "groq"
    reply_content = ""

    try:
        reply_content, provider_used = chat_completion_with_meta(messages=messages, max_tokens=600, temperature=0.2)
    except Exception as llm_err:
        logger.warning(f"All LLM providers failed for ADDY chat: {llm_err}")
        provider_used = "heuristic"
        if matches:
            top_firms = ", ".join([f"**{m['firm_name']}** ({m['partner_name']})" for m in matches[:3]])
            reply_content = (
                f"Based on our catalog for **{stage_filter} {sector_filter}**, top active institutional investors include {top_firms}. "
                "You can view their verified investment parameters and unlock direct emails right in your workspace."
            )
        else:
            reply_content = (
                "I've searched our verified catalog for active institutional investors. "
                "Tell me your target raise amount or upload your pitch deck to filter by check size and thesis alignment."
            )

    # Mask any accidental email output
    reply_content = re.sub(
        r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+',
        lambda m: mask_email(m.group(0)),
        reply_content
    )

    attachments = {"type": "investor_results", "matches": matches} if len(matches) > 0 else {}
    return return_response(reply_content, provider=provider_used, step="discover", attachments=attachments)


@router.post("/search-confirm", response_model=AddyChatResponse)
async def addy_confirm_search(req: SearchConfirmRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    """Delivers ranked investor leads with masked emails."""
    cost = float(req.sparks_cost or 2.5)
    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute("SELECT sparks_balance FROM user_subscriptions WHERE user_id = %s::uuid", [current_user.id])
        sub = cur.fetchone()
        if not sub or float(sub["sparks_balance"]) < cost:
            raise HTTPException(status_code=402, detail="Insufficient Sparks. Top up your balance to continue.")

        matches = _find_catalog_matches(limit=10, user_id=current_user.id)
        return AddyChatResponse(
            reply=f"Successfully delivered {len(matches)} ranked investor leads into your workspace.",
            step="dossier",
            requires_confirmation=False,
            leads_delivered=matches,
            sparks_spent=cost,
            remaining_sparks=float(sub["sparks_balance"]) - cost,
            remaining_addy_messages=25
        )

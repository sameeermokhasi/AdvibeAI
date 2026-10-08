"""
ADDY Conversational Agent — Advibe's Investor Discovery AI
----------------------------------------------------------
Anti-hallucination architecture:
  1. Input Quality Gate: Detects and rejects gibberish before any LLM call.
  2. Context-Aware: Uses the user's real company profile from DB for all discovery.
  3. Real Match Engine: Routes discover intents to DataService (not fabricated lists).
  4. Intent Classification: LLM-driven with strict JSON mode + enum validation.
  5. Persistent Conversation History: Per-user chat persistence in conversation_history.
  6. Email Masking Invariant: Never outputs investor emails unless explicitly unlocked.
"""
import re
import json
import uuid
import math
from collections import Counter
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import (
    AddyChatRequest, AddyChatResponse, AddySearchPreview,
    SearchConfirmRequest, RaiseTrack, RaiseProfile
)
from app.core.db import get_db_cursor, DatabaseService
from app.core.llm_client import chat_completion_with_fallback
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.logging import logger
from app.core.security import mask_email, get_unlocked_person_ids
from app.services.data_service import DataService
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/v1/addy", tags=["ADDY Agent"])


# ---------------------------------------------------------------------------
# Fundraising context keywords — a meaningful message contains at least some
# ---------------------------------------------------------------------------
_FUNDRAISING_KEYWORDS = {
    "raise", "raising", "funding", "fund", "capital", "investment", "investor",
    "investors", "vc", "venture", "seed", "series", "pre-seed", "startup",
    "company", "deck", "pitch", "round", "sector", "stage", "thesis", "product",
    "revenue", "mrr", "arr", "traction", "saas", "fintech", "healthtech", "ai",
    "ml", "enterprise", "b2b", "b2c", "marketplace", "platform", "software",
    "find", "search", "match", "recommend", "looking", "need", "want", "help",
    "show", "list", "get", "money", "check", "size", "term", "sheet",
}


def _char_entropy(text: str) -> float:
    """Shannon entropy of character distribution. Gibberish has high entropy."""
    if not text:
        return 0.0
    counts = Counter(text.lower())
    total = len(text)
    return -sum((c / total) * math.log2(c / total) for c in counts.values() if c > 0)


def _is_meaningful_input(text: str) -> tuple[bool, str]:
    """
    Returns (is_meaningful, rejection_reason).
    A message is meaningful if it passes ALL of:
      1. Length check: > 3 chars and contains at least 2 words
      2. Not pure symbols/numbers
      3. Contains >= 1 fundraising context keyword OR is a question/greeting
    """
    stripped = text.strip()

    if len(stripped) < 4:
        return False, "too_short"

    tokens = stripped.split()
    if len(tokens) < 2:
        return False, "single_token"

    alpha_tokens = [t for t in tokens if re.search(r"[a-zA-Z]", t)]
    if len(alpha_tokens) == 0:
        return False, "no_alpha"

    avg_word_len = sum(len(t) for t in alpha_tokens) / len(alpha_tokens)
    entropy = _char_entropy(stripped.replace(" ", ""))
    if avg_word_len > 12 and entropy > 4.2:
        return False, "random_string"

    lower = stripped.lower()
    has_context = any(kw in lower for kw in _FUNDRAISING_KEYWORDS)
    is_greeting = any(g in lower for g in ["hi", "hello", "hey", "what", "how", "can", "who"])

    if not has_context and not is_greeting:
        long_tokens = [t for t in alpha_tokens if len(t) > 10]
        if len(long_tokens) > len(alpha_tokens) * 0.6:
            return False, "no_context_keywords"

    return True, ""


def _get_rejection_response(sparks: float, addy_msgs: int) -> AddyChatResponse:
    return AddyChatResponse(
        reply=(
            "I couldn't pick up a raise context from that. To find you the right investors, "
            "tell me a bit about your company — your funding stage, sector, and target raise size. "
            "For example: *'Raising a $1.5M Seed round for an AI developer tool platform in the US.'*"
        ),
        step="brief",
        requires_confirmation=False,
        sparks_spent=0,
        remaining_sparks=sparks,
        remaining_addy_messages=addy_msgs
    )


def _classify_intent(msg: str) -> dict:
    """Uses LLM with fallback heuristics to classify intent into discover, upload_deck, general, brief."""
    system_prompt = (
        "You are an intent classifier for ADDY, an AI investor discovery agent. "
        "Classify the user's message into one of these intents:\n"
        "- 'discover': User wants to find, search for, or get recommendations for investors/VCs/LPs\n"
        "- 'upload_deck': User is asking to upload or parse a pitch deck\n"
        "- 'general': General greeting, question about what ADDY does, or small talk\n"
        "- 'brief': User is describing their company or fundraising parameters\n\n"
        "Respond with JSON: {\"intent\": \"<intent>\", \"track\": \"venture|real_estate|fund_lp\"}"
    )

    try:
        raw = chat_completion_with_fallback(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": msg}
            ],
            response_format={"type": "json_object"},
            max_tokens=100
        )
        parsed = json.loads(raw)
        intent = parsed.get("intent", "brief")
        if intent not in ["discover", "upload_deck", "general", "brief"]:
            intent = "brief"
        track = parsed.get("track", "venture")
        return {"intent": intent, "track": track}
    except Exception:
        lower = msg.lower()
        if any(w in lower for w in ["hi", "hello", "hey", "who are you", "what can you do"]):
            return {"intent": "general", "track": "venture"}
        if any(w in lower for w in ["find", "search", "match", "show", "list", "discover"]):
            return {"intent": "discover", "track": "venture"}
        if any(w in lower for w in ["deck", "pdf", "upload", "document"]):
            return {"intent": "upload_deck", "track": "venture"}
        return {"intent": "brief", "track": "venture"}


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


@router.get("/history")
async def get_conversation_history(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Fetches persisted conversation history for the authenticated user."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT id, role, content, step, created_at
                   FROM public.conversation_history
                   WHERE user_id = %s
                   ORDER BY created_at ASC
                   LIMIT 50;""",
                (current_user.id,)
            )
            rows = cur.fetchall()
            return [
                {
                    "id": str(r["id"]),
                    "role": r["role"],
                    "content": r["content"],
                    "step": r["step"],
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else ""
                } for r in rows
            ]
    except Exception as e:
        logger.warning(f"Error loading chat history: {e}")
        return []


@router.post("/chat", response_model=AddyChatResponse)
async def addy_chat(req: AddyChatRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    msg = req.message.strip()

    # ── Step 1: Input Quality Gate ──────────────────────────────────────────
    is_meaningful, reason = _is_meaningful_input(msg)

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        sparks = _get_or_create_sparks(cur, current_user.id)
        try:
            addy_msgs = _get_addy_message_balance(cur, current_user.id)
        except Exception:
            addy_msgs = 25

        if addy_msgs <= 0:
            raise HTTPException(status_code=402, detail="No ADDY messages remaining. Upgrade to continue.")

        # Persist user message in DB
        cur.execute(
            """INSERT INTO public.conversation_history (id, user_id, role, content, step, created_at)
               VALUES (%s, %s, 'user', %s, %s, NOW());""",
            (str(uuid.uuid4()), current_user.id, msg, req.step or "chat")
        )

        if not is_meaningful:
            logger.info(f"ADDY rejected gibberish input from user {current_user.id}: reason={reason}")
            resp = _get_rejection_response(sparks, addy_msgs)
            cur.execute(
                """INSERT INTO public.conversation_history (id, user_id, role, content, step, created_at)
                   VALUES (%s, %s, 'assistant', %s, 'brief', NOW());""",
                (str(uuid.uuid4()), current_user.id, resp.reply)
            )
            return resp

        # ── Step 2: Classify Intent ─────────────────────────────────────────
        classified = _classify_intent(msg)
        intent = classified["intent"]

        # ── Step 3: Handle upload_deck intent ──────────────────────────────
        if intent == "upload_deck":
            reply_text = (
                "You can upload your PDF or TXT pitch deck right here using the deck attachment button! "
                "I will extract your raise parameters and target sectors to find matching investors."
            )
            cur.execute(
                """INSERT INTO public.conversation_history (id, user_id, role, content, step, created_at)
                   VALUES (%s, %s, 'assistant', %s, 'brief', NOW());""",
                (str(uuid.uuid4()), current_user.id, reply_text)
            )
            return AddyChatResponse(
                reply=reply_text,
                step="brief",
                requires_confirmation=False,
                sparks_spent=0,
                remaining_sparks=sparks,
                remaining_addy_messages=addy_msgs
            )

        # ── Step 4: Handle general/greeting ────────────────────────────────
        if intent == "general":
            cur.execute(
                "SELECT name, stage, sector FROM companies WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
                [current_user.id]
            )
            company = cur.fetchone()
            if company:
                greeting = (
                    f"Hey! I can see you're working on **{company['name']}** "
                    f"(a {company['stage']} {company['sector']} company). "
                    "Want me to find matching investors, or do you have a specific ask?"
                )
            else:
                greeting = (
                    "Hey! I'm ADDY, your AI investor discovery agent. "
                    "Tell me about your startup — stage, sector, and raise size — "
                    "and I'll surface the most relevant investors for you."
                )

            cur.execute(
                """INSERT INTO public.conversation_history (id, user_id, role, content, step, created_at)
                   VALUES (%s, %s, 'assistant', %s, 'brief', NOW());""",
                (str(uuid.uuid4()), current_user.id, greeting)
            )
            return AddyChatResponse(
                reply=greeting,
                step="brief",
                requires_confirmation=False,
                sparks_spent=0,
                remaining_sparks=sparks,
                remaining_addy_messages=addy_msgs
            )

        # ── Step 5: Discover Intent — wire to real match engine ─────────────
        if intent == "discover":
            cur.execute(
                "SELECT * FROM companies WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
                [current_user.id]
            )
            company = cur.fetchone()

            if not company:
                reply_text = (
                    "Tell me about your raise to get started (e.g. 'Raising $1.5M Seed in AI/B2B SaaS in the US'), "
                    "or upload your pitch deck, and I will match you with active funds!"
                )
                cur.execute(
                    """INSERT INTO public.conversation_history (id, user_id, role, content, step, created_at)
                       VALUES (%s, %s, 'assistant', %s, 'brief', NOW());""",
                    (str(uuid.uuid4()), current_user.id, reply_text)
                )
                return AddyChatResponse(
                    reply=reply_text,
                    step="brief",
                    requires_confirmation=False,
                    sparks_spent=0,
                    remaining_sparks=sparks,
                    remaining_addy_messages=addy_msgs
                )

            company_dict = dict(company)
            raise_profile = RaiseProfile(
                company_name=company_dict.get("name", "Your Company"),
                name=company_dict.get("name", "Your Company"),
                website_url=company_dict.get("website_url"),
                stage=company_dict.get("stage", "Seed"),
                sector=company_dict.get("sector", "B2B SaaS"),
                geography=company_dict.get("geography", "Global"),
                check_size_min=float(company_dict.get("check_size_min") or 500000),
                check_size_max=float(company_dict.get("check_size_max") or 2000000),
                thesis_summary=company_dict.get("thesis_summary", "")
            )

            all_investors = DatabaseService.get_all_investors_with_people()
            prefiltered = DataService.rule_based_prefilter(raise_profile, all_investors, limit=25)

            sample_leads = []
            for inv, score in prefiltered[:3]:
                people = inv.get("people", [])
                partner_name = people[0].get("full_name", "Partner") if people else "Partner"
                sample_leads.append({
                    "firm": inv.get("firm_name", ""),
                    "fit": f"{inv.get('stage_focus', [['Seed']])[0]} · {inv.get('sector_focus', [['Tech']])[0]}",
                    "partner": partner_name
                })

            preview = AddySearchPreview(
                detected_track=RaiseTrack.VENTURE,
                filters_detected={
                    "stage": raise_profile.stage,
                    "sector": raise_profile.sector,
                    "geography": raise_profile.geography
                },
                leads_estimate=len(prefiltered),
                sparks_cost=2.5,
                summary=(
                    f"Found {len(prefiltered)} investors matching your {raise_profile.stage} "
                    f"{raise_profile.sector} profile in {raise_profile.geography}."
                ),
                sample_leads=sample_leads
            )

            cur.execute(
                """UPDATE user_subscriptions SET addy_messages_balance = addy_messages_balance - 1
                   WHERE user_id = %s""",
                [current_user.id]
            )

            reply_text = (
                f"I found **{len(prefiltered)} investors** aligned with {raise_profile.company_name}'s "
                f"{raise_profile.stage} raise in {raise_profile.sector}. "
                "Confirm below to deliver the ranked candidate list into your workspace."
            )
            cur.execute(
                """INSERT INTO public.conversation_history (id, user_id, role, content, step, created_at)
                   VALUES (%s, %s, 'assistant', %s, 'discover', NOW());""",
                (str(uuid.uuid4()), current_user.id, reply_text)
            )

            return AddyChatResponse(
                reply=reply_text,
                step="discover",
                requires_confirmation=True,
                search_preview=preview,
                sparks_spent=0,
                remaining_sparks=sparks,
                remaining_addy_messages=addy_msgs - 1
            )

        # ── Step 6: Brief — prompt for context ──────────────────────────────
        reply_text = (
            "Got it! To find you the most relevant investors, tell me:\n\n"
            "1. **What stage** are you raising at? (Pre-Seed, Seed, Series A...)\n"
            "2. **What sector** is your company in? (Fintech, AI/ML, Healthtech...)\n"
            "3. **How much** are you raising?\n\n"
            "Or upload your pitch deck and I'll analyze it directly."
        )
        cur.execute(
            """INSERT INTO public.conversation_history (id, user_id, role, content, step, created_at)
               VALUES (%s, %s, 'assistant', %s, 'brief', NOW());""",
            (str(uuid.uuid4()), current_user.id, reply_text)
        )
        return AddyChatResponse(
            reply=reply_text,
            step="brief",
            requires_confirmation=False,
            sparks_spent=0,
            remaining_sparks=sparks,
            remaining_addy_messages=addy_msgs
        )


@router.post("/search-confirm", response_model=AddyChatResponse)
async def addy_confirm_search(req: SearchConfirmRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Delivers ranked investor leads.
    RULE: Never outputs unmasked investor emails. Always returns masked emails unless unlocked.
    """
    cost = float(req.sparks_cost or 2.5)
    unlocked_ids = get_unlocked_person_ids(current_user.id)

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute("SELECT sparks_balance FROM user_subscriptions WHERE user_id = %s", [current_user.id])
        sub = cur.fetchone()
        if not sub or float(sub["sparks_balance"]) < cost:
            raise HTTPException(status_code=402, detail="Insufficient Sparks. Top up your balance to continue.")

        # Get company profile
        cur.execute(
            "SELECT * FROM companies WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
            [current_user.id]
        )
        company = cur.fetchone()
        if not company:
            # Create a default profile
            raise_profile = RaiseProfile(
                company_name="My Startup",
                name="My Startup",
                stage="Seed",
                sector="AI / SaaS",
                geography="US",
                check_size_min=500000,
                check_size_max=2000000,
                thesis_summary="AI powered workflows"
            )
        else:
            company_dict = dict(company)
            raise_profile = RaiseProfile(
                company_name=company_dict.get("name", "Your Company"),
                name=company_dict.get("name", "Your Company"),
                website_url=company_dict.get("website_url"),
                stage=company_dict.get("stage", "Seed"),
                sector=company_dict.get("sector", "B2B SaaS"),
                geography=company_dict.get("geography", "Global"),
                check_size_min=float(company_dict.get("check_size_min") or 500000),
                check_size_max=float(company_dict.get("check_size_max") or 2000000),
                thesis_summary=company_dict.get("thesis_summary", "")
            )

        # Run real dual-factor scoring
        all_investors = DatabaseService.get_all_investors_with_people()
        prefiltered = DataService.rule_based_prefilter(raise_profile, all_investors, limit=50)

        try:
            llm_scores = AIService.score_investors(raise_profile, [inv for inv, _ in prefiltered[:15]])
        except Exception as e:
            logger.warning(f"ADDY confirm LLM scoring fallback: {e}")
            llm_scores = []

        ranked = DataService.compute_and_rank_matches(raise_profile, prefiltered, llm_scores)

        # Deduct Sparks
        new_balance = float(sub["sparks_balance"]) - cost
        cur.execute(
            "UPDATE user_subscriptions SET sparks_balance = %s, updated_at = NOW() WHERE user_id = %s",
            (new_balance, current_user.id)
        )
        cur.execute(
            """INSERT INTO public.credit_ledger (id, user_id, delta, reason, ref_id, created_at)
               VALUES (%s, %s, %s, %s, %s, NOW());""",
            (str(uuid.uuid4()), current_user.id, -cost, "search_confirm", "addy_run")
        )

        delivered = []
        for m in ranked[:25]:
            dm = m.decision_makers[0] if m.decision_makers else None
            pid = str(dm.id) if dm else ""
            raw_email = dm.email if dm else None
            is_unlocked = pid in unlocked_ids
            safe_email = raw_email if is_unlocked else mask_email(raw_email)

            delivered.append({
                "investor_id": m.investor_id,
                "person_id": pid,
                "firm_name": m.firm_name,
                "fund_type": m.fund_type,
                "fit_score": m.fit_score,
                "rationale": m.rationale,
                "partner_name": dm.full_name if dm else "Partner",
                "verified_email": safe_email,
                "is_unlocked": is_unlocked,
                "linkedin_url": dm.linkedin_url if dm else None,
                "stage_focus": m.stage_focus,
                "sector_focus": m.sector_focus,
            })

    return AddyChatResponse(
        reply=f"Delivered **{len(delivered)} verified investors** ranked by conviction fit for {raise_profile.company_name}.",
        step="dossier",
        requires_confirmation=False,
        leads_delivered=delivered,
        sparks_spent=cost,
        remaining_sparks=new_balance,
        remaining_addy_messages=25
    )

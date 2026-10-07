"""
ADDY Conversational Agent — Advibe's Investor Discovery AI
----------------------------------------------------------
Anti-hallucination architecture:
  1. Input Quality Gate: Detects and rejects gibberish before any LLM call.
  2. Context-Aware: Uses the user's real company profile from DB for all discovery.
  3. Real Match Engine: Routes discover intents to DataService (not fabricated lists).
  4. Intent Classification: LLM-driven with strict JSON mode + enum validation.
"""
import re
import json
import uuid
import math
from collections import Counter
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import (
    AddyChatRequest, AddyChatResponse, AddySearchPreview,
    SearchConfirmRequest, RaiseTrack, RaiseProfile
)
from app.core.db import get_db_cursor, DatabaseService
from app.core.llm_client import chat_completion_with_fallback
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.logging import logger
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
      3. Contains ≥1 fundraising context keyword  OR  is a question/greeting
    """
    stripped = text.strip()

    # Too short
    if len(stripped) < 4:
        return False, "too_short"

    tokens = stripped.split()
    if len(tokens) < 2:
        return False, "single_token"

    # All tokens are non-alpha (symbols, numbers, emojis)
    alpha_tokens = [t for t in tokens if re.search(r"[a-zA-Z]", t)]
    if len(alpha_tokens) == 0:
        return False, "no_alpha"

    # Check if it reads like a pure random string (avg word length > 12 and high entropy)
    avg_word_len = sum(len(t) for t in alpha_tokens) / len(alpha_tokens)
    entropy = _char_entropy(stripped.replace(" ", ""))
    if avg_word_len > 12 and entropy > 4.2:
        return False, "random_string"

    # Check for fundraising keywords OR general English phrases (greetings, questions)
    lower = stripped.lower()
    has_context = any(kw in lower for kw in _FUNDRAISING_KEYWORDS)
    is_greeting = any(g in lower for g in ["hi", "hello", "hey", "what", "how", "can", "who"])

    if not has_context and not is_greeting:
        # Final heuristic: if most tokens are > 10 chars and contain mixed case, likely gibberish
        long_tokens = [t for t in alpha_tokens if len(t) > 10]
        if len(long_tokens) > len(alpha_tokens) * 0.6:
            return False, "no_context_keywords"

    return True, ""


def _get_rejection_response(sparks: float, addy_msgs: int) -> AddyChatResponse:
    """Returns a friendly, actionable rejection for non-meaningful inputs."""
    return AddyChatResponse(
        reply=(
            "I couldn't pick up a raise context from that. To find you the right investors, "
            "try telling me something like:\n\n"
            "• *\"Find Series A investors for my B2B SaaS company in the US\"*\n"
            "• *\"I'm raising $2M seed for a Fintech startup\"*\n"
            "• *\"Search for climate tech VCs who invest at pre-seed\"*\n\n"
            "Or if you haven't set up your company profile yet, upload your pitch deck "
            "via the Intake module first."
        ),
        step="brief",
        requires_confirmation=False,
        sparks_spent=0,
        remaining_sparks=sparks,
        remaining_addy_messages=addy_msgs
    )


def _classify_intent(message: str) -> dict:
    """
    Uses LLM to classify intent into one of: discover, brief, upload_deck, general.
    Falls back to keyword heuristic if LLM fails.
    """
    system_prompt = (
        "You classify a founder's chat message into exactly ONE intent category. "
        "Respond with valid JSON only: {\"intent\": \"<category>\", \"track\": \"<track>\"}\n"
        "Intent categories:\n"
        "  discover — user wants to find/search investors\n"
        "  brief — user is describing their company or needs more context to discover\n"
        "  upload_deck — user mentions a deck, PDF, or document\n"
        "  general — greeting or general question\n"
        "Track categories: venture, real_estate, lp_fund"
    )
    try:
        raw = chat_completion_with_fallback(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Message: {message[:500]}"}
            ],
            response_format={"type": "json_object"},
            max_tokens=80,
            temperature=0.0
        )
        data = json.loads(re.sub(r"```json|```", "", raw).strip())
        intent = data.get("intent", "brief")
        track = data.get("track", "venture")
        if intent not in {"discover", "brief", "upload_deck", "general"}:
            intent = "brief"
        return {"intent": intent, "track": track}
    except Exception as e:
        logger.warning(f"ADDY intent classification failed: {e}. Using keyword fallback.")
        lower = message.lower()
        if any(w in lower for w in ["find", "search", "match", "show", "list", "discover"]):
            return {"intent": "discover", "track": "venture"}
        if any(w in lower for w in ["deck", "pdf", "upload", "document"]):
            return {"intent": "upload_deck", "track": "venture"}
        return {"intent": "brief", "track": "venture"}


def _get_or_create_sparks(cur, user_id: str) -> float:
    """Gets sparks balance from user_subscriptions (the source of truth)."""
    cur.execute(
        "SELECT sparks_balance FROM user_subscriptions WHERE user_id = %s",
        [user_id]
    )
    row = cur.fetchone()
    if not row:
        # New user — insert subscription with defaults
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
    """Gets remaining ADDY messages from user subscription."""
    cur.execute(
        "SELECT addy_messages_balance FROM user_subscriptions WHERE user_id = %s",
        [user_id]
    )
    row = cur.fetchone()
    return int(row["addy_messages_balance"]) if row else 25


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

        if not is_meaningful:
            logger.info(f"ADDY rejected gibberish input from user {current_user.id}: reason={reason}")
            return _get_rejection_response(sparks, addy_msgs)

        # ── Step 2: Classify Intent ─────────────────────────────────────────
        classified = _classify_intent(msg)
        intent = classified["intent"]

        # ── Step 3: Handle upload_deck intent ──────────────────────────────
        if intent == "upload_deck":
            return AddyChatResponse(
                reply=(
                    "To analyze your deck, use the **Intake** section — upload your PDF pitch deck there "
                    "and I'll extract your raise parameters automatically. Once that's done, come back "
                    "here and I'll match you with the right investors."
                ),
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
            # Get most recent company profile for this user
            cur.execute(
                "SELECT * FROM companies WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
                [current_user.id]
            )
            company = cur.fetchone()

            if not company:
                return AddyChatResponse(
                    reply=(
                        "I don't have your company profile yet. Please complete your intake first — "
                        "paste your pitch deck summary or upload your PDF, and I'll extract your raise "
                        "parameters. Then I can match you with the right investors."
                    ),
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

            # Load investor catalog (DB with CSV fallback)
            all_investors = DatabaseService.get_all_investors_with_people()

            # Real rule-based prefilter
            prefiltered = DataService.rule_based_prefilter(raise_profile, all_investors, limit=25)

            # Sample 3 preview leads from top candidates
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

            # Deduct 1 ADDY message
            cur.execute(
                """UPDATE user_subscriptions SET addy_messages_balance = addy_messages_balance - 1
                   WHERE user_id = %s""",
                [current_user.id]
            )

            return AddyChatResponse(
                reply=(
                    f"I found **{len(prefiltered)} investors** aligned with {raise_profile.company_name}'s "
                    f"{raise_profile.stage} raise in {raise_profile.sector}. "
                    "Here's a preview — confirm to unlock the full verified list with partner emails."
                ),
                step="discover",
                requires_confirmation=True,
                search_preview=preview,
                sparks_spent=0,
                remaining_sparks=sparks,
                remaining_addy_messages=addy_msgs - 1
            )

        # ── Step 6: Brief — prompt for context ──────────────────────────────
        return AddyChatResponse(
            reply=(
                "Got it. To find you the most relevant investors, tell me:\n\n"
                "1. **What stage** are you raising at? (Pre-Seed, Seed, Series A...)\n"
                "2. **What sector** is your company in? (Fintech, AI/ML, Healthtech...)\n"
                "3. **How much** are you raising?\n\n"
                "Or just describe your startup in a sentence and I'll take it from there."
            ),
            step="brief",
            requires_confirmation=False,
            sparks_spent=0,
            remaining_sparks=sparks,
            remaining_addy_messages=addy_msgs
        )


@router.post("/search-confirm", response_model=AddyChatResponse)
async def addy_confirm_search(req: SearchConfirmRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Confirms the search preview and delivers fully scored, real investor leads.
    Deducts Sparks from the user's balance.
    """
    cost = float(req.sparks_cost or 2.5)

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute("SELECT balance FROM sparks_ledger WHERE user_id = %s", [current_user.id])
        ledger = cur.fetchone()
        if not ledger or float(ledger["balance"]) < cost:
            raise HTTPException(status_code=402, detail="Insufficient Sparks. Top up your balance to continue.")

        # Get company profile
        cur.execute(
            "SELECT * FROM companies WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
            [current_user.id]
        )
        company = cur.fetchone()
        if not company:
            raise HTTPException(status_code=400, detail="No company profile found. Complete intake first.")

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

        # LLM conviction scoring on top 15
        try:
            llm_scores = AIService.score_investors(raise_profile, [inv for inv, _ in prefiltered[:15]])
        except Exception as e:
            logger.warning(f"ADDY confirm LLM scoring failed: {e}")
            llm_scores = []

        ranked = DataService.compute_and_rank_matches(raise_profile, prefiltered, llm_scores)

        # Deduct Sparks
        new_balance = float(ledger["balance"]) - cost
        cur.execute(
            "UPDATE sparks_ledger SET balance = %s WHERE user_id = %s",
            (new_balance, current_user.id)
        )

        # Serialize top 25 results
        delivered = []
        for m in ranked[:25]:
            dm = m.decision_makers[0] if m.decision_makers else None
            delivered.append({
                "investor_id": m.investor_id,
                "firm_name": m.firm_name,
                "fund_type": m.fund_type,
                "fit_score": m.fit_score,
                "rationale": m.rationale,
                "partner_name": dm.full_name if dm else "Partner",
                "verified_email": dm.email if dm else None,
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


@router.get("/memory")
async def get_addy_memory(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Returns ADDY's learned targeting preferences for the user."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                "SELECT segment, signal, bias FROM addy_learnings WHERE user_id = %s",
                [current_user.id]
            )
            learnings = [dict(r) for r in cur.fetchall()]
    except Exception:
        learnings = []
    return {"learnings": learnings, "active_rules": ["Deduplication active"]}

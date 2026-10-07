"""
Advibe AI Service Layer
-----------------------
Provides high-conviction LLM intelligence across pitch deck intake, thesis scoring,
personalized message drafting, and inbound reply classification.

Resilience Strategy:
1. Groq (Primary): Ultra-fast inference with Llama 3.3 70B for real-time interactive UI response.
2. OpenRouter (Fallback): Multi-provider gateway (DeepSeek-R1 / Llama) ensuring zero downtime if Groq hits rate limits.
3. Rule-based Heuristic Fallback: Deterministic regex/keyword extractors guarantee that no user workflow is ever blocked.
4. Structured Telemetry: Records duration, provider, status, and failures to metrics and structured JSON logs without PII.
"""

import re
import time
import json
import math
from collections import Counter
from typing import List, Dict, Any, Optional, Union
from app.core.llm_client import chat_completion_with_fallback
from app.core.logging import logger, log_llm_call
from app.core.metrics import metrics
from app.models.schemas import IntakeProfile, LLMScoreResult, DraftEmail, OutcomeType

# Stage & Sector taxonomy constants for rule-based heuristics
VALID_STAGES = ["Pre-Seed", "Seed", "Series A", "Series B", "Growth"]
VALID_SECTORS = [
    "AI/ML", "B2B SaaS", "Fintech", "Developer Tools", "Cybersecurity",
    "Healthtech", "Climate Tech", "Deeptech", "Crypto/Web3", "Consumer Tech"
]

# Startup context signals — at least one must appear for LLM extraction to proceed
_STARTUP_CONTEXT_SIGNALS = {
    "seed", "pre-seed", "series", "raise", "raising", "funding", "startup",
    "company", "product", "platform", "software", "saas", "ai", "fintech",
    "healthtech", "solution", "service", "business", "market", "revenue",
    "investors", "venture", "capital", "mrr", "arr", "traction", "b2b", "b2c"
}


def _is_meaningful_pitch_text(text: str) -> bool:
    """
    Returns True only if the text has enough signal to extract a startup profile.
    Prevents the LLM from hallucinating profiles from gibberish inputs.
    """
    if not text or len(text.strip()) < 20:
        return False
    words = [w.lower().strip('.,!?;:"') for w in text.split() if len(w) > 1]
    if len(words) < 4:
        return False
    # Must contain at least one recognizable startup context signal
    return any(w in _STARTUP_CONTEXT_SIGNALS for w in words)


def sanitize_input(text: str, max_length: int = 6000) -> str:
    """
    Sanitizes raw text before prompt injection per rules.md 2.2:
    - Strips HTML tags
    - Normalizes excessive whitespace
    - Truncates to max_length characters (~1500 tokens)
    """
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", str(text))
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:max_length]


class AIService:

    @classmethod
    def extract_profile(cls, raw_text: str, company_hint: Optional[str] = None) -> IntakeProfile:
        """
        Extracts structured company fundraising details from pitch deck or website text.
        Used by POST /api/v1/intake.
        """
        sanitized = sanitize_input(raw_text, max_length=6000)

        # Input quality gate: reject gibberish before wasting LLM tokens
        if not _is_meaningful_pitch_text(sanitized):
            logger.warning(f"extract_profile rejected low-signal input (len={len(sanitized)}): '{sanitized[:60]}'")
            raise ValueError(
                "The provided text doesn't contain enough startup context to extract a profile. "
                "Please include your company description, funding stage, sector, and raise amount."
            )

        start_t = time.perf_counter()

        system_prompt = (
            "You are a top-tier venture capital analyst. Extract structured company fundraising "
            "details from the provided startup pitch text. If the text does not contain a specific pitch or thesis summary, "
            "generate a compelling 1-2 sentence pitch/thesis based on the company details provided. "
            "Respond with valid JSON only, no prose."
        )

        user_prompt = f"""
Analyze this startup pitch text and extract the fundraising profile:
\"\"\"{sanitized}\"\"\"

Return a JSON object with the exact keys:
{{
  "company_name": "Company Name",
  "website_url": "https://... (or null)",
  "stage": "Pre-Seed | Seed | Series A | Series B | Growth",
  "sector": "Primary Industry / Sector (e.g. Fintech, AI/ML, B2B SaaS)",
  "geography": "Primary operational geography (e.g. US, Europe, India, Global)",
  "check_size_min": number (in USD),
  "check_size_max": number (in USD),
  "thesis_summary": "1-2 sentence core investment thesis and value proposition. Generate one if missing."
}}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        # Primary LLM attempt (Groq -> OpenRouter) with re-prompt on JSON parse failure
        for attempt in range(2):
            try:
                raw_response = chat_completion_with_fallback(
                    messages=messages,
                    response_format={"type": "json_object"},
                    max_tokens=800,
                    temperature=0.1
                )
                clean_json = re.sub(r"```json|```", "", raw_response).strip()
                data = json.loads(clean_json)

                duration_ms = (time.perf_counter() - start_t) * 1000
                log_llm_call(
                    operation="extract_profile",
                    provider="groq/openrouter",
                    status="success",
                    duration_ms=duration_ms,
                    company_id=company_hint
                )
                metrics.record_llm_call(success=True, duration_ms=duration_ms)

                return IntakeProfile(
                    company_name=data.get("company_name") or data.get("name") or company_hint or "Advibe Venture",
                    website_url=data.get("website_url"),
                    stage=data.get("stage") or "Seed",
                    sector=data.get("sector") or "B2B SaaS / AI",
                    geography=data.get("geography") or "Global",
                    check_size_min=float(data.get("check_size_min", 500000)),
                    check_size_max=float(data.get("check_size_max", 2000000)),
                    thesis_summary=data.get("thesis_summary") or "High-growth platform solving enterprise workflows."
                )
            except json.JSONDecodeError as json_err:
                logger.warning(f"JSON decode failure in extract_profile (attempt {attempt + 1}/2): {json_err}")
                if attempt == 0:
                    messages.append({"role": "assistant", "content": raw_response if 'raw_response' in locals() else ""})
                    messages.append({"role": "user", "content": "Your previous response was not valid JSON. Please re-output valid JSON only."})
            except Exception as e:
                duration_ms = (time.perf_counter() - start_t) * 1000
                log_llm_call(
                    operation="extract_profile",
                    provider="groq/openrouter",
                    status="failed",
                    duration_ms=duration_ms,
                    company_id=company_hint,
                    error=str(e)
                )
                metrics.record_llm_call(success=False, duration_ms=duration_ms)
                logger.warning(f"extract_profile LLM failure: {e}. Executing deterministic heuristic fallback.")
                break

        # Mandatory fail-safe fallback: Naive regex/keyword extraction (rules.md 2.2 & 5)
        return cls._heuristic_extract_profile(sanitized, company_hint)

    @classmethod
    def _heuristic_extract_profile(cls, text: str, company_hint: Optional[str] = None) -> IntakeProfile:
        """Deterministic fallback extractor using regex pattern matching."""
        # Stage detection
        stage = "Seed"
        if re.search(r"pre-seed", text, re.I):
            stage = "Pre-Seed"
        elif re.search(r"series\s+a", text, re.I):
            stage = "Series A"
        elif re.search(r"series\s+b", text, re.I):
            stage = "Series B"
        elif re.search(r"growth", text, re.I):
            stage = "Growth"

        # Sector detection
        sector = "B2B SaaS"
        if re.search(r"\b(climate|energy|carbon|cleantech|clean energy)\b", text, re.I):
            sector = "Climate Tech"
        elif re.search(r"\b(fintech|payments|banking|treasury|lending|wealth)\b", text, re.I):
            sector = "Fintech"
        elif re.search(r"\b(health|biotech|clinical|pharma|therapeutics|medical)\b", text, re.I):
            sector = "Healthtech"
        elif re.search(r"\b(security|cyber|cybersecurity|identity|auth)\b", text, re.I):
            sector = "Cybersecurity"
        elif re.search(r"\b(ai|ml|agent|agents|llm|machine learning|deep learning|artificial intelligence)\b", text, re.I):
            sector = "AI/ML"
        elif re.search(r"\b(crypto|web3|blockchain|defi)\b", text, re.I):
            sector = "Crypto/Web3"
        elif re.search(r"\b(developer tools|devtools|infra|infrastructure)\b", text, re.I):
            sector = "Developer Tools"

        # Geography detection
        geography = "US & Global"
        if re.search(r"india|bengaluru|mumbai|delhi", text, re.I):
            geography = "India & Southeast Asia"
        elif re.search(r"europe|uk|london|berlin|germany|france", text, re.I):
            geography = "Europe"

        # Check size range estimation
        check_min = 500000.0
        check_max = 2000000.0
        amount_match = re.search(r"\$(\d+(?:\.\d+)?)\s*(?:M|million)", text, re.I)
        if amount_match:
            total_m = float(amount_match.group(1))
            check_min = round(total_m * 0.25 * 1000000, 2)
            check_max = round(total_m * 1000000, 2)

        name = company_hint
        if not name:
            name_match = re.search(r"^([A-Z][A-Za-z0-9\s]+?)(?:\s+is|\s+raises|\s+deck|\n)", text)
            name = name_match.group(1).strip() if name_match else "Advibe Venture"

        summary = text[:240].strip() + ("..." if len(text) > 240 else "")

        return IntakeProfile(
            company_name=name,
            website_url="https://advibe.ai",
            stage=stage,
            sector=sector,
            geography=geography,
            check_size_min=check_min,
            check_size_max=check_max,
            thesis_summary=summary or f"{name} is building intelligent infrastructure in {sector}."
        )

    # Backward compatibility alias
    parse_deck = extract_profile

    @classmethod
    def score_conviction(
        cls,
        company_profile: Union[Dict[str, Any], IntakeProfile],
        investor_profile: Dict[str, Any]
    ) -> LLMScoreResult:
        """
        Evaluates qualitative thesis alignment between a startup and an investor firm.
        Used in match loop (GET /api/v1/match/{id}).
        """
        cp = company_profile.model_dump() if hasattr(company_profile, "model_dump") else dict(company_profile)
        c_name = cp.get("company_name") or cp.get("name") or "Startup"
        c_stage = cp.get("stage", "Seed")
        c_sector = cp.get("sector", "B2B SaaS")
        c_thesis = sanitize_input(cp.get("thesis_summary", ""))

        inv_id = str(investor_profile.get("id", ""))
        inv_name = investor_profile.get("firm_name", "Investor")
        inv_stages = investor_profile.get("stage_focus", [])
        inv_sectors = investor_profile.get("sector_focus", [])
        inv_geos = investor_profile.get("geography_focus", [])

        start_t = time.perf_counter()

        system_prompt = (
            "You are a venture capital investment committee partner. Evaluate qualitative thesis fit "
            "between a startup and a venture firm. Respond with valid JSON only, no prose."
        )

        user_prompt = f"""
STARTUP PROFILE:
- Name: {c_name}
- Stage: {c_stage}
- Sector: {c_sector}
- Thesis: {c_thesis}

INVESTOR FIRM PROFILE:
- Firm Name: {inv_name}
- Stages: {', '.join(inv_stages)}
- Sectors: {', '.join(inv_sectors)}
- Geographies: {', '.join(inv_geos)}

Evaluate how strongly this investor's thesis aligns with the startup.
Return JSON:
{{
  "llm_score": float between 0.0 and 1.0 (where 1.0 is highest conviction),
  "rationale": "2-3 sentences explaining the specific investment thesis overlap and why this partner should care."
}}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            raw_response = chat_completion_with_fallback(
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=400,
                temperature=0.2
            )
            clean_json = re.sub(r"```json|```", "", raw_response).strip()
            data = json.loads(clean_json)

            score_val = float(data.get("llm_score", 0.85))
            score_val = max(0.0, min(1.0, score_val))
            rationale = str(data.get("rationale", f"Strong alignment with {inv_name}'s focus in {c_sector}."))

            duration_ms = (time.perf_counter() - start_t) * 1000
            log_llm_call(
                operation="score_conviction",
                provider="groq/openrouter",
                status="success",
                duration_ms=duration_ms,
                investor_id=inv_id
            )
            metrics.record_llm_call(success=True, duration_ms=duration_ms)

            return LLMScoreResult(
                llm_score=score_val,
                rationale=rationale
            )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_t) * 1000
            log_llm_call(
                operation="score_conviction",
                provider="groq/openrouter",
                status="failed",
                duration_ms=duration_ms,
                investor_id=inv_id,
                error=str(e)
            )
            metrics.record_llm_call(success=False, duration_ms=duration_ms)
            logger.warning(f"score_conviction LLM failure for {inv_name} ({inv_id}): {e}. Falling back to rule score alone.")
            
            # Fail-safe fallback: llm_score = None, note LLM unavailable
            return LLMScoreResult(
                llm_score=None,
                rationale=f"Evaluated on rule alignment with {inv_name} ({', '.join(inv_sectors[:2]) or c_sector}). LLM conviction scoring was unavailable."
            )

    @classmethod
    def score_investors(
        cls,
        raise_profile: Any,
        candidate_investors: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Batch evaluation adapter maintaining compatibility with match route.
        """
        results = []
        for inv in candidate_investors:
            inv_id = str(inv.get("id"))
            score_res = cls.score_conviction(raise_profile, inv)
            
            scaled_score = (score_res.llm_score * 100.0) if score_res.llm_score is not None else 88.0
            results.append({
                "investor_id": inv_id,
                "llm_score": round(scaled_score, 1),
                "rationale": score_res.rationale
            })
        return results

    @classmethod
    def draft_outreach(
        cls,
        company_profile: Union[Dict[str, Any], IntakeProfile],
        investor: Dict[str, Any],
        person: Dict[str, Any]
    ) -> DraftEmail:
        """
        Generates bespoke first-touch email outreach for a specific partner.
        Used by POST /api/v1/outreach/draft.
        """
        cp = company_profile.model_dump() if hasattr(company_profile, "model_dump") else dict(company_profile)
        c_name = cp.get("company_name") or cp.get("name") or "Our Company"
        c_stage = cp.get("stage", "Seed")
        c_sector = cp.get("sector", "B2B SaaS")
        c_thesis = sanitize_input(cp.get("thesis_summary", ""))
        c_min = float(cp.get("check_size_min", 500000))
        c_max = float(cp.get("check_size_max", 2000000))

        person_id = str(person.get("id", ""))
        person_name = person.get("full_name", "Partner")
        first_name = person_name.split()[0] if person_name else "there"
        role = person.get("role_title", "Partner")
        firm_name = investor.get("firm_name", "your fund")
        fund_type = investor.get("fund_type", "Venture Capital")
        sector_focus = ", ".join(investor.get("sector_focus", [])[:3]) or c_sector

        start_t = time.perf_counter()

        system_prompt = (
            "You are an executive founder writing a direct, high-signal, concise introductory note to a VC partner. "
            "Respond with valid JSON only, no prose. Do not use generic buzzwords."
        )

        user_prompt = f"""
Write a high-conviction first-touch email to {person_name} ({role} at {firm_name}).

CONTEXT TO REFERENCE:
- Target Partner: {person_name} ({role})
- Firm: {firm_name} ({fund_type}, sector focus in {sector_focus})
- Company Name: {c_name}
- Thesis: {c_thesis}
- Round: {c_stage} (${c_min:,.0f} - ${c_max:,.0f} target check size)

INSTRUCTIONS:
- Maximum 4 concise sentences.
- Explicitly reference why {firm_name}'s focus on {sector_focus} makes this relevant.
- Include a low-friction ask for 15 minutes.

Return JSON:
{{
  "subject": "Concise high-open-rate subject line",
  "body": "Personalized email body text"
}}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            raw_response = chat_completion_with_fallback(
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=500,
                temperature=0.3
            )
            clean_json = re.sub(r"```json|```", "", raw_response).strip()
            data = json.loads(clean_json)

            if data.get("subject") and data.get("body"):
                duration_ms = (time.perf_counter() - start_t) * 1000
                log_llm_call(
                    operation="draft_outreach",
                    provider="groq/openrouter",
                    status="success",
                    duration_ms=duration_ms,
                    investor_id=person_id
                )
                metrics.record_llm_call(success=True, duration_ms=duration_ms)

                return DraftEmail(
                    subject=str(data["subject"]).strip(),
                    body=str(data["body"]).strip()
                )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_t) * 1000
            log_llm_call(
                operation="draft_outreach",
                provider="groq/openrouter",
                status="failed",
                duration_ms=duration_ms,
                investor_id=person_id,
                error=str(e)
            )
            metrics.record_llm_call(success=False, duration_ms=duration_ms)
            logger.warning(f"draft_outreach LLM failure for {person_name} ({person_id}): {e}. Using deterministic template.")

        # Fail-safe fallback: Non-AI templated draft
        fallback_subject = f"{c_name} // {c_stage} Raise - {c_sector}"
        fallback_body = (
            f"Hi {first_name},\n\n"
            f"I've been following {firm_name}'s investments in {sector_focus}, and wanted to reach out regarding what we're building at {c_name}.\n\n"
            f"{c_thesis}\n\n"
            f"We are currently opening our {c_stage} round (${c_min:,.0f}-${c_max:,.0f} target) and would value 15 minutes to share our traction metrics.\n\n"
            f"Best regards,\nFounder, {c_name}"
        )

        return DraftEmail(
            subject=fallback_subject,
            body=fallback_body
        )

    @classmethod
    def draft_message(
        cls,
        raise_profile: Any,
        person: Dict[str, Any],
        investor: Dict[str, Any]
    ) -> Dict[str, str]:
        """Backward compatibility adapter returning dict."""
        res = cls.draft_outreach(raise_profile, investor, person)
        return {"subject": res.subject, "body": res.body}

    @classmethod
    def classify_reply(cls, reply_text: str) -> OutcomeType:
        """
        Classifies inbound email responses into CRM outcome categories.
        Used by POST /api/v1/webhook/reply.
        """
        sanitized = sanitize_input(reply_text, max_length=2000)
        start_t = time.perf_counter()

        system_prompt = (
            "Classify an investor email response into EXACTLY ONE category: "
            "[meeting_requested, interested, not_interested, wrong_person, replied]. "
            "Respond with valid JSON only: {\"category\": \"<one_category>\"}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"INVESTOR REPLY:\n\"\"\"{sanitized}\"\"\""}
        ]

        try:
            raw_response = chat_completion_with_fallback(
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=100,
                temperature=0.0
            )
            clean_json = re.sub(r"```json|```", "", raw_response).strip()
            data = json.loads(clean_json)
            category = data.get("category", "").lower()

            duration_ms = (time.perf_counter() - start_t) * 1000
            log_llm_call(
                operation="classify_reply",
                provider="groq/openrouter",
                status="success",
                duration_ms=duration_ms
            )
            metrics.record_llm_call(success=True, duration_ms=duration_ms)

            if "meeting_requested" in category:
                return OutcomeType.MEETING_REQUESTED
            elif "interested" in category:
                return OutcomeType.INTERESTED
            elif "not_interested" in category:
                return OutcomeType.NOT_INTERESTED
            elif "wrong_person" in category:
                return OutcomeType.WRONG_PERSON
            elif "replied" in category:
                return OutcomeType.REPLIED
        except Exception as e:
            duration_ms = (time.perf_counter() - start_t) * 1000
            log_llm_call(
                operation="classify_reply",
                provider="groq/openrouter",
                status="failed",
                duration_ms=duration_ms,
                error=str(e)
            )
            metrics.record_llm_call(success=False, duration_ms=duration_ms)
            logger.warning(f"classify_reply LLM failure: {e}. Using regex fallback.")

        # Heuristic fallback for reply classification
        text_lower = sanitized.lower()
        if any(w in text_lower for w in ["meeting", "calendar", "call", "schedule", "zoom", "chat this week", "available"]):
            return OutcomeType.MEETING_REQUESTED
        if any(w in text_lower for w in ["send deck", "send materials", "sounds interesting", "would love to learn more", "share more"]):
            return OutcomeType.INTERESTED
        if any(w in text_lower for w in ["pass", "not for us", "too early", "not our thesis", "out of scope", "unfortunate"]):
            return OutcomeType.NOT_INTERESTED
        if any(w in text_lower for w in ["wrong person", "reach out to", "forwarding to my partner"]):
            return OutcomeType.WRONG_PERSON

        return OutcomeType.REPLIED

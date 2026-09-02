"""
Unit Tests for Advibe AI Service Layer
-------------------------------------
Tests multi-provider fallback mechanics (Groq -> OpenRouter -> Rule-based Heuristics).
"""

import json
import pytest
from unittest.mock import patch, MagicMock
from openai import RateLimitError, APIConnectionError
from app.services.ai_service import AIService, sanitize_input
from app.models.schemas import IntakeProfile, LLMScoreResult, DraftEmail, OutcomeType
from app.core.config import settings


@pytest.fixture(autouse=True)
def setup_env():
    """Ensure mock API keys and provider order are populated for unit tests."""
    settings.GROQ_API_KEY = "gsk_test_mock_key"
    settings.OPENROUTER_API_KEY = "sk-or-v1-test_mock_key"
    settings.LLM_PROVIDER_ORDER = ["groq", "openrouter"]


def create_mock_completion(content_dict_or_str):
    """Helper to mock OpenAI chat completion response."""
    if isinstance(content_dict_or_str, dict):
        content = json.dumps(content_dict_or_str)
    else:
        content = str(content_dict_or_str)

    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_resp.choices = [mock_choice]
    return mock_resp


# ==============================================================================
# 1. Sanitization Tests
# ==============================================================================

def test_sanitize_input():
    html_input = "<html><body><h1>FinFlow AI</h1><p>Raising $1.5M Seed round.</p></body></html>"
    sanitized = sanitize_input(html_input, max_length=100)
    assert "<" not in sanitized
    assert ">" not in sanitized
    assert "FinFlow AI" in sanitized
    assert len(sanitized) <= 100


# ==============================================================================
# 2. Happy Path on Primary Provider (Groq)
# ==============================================================================

@patch("app.core.llm_client.get_client")
def test_extract_profile_groq_happy_path(mock_get_client):
    mock_groq_client = MagicMock()
    mock_payload = {
        "company_name": "FinFlow AI",
        "website_url": "https://finflow.ai",
        "stage": "Seed",
        "sector": "Fintech",
        "geography": "US + India",
        "check_size_min": 500000.0,
        "check_size_max": 2000000.0,
        "thesis_summary": "Automated treasury workflows for mid-market CFOs."
    }
    mock_groq_client.chat.completions.create.return_value = create_mock_completion(mock_payload)
    mock_get_client.return_value = mock_groq_client

    raw_text = "FinFlow AI is raising $1.5M Seed to automate corporate treasury."
    profile = AIService.extract_profile(raw_text)

    assert isinstance(profile, IntakeProfile)
    assert profile.company_name == "FinFlow AI"
    assert profile.stage == "Seed"
    assert profile.sector == "Fintech"
    assert profile.check_size_max == 2000000.0


@patch("app.core.llm_client.get_client")
def test_score_conviction_groq_happy_path(mock_get_client):
    mock_groq_client = MagicMock()
    mock_payload = {
        "llm_score": 0.94,
        "rationale": "Exceptional fit with Sequoia's active investments in cross-border fintech infrastructure."
    }
    mock_groq_client.chat.completions.create.return_value = create_mock_completion(mock_payload)
    mock_get_client.return_value = mock_groq_client

    company = {
        "name": "FinFlow AI",
        "stage": "Seed",
        "sector": "Fintech",
        "thesis_summary": "Automated treasury workflows."
    }
    investor = {
        "firm_name": "Sequoia Capital",
        "stage_focus": ["Seed", "Series A"],
        "sector_focus": ["Fintech", "AI/ML"],
        "geography_focus": ["US", "India"]
    }

    result = AIService.score_conviction(company, investor)

    assert isinstance(result, LLMScoreResult)
    assert result.llm_score == 0.94
    assert "Sequoia" in result.rationale


@patch("app.core.llm_client.get_client")
def test_draft_outreach_groq_happy_path(mock_get_client):
    mock_groq_client = MagicMock()
    mock_payload = {
        "subject": "FinFlow AI // Seed Raise - Automated Treasury Workflows",
        "body": "Hi Roelof,\n\nI've been following Sequoia's leadership in fintech. We are building FinFlow AI."
    }
    mock_groq_client.chat.completions.create.return_value = create_mock_completion(mock_payload)
    mock_get_client.return_value = mock_groq_client

    company = {
        "name": "FinFlow AI",
        "stage": "Seed",
        "sector": "Fintech",
        "thesis_summary": "Automated treasury workflows.",
        "check_size_min": 500000,
        "check_size_max": 2000000
    }
    investor = {
        "firm_name": "Sequoia Capital",
        "fund_type": "Venture Capital",
        "sector_focus": ["Fintech", "Enterprise SaaS"]
    }
    person = {
        "full_name": "Roelof Botha",
        "role_title": "Managing Partner"
    }

    draft = AIService.draft_outreach(company, investor, person)

    assert isinstance(draft, DraftEmail)
    assert "FinFlow AI" in draft.subject
    assert "Roelof" in draft.body


# ==============================================================================
# 3. Fallthrough from Groq to OpenRouter (Provider Resilience)
# ==============================================================================

@patch("app.core.llm_client.get_client")
def test_groq_failure_falls_through_to_openrouter(mock_get_client):
    mock_groq_client = MagicMock()
    # Simulate Groq 429 RateLimitError
    mock_groq_client.chat.completions.create.side_effect = RateLimitError(
        message="Rate limit reached on Groq",
        response=MagicMock(status_code=429),
        body=None
    )

    mock_openrouter_client = MagicMock()
    mock_payload = {
        "company_name": "OpenRouter FinFlow",
        "website_url": "https://finflow.ai",
        "stage": "Series A",
        "sector": "Fintech",
        "geography": "Global",
        "check_size_min": 1000000.0,
        "check_size_max": 5000000.0,
        "thesis_summary": "Extracted via OpenRouter fallback after Groq 429."
    }
    mock_openrouter_client.chat.completions.create.return_value = create_mock_completion(mock_payload)

    def client_router(provider):
        if provider == "groq":
            return mock_groq_client
        elif provider == "openrouter":
            return mock_openrouter_client
        raise ValueError(provider)

    mock_get_client.side_effect = client_router

    profile = AIService.extract_profile("OpenRouter FinFlow is raising $5M Series A.")

    assert isinstance(profile, IntakeProfile)
    assert profile.company_name == "OpenRouter FinFlow"
    assert profile.stage == "Series A"


# ==============================================================================
# 4. Total Provider Failure Triggers Rule-Based Heuristic Fallbacks (Never Errors)
# ==============================================================================

@patch("app.core.llm_client.get_client")
def test_all_providers_fail_extract_profile_heuristic_fallback(mock_get_client):
    # Simulate total network failure across all LLM providers
    mock_failing_client = MagicMock()
    mock_failing_client.chat.completions.create.side_effect = Exception("API connection failure")
    mock_get_client.return_value = mock_failing_client

    raw_text = "Acme Robotics is raising a $4M Series A in Climate Tech across India."
    profile = AIService.extract_profile(raw_text)

    # Must return a valid IntakeProfile via regex heuristics without throwing
    assert isinstance(profile, IntakeProfile)
    assert profile.company_name == "Acme Robotics"
    assert profile.stage == "Series A"
    assert profile.sector == "Climate Tech"
    assert "India" in profile.geography


@patch("app.core.llm_client.get_client")
def test_all_providers_fail_score_conviction_heuristic_fallback(mock_get_client):
    mock_failing_client = MagicMock()
    mock_failing_client.chat.completions.create.side_effect = Exception("Service unavailable")
    mock_get_client.return_value = mock_failing_client

    company = {"name": "Acme", "stage": "Seed", "sector": "AI/ML", "thesis_summary": "AI agents"}
    investor = {"firm_name": "Lightspeed", "sector_focus": ["AI/ML"]}

    result = AIService.score_conviction(company, investor)

    # Must return LLMScoreResult with llm_score=None so composite formula falls back to rule score
    assert isinstance(result, LLMScoreResult)
    assert result.llm_score is None
    assert "unavailable" in result.rationale.lower()


@patch("app.core.llm_client.get_client")
def test_all_providers_fail_draft_outreach_heuristic_fallback(mock_get_client):
    mock_failing_client = MagicMock()
    mock_failing_client.chat.completions.create.side_effect = Exception("Outage")
    mock_get_client.return_value = mock_failing_client

    company = {
        "name": "CloudNova",
        "stage": "Seed",
        "sector": "B2B SaaS",
        "thesis_summary": "Automated serverless observability.",
        "check_size_min": 500000,
        "check_size_max": 1500000
    }
    investor = {"firm_name": "Accel", "sector_focus": ["B2B SaaS"]}
    person = {"full_name": "Sameer Gandhi", "role_title": "Partner"}

    draft = AIService.draft_outreach(company, investor, person)

    # Must return a valid non-empty DraftEmail using deterministic template
    assert isinstance(draft, DraftEmail)
    assert "CloudNova" in draft.subject
    assert "Sameer" in draft.body
    assert "Accel" in draft.body

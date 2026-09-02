"""
Advibe Multi-Provider LLM Client Layer
--------------------------------------
Architecture Rationale:
- Groq (Primary): Selected for ultra low-latency LPU inference on open-weights models (Llama 3.3 70B),
  delivering instantaneous responses with a generous free tier for high-frequency intake and scoring.
- OpenRouter (Fallback): Aggregates dozens of top upstream providers behind a unified OpenAI-compatible
  API key. If Groq experiences rate limits (429), capacity degradation, or outages, OpenRouter seamlessly
  picks up identical payloads (e.g. DeepSeek-R1 / Llama 3.3) before any rule-based heuristic fallback is needed.
"""

import time
import logging
from typing import List, Dict, Any, Optional
from openai import OpenAI, APIError, RateLimitError, APIConnectionError, Timeout
from app.core.config import settings

logger = logging.getLogger("advibe.llm_client")

# Provider base URLs for OpenAI-compatible endpoints
PROVIDER_BASE_URLS = {
    "groq": "https://api.groq.com/openai/v1",
    "openrouter": "https://openrouter.ai/api/v1"
}


def get_client(provider: str) -> OpenAI:
    """
    Factory creating an OpenAI SDK client configured for the specified provider.
    """
    provider_key = provider.lower()
    if provider_key == "groq":
        api_key = settings.GROQ_API_KEY or "dummy-key-for-test"
        base_url = PROVIDER_BASE_URLS["groq"]
    elif provider_key == "openrouter":
        api_key = settings.OPENROUTER_API_KEY or "dummy-key-for-test"
        base_url = PROVIDER_BASE_URLS["openrouter"]
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")

    return OpenAI(api_key=api_key, base_url=base_url)


def get_model_for_provider(provider: str) -> str:
    """
    Returns the configured model string for a given provider.
    """
    if provider.lower() == "groq":
        return settings.GROQ_MODEL
    elif provider.lower() == "openrouter":
        return settings.OPENROUTER_MODEL
    return "llama-3.3-70b-versatile"


def chat_completion_with_fallback(
    messages: List[Dict[str, str]],
    response_format: Optional[Dict[str, Any]] = None,
    max_tokens: int = 1500,
    temperature: float = 0.2
) -> str:
    """
    Executes a chat completion across providers in LLM_PROVIDER_ORDER with retry
    and exponential backoff (max 2 attempts per provider, base delay 500ms).

    Tries providers in sequence (Groq -> OpenRouter) and returns the first success.
    Logs warnings upon individual provider failures before falling through.
    """
    providers = settings.LLM_PROVIDER_ORDER or ["groq", "openrouter"]
    last_exception = None

    for provider in providers:
        provider_name = provider.lower()
        model_name = get_model_for_provider(provider_name)
        
        # Verify API key exists unless in test/mock environment
        api_key = settings.GROQ_API_KEY if provider_name == "groq" else settings.OPENROUTER_API_KEY
        if not api_key:
            logger.warning(f"LLM Provider '{provider_name}' skipped: No API key configured in environment.")
            continue

        try:
            client = get_client(provider_name)
        except Exception as e:
            logger.warning(f"Failed to instantiate client for provider '{provider_name}': {e}")
            continue

        # Retry with exponential backoff (max 2 attempts per provider, base delay 500ms)
        max_attempts = 2
        for attempt in range(1, max_attempts + 1):
            try:
                kwargs: Dict[str, Any] = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
                if response_format:
                    kwargs["response_format"] = response_format

                # Extra headers for OpenRouter rankings/attribution
                if provider_name == "openrouter":
                    kwargs["extra_headers"] = {
                        "HTTP-Referer": "https://advibe.ai",
                        "X-Title": "Advibe AI Investor Intelligence"
                    }

                response = client.chat.completions.create(**kwargs)
                if response.choices and len(response.choices) > 0:
                    content = response.choices[0].message.content or ""
                    return content.strip()
                raise APIError("Empty response returned from provider choices.", request=None, body=None)

            except (RateLimitError, APIConnectionError, Timeout) as retryable_err:
                last_exception = retryable_err
                if attempt < max_attempts:
                    backoff_delay = 0.5 * (2 ** (attempt - 1))  # 500ms, 1000ms
                    logger.warning(
                        f"Transient error on {provider_name} (attempt {attempt}/{max_attempts}): {retryable_err}. "
                        f"Retrying in {backoff_delay}s..."
                    )
                    time.sleep(backoff_delay)
                else:
                    logger.warning(f"Provider '{provider_name}' exhausted {max_attempts} attempts: {retryable_err}")

            except Exception as non_retryable_err:
                last_exception = non_retryable_err
                logger.warning(f"Non-retryable error on provider '{provider_name}': {non_retryable_err}")
                break

    # If all configured providers have failed
    raise RuntimeError(f"All LLM providers failed in LLM_PROVIDER_ORDER ({providers}). Last error: {last_exception}")

import os
from typing import List
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
if _ENV_PATH.exists():
    load_dotenv(_ENV_PATH, override=True)
else:
    load_dotenv(override=True)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_PATH if _ENV_PATH.exists() else ".env", extra="ignore")

    PROJECT_NAME: str = "Advibe API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database Configuration (Docker Compose PostgreSQL / Supabase)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://advibe_user:advibe_password@localhost:5432/advibe")

    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "your-anon-key")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-service-role-key")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-token-with-at-least-32-chars-long")

    # LLM Provider Configuration
    # Groq (Primary): Ultra low-latency inference on open weights (Qwen / Llama), generous tier.
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

    # OpenRouter (Fallback): Multi-provider aggregator (DeepSeek-R1 / Llama), guarantees high availability.
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-r1")

    # Provider fallback execution order
    LLM_PROVIDER_ORDER: List[str] = ["groq", "openrouter"]

    # Legacy Gemini Configuration (Optional)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Outreach (Resend) Configuration
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "re_mock_key")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "Advibe <outreach@advibe.ai>")
    RESEND_WEBHOOK_SECRET: str = os.getenv("RESEND_WEBHOOK_SECRET", "whsec_mock_secret")

    # Rate Limiting & Security
    CORS_ORIGINS: List[str] = ["*"]
    INTAKE_RATE_LIMIT: str = "10/minute"
    SEND_RATE_LIMIT: str = "30/minute"

    # Integration Encryption (Fernet at rest)
    HEYREACH_ENCRYPTION_KEY: str = os.getenv("HEYREACH_ENCRYPTION_KEY", "uO7kP9Zq4qM8wY7x3L4bA1s8D9f2G5h6J7k8L9z0X1c=")

    # Razorpay Payment Gateway Configuration
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_advibe_mock_key")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "rzp_secret_advibe_mock_secret")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "rzp_whsec_advibe_mock")

    # MSG91 SMS Service Configuration
    MSG91_AUTH_KEY: str = os.getenv("MSG91_AUTH_KEY", "")
    MSG91_TEMPLATE_ID: str = os.getenv("MSG91_TEMPLATE_ID", "")
    MSG91_SENDER_ID: str = os.getenv("MSG91_SENDER_ID", "ADVIBE")

    # Manual QR Fallback (Default False)
    MANUAL_QR_ENABLED: bool = os.getenv("MANUAL_QR_ENABLED", "false").lower() in ("true", "1", "yes")

settings = Settings()


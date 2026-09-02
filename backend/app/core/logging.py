"""
Advibe Structured JSON Logging Subsystem
----------------------------------------
Implements high-performance, single-line JSON structured logging with request_id correlation,
automatic context tracking via ContextVars, duration metrics, and foolproof crash safety.
"""

import sys
import json
import logging
from datetime import datetime, timezone
from contextvars import ContextVar
from typing import Optional, Dict, Any

# ContextVar for propagating request_id through asynchronous execution
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class StructuredJsonFormatter(logging.Formatter):
    """
    Formats LogRecord instances into clean, single-line JSON strings.
    Guaranteed never to throw an exception or crash execution.
    """

    def format(self, record: logging.LogRecord) -> str:
        try:
            # 1. Base structured fields
            log_data: Dict[str, Any] = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage()
            }

            # 2. Extract request correlation ID from ContextVar or record extra
            req_id = getattr(record, "request_id", None) or request_id_ctx.get()
            if req_id:
                log_data["request_id"] = req_id

            # 3. HTTP Request fields if attached
            if hasattr(record, "method"):
                log_data["method"] = record.method
            if hasattr(record, "path"):
                log_data["path"] = record.path
            if hasattr(record, "status_code"):
                log_data["status_code"] = record.status_code
            if hasattr(record, "duration_ms"):
                log_data["duration_ms"] = round(float(record.duration_ms), 2)

            # 4. Contextual properties & metadata
            if hasattr(record, "props") and isinstance(record.props, dict):
                log_data.update(record.props)

            # 5. Exception traceback formatting
            if record.exc_info:
                log_data["exception"] = self.formatException(record.exc_info)

            return json.dumps(log_data, default=str)

        except Exception as fmt_err:
            # Absolute fallback if JSON serialization fails
            fallback_msg = f"{record.levelname}: {record.getMessage()} [Logging serialization error: {fmt_err}]"
            try:
                return json.dumps({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "level": "ERROR",
                    "logger": "advibe.logging_fallback",
                    "message": fallback_msg
                })
            except Exception:
                return fallback_msg


def setup_logger(name: str = "advibe") -> logging.Logger:
    """Configures and returns the primary structured logger singleton."""
    log = logging.getLogger(name)
    log.setLevel(logging.INFO)

    # Avoid duplicate handlers on hot reload
    if not log.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJsonFormatter())
        log.addHandler(handler)
        log.propagate = False

    return log


logger = setup_logger()


def log_request(method: str, path: str, status_code: int, duration_ms: float, request_id: Optional[str] = None):
    """Logs completion of an HTTP request with timing and status code."""
    extra = {
        "request_id": request_id or request_id_ctx.get(),
        "method": method,
        "path": path,
        "status_code": status_code,
        "duration_ms": duration_ms
    }
    level = logging.INFO if status_code < 400 else (logging.WARNING if status_code < 500 else logging.ERROR)
    logger.log(
        level,
        f"{method} {path} HTTP {status_code} - {duration_ms:.2f}ms",
        extra=extra
    )


def log_llm_call(
    operation: str,
    provider: str,
    status: str,
    duration_ms: float = 0.0,
    company_id: Optional[str] = None,
    investor_id: Optional[str] = None,
    error: Optional[str] = None
):
    """Structured telemetry logging for LLM inferences (Groq / OpenRouter)."""
    props = {
        "event": "llm_inference",
        "operation": operation,
        "provider": provider,
        "status": status,
        "duration_ms": round(duration_ms, 2)
    }
    if company_id:
        props["company_id"] = company_id
    if investor_id:
        props["investor_id"] = investor_id
    if error:
        props["error"] = error

    level = logging.INFO if status == "success" else logging.WARNING
    logger.log(
        level,
        f"LLM [{operation}] on {provider} status: {status} ({duration_ms:.1f}ms)",
        extra={"props": props}
    )


def log_outreach_send(
    message_id: str,
    recipient_email: str,
    channel: str,
    status: str,
    campaign_id: Optional[str] = None,
    error: Optional[str] = None
):
    """Structured telemetry logging for outreach email dispatch."""
    # Mask recipient email slightly to prevent PII exposure in logs (e.g. j***@firm.com)
    masked_email = recipient_email
    if "@" in recipient_email:
        user_part, domain = recipient_email.split("@", 1)
        masked_email = f"{user_part[:1]}***@{domain}"

    props = {
        "event": "outreach_send",
        "message_id": message_id,
        "recipient_masked": masked_email,
        "channel": channel,
        "status": status
    }
    if campaign_id:
        props["campaign_id"] = campaign_id
    if error:
        props["error"] = error

    level = logging.INFO if status == "sent" else logging.WARNING
    logger.log(
        level,
        f"Outreach message {message_id} -> {masked_email} [{channel}] status: {status}",
        extra={"props": props}
    )

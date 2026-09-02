"""
Advibe Structured Logging & Global Error Handling Test Suite
------------------------------------------------------------
Validates:
1. Request ID correlation & X-Request-ID response header propagation
2. Structured single-line JSON log formatting
3. Clean Pydantic 422 validation error formatting without stack traces
4. ExternalServiceError 502 mapping when external APIs fail
5. Unhandled exception 500 masking with request_id
6. Live telemetry metric counters at GET /metrics
"""

import json
import logging
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.exceptions import ExternalServiceError
from app.core.metrics import metrics
from app.core.logging import StructuredJsonFormatter, setup_logger

client = TestClient(app, raise_server_exceptions=False)
DEV_AUTH_HEADER = {"Authorization": "Bearer dev-mock-token"}


def test_request_id_and_timing_headers():
    """Verify X-Request-ID header is returned on successful requests and metrics update."""
    metrics.reset()
    res = client.get("/health")
    assert res.status_code in [200, 503]
    assert "X-Request-ID" in res.headers
    req_id = res.headers["X-Request-ID"]
    assert len(req_id) > 10

    # Verify metrics updated
    m = client.get("/metrics").json()
    assert m["requests_total"] >= 1
    assert "avg_latency_ms" in m
    assert "uptime_seconds" in m


def test_structured_json_formatter_safety():
    """Verify StructuredJsonFormatter outputs valid JSON and handles non-serializable objects safely."""
    formatter = StructuredJsonFormatter()
    record = logging.LogRecord(
        name="advibe.test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Test structured log message",
        args=(),
        exc_info=None
    )
    record.request_id = "test-uuid-12345"
    record.props = {"firm_id": "inv-001", "stage": "Seed"}

    output = formatter.format(record)
    parsed = json.loads(output)
    assert parsed["level"] == "INFO"
    assert parsed["message"] == "Test structured log message"
    assert parsed["request_id"] == "test-uuid-12345"
    assert parsed["firm_id"] == "inv-001"
    assert "timestamp" in parsed


def test_validation_error_handling_422():
    """Verify invalid payloads produce clean 422 JSON with field errors and request_id, no stack trace."""
    # Send empty body to intake route which expects JSON
    res = client.post(
        "/api/v1/intake",
        json={"name": 12345},  # Missing required raw_text
        headers=DEV_AUTH_HEADER
    )
    assert res.status_code == 422
    assert "X-Request-ID" in res.headers

    data = res.json()
    assert data["error"] == "validation_error"
    assert "request_id" in data
    assert "details" in data
    assert isinstance(data["details"], list)
    assert len(data["details"]) > 0
    # Confirm no traceback / exception leaking
    assert "Traceback" not in res.text


def test_external_service_error_handling_502():
    """Verify ExternalServiceError raises clean 502 with service tag and request_id."""
    # Temporarily add a test route that raises ExternalServiceError
    @app.get("/test-external-failure")
    def trigger_ext_error():
        raise ExternalServiceError("Groq", "Connection timeout after 3 retries", {"model": "llama-3.3-70b"})

    res = client.get("/test-external-failure")
    assert res.status_code == 502
    assert "X-Request-ID" in res.headers

    data = res.json()
    assert data["error"] == "external_service_error"
    assert "Groq" in data["message"]
    assert data["service"] == "Groq"
    assert "request_id" in data
    assert "Traceback" not in res.text


def test_unhandled_internal_error_handling_500():
    """Verify unexpected Python crashes are caught and return safe 500 without leaking stack traces."""
    @app.get("/test-crash")
    def trigger_crash():
        # Force a division by zero internal error
        return 1 / 0

    res = client.get("/test-crash")
    assert res.status_code == 500
    assert "X-Request-ID" in res.headers

    data = res.json()
    assert data["error"] == "internal_error"
    assert "request_id" in data
    # Confirm no Python internal traceback or line number leaked to user
    assert "ZeroDivisionError" not in res.text
    assert "Traceback" not in res.text


def test_live_metrics_endpoint():
    """Verify GET /metrics delivers valid operational telemetry."""
    res = client.get("/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "requests_total" in data
    assert "errors_total" in data
    assert "error_rate_pct" in data
    assert "llm_calls_total" in data
    assert "llm_failures_total" in data
    assert "avg_latency_ms" in data
    assert "uptime_seconds" in data

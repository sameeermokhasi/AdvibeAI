"""
Advibe FastAPI Backend Application Entrypoint
----------------------------------------------
Configured with structured JSON logging middleware, request ID correlation,
production-grade global exception handlers, and /metrics telemetry.
"""

import time
import uuid
from typing import Callable
from fastapi import FastAPI, Request, Response, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.logging import logger, log_request, request_id_ctx
from app.core.metrics import metrics
from app.core.exceptions import ExternalServiceError, AdvibeException
from app.core.db import check_db_health
from app.services.scheduled_worker import start_scheduled_worker, stop_scheduled_worker
from app.routes import (
    intake, match, outreach, webhook, campaigns, investors, tracks,
    addy, twin_finder, resolve, account, auth_routes, watchlist_routes,
    exclusions, command_center, readiness, scheduled_jobs, billing
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduled_worker()
    yield
    stop_scheduled_worker()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Advibe — AI Investor Discovery & Relationship Operating System API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)


# Explicit CORS Origins Configuration for React Vite & Production
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in settings.CORS_ORIGINS else CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# 1. Structured Logging & Request Correlation Middleware
# ============================================================================
@app.middleware("http")
async def logging_and_timing_middleware(request: Request, call_next: Callable) -> Response:
    """
    Assigns a UUID request_id to each incoming request, measures duration,
    logs a single structured JSON line on completion, and attaches X-Request-ID.
    """
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = req_id
    token = request_id_ctx.set(req_id)

    start_time = time.perf_counter()
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-ID"] = req_id
        return response
    except Exception as exc:
        # Pass exception through to global exception handler
        raise exc
    finally:
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        # Record metrics telemetry
        metrics.record_request(status_code=status_code, duration_ms=duration_ms)

        # Emit structured log record safely
        try:
            log_request(
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                duration_ms=duration_ms,
                request_id=req_id
            )
        except Exception as log_err:
            print(f"[LOGGING FALLBACK ERROR] {request.method} {request.url.path} {status_code}: {log_err}")

        request_id_ctx.reset(token)


# ============================================================================
# 2. Global Exception Handlers
# ============================================================================

@app.exception_handler(ExternalServiceError)
async def external_service_error_handler(request: Request, exc: ExternalServiceError):
    """
    Handles upstream provider failures (Groq / OpenRouter / Resend) with HTTP 502.
    Logged at WARNING level distinctly from internal code bugs.
    """
    req_id = getattr(request.state, "request_id", None) or request_id_ctx.get() or str(uuid.uuid4())
    logger.warning(
        f"External service failure on {request.method} {request.url.path}: {exc.message}",
        extra={"props": {"service": exc.service_name, "details": exc.details, "request_id": req_id}}
    )
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        headers={"X-Request-ID": req_id},
        content={
            "error": "external_service_error",
            "message": exc.message,
            "service": exc.service_name,
            "request_id": req_id
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handles Pydantic payload validation errors with a clean, field-level 422 response.
    """
    req_id = getattr(request.state, "request_id", None) or request_id_ctx.get() or str(uuid.uuid4())
    formatted_errors = []
    for err in exc.errors():
        field_path = " -> ".join(str(loc) for loc in err.get("loc", []))
        formatted_errors.append({
            "field": field_path,
            "message": err.get("msg", "Invalid input"),
            "type": err.get("type", "value_error")
        })

    logger.warning(
        f"Validation error on {request.method} {request.url.path}: {len(formatted_errors)} issue(s)",
        extra={"props": {"validation_errors": formatted_errors, "request_id": req_id}}
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        headers={"X-Request-ID": req_id},
        content={
            "error": "validation_error",
            "message": "Input validation failed. Please check the request body fields.",
            "request_id": req_id,
            "details": formatted_errors
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handles explicit HTTPExceptions with request_id correlation.
    """
    req_id = getattr(request.state, "request_id", None) or request_id_ctx.get() or str(uuid.uuid4())
    return JSONResponse(
        status_code=exc.status_code,
        headers={"X-Request-ID": req_id},
        content={
            "error": "http_error",
            "detail": exc.detail,
            "request_id": req_id
        }
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catches all unexpected internal exceptions.
    Logs full stack trace at ERROR level and returns a safe, clean 500 response
    without leaking internal code details or stack traces to the client.
    """
    req_id = getattr(request.state, "request_id", None) or request_id_ctx.get() or str(uuid.uuid4())
    logger.error(
        f"Unhandled internal exception on {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
        extra={"request_id": req_id}
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        headers={"X-Request-ID": req_id},
        content={
            "error": "internal_error",
            "message": "An internal error occurred. Please contact support with the request ID.",
            "request_id": req_id
        }
    )


# ============================================================================
# 3. Mount Route Modules
# ============================================================================
app.include_router(intake.router)
app.include_router(match.router)
app.include_router(outreach.router)
app.include_router(webhook.router)
app.include_router(campaigns.router)
app.include_router(investors.router)
app.include_router(tracks.router)
app.include_router(addy.router)
app.include_router(twin_finder.router)
app.include_router(resolve.router)
app.include_router(account.router)
app.include_router(auth_routes.router)
app.include_router(watchlist_routes.router)
app.include_router(exclusions.router)
app.include_router(command_center.router)
app.include_router(readiness.router)
app.include_router(scheduled_jobs.router)
app.include_router(billing.router)



# ============================================================================
# 4. System Telemetry & Health Endpoints
# ============================================================================

@app.get("/metrics", tags=["Telemetry"], summary="Get Production Health Metrics")
async def get_metrics():
    """
    Exposes live production health counters:
    requests_total, errors_total, llm_calls_total, llm_failures_total, avg_latency_ms, uptime.
    """
    return metrics.get_metrics()


@app.get("/health", tags=["Health"], summary="Service & Database Health Ping")
async def health_check(response: Response):
    """
    Checks backend service status and direct PostgreSQL 15 connectivity (SELECT 1).
    Returns 200 if connected, 503 if database is unreachable.
    """
    db_status = check_db_health()
    is_healthy = db_status.get("status") == "healthy"
    
    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "healthy" if is_healthy else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to Advibe API — AI Investor Discovery & Relationship OS",
        "documentation": "/docs",
        "openapi_spec": "/openapi.json",
        "metrics": "/metrics"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

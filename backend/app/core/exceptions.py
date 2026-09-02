"""
Advibe Application Exceptions
-----------------------------
Custom domain exceptions for clean, typed error handling and mapping to HTTP status codes.
"""

from typing import Optional, Any, Dict


class AdvibeException(Exception):
    """Base exception for all Advibe application errors."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ExternalServiceError(AdvibeException):
    """
    Raised when an upstream third-party service (e.g. Groq, OpenRouter, Resend)
    fails or exhausts retries. Mapped to HTTP 502 Bad Gateway.
    """
    def __init__(self, service_name: str, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(f"[{service_name}] {message}", details)
        self.service_name = service_name


class DatabaseServiceError(AdvibeException):
    """Raised when a direct PostgreSQL query or connection pool fails."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details)


class EntityNotFoundError(AdvibeException):
    """Raised when a requested resource is not found."""
    def __init__(self, entity_name: str, entity_id: str):
        super().__init__(f"{entity_name} with ID '{entity_id}' not found.", {"entity": entity_name, "id": entity_id})
        self.entity_name = entity_name
        self.entity_id = entity_id

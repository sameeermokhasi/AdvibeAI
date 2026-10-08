"""
Advibe Security & Encryption Utilities
---------------------------------------
Provides:
1. Server-side email masking (e.g. j***@firm.com).
2. Fernet symmetric encryption and decryption for sensitive third-party credentials (HeyReach API keys).
3. Database helper to query unlocked person IDs for a user.
"""

import base64
from typing import Optional, Set
from cryptography.fernet import Fernet
from app.core.config import settings
from app.core.logging import logger
from app.core.db import get_db_cursor

def _get_fernet() -> Fernet:
    """Derives or formats a 32-byte url-safe base64 key for Fernet."""
    raw_key = settings.HEYREACH_ENCRYPTION_KEY or "uO7kP9Zq4qM8wY7x3L4bA1s8D9f2G5h6J7k8L9z0X1c="
    try:
        key_bytes = raw_key.encode("utf-8")
        if len(base64.urlsafe_b64decode(key_bytes)) == 32:
            return Fernet(key_bytes)
    except Exception:
        pass
    # Fallback deterministic derivation
    derived = base64.urlsafe_b64encode(raw_key.ljust(32, "x")[:32].encode("utf-8"))
    return Fernet(derived)


def encrypt_secret(secret_text: str) -> str:
    """Encrypts a plaintext string into a Fernet ciphertext token."""
    if not secret_text:
        return ""
    f = _get_fernet()
    return f.encrypt(secret_text.encode("utf-8")).decode("utf-8")


def decrypt_secret(ciphertext: str) -> str:
    """Decrypts a Fernet ciphertext token back into plaintext."""
    if not ciphertext:
        return ""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")


def mask_email(email: Optional[str]) -> str:
    """
    Computes a server-enforced masked email representation.
    Examples:
        john.doe@sequoiacap.com -> j***@sequoiacap.com
        a@firm.com -> a***@firm.com
        None -> "***@***.com"
    """
    if not email or "@" not in email:
        return "***@***.com"
    
    parts = email.strip().split("@", 1)
    user_part = parts[0]
    domain_part = parts[1] if len(parts) > 1 else "domain.com"
    
    if len(user_part) <= 1:
        prefix = user_part
    else:
        prefix = user_part[0]
        
    return f"{prefix}***@{domain_part}"


def get_unlocked_person_ids(user_id: Optional[str]) -> Set[str]:
    """Retrieves the set of person_ids unlocked by the specified user."""
    if not user_id:
        return set()
    try:
        with get_db_cursor(user_id=user_id, commit=False) as cur:
            cur.execute("SELECT person_id FROM public.investor_unlocks WHERE user_id = %s", [user_id])
            rows = cur.fetchall()
            return {str(r["person_id"]) for r in rows}
    except Exception as e:
        logger.warning(f"Error fetching unlocked person IDs for user {user_id}: {e}")
        return set()

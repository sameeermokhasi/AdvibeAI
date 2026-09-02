import hmac
import hashlib
import jwt
from fastapi import Depends, HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.logging import logger

security = HTTPBearer(auto_error=False)

class AuthenticatedUser:
    def __init__(self, id: str, email: str, token: str):
        self.id = id
        self.email = email
        self.token = token

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> AuthenticatedUser:
    if not credentials:
        if settings.ENVIRONMENT == "development":
            return AuthenticatedUser(
                id="00000000-0000-0000-0000-000000000001",
                email="founder@advibe.ai",
                token="dev-mock-token"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        user_id = payload.get("sub") or payload.get("id")
        email = payload.get("email", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims: sub missing"
            )
        return AuthenticatedUser(id=user_id, email=email, token=token)

    except jwt.PyJWTError as e:
        logger.warning(f"JWT Validation error: {str(e)}")
        if settings.ENVIRONMENT == "development" and (
            token.startswith("dev-") or token.startswith("test-") or "mock" in token
        ):
            return AuthenticatedUser(
                id="00000000-0000-0000-0000-000000000001",
                email="founder@advibe.ai",
                token=token
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def verify_webhook_signature(request_signature: str, payload_bytes: bytes) -> bool:
    if not settings.RESEND_WEBHOOK_SECRET:
        return True
    
    expected = hmac.new(
        settings.RESEND_WEBHOOK_SECRET.encode("utf-8"),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, request_signature)

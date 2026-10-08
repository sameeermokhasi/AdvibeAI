import hmac
import hashlib
import jwt
from fastapi import Depends, HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.logging import logger

security = HTTPBearer(auto_error=False)

class AuthenticatedUser:
    def __init__(self, id: str, email: str, token: str, phone_verified: bool = False, phone: str = None):
        self.id = id
        self.email = email
        self.token = token
        self.phone_verified = phone_verified
        self.phone = phone

async def get_current_user(
    request: Request = None,
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> AuthenticatedUser:
    if not credentials:
        if settings.ENVIRONMENT == "development":
            return AuthenticatedUser(
                id="00000000-0000-0000-0000-000000000001",
                email="founder@advibe.ai",
                token="dev-mock-token",
                phone_verified=True,
                phone="+919999999999"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg in ("ES256", "RS256", "RS384", "RS512", "ES384", "ES512"):
            try:
                jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
                jwks_client = jwt.PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[alg],
                    options={"verify_aud": False}
                )
            except Exception as jwks_err:
                logger.warning(f"Supabase JWKS verification note: {jwks_err}, decoding unverified in dev")
                if settings.ENVIRONMENT == "development":
                    payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
                else:
                    raise
        else:
            try:
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
            except Exception:
                if settings.ENVIRONMENT == "development":
                    payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
                else:
                    raise

        user_id = payload.get("sub") or payload.get("id")
        email = payload.get("email", "")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims: sub missing"
            )

        phone_verified = False
        phone_num = None
        try:
            from app.core.db import get_db_cursor
            with get_db_cursor(user_id=user_id, commit=True) as cur:
                cur.execute("SELECT phone, phone_verified_at FROM public.users WHERE id = %s;", (user_id,))
                user_row = cur.fetchone()
                if not user_row and user_id:
                    # Auto-provision OAuth user into public.users, subscriptions, and workspaces
                    cur.execute(
                        """INSERT INTO public.users (id, email, password_hash, created_at, updated_at)
                           VALUES (%s, %s, 'oauth_user', NOW(), NOW())
                           ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
                           RETURNING phone, phone_verified_at;""",
                        (user_id, email)
                    )
                    user_row = cur.fetchone()
                    cur.execute(
                        """INSERT INTO public.user_subscriptions (id, user_id, plan_tier, sparks_balance, sparks_monthly_quota, addy_messages_balance)
                           VALUES (gen_random_uuid(), %s, 'free_trial', 0.0, 10.0, 25)
                           ON CONFLICT (user_id) DO NOTHING;""",
                        (user_id,)
                    )
                    cur.execute(
                        """INSERT INTO public.workspaces (id, owner_user_id, name)
                           VALUES (gen_random_uuid(), %s, 'General')
                           ON CONFLICT DO NOTHING;""",
                        (user_id,)
                    )
                if user_row and user_row.get("phone_verified_at"):
                    phone_verified = True
                    phone_num = user_row.get("phone")
        except Exception as e:
            logger.warning(f"Error checking/provisioning user status: {e}")

        # In dev mode, if user is mock founder, default to verified
        if settings.ENVIRONMENT == "development" and user_id == "00000000-0000-0000-0000-000000000001":
            phone_verified = True
            phone_num = phone_num or "+919999999999"

        return AuthenticatedUser(
            id=user_id,
            email=email,
            token=token,
            phone_verified=phone_verified,
            phone=phone_num
        )

    except jwt.PyJWTError as e:
        logger.warning(f"JWT Validation error: {str(e)}")
        if settings.ENVIRONMENT == "development" and (
            token.startswith("dev-") or token.startswith("test-") or "mock" in token
        ):
            return AuthenticatedUser(
                id="00000000-0000-0000-0000-000000000001",
                email="founder@advibe.ai",
                token=token,
                phone_verified=True,
                phone="+919999999999"
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

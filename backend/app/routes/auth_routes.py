"""Authentication Routes — Signup, Login, Token Refresh, Logout"""
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
import jwt

from app.core.config import settings
from app.core.db import get_db_cursor
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.logging import logger

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except ImportError:
    pwd_context = None
    logger.warning("passlib not installed — password hashing unavailable")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
REFRESH_TOKEN_EXPIRE_DAYS = 30


class SignupRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field("", max_length=200)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


def _create_token(user_id: str, email: str, expires_delta: timedelta) -> str:
    payload = {
        "sub": str(user_id),
        "id": str(user_id),
        "email": email,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + expires_delta,
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest):
    if not pwd_context:
        raise HTTPException(500, "Password hashing unavailable")

    email = req.email.strip().lower()
    password_hash = pwd_context.hash(req.password)
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    try:
        with get_db_cursor(commit=True) as cur:
            # Check if email already exists
            cur.execute("SELECT id FROM public.users WHERE email = %s;", (email,))
            if cur.fetchone():
                raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

            # Create user
            cur.execute(
                """INSERT INTO public.users (id, email, password_hash, full_name, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, email, full_name, created_at;""",
                (user_id, email, password_hash, req.full_name.strip(), now, now)
            )

            # Create default workspace
            ws_id = str(uuid.uuid4())
            cur.execute(
                """INSERT INTO public.workspaces (id, name, owner_user_id, created_at)
                   VALUES (%s, %s, %s, %s);""",
                (ws_id, f"{req.full_name.strip() or 'My'}'s Workspace", user_id, now)
            )

            # Create subscription with free trial defaults
            cur.execute(
                """INSERT INTO public.user_subscriptions
                   (id, user_id, workspace_id, plan_tier, sparks_balance, sparks_monthly_quota,
                    addy_messages_balance, playbook_claims_balance, created_at, updated_at)
                   VALUES (%s, %s, %s, 'free_trial', 10.0, 10.0, 25, 1, %s, %s);""",
                (str(uuid.uuid4()), user_id, ws_id, now, now)
            )

            # Initial sparks grant ledger entry
            cur.execute(
                """INSERT INTO public.sparks_ledger (id, user_id, amount, action_type, description, created_at)
                   VALUES (%s, %s, 10.0, 'initial_grant', 'Welcome bonus: 10 free Sparks', %s);""",
                (str(uuid.uuid4()), user_id, now)
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup DB error: {e}")
        raise HTTPException(500, f"Failed to create account: {e}")

    access_token = _create_token(user_id, email, timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    refresh_token = _create_token(user_id, email, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        user={
            "id": user_id,
            "email": email,
            "full_name": req.full_name.strip(),
            "plan_tier": "free_trial",
            "sparks_balance": 10.0,
            "addy_messages_balance": 25,
            "workspace_name": f"{req.full_name.strip() or 'My'}'s Workspace"
        }
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    if not pwd_context:
        raise HTTPException(500, "Password hashing unavailable")

    email = req.email.strip().lower()

    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute(
                """SELECT u.id, u.email, u.password_hash, u.full_name,
                          COALESCE(s.plan_tier, 'free_trial') as plan_tier,
                          COALESCE(s.sparks_balance, 10.0) as sparks_balance,
                          COALESCE(s.addy_messages_balance, 25) as addy_messages_balance,
                          COALESCE(w.name, 'General') as workspace_name
                   FROM public.users u
                   LEFT JOIN public.user_subscriptions s ON u.id = s.user_id
                   LEFT JOIN public.workspaces w ON u.id = w.owner_user_id
                   WHERE u.email = %s;""",
                (email,)
            )
            user_row = cur.fetchone()
    except Exception as e:
        logger.error(f"Login DB error: {e}")
        raise HTTPException(500, "Authentication service unavailable")

    if not user_row:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    stored_hash = user_row.get("password_hash")
    if not stored_hash or not pwd_context.verify(req.password, stored_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    user_id = str(user_row["id"])
    access_token = _create_token(user_id, email, timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    refresh_token = _create_token(user_id, email, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        user={
            "id": user_id,
            "email": email,
            "full_name": user_row.get("full_name") or email.split('@')[0],
            "plan_tier": user_row.get("plan_tier", "free_trial"),
            "sparks_balance": float(user_row.get("sparks_balance", 10.0)),
            "addy_messages_balance": int(user_row.get("addy_messages_balance", 25)),
            "workspace_name": user_row.get("workspace_name", "General")
        }
    )


@router.post("/refresh")
async def refresh_token(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Issue a fresh access token using the current valid token."""
    access_token = _create_token(
        current_user.id, current_user.email,
        timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    return {"access_token": access_token, "token_type": "bearer", "expires_in": ACCESS_TOKEN_EXPIRE_HOURS * 3600}


@router.get("/me")
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Return the authenticated user's profile and subscription info."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=False) as cur:
            cur.execute(
                """SELECT u.id, u.email, u.full_name, u.created_at,
                          COALESCE(s.plan_tier, 'free_trial') as plan_tier,
                          COALESCE(s.billing_interval, 'monthly') as billing_interval,
                          COALESCE(s.sparks_balance, 10.0) as sparks_balance,
                          COALESCE(s.sparks_monthly_quota, 10.0) as sparks_monthly_quota,
                          COALESCE(s.addy_messages_balance, 25) as addy_messages_balance,
                          COALESCE(s.playbook_claims_balance, 1) as playbook_claims_balance,
                          COALESCE(s.discount_claimed, false) as discount_claimed,
                          COALESCE(w.name, 'General') as workspace_name
                   FROM public.users u
                   LEFT JOIN public.user_subscriptions s ON u.id = s.user_id
                   LEFT JOIN public.workspaces w ON w.owner_user_id = u.id
                   WHERE u.id = %s::uuid;""",
                (current_user.id,)
            )
            row = cur.fetchone()
            if not row:
                # In development fallback if dev user
                return {
                    "id": current_user.id,
                    "email": current_user.email,
                    "full_name": "Advibe Founder",
                    "plan_tier": "free_trial",
                    "billing_interval": "monthly",
                    "sparks_balance": 10.0,
                    "sparks_monthly_quota": 10.0,
                    "addy_messages_balance": 25,
                    "playbook_claims_balance": 1,
                    "discount_claimed": False,
                    "workspace_name": "General"
                }
            result = dict(row)
            for k, v in result.items():
                if hasattr(v, 'isoformat'):
                    result[k] = v.isoformat()
                elif isinstance(v, (int, float, str, bool, type(None))):
                    pass
                else:
                    result[k] = str(v)
            return result
    except Exception as e:
        logger.error(f"Get me error: {e}")
        return {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": "Advibe Founder",
            "plan_tier": "free_trial",
            "billing_interval": "monthly",
            "sparks_balance": 10.0,
            "sparks_monthly_quota": 10.0,
            "addy_messages_balance": 25,
            "playbook_claims_balance": 1,
            "discount_claimed": False,
            "workspace_name": "General"
        }

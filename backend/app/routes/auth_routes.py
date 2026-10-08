"""Authentication Routes — Signup, Login, Token Refresh, Logout, Phone OTP"""
import uuid
import secrets
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
import jwt

from app.core.config import settings
from app.core.db import get_db_cursor
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.logging import logger
from app.services.sms_service import send_sms, clean_phone_number, is_valid_e164

try:
    import bcrypt

    class BcryptPasswordHelper:
        @staticmethod
        def hash(secret: str) -> str:
            pw_bytes = secret.encode("utf-8")[:72]
            return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")

        @staticmethod
        def verify(secret: str, hash_val: str) -> bool:
            try:
                pw_bytes = secret.encode("utf-8")[:72]
                return bcrypt.checkpw(pw_bytes, hash_val.encode("utf-8"))
            except Exception:
                return False

    pwd_context = BcryptPasswordHelper()
except ImportError:
    pwd_context = None
    logger.warning("bcrypt not installed — password hashing unavailable")

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


class SendOtpRequest(BaseModel):
    phone: str = Field(..., description="E.164 phone number, e.g. +919876543210")


class VerifyOtpRequest(BaseModel):
    phone: str = Field(..., description="E.164 phone number")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


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

            # Create subscription with free trial defaults (Sparks held pending phone verification)
            cur.execute(
                """INSERT INTO public.user_subscriptions
                   (id, user_id, workspace_id, plan_tier, sparks_balance, sparks_monthly_quota,
                    addy_messages_balance, playbook_claims_balance, created_at, updated_at)
                   VALUES (%s, %s, %s, 'free_trial', 0.0, 10.0, 0, 1, %s, %s);""",
                (str(uuid.uuid4()), user_id, ws_id, now, now)
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
            "sparks_balance": 0.0,
            "addy_messages_balance": 0,
            "workspace_name": f"{req.full_name.strip() or 'My'}'s Workspace",
            "phone": None,
            "phone_verified_at": None
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
                """SELECT u.id, u.email, u.password_hash, u.full_name, u.phone, u.phone_verified_at,
                          COALESCE(s.plan_tier, 'free_trial') as plan_tier,
                          COALESCE(s.sparks_balance, 0.0) as sparks_balance,
                          COALESCE(s.addy_messages_balance, 0) as addy_messages_balance,
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
            "sparks_balance": float(user_row.get("sparks_balance", 0.0)),
            "addy_messages_balance": int(user_row.get("addy_messages_balance", 0)),
            "workspace_name": user_row.get("workspace_name", "General"),
            "phone": user_row.get("phone"),
            "phone_verified_at": user_row["phone_verified_at"].isoformat() if user_row.get("phone_verified_at") else None
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
    """Return the authenticated user's profile and subscription info, auto-provisioning Supabase OAuth users idempotently."""
    try:
        with get_db_cursor(user_id=current_user.id, commit=True) as cur:
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
                # Idempotent provisioning for Supabase JWT users
                now = datetime.now(timezone.utc)
                email = current_user.email or f"{current_user.id}@advibe.user"
                full_name = email.split('@')[0].capitalize()
                
                # Insert into users if not exists
                cur.execute(
                    """INSERT INTO public.users (id, email, password_hash, full_name, created_at, updated_at)
                       VALUES (%s::uuid, %s, '', %s, %s, %s)
                       ON CONFLICT (id) DO NOTHING;""",
                    (current_user.id, email, full_name, now, now)
                )

                # Insert workspace if not exists
                ws_id = str(uuid.uuid4())
                cur.execute(
                    """INSERT INTO public.workspaces (id, name, owner_user_id, created_at)
                       VALUES (%s::uuid, %s, %s::uuid, %s)
                       ON CONFLICT DO NOTHING;""",
                    (ws_id, f"{full_name}'s Workspace", current_user.id, now)
                )

                # Insert subscription with initial free tier quota
                sub_id = str(uuid.uuid4())
                cur.execute(
                    """INSERT INTO public.user_subscriptions
                       (id, user_id, workspace_id, plan_tier, sparks_balance, sparks_monthly_quota,
                        addy_messages_balance, playbook_claims_balance, created_at, updated_at)
                       VALUES (%s::uuid, %s::uuid, %s::uuid, 'free_trial', 10.0, 10.0, 25, 1, %s, %s)
                       ON CONFLICT (user_id) DO NOTHING;""",
                    (sub_id, current_user.id, ws_id, now, now)
                )

                # Record 10.0 welcome sparks in credit_ledger idempotently
                grant_id = str(uuid.uuid4())
                cur.execute(
                    """INSERT INTO public.credit_ledger (id, user_id, delta, reason, ref_id, idempotency_key, created_at)
                       VALUES (%s::uuid, %s::uuid, 10.0, 'signup_welcome_grant', 'signup', %s, %s)
                       ON CONFLICT DO NOTHING;""",
                    (grant_id, current_user.id, f"welcome_{current_user.id}", now)
                )

                # Fetch the freshly provisioned record
                cur.execute(
                    """SELECT u.id, u.email, u.full_name, u.phone, u.phone_verified_at, u.created_at,
                              COALESCE(s.plan_tier, 'free_trial') as plan_tier,
                              COALESCE(s.billing_interval, 'monthly') as billing_interval,
                              COALESCE(s.sparks_balance, 0.0) as sparks_balance,
                              COALESCE(s.sparks_monthly_quota, 10.0) as sparks_monthly_quota,
                              COALESCE(s.addy_messages_balance, 0) as addy_messages_balance,
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
                return {
                    "id": current_user.id,
                    "email": current_user.email or "founder@advibe.ai",
                    "full_name": "Advibe Founder",
                    "plan_tier": "free_trial",
                    "billing_interval": "monthly",
                    "sparks_balance": 0.0,
                    "sparks_monthly_quota": 10.0,
                    "addy_messages_balance": 0,
                    "playbook_claims_balance": 1,
                    "discount_claimed": False,
                    "workspace_name": "General",
                    "phone": None,
                    "phone_verified_at": None
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
            "email": current_user.email or "founder@advibe.ai",
            "full_name": "Advibe Founder",
            "plan_tier": "free_trial",
            "billing_interval": "monthly",
            "sparks_balance": 0.0,
            "sparks_monthly_quota": 10.0,
            "addy_messages_balance": 0,
            "playbook_claims_balance": 1,
            "discount_claimed": False,
            "workspace_name": "General",
            "phone": None,
            "phone_verified_at": None
        }


@router.post("/phone/send", summary="Send 6-digit SMS OTP to User Phone")
async def send_phone_otp(
    req: SendOtpRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    clean_phone = clean_phone_number(req.phone)
    if not is_valid_e164(clean_phone):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid phone number format. Must be E.164 (e.g. +919876543210).")

    now = datetime.now(timezone.utc)

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        # Partial unique check: is this phone already verified on another account?
        cur.execute(
            """SELECT id FROM public.users 
               WHERE phone = %s AND phone_verified_at IS NOT NULL AND id != %s::uuid;""",
            (clean_phone, current_user.id)
        )
        existing_owner = cur.fetchone()
        if existing_owner:
            if str(existing_owner["id"]) == "00000000-0000-0000-0000-000000000001":
                cur.execute(
                    """UPDATE public.users SET phone = NULL, phone_verified_at = NULL WHERE id = %s::uuid;""",
                    (existing_owner["id"],)
                )
            else:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "This phone number is already verified by another account."
                )

        # Check existing active verifications for locks or cooldowns
        cur.execute(
            """SELECT id, attempts, locked_until, resend_available_at 
               FROM public.phone_verifications 
               WHERE user_id = %s::uuid AND phone = %s AND used_at IS NULL 
               ORDER BY created_at DESC LIMIT 1;""",
            (current_user.id, clean_phone)
        )
        active = cur.fetchone()

        if active:
            locked_until = active.get("locked_until")
            if locked_until and locked_until > now:
                remaining_mins = max(1, int((locked_until - now).total_seconds() // 60))
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    f"Too many failed verification attempts. Account locked for {remaining_mins} more minutes."
                )

            resend_at = active.get("resend_available_at")
            if resend_at and resend_at > now:
                remaining_secs = max(1, int((resend_at - now).total_seconds()))
                raise HTTPException(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    f"Please wait {remaining_secs} seconds before requesting a new verification code."
                )

        # Rate limiting: maximum 10 OTP requests per hour per user or phone
        cur.execute(
            """SELECT count(*) FROM public.phone_verifications 
               WHERE (user_id = %s::uuid OR phone = %s) AND created_at > %s;""",
            (current_user.id, clean_phone, now - timedelta(hours=1))
        )
        hourly_count = cur.fetchone()["count"]
        if hourly_count >= 10:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Too many verification requests. Please try again later."
            )

        # Invalidate any prior unused OTPs for this user and phone
        cur.execute(
            """UPDATE public.phone_verifications 
               SET used_at = %s 
               WHERE user_id = %s::uuid AND phone = %s AND used_at IS NULL;""",
            (now, current_user.id, clean_phone)
        )

        # Generate secure random 6-digit code
        code = f"{secrets.randbelow(900000) + 100000:06d}"

        # HMAC-SHA256 hash storage (raw code is NEVER stored in database)
        key_bytes = settings.SUPABASE_JWT_SECRET.encode("utf-8")
        otp_hash = hmac.new(key_bytes, code.encode("utf-8"), hashlib.sha256).hexdigest()

        verif_id = str(uuid.uuid4())
        expires_at = now + timedelta(minutes=5)
        resend_at = now + timedelta(seconds=30)

        cur.execute(
            """INSERT INTO public.phone_verifications (
                id, user_id, phone, otp_hash, attempts, max_attempts,
                expires_at, resend_available_at, created_at, updated_at
            ) VALUES (
                %s, %s::uuid, %s, %s, 0, 5, %s, %s, %s, %s
            );""",
            (verif_id, current_user.id, clean_phone, otp_hash, expires_at, resend_at, now, now)
        )

        # Update draft phone on user record
        cur.execute(
            """UPDATE public.users SET phone = %s, updated_at = %s WHERE id = %s::uuid;""",
            (clean_phone, now, current_user.id)
        )

    # Deliver SMS via provider (MSG91 or dev console)
    send_sms(clean_phone, code)

    return {
        "success": True,
        "message": "Verification code sent successfully",
        "phone": clean_phone,
        "resend_cooldown_seconds": 30
    }


@router.post("/phone/verify", summary="Verify 6-digit SMS OTP and Activate Account")
async def verify_phone_otp(
    req: VerifyOtpRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    clean_phone = clean_phone_number(req.phone)
    code = req.code.strip()

    if len(code) != 6 or not code.isdigit():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Verification code must be exactly 6 digits.")

    now = datetime.now(timezone.utc)

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        # Check active verification record
        cur.execute(
            """SELECT id, otp_hash, attempts, max_attempts, expires_at, locked_until 
               FROM public.phone_verifications 
               WHERE user_id = %s::uuid AND phone = %s AND used_at IS NULL 
               ORDER BY created_at DESC LIMIT 1;""",
            (current_user.id, clean_phone)
        )
        record = cur.fetchone()

        if not record:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "No active verification found for this phone number. Please request a new code."
            )

        # Check lock
        locked_until = record.get("locked_until")
        if locked_until and locked_until > now:
            remaining_mins = max(1, int((locked_until - now).total_seconds() // 60))
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Account locked for phone verification. Please try again after {remaining_mins} minutes."
            )

        # Check expiry (5 minutes)
        if record["expires_at"] < now:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Verification code has expired. Please request a new code."
            )

        # Compare HMAC in constant time
        key_bytes = settings.SUPABASE_JWT_SECRET.encode("utf-8")
        computed_hash = hmac.new(key_bytes, code.encode("utf-8"), hashlib.sha256).hexdigest()
        is_correct = hmac.compare_digest(record["otp_hash"], computed_hash)

        if not is_correct:
            new_attempts = record["attempts"] + 1
            new_lock = now + timedelta(minutes=15) if new_attempts >= record["max_attempts"] else None

            cur.execute(
                """UPDATE public.phone_verifications 
                   SET attempts = %s, locked_until = %s, updated_at = %s 
                   WHERE id = %s::uuid;""",
                (new_attempts, new_lock, now, record["id"])
            )

    # If verification failed, raise error after cursor commit
    if not is_correct:
        if new_attempts >= 5:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Invalid verification code. Maximum attempts reached. Account locked for 15 minutes."
            )
        else:
            remaining_attempts = 5 - new_attempts
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Invalid verification code. {remaining_attempts} attempt(s) remaining."
            )

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        # OTP verified! Mark used
        cur.execute(
            """UPDATE public.phone_verifications 
               SET used_at = %s, updated_at = %s 
               WHERE id = %s::uuid;""",
            (now, now, record["id"])
        )

        # Mark user phone verified
        cur.execute(
            """UPDATE public.users 
               SET phone = %s, phone_verified_at = %s, updated_at = %s 
               WHERE id = %s::uuid;""",
            (clean_phone, now, now, current_user.id)
        )

        # Idempotent Signup Sparks Grant via ledger
        cur.execute(
            """SELECT 1 FROM public.sparks_ledger 
               WHERE user_id = %s::uuid AND action_type IN ('signup_phone_verified_bonus', 'initial_grant', 'signup_welcome_grant');""",
            (current_user.id,)
        )
        has_grant = cur.fetchone()

        if not has_grant:
            cur.execute(
                """UPDATE public.user_subscriptions 
                   SET sparks_balance = sparks_balance + 10.0, 
                       addy_messages_balance = addy_messages_balance + 25, 
                       updated_at = %s 
                   WHERE user_id = %s::uuid;""",
                (now, current_user.id)
            )

            cur.execute(
                """INSERT INTO public.sparks_ledger (id, user_id, amount, action_type, description, created_at)
                   VALUES (%s::uuid, %s::uuid, 10.0, 'signup_phone_verified_bonus', 'Phone verified welcome bonus: 10 free Sparks', %s);""",
                (str(uuid.uuid4()), current_user.id, now)
            )
            logger.info(f"Granted 10 signup Sparks to newly phone-verified user {current_user.id}")

    return {
        "success": True,
        "message": "Phone number successfully verified",
        "phone": clean_phone,
        "phone_verified_at": now.isoformat()
    }


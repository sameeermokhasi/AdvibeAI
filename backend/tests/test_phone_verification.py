import pytest
import uuid
import jwt
import secrets
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from main import app
from app.core.config import settings
from app.core.db import get_db_cursor

client = TestClient(app)

def _create_test_user(phone_verified: bool = False, phone: str = None) -> tuple[str, dict]:
    user_id = str(uuid.uuid4())
    token = jwt.encode(
        {"sub": user_id, "email": f"test_{user_id[:8]}@example.com", "aud": "authenticated", "role": "authenticated"},
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256"
    )
    headers = {"Authorization": f"Bearer {token}"}
    now = datetime.now(timezone.utc)
    verified_at = now if phone_verified else None

    with get_db_cursor(commit=True) as cur:
        cur.execute(
            """INSERT INTO public.users (id, email, password_hash, phone, phone_verified_at, created_at, updated_at)
               VALUES (%s, %s, 'hash', %s, %s, %s, %s);""",
            (user_id, f"test_{user_id[:8]}@example.com", phone, verified_at, now, now)
        )
        cur.execute(
            """INSERT INTO public.user_subscriptions (id, user_id, plan_tier, sparks_balance, sparks_monthly_quota, addy_messages_balance, created_at, updated_at)
               VALUES (%s, %s, 'free_trial', 0.0, 10.0, 0, %s, %s);""",
            (str(uuid.uuid4()), user_id, now, now)
        )
    return user_id, headers


def test_unverified_user_not_blocked_from_protected_routes():
    user_id, headers = _create_test_user(phone_verified=False)

    # 1. Unverified user can access /api/v1/account/me and /api/v1/auth/me
    me_resp = client.get("/api/v1/account/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["phone_verified_at"] is None

    # 2. Unverified user is NOT blocked with 403 from protected routes
    res = client.get("/api/v1/readiness", headers=headers)
    assert res.status_code == 200

    res_camp = client.get("/api/v1/campaigns/heyreach/status", headers=headers)
    assert res_camp.status_code == 200


def test_phone_otp_hash_only_storage_and_flow():
    user_id, headers = _create_test_user(phone_verified=False)
    test_phone = f"+9198{secrets.randbelow(90000000) + 10000000}"

    # Send OTP
    send_resp = client.post("/api/v1/auth/phone/send", json={"phone": test_phone}, headers=headers)
    assert send_resp.status_code == 200
    send_data = send_resp.json()
    assert send_data["success"] is True
    # Verify OTP code does NOT appear in response
    assert "code" not in send_data
    assert "otp" not in send_data

    # Check DB: Raw OTP must NEVER be stored, only HMAC hash
    with get_db_cursor(commit=False) as cur:
        cur.execute("SELECT otp_hash FROM public.phone_verifications WHERE user_id = %s::uuid;", (user_id,))
        row = cur.fetchone()
        assert row is not None
        otp_hash = row["otp_hash"]
        # Hash is a 64-char hex string (SHA256)
        assert len(otp_hash) == 64
        # Assert it's not a plain 6-digit number
        assert not otp_hash.isdigit()


def test_phone_otp_resend_cooldown():
    user_id, headers = _create_test_user(phone_verified=False)
    test_phone = f"+9198{secrets.randbelow(90000000) + 10000000}"

    # First send succeeds
    r1 = client.post("/api/v1/auth/phone/send", json={"phone": test_phone}, headers=headers)
    assert r1.status_code == 200

    # Immediate second send fails with 429 cooldown
    r2 = client.post("/api/v1/auth/phone/send", json={"phone": test_phone}, headers=headers)
    assert r2.status_code == 429
    assert "seconds before requesting" in r2.json()["detail"]


def test_duplicate_phone_rejected_if_already_verified():
    shared_phone = f"+9198{secrets.randbelow(90000000) + 10000000}"
    # User 1 has verified this phone
    u1, h1 = _create_test_user(phone_verified=True, phone=shared_phone)

    # User 2 tries to send OTP to the same verified phone
    u2, h2 = _create_test_user(phone_verified=False)
    resp = client.post("/api/v1/auth/phone/send", json={"phone": shared_phone}, headers=h2)
    assert resp.status_code == 400
    assert "already verified by another account" in resp.json()["detail"]


def test_phone_otp_attempt_lock_after_5_failures():
    user_id, headers = _create_test_user(phone_verified=False)
    test_phone = f"+9198{secrets.randbelow(90000000) + 10000000}"

    # Send OTP
    client.post("/api/v1/auth/phone/send", json={"phone": test_phone}, headers=headers)

    # Attempt 4 wrong codes
    for i in range(1, 5):
        wrong_resp = client.post("/api/v1/auth/phone/verify", json={"phone": test_phone, "code": "000000"}, headers=headers)
        assert wrong_resp.status_code == 400
        assert f"{5 - i} attempt(s) remaining" in wrong_resp.json()["detail"]

    # 5th failure locks the account
    fifth_resp = client.post("/api/v1/auth/phone/verify", json={"phone": test_phone, "code": "000000"}, headers=headers)
    assert fifth_resp.status_code == 400
    assert "locked for 15 minutes" in fifth_resp.json()["detail"].lower()

    # Subsequent send or verify attempt is locked
    locked_send = client.post("/api/v1/auth/phone/send", json={"phone": test_phone}, headers=headers)
    assert locked_send.status_code == 429
    assert "locked" in locked_send.json()["detail"].lower()


def test_phone_otp_expiry():
    user_id, headers = _create_test_user(phone_verified=False)
    test_phone = f"+9198{secrets.randbelow(90000000) + 10000000}"

    client.post("/api/v1/auth/phone/send", json={"phone": test_phone}, headers=headers)

    # Artificially expire the record in the DB
    with get_db_cursor(commit=True) as cur:
        cur.execute(
            """UPDATE public.phone_verifications 
               SET expires_at = NOW() - INTERVAL '10 seconds'
               WHERE user_id = %s::uuid AND phone = %s;""",
            (user_id, test_phone)
        )

    exp_resp = client.post("/api/v1/auth/phone/verify", json={"phone": test_phone, "code": "123456"}, headers=headers)
    assert exp_resp.status_code == 400
    assert "Verification code has expired" in exp_resp.json()["detail"]

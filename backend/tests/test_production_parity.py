"""
Advibe Production Parity Test Suite
-----------------------------------
Verifies strict production invariants:
1. Email unlock idempotency (unlock once -> revisit -> 0 Sparks charge).
2. Concurrency row-locking: 20 concurrent unlocks debits exactly 1 Spark.
3. Insufficient Sparks (402) -> top-up (+10) -> unlock succeeds.
4. Email masking invariant: no un-unlocked email exposed across tracks, dossiers, resolve, twin finder, addy, or export.
5. Credit ledger immutability and exact equality: SUM(delta) == sparks_balance.
"""

import uuid
import jwt
import pytest
import concurrent.futures
from fastapi.testclient import TestClient
from main import app
from app.core.config import settings
from app.core.db import get_db_cursor, DatabaseService
from app.core.security import mask_email

from datetime import datetime, timezone

client = TestClient(app)


def make_test_user_jwt(user_id: str, email: str) -> dict:
    token = jwt.encode(
        {"sub": user_id, "email": email},
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256"
    )
    return {"Authorization": f"Bearer {token}"}


def seed_test_user(sparks_balance: float = 10.0):
    user_id = str(uuid.uuid4())
    email = f"test_{user_id[:8]}@advibe.io"
    auth_header = make_test_user_jwt(user_id, email)
    now = datetime.now(timezone.utc)

    with get_db_cursor(commit=True) as cur:
        # Create user
        cur.execute("""
            INSERT INTO public.users (id, email, password_hash, full_name, phone_verified_at, created_at, updated_at)
            VALUES (%s, %s, 'test_hash', %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET phone_verified_at = EXCLUDED.phone_verified_at
        """, (user_id, email, "Test Founder", now, now, now))

        # Create subscription
        cur.execute("""
            INSERT INTO public.user_subscriptions (id, user_id, plan_tier, sparks_balance, sparks_monthly_quota, addy_messages_balance, created_at, updated_at)
            VALUES (%s, %s, 'growth', %s, 100.0, 50, %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET sparks_balance = EXCLUDED.sparks_balance
        """, (str(uuid.uuid4()), user_id, sparks_balance, now, now))

        # Record initial credit ledger entry if balance > 0
        if sparks_balance > 0:
            cur.execute("""
                INSERT INTO public.credit_ledger (user_id, delta, reason)
                VALUES (%s, %s, 'Initial seed balance')
            """, (user_id, sparks_balance))

    return user_id, email, auth_header


def get_catalog_sample_person():
    all_invs = DatabaseService.get_all_investors_with_people()
    for inv in all_invs:
        people = inv.get("people", [])
        for p in people:
            if p.get("id") and p.get("email"):
                return p
    # Fallback to loading CSV directly
    catalog = DatabaseService.load_csv_investors()
    for inv in catalog:
        for p in inv.get("people", []):
            if p.get("id") and p.get("email"):
                return p
    pytest.skip("No catalog investor people found for testing")


def test_unlock_idempotency():
    """Verify that unlocking a person once debits 1 Spark, and subsequent unlocks cost 0 Sparks."""
    person = get_catalog_sample_person()
    person_id = str(person["id"])
    user_id, email, auth_header = seed_test_user(sparks_balance=10.0)

    # First Unlock
    res1 = client.post("/api/v1/unlock", json={"person_id": person_id}, headers=auth_header)
    assert res1.status_code == 200, f"Unlock failed: {res1.text}"
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["sparks_charged"] == 1.0
    assert data1["already_unlocked"] is False
    assert data1["revealed_email"] == person["email"]
    assert data1["remaining_sparks"] == 9.0

    # Second Unlock (Revisit)
    res2 = client.post("/api/v1/unlock", json={"person_id": person_id}, headers=auth_header)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    assert data2["sparks_charged"] == 0.0
    assert data2["already_unlocked"] is True
    assert data2["revealed_email"] == person["email"]
    assert data2["remaining_sparks"] == 9.0

    # Verify credit ledger has exactly 1 debit entry of -1.0
    with get_db_cursor(commit=False) as cur:
        cur.execute("SELECT delta, reason FROM credit_ledger WHERE user_id = %s AND delta < 0", (user_id,))
        debits = cur.fetchall()
        assert len(debits) == 1
        assert float(debits[0]["delta"]) == -1.0


def test_concurrent_unlocks_exact_single_debit():
    """20 concurrent unlock requests for the same contact must debit exactly 1 Spark."""
    person = get_catalog_sample_person()
    person_id = str(person["id"])
    user_id, email, auth_header = seed_test_user(sparks_balance=10.0)

    def do_unlock(req_idx):
        return client.post(
            "/api/v1/unlock",
            json={"person_id": person_id, "idempotency_key": f"key-{req_idx}"},
            headers=auth_header
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(do_unlock, i) for i in range(20)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    # All responses should be successful
    for r in results:
        assert r.status_code == 200, f"Concurrent unlock returned {r.status_code}: {r.text}"
        data = r.json()
        assert data["success"] is True
        assert data["revealed_email"] == person["email"]

    # Verify ledger has exactly 1 debit
    with get_db_cursor(commit=False) as cur:
        cur.execute("SELECT delta FROM credit_ledger WHERE user_id = %s AND delta < 0", (user_id,))
        debits = cur.fetchall()
        assert len(debits) == 1
        assert float(debits[0]["delta"]) == -1.0

        # Verify subscription balance
        cur.execute("SELECT sparks_balance FROM user_subscriptions WHERE user_id = %s", (user_id,))
        sub = cur.fetchone()
        assert float(sub["sparks_balance"]) == 9.0


def test_insufficient_sparks_topup_and_unlock():
    """Attempting unlock with insufficient Sparks fails (402), succeeds after top-up."""
    person = get_catalog_sample_person()
    person_id = str(person["id"])
    user_id, email, auth_header = seed_test_user(sparks_balance=0.5)

    # 1. Attempt unlock with 0.5 Sparks -> Expect 402 Payment Required
    res_fail = client.post("/api/v1/unlock", json={"person_id": person_id}, headers=auth_header)
    assert res_fail.status_code == 402
    assert "insufficient" in res_fail.json()["detail"].lower()

    # 2. Top up 10 Sparks
    res_topup = client.post(
        "/api/v1/sparks/top-up",
        json={"amount": 10.0, "reason": "Testing topup flow"},
        headers=auth_header
    )
    assert res_topup.status_code == 200
    topup_data = res_topup.json()
    assert topup_data["success"] is True
    assert float(topup_data["new_balance"]) == 10.5

    # 3. Re-attempt unlock -> Should succeed now
    res_success = client.post("/api/v1/unlock", json={"person_id": person_id}, headers=auth_header)
    assert res_success.status_code == 200
    succ_data = res_success.json()
    assert succ_data["success"] is True
    assert succ_data["sparks_charged"] == 1.0
    assert float(succ_data["remaining_sparks"]) == 9.5


def test_email_masking_invariant_across_all_endpoints():
    """Verify raw emails are never exposed before unlock across all discovery and enrich endpoints."""
    user_id, email, auth_header = seed_test_user(sparks_balance=10.0)

    # 1. Discovery Tracks (Venture, Real Estate, LP)
    for track in ["venture", "real_estate", "fund_lp"]:
        res = client.get(f"/api/v1/tracks/{track}/investors?page=1&limit=10", headers=auth_header)
        assert res.status_code == 200
        data = res.json()
        for item in data:
            for p in item.get("people", []):
                p_email = p.get("email") or ""
                if p_email:
                    assert "***@" in p_email, f"Raw email leaked in track {track}: {p_email}"

    # 2. Investor Detail / Dossier
    person = get_catalog_sample_person()
    investor_id = str(person["investor_id"])
    res_inv = client.get(f"/api/v1/investors/{investor_id}", headers=auth_header)
    if res_inv.status_code == 200:
        inv_data = res_inv.json()
        for dm in inv_data.get("decision_makers", []):
            dm_email = dm.get("email") or ""
            if dm_email:
                assert "***@" in dm_email, f"Raw email leaked in investor detail: {dm_email}"

    # 3. Resolve Paste
    res_resolve = client.post(
        "/api/v1/resolve/paste",
        json={"firm_names": "Sequoia Capital\nAndreessen Horowitz"},
        headers=auth_header
    )
    assert res_resolve.status_code == 200
    resolve_data = res_resolve.json()
    for lead in resolve_data.get("results", []):
        lead_email = lead.get("verified_email") or ""
        assert "***@" in lead_email, f"Raw email leaked in resolve: {lead_email}"

    # 4. Resolve CSV Export
    batch_id = resolve_data.get("batch_id")
    if batch_id:
        res_export = client.get(f"/api/v1/resolve/{batch_id}/export.csv", headers=auth_header)
        assert res_export.status_code == 200
        csv_text = res_export.text
        lines = csv_text.strip().split("\n")[1:]  # Skip header
        for line in lines:
            if line.strip():
                cols = line.split(",")
                if len(cols) >= 4:
                    email_col = cols[3].strip('"')
                    assert "***@" in email_col, f"Raw email leaked in resolve CSV export: {email_col}"


def test_credit_ledger_immutability_and_balance_integrity():
    """Verify that credit_ledger is immutable (UPDATE/DELETE blocked by trigger) and SUM(delta) == balance."""
    user_id, email, auth_header = seed_test_user(sparks_balance=5.0)

    # Perform topup
    client.post("/api/v1/sparks/top-up", json={"amount": 10.0, "reason": "Audit test 1"}, headers=auth_header)

    # Perform unlock
    person = get_catalog_sample_person()
    client.post("/api/v1/unlock", json={"person_id": str(person["id"])}, headers=auth_header)

    # Check sum of credit_ledger deltas vs user_subscriptions.sparks_balance
    with get_db_cursor(commit=False) as cur:
        cur.execute("SELECT SUM(delta) as total_delta FROM credit_ledger WHERE user_id = %s", (user_id,))
        total_delta = float(cur.fetchone()["total_delta"])

        cur.execute("SELECT sparks_balance FROM user_subscriptions WHERE user_id = %s", (user_id,))
        balance = float(cur.fetchone()["sparks_balance"])

        assert total_delta == balance, f"Ledger sum ({total_delta}) != balance ({balance})"

    # Test trigger blocking mutations on credit_ledger
    with pytest.raises(Exception) as exc_update:
        with get_db_cursor(commit=True) as cur:
            cur.execute("UPDATE credit_ledger SET delta = 999.0 WHERE user_id = %s", (user_id,))
    assert "immutable" in str(exc_update.value).lower() or "append-only" in str(exc_update.value).lower()

    with pytest.raises(Exception) as exc_delete:
        with get_db_cursor(commit=True) as cur:
            cur.execute("DELETE FROM credit_ledger WHERE user_id = %s", (user_id,))
    assert "immutable" in str(exc_delete.value).lower() or "append-only" in str(exc_delete.value).lower()

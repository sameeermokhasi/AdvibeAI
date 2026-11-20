"""
Tests for:
1. Server-side demo pack definition (id: "demo_1", price_paise: 100, sparks: 2.0).
2. ₹1 pack credits exactly 2 Sparks once upon admin approval.
3. Duplicate 12-digit UTR is rejected with 400.
4. Non-admin user gets 403 Forbidden on payment approval.
5. Strict idempotency: approving twice credits only once.
6. Ledger entry recorded with reason 'topup' and ref = payment_id.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.config import settings
from app.core.db import get_db_cursor
from app.routes.billing import SPARKS_PACKS_PAISE, _calculate_pricing

client = TestClient(app)

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
ADMIN_EMAIL = "founder@advibe.ai"
NON_ADMIN_EMAIL = "regular_founder@company.com"


def test_server_side_demo_pack_definition():
    """Verify demo_1 is defined in server-side pack table with 100 paise (₹1) and 2.0 Sparks."""
    assert "demo_1" in SPARKS_PACKS_PAISE
    pack = SPARKS_PACKS_PAISE["demo_1"]
    assert pack["paise"] == 100
    assert pack["sparks"] == 2.0

    # Pricing calculation helper derives strictly from server
    amount_paise, sparks = _calculate_pricing("sparks_pack", "demo_1")
    assert amount_paise == 100
    assert sparks == 2.0


def test_manual_review_and_duplicate_utr_rejected():
    """Verify 12-digit UTR creates pending_review payment and duplicate UTR is rejected with 400."""
    unique_12_digit_utr = f"{uuid.uuid4().int % 10**12:012d}"

    # First submission -> pending_review
    res = client.post(
        "/api/v1/billing/manual-review",
        json={
            "utr": unique_12_digit_utr,
            "item_type": "sparks_pack",
            "item_id": "demo_1"
        },
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "pending_review"
    assert data["amount_paise"] == 100
    assert data["sparks"] == 2.0

    # Second submission with the same UTR -> rejected as duplicate
    dup_res = client.post(
        "/api/v1/billing/manual-review",
        json={
            "utr": unique_12_digit_utr,
            "item_type": "sparks_pack",
            "item_id": "demo_1"
        },
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert dup_res.status_code == 400
    assert "already been submitted" in dup_res.json()["detail"].lower()


def test_non_admin_gets_403_on_approve():
    """Verify non-admin user receives 403 Forbidden on payment approval endpoints."""
    unique_utr = f"{uuid.uuid4().int % 10**12:012d}"

    # Submit payment
    sub_res = client.post(
        "/api/v1/billing/manual-review",
        json={"utr": unique_utr, "item_type": "sparks_pack", "item_id": "demo_1"},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert sub_res.status_code == 200

    # Override current user as non-admin
    def mock_non_admin():
        return AuthenticatedUser(
            id=str(uuid.uuid4()),
            email=NON_ADMIN_EMAIL,
            token="non-admin-token"
        )

    app.dependency_overrides[get_current_user] = mock_non_admin
    try:
        # Non-admin attempts to approve -> 403 Forbidden
        approve_res = client.post(f"/api/v1/billing/admin/payments/{unique_utr}/approve")
        assert approve_res.status_code == 403
        assert "forbidden" in approve_res.json()["detail"].lower() or "admin access required" in approve_res.json()["detail"].lower()

        # Non-admin attempts to access admin list -> 403 Forbidden
        list_res = client.get("/api/v1/billing/admin/payments")
        assert list_res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_demo_pack_credits_exactly_2_sparks_once_and_is_idempotent():
    """
    Verify:
    1. Admin approval credits exactly 2.0 Sparks.
    2. Writes a credit_ledger row with reason 'topup' and ref = payment_id.
    3. Second approval is strictly idempotent (does not add 2 more Sparks).
    """
    unique_utr = f"{uuid.uuid4().int % 10**12:012d}"

    # Get initial balance
    with get_db_cursor(user_id=TEST_USER_ID, commit=False) as cur:
        cur.execute("SELECT sparks_balance FROM public.user_subscriptions WHERE user_id = %s::uuid;", (TEST_USER_ID,))
        row = cur.fetchone()
        initial_balance = float(row["sparks_balance"]) if row else 10.0

    # Submit ₹1 demo payment
    sub_res = client.post(
        "/api/v1/billing/manual-review",
        json={"utr": unique_utr, "item_type": "sparks_pack", "item_id": "demo_1"},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert sub_res.status_code == 200

    # Admin approves payment
    def mock_admin():
        return AuthenticatedUser(
            id=TEST_USER_ID,
            email=ADMIN_EMAIL,
            token="admin-token"
        )

    app.dependency_overrides[get_current_user] = mock_admin
    try:
        approve_res = client.post(f"/api/v1/billing/admin/payments/{unique_utr}/approve")
        assert approve_res.status_code == 200
        data = approve_res.json()
        assert data["success"] is True
        assert data["status"] == "paid"
        assert data["sparks_credited"] == 2.0
        assert data["new_sparks_balance"] == initial_balance + 2.0

        # Verify ledger row in DB
        with get_db_cursor(user_id=TEST_USER_ID, commit=False) as cur:
            cur.execute(
                """SELECT delta, reason, ref_id FROM public.credit_ledger
                   WHERE user_id = %s::uuid AND ref_id = %s;""",
                (TEST_USER_ID, unique_utr)
            )
            ledger_entry = cur.fetchone()
            assert ledger_entry is not None
            assert float(ledger_entry["delta"]) == 2.0
            assert ledger_entry["reason"] == "topup"
            assert ledger_entry["ref_id"] == unique_utr

            # Verify subscription balance
            cur.execute("SELECT sparks_balance FROM public.user_subscriptions WHERE user_id = %s::uuid;", (TEST_USER_ID,))
            bal_row = cur.fetchone()
            assert float(bal_row["sparks_balance"]) == initial_balance + 2.0

        # Approving a second time -> STRICT IDEMPOTENCY
        second_approve_res = client.post(f"/api/v1/billing/admin/payments/{unique_utr}/approve")
        assert second_approve_res.status_code == 200
        assert second_approve_res.json()["status"] == "paid"

        # Balance MUST remain unchanged (only credited once!)
        with get_db_cursor(user_id=TEST_USER_ID, commit=False) as cur:
            cur.execute("SELECT sparks_balance FROM public.user_subscriptions WHERE user_id = %s::uuid;", (TEST_USER_ID,))
            final_bal_row = cur.fetchone()
            assert float(final_bal_row["sparks_balance"]) == initial_balance + 2.0

            # Ledger must still have only 1 row for this payment
            cur.execute(
                """SELECT count(*) as count FROM public.credit_ledger
                   WHERE user_id = %s::uuid AND ref_id = %s;""",
                (TEST_USER_ID, unique_utr)
            )
            count_row = cur.fetchone()
            assert count_row["count"] == 1

    finally:
        app.dependency_overrides.pop(get_current_user, None)

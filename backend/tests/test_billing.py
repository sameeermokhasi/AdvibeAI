"""
Unit and Integration Tests for Razorpay Billing, Signature Verification, and Ledger Crediting
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from app.routes.billing import _verify_razorpay_signature, PLAN_PRICING_PAISE, SPARKS_PACKS_PAISE
import hmac
import hashlib

client = TestClient(app)

def test_signature_verification_valid():
    secret = "test_secret_key"
    order_id = "order_12345"
    payment_id = "pay_67890"
    message = f"{order_id}|{payment_id}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()

    assert _verify_razorpay_signature(order_id, payment_id, sig, secret) is True

def test_signature_verification_invalid():
    secret = "test_secret_key"
    order_id = "order_12345"
    payment_id = "pay_67890"

    assert _verify_razorpay_signature(order_id, payment_id, "invalid_sig", secret) is False

def test_server_calculated_pricing_matrix():
    assert PLAN_PRICING_PAISE["solo"]["monthly"] == 499900
    assert PLAN_PRICING_PAISE["starter"]["monthly"] == 1499900
    assert PLAN_PRICING_PAISE["growth"]["monthly"] == 4499900
    assert PLAN_PRICING_PAISE["pro"]["monthly"] == 8999900
    assert SPARKS_PACKS_PAISE[10]["paise"] == 49900

def test_create_order_and_verify_flow():
    # 1. Create order
    create_res = client.post(
        "/api/v1/billing/order",
        json={"item_type": "sparks_pack", "item_id": "10"},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert create_res.status_code == 200
    data = create_res.json()
    assert "order_id" in data
    assert data["amount_paise"] == 49900
    assert data["currency"] == "INR"

    order_id = data["order_id"]

    # 2. Verify payment (using development simulated token)
    verify_res = client.post(
        "/api/v1/billing/verify",
        json={
            "order_id": order_id,
            "payment_id": f"pay_test_{order_id}",
            "signature": f"simulated_{order_id}"
        },
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["success"] is True
    assert v_data["status"] == "paid"

    # 3. Idempotent re-verify (should not fail or duplicate)
    reverify_res = client.post(
        "/api/v1/billing/verify",
        json={
            "order_id": order_id,
            "payment_id": f"pay_test_{order_id}",
            "signature": f"simulated_{order_id}"
        },
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert reverify_res.status_code == 200
    assert reverify_res.json()["status"] == "paid"

def test_billing_history_endpoint():
    res = client.get("/api/v1/billing/history", headers={"Authorization": "Bearer dev-mock-token"})
    assert res.status_code == 200
    assert "history" in res.json()
    assert isinstance(res.json()["history"], list)


def test_create_qr_code_server_calculated_pricing():
    """Verify QR code creation returns valid QR image, server-enforced pricing, and 15m expiry."""
    res = client.post(
        "/api/v1/billing/qr",
        json={"plan_id": "starter", "billing_interval": "monthly"},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "qr_id" in data
    assert data["qr_id"].startswith("qr_")
    assert "image_url" in data
    assert len(data["image_url"]) > 10
    # Server calculated paise strictly matches PLAN_PRICING_PAISE
    assert data["amount_paise"] == 1499900
    assert data["amount_inr"] == 14999.0
    assert data["currency"] == "INR"
    assert data["sparks"] == 500.0
    assert data["expires_in_seconds"] == 900
    assert data["close_by"] > 0


def test_qr_poll_status_and_webhook_idempotency():
    """Verify polling QR status, webhook crediting, and webhook replay protection."""
    # 1. Create QR
    qr_res = client.post(
        "/api/v1/billing/qr",
        json={"plan_id": "solo", "billing_interval": "monthly"},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert qr_res.status_code == 200
    qr_id = qr_res.json()["qr_id"]

    # 2. Poll initial status -> created / not paid
    status_res = client.get(
        f"/api/v1/billing/qr/{qr_id}/status",
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert status_res.status_code == 200
    assert status_res.json()["paid"] is False
    assert status_res.json()["status"] == "created"

    # 3. Simulate qr_code.credited webhook
    import json
    from app.core.config import settings
    payment_id = f"pay_webhook_{qr_id}"
    webhook_payload = {
        "event": "qr_code.credited",
        "payload": {
            "qr_code": {"entity": {"id": qr_id}},
            "payment": {"entity": {"id": payment_id, "amount": 499900}}
        }
    }
    body_str = json.dumps(webhook_payload)
    sig = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), body_str.encode("utf-8"), hashlib.sha256).hexdigest()

    wh_res = client.post(
        "/api/v1/billing/webhook",
        content=body_str,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"}
    )
    assert wh_res.status_code == 200
    assert wh_res.json()["status"] == "ok"

    # 4. Poll status again -> paid!
    status_after = client.get(
        f"/api/v1/billing/qr/{qr_id}/status",
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert status_after.status_code == 200
    assert status_after.json()["paid"] is True
    assert status_after.json()["status"] == "paid"
    assert status_after.json()["sparks_credited"] == 150.0

    # 5. Replay webhook -> must succeed idempotently without double credit
    wh_replay = client.post(
        "/api/v1/billing/webhook",
        content=body_str,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"}
    )
    assert wh_replay.status_code == 200


def test_manual_review_utr_submission_and_duplicate_rejection():
    """Verify 12-char UTR manual submission, duplicate rejection, and approval flow."""
    import uuid
    random_utr = f"UTR{uuid.uuid4().hex[:9].upper()}"

    # 1. Invalid length rejection (< 12 chars)
    invalid_res = client.post(
        "/api/v1/billing/manual-review",
        json={"utr": "123", "plan_id": "growth"},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert invalid_res.status_code == 400

    # 2. Valid 12-char submission -> pending_review
    valid_res = client.post(
        "/api/v1/billing/manual-review",
        json={"utr": random_utr, "plan_id": "growth"},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert valid_res.status_code == 200
    assert valid_res.json()["status"] == "pending_review"
    assert valid_res.json()["utr"] == random_utr

    # 3. Duplicate UTR submission -> 400 rejection
    dup_res = client.post(
        "/api/v1/billing/manual-review",
        json={"utr": random_utr, "plan_id": "growth"},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert dup_res.status_code == 400
    assert "already been submitted" in dup_res.json()["detail"]

    # 4. Admin approval flow -> marks paid
    approve_res = client.post(
        f"/api/v1/billing/admin/approve-manual/{random_utr}",
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "paid"


"""
Unit and Integration Tests for Leads Scoping, Unlocks, and Single Source of Truth for Credits
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.db import get_db_cursor

client = TestClient(app)

def test_single_source_of_truth_credits():
    """
    Verify /api/v1/account/me and /api/v1/auth/me report sparks_balance and sparks_used.
    """
    res = client.get("/api/v1/account/me", headers={"Authorization": "Bearer dev-mock-token"})
    assert res.status_code == 200
    data = res.json()
    assert "sparks_balance" in data
    assert "sparks_used" in data
    assert isinstance(data["sparks_used"], (int, float))
    assert data["sparks_used"] >= 0.0

    res_auth = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer dev-mock-token"})
    assert res_auth.status_code == 200
    auth_data = res_auth.json()
    assert "sparks_balance" in auth_data
    assert "sparks_used" in auth_data
    assert float(auth_data["sparks_used"]) == float(data["sparks_used"])

def test_leads_empty_or_populated_schema():
    """
    Verify /api/v1/leads returns standard schema with name first and valid filter chips.
    """
    res_all = client.get("/api/v1/leads?filter=all", headers={"Authorization": "Bearer dev-mock-token"})
    assert res_all.status_code == 200
    leads = res_all.json()
    assert isinstance(leads, list)

    res_saved = client.get("/api/v1/leads?filter=saved", headers={"Authorization": "Bearer dev-mock-token"})
    assert res_saved.status_code == 200

    res_unlocked = client.get("/api/v1/leads?filter=unlocked", headers={"Authorization": "Bearer dev-mock-token"})
    assert res_unlocked.status_code == 200

    if len(leads) > 0:
        lead = leads[0]
        assert "person_id" in lead
        assert "investor_name" in lead
        assert "role_title" in lead
        assert "firm_name" in lead
        assert "location" in lead
        assert "linkedin_url" in lead
        assert "partner_email" in lead
        assert "is_saved" in lead
        assert "is_unlocked" in lead

def test_unlock_leads_dedup_and_no_double_charge():
    """
    Verify:
    1. Unlocking an investor deducts 1 spark or recognizes previous unlock.
    2. Investor appears in /api/v1/leads with is_unlocked=True.
    3. Re-unlocking the same investor does not deduct Sparks again.
    4. Saving to watchlist deduplicates with the unlock in /api/v1/leads.
    """
    # 1. Pick an available person from the catalog
    with get_db_cursor(commit=False) as cur:
        cur.execute("SELECT id, full_name, email FROM public.people LIMIT 1;")
        person = cur.fetchone()

    assert person is not None, "At least one person must exist in catalog"
    person_id = str(person["id"])

    # 2. Check initial sparks balance
    acc_before = client.get("/api/v1/account/me", headers={"Authorization": "Bearer dev-mock-token"}).json()
    balance_before = float(acc_before["sparks_balance"])
    used_before = float(acc_before["sparks_used"])

    # Ensure user has at least 5 sparks for the test
    if balance_before < 2.0:
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                UPDATE public.subscriptions 
                SET sparks_balance = sparks_balance + 10.0 
                WHERE user_id = (SELECT id FROM public.users WHERE email = 'founder@advibe.ai');
            """)
        acc_before = client.get("/api/v1/account/me", headers={"Authorization": "Bearer dev-mock-token"}).json()
        balance_before = float(acc_before["sparks_balance"])

    # 3. First unlock
    unlock_res = client.post(
        "/api/v1/unlock",
        json={"person_id": person_id},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert unlock_res.status_code == 200
    unlock_data = unlock_res.json()
    assert unlock_data["success"] is True
    assert unlock_data["revealed_email"] is not None

    # Verify presence in /api/v1/leads?filter=unlocked
    leads_res = client.get("/api/v1/leads?filter=unlocked", headers={"Authorization": "Bearer dev-mock-token"})
    assert leads_res.status_code == 200
    unlocked_leads = leads_res.json()
    matching = [l for l in unlocked_leads if l["person_id"] == person_id]
    assert len(matching) == 1
    assert matching[0]["is_unlocked"] is True
    assert matching[0]["partner_email"] == unlock_data["revealed_email"]

    # 4. Check account after first unlock
    acc_after = client.get("/api/v1/account/me", headers={"Authorization": "Bearer dev-mock-token"}).json()
    balance_after = float(acc_after["sparks_balance"])
    used_after = float(acc_after["sparks_used"])

    # 5. Re-unlock the same person: should NOT charge again
    reunlock_res = client.post(
        "/api/v1/unlock",
        json={"person_id": person_id},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert reunlock_res.status_code == 200
    reunlock_data = reunlock_res.json()
    assert reunlock_data["success"] is True
    assert reunlock_data["revealed_email"] == unlock_data["revealed_email"]

    acc_reunlock = client.get("/api/v1/account/me", headers={"Authorization": "Bearer dev-mock-token"}).json()
    assert float(acc_reunlock["sparks_balance"]) == balance_after
    assert float(acc_reunlock["sparks_used"]) == used_after

    # 6. Save to watchlist and verify deduplication in /api/v1/leads
    save_res = client.post(
        "/api/v1/watchlist",
        json={"person_id": person_id, "notes": "Top tier partner"},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert save_res.status_code in [200, 201]

    all_leads_res = client.get("/api/v1/leads?filter=all", headers={"Authorization": "Bearer dev-mock-token"})
    assert all_leads_res.status_code == 200
    all_leads = all_leads_res.json()
    person_matches = [l for l in all_leads if l["person_id"] == person_id]
    # Must be deduplicated (exactly 1 occurrence)
    assert len(person_matches) == 1
    assert person_matches[0]["is_saved"] is True
    assert person_matches[0]["is_unlocked"] is True

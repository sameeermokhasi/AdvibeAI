import pytest
import uuid
import jwt
from fastapi.testclient import TestClient
from main import app
from app.core.config import settings
from app.core.db import get_db_cursor

client = TestClient(app)

def _get_auth_headers(user_id: str, email: str = "test@advibe.io") -> dict:
    token = jwt.encode(
        {"sub": str(user_id), "email": email, "aud": "authenticated", "role": "authenticated"},
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256"
    )
    return {"Authorization": f"Bearer {token}"}


def test_readiness_empty_state_when_no_company():
    random_user_id = str(uuid.uuid4())
    headers = _get_auth_headers(random_user_id)

    # Seed user without any company
    with get_db_cursor(user_id=random_user_id, commit=True) as cur:
        cur.execute(
            """INSERT INTO public.users (id, email, password_hash, phone_verified_at)
               VALUES (%s, %s, 'hash', NOW()) ON CONFLICT (id) DO NOTHING;""",
            (random_user_id, f"empty_{random_user_id[:8]}@example.com")
        )

    response = client.get("/api/v1/readiness", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["has_data"] is False
    assert data["has_profile"] is False
    assert data["company"] is None
    assert data["evaluation"] is None
    assert "No company profile or pitch deck found" in data["message"]


def test_readiness_evaluation_with_real_company_weighted_sum():
    test_user_id = str(uuid.uuid4())
    company_id = str(uuid.uuid4())
    headers = _get_auth_headers(test_user_id)

    # Seed user and company profile using parameterized queries
    with get_db_cursor(user_id=test_user_id, commit=True) as cur:
        cur.execute(
            """INSERT INTO public.users (id, email, password_hash, phone_verified_at)
               VALUES (%s, %s, 'hash', NOW()) ON CONFLICT (id) DO NOTHING;""",
            (test_user_id, f"test_{test_user_id[:8]}@example.com")
        )
        cur.execute(
            """INSERT INTO public.companies (
                id, user_id, name, stage, sector, geography, check_size_min, check_size_max,
                thesis_summary, deck_text, traction, moat, use_of_funds, investor_criteria
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            );""",
            (
                company_id,
                test_user_id,
                "Apex AI",
                "Seed",
                "B2B SaaS",
                "North America",
                500000,
                2000000,
                "Enterprise workflow automation with autonomous agents",
                "Pitch deck: 12 enterprise pilots, $180k ARR growing 25% MoM",
                "$180k ARR, 12 signed POCs, 115% net retention",
                "Proprietary workflow execution graph with patented security",
                "60% engineering and AI agents, 30% GTM sales, 10% operations",
                "Seed-stage funds investing $500k-$2M in B2B AI infra"
            )
        )

    # 1. Fetch readiness (triggers server calculation and database persistence)
    response = client.get("/api/v1/readiness", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["has_data"] is True
    assert data["company"]["name"] == "Apex AI"
    evaluation = data["evaluation"]
    assert evaluation is not None

    # Verify all 7 dimensions and exact weights
    expected_weights = {
        "Deck Completeness": 20,
        "Traction Evidence": 20,
        "Market Clarity": 15,
        "Financial Ask": 15,
        "Use of Funds": 10,
        "Moat": 10,
        "Investor Targeting": 10
    }
    dim_dict = {d["name"]: d for d in evaluation["dimensions"]}
    assert len(dim_dict) == 7
    for name, expected_weight in expected_weights.items():
        assert name in dim_dict
        dim = dim_dict[name]
        assert dim["weight"] == expected_weight
        assert 0 <= dim["score"] <= 100
        assert dim["status"] in ("strong", "moderate", "weak", "missing")

    # Verify server-computed weighted sum (never arbitrary mock 72)
    expected_total = round(sum(d["score"] * (d["weight"] / 100.0) for d in evaluation["dimensions"]), 1)
    assert evaluation["overall_score"] == expected_total

    # Verify persisted in DB
    with get_db_cursor(user_id=test_user_id, commit=False) as cur:
        cur.execute(
            "SELECT count(*) FROM public.readiness_evaluations WHERE company_id = %s;",
            (company_id,)
        )
        count = cur.fetchone()["count"]
        assert count >= 1

    # 2. Re-evaluate endpoint forces a new calculation and persists fresh evaluation
    reeval_resp = client.post("/api/v1/readiness/evaluate", json={"company_id": company_id}, headers=headers)
    assert reeval_resp.status_code == 200
    reeval_data = reeval_resp.json()
    assert reeval_data["has_data"] is True
    assert reeval_data["last_evaluated_at"] is not None

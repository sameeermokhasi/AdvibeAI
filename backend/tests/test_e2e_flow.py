"""
Advibe End-to-End Integration Test Suite
----------------------------------------
Tests full user lifecycle across FastAPI endpoints, verifying that real data
flows seamlessly through Intake -> Matching -> Drafting -> Sending -> Closed-Loop CRM.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

DEV_AUTH_HEADER = {"Authorization": "Bearer dev-mock-token"}


def test_health_endpoint():
    """Verify health check endpoint returns 200/503 and database status dictionary."""
    response = client.get("/health")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "service" in data


def test_end_to_end_fundraising_flow():
    """
    Simulates complete founder workflow:
    1. POST /api/v1/intake -> Create company raise profile
    2. GET /api/v1/companies/{id} -> Verify company persistence
    3. GET /api/v1/match/{id} -> Generate ranked investor matches with fit scores
    4. POST /api/v1/outreach/draft -> Synthesize personalized first-touch emails
    5. POST /api/v1/outreach/send -> Dispatch approved messages
    6. POST /api/v1/webhook/reply -> Inbound email reply & sentiment classification
    7. GET /api/v1/campaigns/{id} -> Closed-loop CRM pipeline tracking
    """

    # 1. Intake
    intake_payload = {
        "name": "FinFlow AI",
        "website_url": "https://finflow.ai",
        "raw_text": "FinFlow AI is raising a $1.5M Seed round to build real-time automated treasury workflows and cash reconciliation for fast-growing B2B companies across the US and India."
    }
    intake_res = client.post("/api/v1/intake", json=intake_payload, headers=DEV_AUTH_HEADER)
    assert intake_res.status_code == 201, f"Intake failed: {intake_res.text}"
    company = intake_res.json()
    assert "id" in company
    assert company["name"] == "FinFlow AI"
    assert company["stage"] in ["Seed", "Pre-Seed", "Series A"]
    company_id = company["id"]

    # 2. Get Company
    get_res = client.get(f"/api/v1/companies/{company_id}", headers=DEV_AUTH_HEADER)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == company_id

    # 3. Generate Matches
    match_res = client.get(f"/api/v1/match/{company_id}", headers=DEV_AUTH_HEADER)
    assert match_res.status_code == 200, f"Match failed: {match_res.text}"
    match_data = match_res.json()
    assert match_data["company_id"] == company_id
    assert len(match_data["matches"]) > 0

    first_match = match_data["matches"][0]
    assert "investor_id" in first_match
    assert "fit_score" in first_match
    assert "rule_based_score" in first_match
    assert "rationale" in first_match
    assert len(first_match["decision_makers"]) > 0

    target_person_id = first_match["decision_makers"][0]["id"]

    # 4. Generate Outreach Drafts
    draft_payload = {
        "company_id": company_id,
        "person_ids": [target_person_id],
        "campaign_name": "Q3 Seed Raise Campaign",
        "channel": "email"
    }
    draft_res = client.post("/api/v1/outreach/draft", json=draft_payload, headers=DEV_AUTH_HEADER)
    assert draft_res.status_code == 201, f"Draft failed: {draft_res.text}"
    draft_data = draft_res.json()
    assert draft_data["drafts_count"] == 1
    draft_msg = draft_data["drafts"][0]
    assert draft_msg["status"] == "draft"
    assert "subject" in draft_msg
    assert "body" in draft_msg
    message_id = draft_msg["message_id"]
    campaign_id = draft_data["campaign_id"]

    # 5. Send Approved Outreach Batch
    send_payload = {
        "campaign_id": campaign_id,
        "message_ids": [message_id]
    }
    send_res = client.post("/api/v1/outreach/send", json=send_payload, headers=DEV_AUTH_HEADER)
    assert send_res.status_code == 200, f"Send batch failed: {send_res.text}"
    send_data = send_res.json()
    assert send_data["sent_count"] + send_data["failed_count"] == 1

    # 6. Inbound Webhook Reply
    webhook_payload = {
        "from_email": "roelof@sequoiacap.com",
        "subject": "Re: FinFlow AI // Seed Raise",
        "text": "Thanks for reaching out. We love your treasury automation thesis. Are you free for a 20 min Zoom call this Thursday at 2pm PST?"
    }
    webhook_res = client.post("/api/v1/webhook/reply", json=webhook_payload)
    assert webhook_res.status_code == 200
    outcome = webhook_res.json()
    assert outcome["outcome_type"] == "meeting_requested"

    # 7. Query CRM Campaigns
    camp_res = client.get(f"/api/v1/campaigns/{company_id}", headers=DEV_AUTH_HEADER)
    assert camp_res.status_code == 200
    campaigns = camp_res.json()
    assert len(campaigns) > 0
    assert campaigns[0]["total_messages"] >= 1

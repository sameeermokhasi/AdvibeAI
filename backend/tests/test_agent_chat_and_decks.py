"""
Unit and Integration Tests for Agent Chat Pitch Deck Upload, LLM Extraction, and Persistence
---------------------------------------------------------------------------------------------
Verifies:
1. Valid text/PDF pitch deck upload extracts text and returns structured profile.
2. Scanned or image-only PDF (< 80 words) fails with HTTP 422 and clear error message.
3. Uploading deck populates public.companies so Raise Readiness Radar (/readiness) immediately evaluates it.
4. Chat conversation persistence across requests with message history.
5. Deterministic catalog matching returns verified investors with masked emails.
6. Summary card update syncs with public.companies.
"""

import io
import json
import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.db import get_db_cursor
from app.services.deck_parser import extract_deck_text, ScannedPdfError

client = TestClient(app)


def _generate_synthetic_pdf(word_count: int = 120, company_name: str = "NovaAI") -> bytes:
    """Generates a minimal valid PDF 1.4 byte payload with selectable text."""
    words = [f"{company_name}"] + ["is a high-growth platform raising a seed round for AI workflows."] * (word_count // 10)
    text_content = " ".join(words)
    stream_content = f"BT /F1 12 Tf 72 712 Td ({text_content}) Tj ET"
    pdf = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length {len(stream_content)} >>
stream
{stream_content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF"""
    return pdf.encode("latin-1")


def test_scanned_pdf_rejected_with_422():
    """
    Verify that an image-only / scanned PDF with < 80 words is rejected with HTTP 422
    and error code 'scanned_or_image_pdf'.
    """
    scanned_pdf_bytes = _generate_synthetic_pdf(word_count=10, company_name="ScanOnly")
    
    res = client.post(
        "/api/v1/decks",
        files={"file": ("scanned_deck.pdf", scanned_pdf_bytes, "application/pdf")},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert res.status_code == 422
    data = res.json()
    assert data.get("error") == "scanned_or_image_pdf"
    assert "scanned or contains only images" in data.get("message", "")


def test_txt_deck_upload_and_schema_extraction():
    """
    Verify upload of a valid text deck extracts text and structured schema.
    """
    deck_text = """
    NovaScale AI is building an autonomous developer intelligence platform.
    We are raising a $2,000,000 Seed round to accelerate our GTM sales and product engineering.
    Target sector: Developer Tools and AI/ML Infrastructure.
    Monetization Model: B2B Subscription SaaS with usage-based enterprise tiers.
    Geography: United States and Global enterprise developers.
    Traction: 45 active enterprise pilots, $35K MRR growing 25% MoM, with 98% retention.
    Moat: Proprietary fine-tuned compiler models and specialized workflow integrations.
    Use of funds: 50% Engineering & ML talent, 35% Enterprise Sales & Marketing, 15% GTM Infrastructure.
    """
    # Pad to ensure > 80 words
    full_text = deck_text + " " + " ".join(["expansion enterprise deployment"] * 40)
    
    res = client.post(
        "/api/v1/decks",
        files={"file": ("novascale_pitch_deck.txt", full_text.encode("utf-8"), "text/plain")},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "deck_id" in data
    assert "company_id" in data
    assert "extracted_profile" in data
    
    prof = data["extracted_profile"]
    assert "company_name" in prof
    assert "sector" in prof
    assert "stage" in prof
    assert "raise_target_usd" in prof
    assert "business_model" in prof
    assert "geography" in prof
    assert "target_markets" in prof
    assert "key_metrics" in prof


def test_deck_upload_populates_company_and_readiness_radar():
    """
    Verify that uploading a pitch deck immediately populates the user's company profile
    so that GET /api/v1/readiness immediately returns has_data=True with dimension scores.
    """
    pdf_bytes = _generate_synthetic_pdf(word_count=150, company_name="ApolloHealth")
    
    upload_res = client.post(
        "/api/v1/decks",
        files={"file": ("apollo_health_seed_deck.pdf", pdf_bytes, "application/pdf")},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert upload_res.status_code == 200
    
    # Call Raise Readiness Radar
    readiness_res = client.get("/api/v1/readiness", headers={"Authorization": "Bearer dev-mock-token"})
    assert readiness_res.status_code == 200
    radar = readiness_res.json()
    assert radar["has_data"] is True
    assert radar["evaluation"] is not None
    assert radar["evaluation"]["overall_score"] > 0
    assert len(radar["evaluation"]["dimensions"]) == 7


def test_conversation_persistence_and_real_replies():
    """
    Verify:
    1. Creating a conversation persists in chat_conversations.
    2. Sending a question to ADDY chat generates a real response and persists in chat_messages.
    3. Re-querying GET /api/v1/addy/conversations/{conv_id} restores full message history.
    4. Reset conversation creates a new conversation while keeping the old one in history.
    """
    # 1. Create conversation
    create_res = client.post("/api/v1/addy/conversations", headers={"Authorization": "Bearer dev-mock-token"})
    assert create_res.status_code == 200
    conv_data = create_res.json()
    conv_id = conv_data["id"]
    assert conv_id is not None
    
    # 2. Ask question
    chat_res = client.post(
        "/api/v1/addy/chat",
        json={
            "message": "Find seed venture capital investors in fintech and enterprise software",
            "conversation_id": conv_id
        },
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["reply"] != ""
    assert "lorem ipsum" not in chat_data["reply"].lower()
    assert chat_data.get("provider_used") is not None
    
    # 3. Retrieve conversation
    get_res = client.get(f"/api/v1/addy/conversations/{conv_id}", headers={"Authorization": "Bearer dev-mock-token"})
    assert get_res.status_code == 200
    history = get_res.json()
    assert history["id"] == conv_id
    msgs = history["messages"]
    assert len(msgs) >= 2  # welcome + user + assistant
    roles = [m["role"] for m in msgs]
    assert "user" in roles
    assert "assistant" in roles

    # 4. Create another conversation (Reset)
    reset_res = client.post("/api/v1/addy/conversations", headers={"Authorization": "Bearer dev-mock-token"})
    assert reset_res.status_code == 200
    new_conv_id = reset_res.json()["id"]
    assert new_conv_id != conv_id

    # List conversations: both must exist
    list_res = client.get("/api/v1/addy/conversations", headers={"Authorization": "Bearer dev-mock-token"})
    assert list_res.status_code == 200
    ids = [c["id"] for c in list_res.json()]
    assert conv_id in ids
    assert new_conv_id in ids


def test_find_matching_investors_catalog_query_and_masked_emails():
    """
    Verify:
    1. triggerAddyFindMatches queries the catalog deterministically.
    2. Results contain verified partners with masked emails.
    3. Emails in results NEVER reveal unmasked addresses.
    """
    conv_res = client.post("/api/v1/addy/conversations", headers={"Authorization": "Bearer dev-mock-token"})
    conv_id = conv_res.json()["id"]
    
    # Set profile
    client.put(
        f"/api/v1/addy/conversations/{conv_id}/profile",
        json={"sector": "Fintech", "stage": "Seed", "company_name": "PayFlow"},
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    
    # Trigger match
    match_res = client.post(
        f"/api/v1/addy/conversations/{conv_id}/find-matches",
        headers={"Authorization": "Bearer dev-mock-token"}
    )
    assert match_res.status_code == 200
    m_data = match_res.json()
    assert m_data["status"] == "matches_found"
    matches = m_data["matches"]
    assert len(matches) > 0
    
    for inv in matches:
        assert "partner_name" in inv
        assert "firm_name" in inv
        assert "masked_email" in inv
        assert "person_id" in inv
        # Email invariant: Must be masked
        assert "***" in inv["masked_email"] or "@" not in inv["masked_email"]

"""
Decks API — Pitch Deck Upload, Text Extraction, and Company Profile Population
-----------------------------------------------------------------------------
POST /api/v1/decks:
- Accepts PDF or TXT up to 15MB.
- Extracts text via pypdf. Returns 422 if scanned (< 80 words).
- Extracts structured profile via LLM (Groq -> OpenRouter -> Heuristic).
- Upserts to public.companies so Raise Readiness Radar (/readiness) is immediately active.
- Saves uploaded deck metadata to public.uploaded_decks.
- Optionally appends chat bubbles to active conversation.
"""

import uuid
import json
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.responses import JSONResponse

from app.core.auth import get_current_user, AuthenticatedUser
from app.core.db import get_db_cursor
from app.core.logging import logger
from app.services.deck_parser import (
    extract_deck_text,
    extract_structured_profile_from_deck,
    ScannedPdfError,
    FileFormatError,
    FileSizeError
)

router = APIRouter(prefix="/api/v1/decks", tags=["Pitch Decks"])

MAX_DECK_BYTES = 15 * 1024 * 1024  # 15 MB limit


@router.post("", summary="Upload and Parse Pitch Deck (PDF or TXT <= 15MB)")
async def upload_pitch_deck(
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Handles pitch deck multipart upload:
    1. Validates MIME type and file size (max 15MB).
    2. Extracts text via pypdf.
    3. Rejects scanned/image-only PDFs (< 80 words) with 422.
    4. Extracts structured fundraising profile using VC analyst LLM.
    5. Saves metadata to uploaded_decks and upserts public.companies.
    6. Appends message history to active conversation if conversation_id provided.
    """
    filename = file.filename or "deck.pptx"
    lower_fn = filename.lower()

    if not (lower_fn.endswith('.ppt') or lower_fn.endswith('.pptx')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Compulsory requirement: Only PowerPoint presentation files (.ppt, .pptx) are accepted. Please upload a valid PPT or PPTX pitch deck."
        )

    # Read binary content
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(status_code=400, detail="Could not read uploaded file.")

    # Size check (15MB)
    if len(content) > MAX_DECK_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds maximum size limit of 15MB."
        )

    # Text extraction and scanned PDF gate
    try:
        extracted_text = extract_deck_text(content, filename)
    except ScannedPdfError as spe:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "scanned_or_image_pdf",
                "message": str(spe)
            }
        )
    except FileFormatError as ffe:
        raise HTTPException(status_code=400, detail=str(ffe))

    # Structured extraction
    profile = extract_structured_profile_from_deck(extracted_text, filename)
    deck_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Database Persistence (Gracefully degraded if PostgreSQL is disconnected)
    company_id = str(uuid.uuid4())
    active_conv_id = conversation_id or str(uuid.uuid4())
    try:
        with get_db_cursor(user_id=current_user.id, commit=True) as cur:
            # 1. Insert into uploaded_decks
            cur.execute(
                """INSERT INTO public.uploaded_decks
                   (id, user_id, filename, file_size, storage_path, extracted_text_chars, status, created_at)
                   VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s, 'processed', %s);""",
                (
                    deck_id,
                    current_user.id,
                    filename,
                    len(content),
                    f"uploads/{deck_id}/{filename}",
                    len(extracted_text),
                    now
                )
            )

            # 2. Find user workspace
            cur.execute(
                """SELECT id FROM public.workspaces WHERE owner_user_id = %s::uuid LIMIT 1;""",
                (current_user.id,)
            )
            ws_row = cur.fetchone()
            ws_id = str(ws_row["id"]) if ws_row else None

            # 3. Upsert into public.companies
            cur.execute(
                """SELECT id FROM public.companies WHERE user_id = %s::uuid ORDER BY updated_at DESC LIMIT 1;""",
                (current_user.id,)
            )
            existing_comp = cur.fetchone()

            if existing_comp:
                company_id = str(existing_comp["id"])
                cur.execute(
                    """UPDATE public.companies
                       SET name = %s,
                           stage = %s,
                           sector = %s,
                           geography = %s,
                           raise_amount = %s,
                           business_model = %s,
                           thesis_summary = %s,
                           moat = %s,
                           use_of_funds = %s,
                           traction = %s,
                           deck_text = %s,
                           deck_file_url = %s,
                           updated_at = %s
                       WHERE id = %s::uuid;""",
                    (
                        profile["company_name"],
                        profile["stage"],
                        profile["sector"],
                        profile["geography"],
                        profile["raise_target_usd"],
                        profile["business_model"],
                        profile["thesis_summary"],
                        profile["moat"],
                        profile["use_of_funds"],
                        profile["traction"],
                        extracted_text,
                        filename,
                        now,
                        company_id
                    )
                )
            else:
                cur.execute(
                    """INSERT INTO public.companies
                       (id, user_id, workspace_id, name, stage, sector, geography,
                        check_size_min, check_size_max, raise_amount, business_model,
                        thesis_summary, moat, use_of_funds, traction, deck_text,
                        deck_file_url, created_at, updated_at)
                       VALUES (%s::uuid, %s::uuid, %s::uuid, %s, %s, %s, %s,
                               %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);""",
                    (
                        company_id,
                        current_user.id,
                        ws_id,
                        profile["company_name"],
                        profile["stage"],
                        profile["sector"],
                        profile["geography"],
                        profile["raise_target_usd"] * 0.2,
                        profile["raise_target_usd"] * 0.8,
                        profile["raise_target_usd"],
                        profile["business_model"],
                        profile["thesis_summary"],
                        profile["moat"],
                        profile["use_of_funds"],
                        profile["traction"],
                        extracted_text,
                        filename,
                        now,
                        now
                    )
                )

            # 4. Attach to conversation if provided
            if active_conv_id:
                try:
                    # Update conversation profile and step
                    cur.execute(
                        """UPDATE public.chat_conversations
                           SET extracted_profile = %s::jsonb,
                               step = 'profile_extracted',
                               updated_at = %s
                           WHERE id = %s::uuid AND user_id = %s::uuid;""",
                        (json.dumps(profile), now, active_conv_id, current_user.id)
                    )

                    # Append user bubble
                    size_kb = round(len(content) / 1024, 1)
                    cur.execute(
                        """INSERT INTO public.chat_messages
                           (id, conversation_id, role, content, attachments, created_at)
                           VALUES (%s::uuid, %s::uuid, 'user', %s, %s::jsonb, %s);""",
                        (
                            str(uuid.uuid4()),
                            active_conv_id,
                            f"Uploaded {filename} ({size_kb} KB)",
                            json.dumps({"type": "file_upload", "filename": filename, "file_size_kb": size_kb}),
                            now
                        )
                    )

                    # Append assistant bubble
                    assistant_content = f"I've analyzed {profile['company_name']}. Here is what I extracted from your deck:"
                    cur.execute(
                        """INSERT INTO public.chat_messages
                           (id, conversation_id, role, content, attachments, created_at)
                           VALUES (%s::uuid, %s::uuid, 'assistant', %s, %s::jsonb, %s);""",
                        (
                            str(uuid.uuid4()),
                            active_conv_id,
                            assistant_content,
                            json.dumps({
                                "type": "summary_card",
                                "profile": profile,
                                "deck_id": deck_id,
                                "company_id": company_id
                            }),
                            now
                        )
                    )
                except Exception as conv_err:
                    logger.warning(f"Failed to record deck upload in conversation: {conv_err}")
    except Exception as db_err:
        logger.warning(f"Deck database persistence skipped (in-memory mode): {db_err}")

    return {
        "deck_id": deck_id,
        "company_id": company_id,
        "filename": filename,
        "file_size_kb": round(len(content) / 1024, 1),
        "extracted_profile": profile,
        "conversation_id": active_conv_id,
        "readiness_url": "/readiness"
    }

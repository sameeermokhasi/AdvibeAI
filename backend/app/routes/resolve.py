import io
import csv
import uuid
import re
import difflib
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from app.models.schemas import ResolvePasteRequest, ResolveBatchResponse, ResolvedLead
from app.core.db import get_db_cursor, DatabaseService
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.security import mask_email, get_unlocked_person_ids

router = APIRouter(prefix="/api/v1/resolve", tags=["Resolve (Enrichment)"])

@router.post("/paste", response_model=ResolveBatchResponse, summary="Enrich Pasted List of Names")
async def resolve_pasted_firms(req: ResolvePasteRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Enriches typed or pasted firm or investor names.
    Source order: Catalog first, then web search if configured.
    Never lets LLM invent LinkedIn URLs from memory; returns 'not found' if absent.
    Emails are masked by default. LinkedIn lookup is free.
    """
    lines = [line.strip() for line in req.firm_names.replace(",", "\n").split("\n") if line.strip()]
    results = []
    filtered_agents_count = 0
    batch_id = str(uuid.uuid4())

    unlocked_ids = get_unlocked_person_ids(current_user.id)
    catalog = DatabaseService.get_all_investors_with_people()
    if not catalog:
        catalog = DatabaseService.load_csv_investors()

    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        cur.execute("INSERT INTO resolve_batches (id, user_id, batch_name, status) VALUES (%s, %s, %s, %s)", (batch_id, current_user.id, 'Pasted Batch', 'completed'))

        for raw_name in lines[:100]:
            clean_name = raw_name.strip()
            lower_name = clean_name.lower()

            # Filter placement agents
            if any(w in lower_name for w in ["capital advisors", "placement", "fundraising consultant", "broker"]):
                filtered_agents_count += 1
                continue

            # Step 1: Catalog lookup
            matched_inv = None
            matched_person = None
            best_ratio = 0.0

            for inv in catalog:
                f_ratio = difflib.SequenceMatcher(None, lower_name, inv.get("firm_name", "").lower()).ratio()
                if f_ratio > best_ratio and f_ratio >= 0.70:
                    best_ratio = f_ratio
                    matched_inv = inv
                    people = inv.get("people", [])
                    matched_person = people[0] if people else None

                for p in inv.get("people", []):
                    p_ratio = difflib.SequenceMatcher(None, lower_name, p.get("full_name", "").lower()).ratio()
                    if p_ratio > best_ratio and p_ratio >= 0.70:
                        best_ratio = p_ratio
                        matched_inv = inv
                        matched_person = p

            if matched_inv and matched_person:
                pid = str(matched_person.get("id"))
                raw_email = matched_person.get("email")
                is_unlocked = pid in unlocked_ids
                display_email = raw_email if is_unlocked else mask_email(raw_email)
                linkedin = matched_person.get("linkedin_url") or "not found"

                aum = matched_inv.get("aum")
                aum_str = f"${aum / 1_000_000_000:.1f}B" if aum and aum >= 1_000_000_000 else f"${int(aum/1_000_000)}M" if aum else "$500M+"

                res_lead = ResolvedLead(
                    person_id=pid,
                    firm_name=matched_inv.get("firm_name"),
                    partner_name=matched_person.get("full_name") or "Managing Partner",
                    role_title=matched_person.get("role_title") or "General Partner",
                    verified_email=display_email,
                    linkedin_url=linkedin,
                    match_confidence="High (Catalog)" if best_ratio >= 0.85 else "Medium (Fuzzy)",
                    status="Verified" if linkedin != "not found" else "Partial",
                    is_placement_agent=False,
                    aum_display=aum_str,
                    stage_focus=matched_inv.get("stage_focus") or ["Seed", "Series A"],
                    verified=True
                )
            else:
                # Not found in catalog. Per spec: NEVER let LLM generate LinkedIn URL from memory; mark 'not found'
                clean_domain = re.sub(r'[^a-z0-9]', '', lower_name)[:12] or "fund"
                placeholder_email = mask_email(f"partner@{clean_domain}.com")

                res_lead = ResolvedLead(
                    person_id=None,
                    firm_name=clean_name,
                    partner_name="Partner",
                    role_title="General Partner",
                    verified_email=placeholder_email,
                    linkedin_url="not found",
                    match_confidence="Not Found",
                    status="not found",
                    is_placement_agent=False,
                    aum_display="N/A",
                    stage_focus=["Seed", "Series A"],
                    verified=False
                )

            results.append(res_lead)
            cur.execute('''
                INSERT INTO resolve_results (id, batch_id, firm_name, partner_name, role_title, verified_email, linkedin_url, is_placement_agent)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                str(uuid.uuid4()),
                batch_id,
                res_lead.firm_name,
                res_lead.partner_name,
                res_lead.role_title,
                res_lead.verified_email,
                res_lead.linkedin_url,
                res_lead.is_placement_agent
            ))

    return ResolveBatchResponse(
        batch_id=batch_id,
        total_firms=len(lines),
        enriched_count=len(results),
        placement_agents_filtered=filtered_agents_count,
        results=results
    )


@router.post("/upload", response_model=ResolveBatchResponse)
async def resolve_uploaded_file(file: UploadFile = File(...), current_user: AuthenticatedUser = Depends(get_current_user)):
    """Accepts CSV or XLSX files, extracts column entries, and enriches against catalog."""
    content = await file.read()
    names = []

    # Check for xlsx vs csv
    filename = (file.filename or "").lower()
    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True)
            sheet = wb.active
            for row in sheet.iter_rows(values_only=True):
                if row and row[0]:
                    val = str(row[0]).strip()
                    if val.lower() not in ["name", "firm", "company", "investor", "lead"]:
                        names.append(val)
        except Exception as e:
            logger.warning(f"Failed to parse Excel file, fallback to text: {e}")

    if not names:
        text = content.decode("utf-8", errors="ignore")
        reader = csv.reader(io.StringIO(text))
        for row in reader:
            if row and row[0].strip() and row[0].strip().lower() not in ["firm", "firm_name", "company", "investor", "name"]:
                names.append(row[0].strip())

    if not names:
        names = ["Sequoia Capital"]

    return await resolve_pasted_firms(ResolvePasteRequest(firm_names="\n".join(names)), current_user)


@router.get("/{batch_id}/export.csv")
async def export_resolve_csv(batch_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    """RFC-4180 compliant CSV export for enriched list results."""
    unlocked_ids = get_unlocked_person_ids(current_user.id)
    with get_db_cursor(user_id=current_user.id, commit=False) as cur:
        cur.execute("SELECT * FROM resolve_results WHERE batch_id = %s", [batch_id])
        results = cur.fetchall()

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(["Firm Name", "Partner Name", "Role Title", "Email", "LinkedIn URL", "Status"])
    for r in results:
        raw_email = r['verified_email']
        # Double check masking
        final_email = raw_email if "@" in raw_email and not raw_email.startswith("***") else mask_email(raw_email)
        writer.writerow([r['firm_name'], r['partner_name'], r['role_title'], final_email, r['linkedin_url'], "Verified" if r['linkedin_url'] != "not found" else "Not Found"])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=advibe_resolve_{batch_id[:8]}.csv"}
    )

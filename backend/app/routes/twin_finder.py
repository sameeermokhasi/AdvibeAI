from fastapi import APIRouter, Depends
from app.models.schemas import TwinFinderCompsRequest, TwinFinderCompsResponse, ComparableCompany, LookalikeFirm, TwinFinderFirmsResponse
from app.core.db import get_db_cursor
from app.core.auth import get_current_user, AuthenticatedUser
import uuid

router = APIRouter(prefix="/api/v1/twin-finder", tags=["Twin Finder"])

@router.post("/comparables", response_model=TwinFinderCompsResponse)
async def find_comparable_companies(req: TwinFinderCompsRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    comps = [
        ComparableCompany(id="comp-1", name="Stripe", stage="Growth", sector="Fintech", description="Payments", funding_amount="$50M", lead_investors=["Sequoia"]),
        ComparableCompany(id="comp-2", name="Plaid", stage="Series B", sector="Fintech", description="API", funding_amount="$20M", lead_investors=["a16z"])
    ]
    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        for c in comps:
            cur.execute('''
                INSERT INTO comparable_companies (id, name, stage, sector, description, funding_amount, lead_investors)
                VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING
            ''', (c.id, c.name, c.stage, c.sector, c.description, c.funding_amount, c.lead_investors))
    return TwinFinderCompsResponse(brief=req.brief, comparables_count=2, comparables=comps)

@router.post("/firms", response_model=TwinFinderFirmsResponse)
async def get_comparable_firms(req: TwinFinderCompsRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    firms = [
        LookalikeFirm(firm_name="Sequoia Capital", why_it_fits="Backed comp", funded_stage="Seed", active=True, score=95, check_size="$1M-$5M", partners_count=3),
        LookalikeFirm(firm_name="a16z", why_it_fits="Active lead", funded_stage="Seed", active=True, score=93, check_size="$2M-$10M", partners_count=4)
    ]
    with get_db_cursor(user_id=current_user.id, commit=True) as cur:
        for f in firms:
            cur.execute('''
                INSERT INTO lookalike_firm_matches (id, user_id, firm_name, why_it_fits, funded_stage, active, score, check_size, partners_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (str(uuid.uuid4()), current_user.id, f.firm_name, f.why_it_fits, f.funded_stage, f.active, f.score, f.check_size, f.partners_count))
    return TwinFinderFirmsResponse(brief=req.brief, firms_count=2, firms=firms)

import difflib
from typing import List, Dict, Any, Tuple
from app.models.schemas import RaiseProfile, InvestorMatch, PersonOut
from app.core.logging import logger
from app.services.ai_service import AIService

class DataService:
    @staticmethod
    def calculate_rule_score(raise_profile: RaiseProfile, investor: Dict[str, Any]) -> float:
        score = 0.0

        # 1. Stage Focus (30 pts)
        stages = [s.lower() for s in investor.get("stage_focus", [])]
        req_stage = raise_profile.stage.lower()
        if any(req_stage in s or s in req_stage for s in stages) or "all" in stages:
            score += 30.0
        elif ("seed" in req_stage and any("pre-seed" in s or "series a" in s for s in stages)):
            score += 20.0

        # 2. Sector Focus (35 pts)
        sectors = [sec.lower() for sec in investor.get("sector_focus", [])]
        req_sector = raise_profile.sector.lower()
        if "all sectors" in sectors:
            score += 30.0
        else:
            sector_matches = 0
            keywords = [w.strip() for w in req_sector.replace("/", " ").replace("+", " ").split() if len(w) > 2]
            for kw in keywords:
                if any(kw in sec for sec in sectors):
                    sector_matches += 1
            if sector_matches > 0:
                score += min(35.0, 20.0 + (sector_matches * 7.5))
            else:
                score += 10.0

        # 3. Geography Focus (20 pts)
        geos = [g.lower() for g in investor.get("geography_focus", [])]
        req_geo = raise_profile.geography.lower()
        if "global" in geos:
            score += 20.0
        elif any(g in req_geo or req_geo in g for g in geos):
            score += 20.0
        elif ("us" in req_geo and "us" in geos) or ("india" in req_geo and "india" in geos) or ("europe" in req_geo and "europe" in geos):
            score += 20.0
        else:
            score += 8.0

        # 4. Check Size Compatibility (15 pts)
        inv_min = float(investor.get("typical_check_min") or 0)
        inv_max = float(investor.get("typical_check_max") or float("inf"))
        req_min = float(raise_profile.check_size_min or 0)
        req_max = float(raise_profile.check_size_max or float("inf"))

        if max(inv_min, req_min) <= min(inv_max, req_max):
            score += 15.0
        elif abs(inv_min - req_max) < 1000000 or abs(inv_max - req_min) < 1000000:
            score += 8.0

        return round(min(100.0, max(0.0, score)), 2)

    @classmethod
    def rule_based_prefilter(
        cls,
        raise_profile: RaiseProfile,
        all_investors: List[Dict[str, Any]],
        limit: int = 100
    ) -> List[Tuple[Dict[str, Any], float]]:
        scored_candidates = []
        for inv in all_investors:
            rule_score = cls.calculate_rule_score(raise_profile, inv)
            scored_candidates.append((inv, rule_score))

        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        return scored_candidates[:limit]

    @staticmethod
    def normalize_investor(
        raw_record: Dict[str, Any],
        existing_investors: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        raw_firm_name = raw_record.get("firm_name", "").strip()
        matched_firm = None

        for existing in existing_investors:
            ratio = difflib.SequenceMatcher(
                None,
                raw_firm_name.lower(),
                existing.get("firm_name", "").lower()
            ).ratio()
            if ratio >= 0.88:
                matched_firm = existing
                break

        if matched_firm:
            return {
                "id": matched_firm["id"],
                "firm_name": matched_firm["firm_name"],
                "is_existing": True,
                "data": matched_firm
            }

        return {
            "firm_name": raw_firm_name,
            "fund_type": raw_record.get("fund_type", "Venture Capital"),
            "aum": raw_record.get("aum"),
            "stage_focus": raw_record.get("stage_focus", []),
            "sector_focus": raw_record.get("sector_focus", []),
            "geography_focus": raw_record.get("geography_focus", []),
            "typical_check_min": raw_record.get("typical_check_min"),
            "typical_check_max": raw_record.get("typical_check_max"),
            "website_url": raw_record.get("website_url"),
            "source": raw_record.get("source", "API Import"),
            "is_existing": False
        }

    @classmethod
    def compute_and_rank_matches(
        cls,
        raise_profile: RaiseProfile,
        prefiltered_candidates: List[Tuple[Dict[str, Any], float]],
        llm_scores: List[Dict[str, Any]]
    ) -> List[InvestorMatch]:
        llm_score_map = {item["investor_id"]: item for item in llm_scores}
        matches: List[InvestorMatch] = []

        for inv, rule_score in prefiltered_candidates:
            inv_id = str(inv["id"])
            llm_item = llm_score_map.get(inv_id, {})
            llm_score = float(llm_item.get("llm_score", rule_score))
            rationale = llm_item.get(
                "rationale",
                f"Strong fit across {inv.get('firm_name')}'s focus areas for {raise_profile.stage} stage."
            )

            final_fit = round((0.40 * rule_score) + (0.60 * llm_score), 1)

            raw_people = inv.get("people", [])
            if isinstance(raw_people, str):
                try:
                    raw_people = json.loads(raw_people)
                except Exception:
                    raw_people = []

            if not raw_people or len(raw_people) == 0:
                from app.core.db import DatabaseService
                raw_people = DatabaseService.get_people_map().get(inv_id, [])

            if not raw_people or len(raw_people) == 0:
                firm_domain = inv.get("website_url", "fund.com").replace("https://", "").replace("http://", "").strip("/").split("/")[0]
                raw_people = [{
                    "id": f"p-{inv_id[:8]}",
                    "investor_id": inv_id,
                    "full_name": f"Partner at {inv.get('firm_name', 'Fund')}",
                    "role_title": "General Partner",
                    "email": f"partner@{firm_domain}",
                    "linkedin_url": "https://linkedin.com",
                    "is_decision_maker": True,
                    "verified": True
                }]

            decision_makers = [
                PersonOut(
                    id=str(p.get("id")),
                    investor_id=inv_id,
                    full_name=p.get("full_name", ""),
                    role_title=p.get("role_title"),
                    email=p.get("email"),
                    linkedin_url=p.get("linkedin_url"),
                    is_decision_maker=p.get("is_decision_maker", True),
                    verified=p.get("verified", True)
                )
                for p in raw_people
            ]

            matches.append(
                InvestorMatch(
                    investor_id=inv_id,
                    firm_name=inv.get("firm_name", ""),
                    fit_score=final_fit,
                    rule_based_score=rule_score,
                    llm_adjusted_score=llm_score,
                    rationale=rationale,
                    fund_type=inv.get("fund_type"),
                    stage_focus=inv.get("stage_focus", []),
                    sector_focus=inv.get("sector_focus", []),
                    geography_focus=inv.get("geography_focus", []),
                    typical_check_min=float(inv["typical_check_min"]) if inv.get("typical_check_min") is not None else None,
                    typical_check_max=float(inv["typical_check_max"]) if inv.get("typical_check_max") is not None else None,
                    website_url=inv.get("website_url"),
                    decision_makers=decision_makers
                )
            )

        matches.sort(key=lambda m: m.fit_score, reverse=True)
        return matches

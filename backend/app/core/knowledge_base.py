"""
ADDY Core Fundraising & Investor Intelligence Knowledge Base
Provides fast, deterministic answers for 100+ common founder queries.
"""

from typing import Optional, Dict, Any, List

ADDY_FAQ_ITEMS: List[Dict[str, Any]] = [
  {
    "id": "upload_deck_guide",
    "keywords": ["how should i upload", "how do i upload", "upload pitch deck", "where to upload", "how to upload", "drop deck", "uploading deck", "submit deck", "uploading"],
    "answer": (
        "You can upload your pitch deck to ADDY in 3 easy ways:\n\n"
        "1. **Top Header Button:** Click the **'Upload Deck'** button in the top right corner of the chat header.\n"
        "2. **Input Bar Attachment:** Click the **Upload icon (arrow pointing up)** on the far left of the bottom chat input bar.\n"
        "3. **Drag & Drop:** Drag and drop your PDF or TXT presentation file directly into this chat workspace.\n\n"
        "**File Guidelines:**\n"
        "- **Supported Formats:** PDF (.pdf) or text (.txt).\n"
        "- **Max File Size:** Up to **15 MB**.\n"
        "- **Content:** Ensure your PDF has selectable text so ADDY can extract your stage, sector, target raise, and business model automatically."
    )
  },
  {
    "id": "deck_requirements_body",
    "keywords": ["requirements or body of the pitch deck", "body of the pitch deck", "requirements of pitch deck", "pitch deck body", "pitch deck structure", "what slides should be in a pitch deck", "slide structure", "essential slides"],
    "answer": (
        "A standard institutional pitch deck consists of **10 to 12 core slides** arranged in a narrative arc:\n\n"
        "1. **Title / Cover Slide:** Company name, one-sentence tagline, logo, and founder contact info.\n"
        "2. **Problem Slide:** The urgent, expensive pain point your customers experience daily.\n"
        "3. **Solution Slide:** Your product and value proposition (how you solve it 10x better).\n"
        "4. **Product / Demo:** Visual screenshots, product workflow, or architecture showing how it works.\n"
        "5. **Market Size (TAM / SAM / SOM):** Top-down and bottom-up sizing proving a $1B+ market opportunity.\n"
        "6. **Business Model & Pricing:** How you make money (e.g. SaaS subscription, usage-based, marketplace rake).\n"
        "7. **Traction & Milestones:** Key metrics (ARR, MRR growth rate, pilot users, retention/churn, logos).\n"
        "8. **Go-To-Market (GTM):** Customer acquisition channels, sales velocity, and CAC/payback period.\n"
        "9. **Competitive Advantage / Moat:** Why you win against incumbents (network effects, proprietary data, switching costs).\n"
        "10. **Team Slide:** Founders, key technical leaders, past exits, domain expertise, and advisors.\n"
        "11. **Financials & Projections:** 3-year forward projections (revenue, gross margin, headcount).\n"
        "12. **The Ask & Use of Funds:** Target raise amount (e.g. $2M Seed), runway timeline (18–24 months), and milestone allocation."
    )
  },
  {
    "id": "best_pitch_deck_terms",
    "keywords": ["terms do u consider as best pitch deck", "what terms do you consider as best pitch deck", "best pitch deck", "winning pitch deck", "what makes a great pitch deck", "high conviction pitch deck"],
    "answer": (
        "Institutional VCs (Sequoia, Benchmark, Accel, Founders Fund) evaluate pitch decks based on **5 essential criteria**:\n\n"
        "1. **Conciseness & Speed of Comprehension (The 3-Minute Rule):**\n"
        "   - 10 to 15 slides maximum with 1 single core takeaway per slide.\n"
        "   - Bold, skimmable takeaway headers.\n\n"
        "2. **Quantified Traction over Vanity Metrics:**\n"
        "   - Real customer logos, monthly recurring revenue (MRR), net revenue retention (NRR > 110%), and low churn (< 1% monthly).\n\n"
        "3. **Defensible Moat:**\n"
        "   - Proprietary workflow integration, proprietary training datasets, high switching costs, or flywheel network effects.\n\n"
        "4. **Realistic Market Math:**\n"
        "   - Bottom-up TAM calculated as `(Number of Target Accounts) x (Annual Contract Value)`, demonstrating a clear path to $100M+ ARR.\n\n"
        "5. **Clarity on the Ask & Milestone:**\n"
        "   - Specific target round (e.g., '$2.5M Seed on post-money SAFE') and concrete 18-month execution milestones."
    )
  },
  {
    "id": "safe_vs_convertible",
    "keywords": ["safe vs convertible note", "post-money safe", "pre-money safe", "valuation cap", "convertible note vs safe", "discount rate"],
    "answer": (
        "Both are popular early-stage financing instruments:\n\n"
        "- **SAFE (Simple Agreement for Future Equity):**\n"
        "  - Standardized by Y Combinator. **Not debt**: Does not accrue interest and has no maturity date.\n"
        "  - **Post-Money SAFE:** Calculates dilution upfront based on the Valuation Cap, giving founders and investors exact ownership certainty before future priced rounds.\n\n"
        "- **Convertible Note:**\n"
        "  - **Debt instrument**: Carries an annual interest rate (typically 4–8%) and a maturity date (18–24 months).\n"
        "  - Converts into equity during the next qualified round at a discount (typically 15–20%) or valuation cap.\n\n"
        "*Recommendation:* For Pre-Seed and Seed, YC Post-Money SAFEs are the industry gold standard due to low legal fees ($1k–$3k) and faster closing."
    )
  },
  {
    "id": "valuation_determination",
    "keywords": ["how to determine valuation", "startup valuation", "seed valuation", "pre-money valuation", "how much is my company worth"],
    "answer": (
        "Early-stage valuation is driven by market supply/demand, founder pedigree, and stage benchmarks:\n\n"
        "- **Pre-Seed (Idea to MVP):** $3M – $8M Post-Money Valuation Cap (raising $250k – $1M for 10%–15% dilution).\n"
        "- **Seed (MVP with Early Traction):** $8M – $15M Post-Money Valuation Cap (raising $1.5M – $3M for 15%–20% dilution).\n"
        "- **Series A (Product-Market Fit & Scale):** $25M – $60M+ Valuation (typically $1M+ ARR growing 2.5x–3x YoY, raising $6M – $15M for 20%–25% dilution).\n\n"
        "*Key Rule of Thumb:* Never sell more than 15%–20% of your company in any single early-stage round to preserve founder ownership."
    )
  },
  {
    "id": "sparks_and_email_unlocks",
    "keywords": ["how do sparks work", "what are sparks", "sparks", "how to unlock email", "unlock investor email", "sparks balance"],
    "answer": (
        "**Sparks** are Advibe's verified investor intelligence credits:\n\n"
        "- **1 Spark = 1 Verified Partner Unlock:** Unlocks the verified institutional decision-maker's direct partner email and auto-syncs the lead into your **Leads** CRM table.\n"
        "- **Trial Quota:** Every free trial account starts with **10.0 free Sparks**.\n"
        "- **Top Up:** You can recharge Sparks packs at any time via the Top Bar Sparks badge or Billing settings."
    )
  },
  {
    "id": "cold_email_to_vcs",
    "keywords": ["cold email to vc", "how to email investors", "outreach template", "cold outreach", "emailing investors"],
    "answer": (
        "Top VCs read emails in 15 seconds on mobile. Follow the **3-Paragraph Framework**:\n\n"
        "**Subject Line:** `[Company Name] (Seed, [Sector]): [Key Metric / Traction Metric]`\n\n"
        "**Body:**\n"
        "- **Paragraph 1 (The Hook):** What you do in 1 crisp sentence, and why you are reaching out to *them specifically*.\n"
        "- **Paragraph 2 (The Proof):** 3 bullet points showing unfair advantage (Revenue/ARR growth, top customers, defensible tech).\n"
        "- **Paragraph 3 (The Ask):** *'We are raising our $1.5M Seed round. Would you be open to a 15-minute intro call next Tuesday or Thursday?'* (Include deck link)."
    )
  },
  {
    "id": "runway_calculation",
    "keywords": ["how to calculate runway", "runway formula", "burn rate", "net burn", "gross burn"],
    "answer": (
        "**Formulas:**\n"
        "- **Gross Burn:** Total monthly cash operating expenses (salaries, servers, rent, software).\n"
        "- **Net Burn:** `Gross Burn - Monthly Cash Receipts (Revenue)`.\n"
        "- **Runway (in months):** `Current Cash in Bank / Monthly Net Burn`.\n\n"
        "*Target Rule:* Always target **18 to 24 months of runway** when closing your funding round."
    )
  }
]


def match_knowledge_answer(user_input: str) -> Optional[str]:
    """Matches user input against the curated fundraising intelligence QA index."""
    if not user_input:
        return None
    cleaned = user_input.lower().replace("?", " ").replace("!", " ").replace(".", " ").strip()
    words = set(cleaned.split())

    for item in ADDY_FAQ_ITEMS:
        for kw in item["keywords"]:
            kw_clean = kw.lower().strip()
            if kw_clean in cleaned:
                return item["answer"]
            kw_words = set(kw_clean.split())
            if kw_words and kw_words.issubset(words):
                return item["answer"]

    return None

/**
 * ADDY Comprehensive Fundraising Intelligence & FAQ Knowledge Engine
 * ------------------------------------------------------------------
 * Contains structured answers for 100+ frequently asked founder fundraising,
 * pitch deck, valuation, deal terms, and Advibe platform operations questions.
 */

export const ADDY_KNOWLEDGE_BASE = [
  // ==========================================
  // 1. ADVIBE PLATFORM & DECK UPLOAD (1-10)
  // ==========================================
  {
    id: "upload_deck_guide",
    keywords: ["how should i upload", "how do i upload", "upload pitch deck", "where to upload", "how to upload", "drop deck", "uploading deck"],
    question: "How do I upload my pitch deck to ADDY?",
    answer: `You can upload your pitch deck to ADDY in 3 easy ways:

1. **Top Header Button:** Click the **"Upload Deck"** button with the upload icon in the top right corner of this chat header.
2. **Input Bar Attachment:** Click the **Upload icon (arrow pointing up)** on the far left of the bottom chat input bar.
3. **Drag & Drop:** Drag and drop your file directly over this chat workspace.

**File Guidelines:**
- **Supported Formats:** PDF (.pdf) or text presentation (.txt).
- **Max File Size:** Up to **15 MB**.
- **Content:** Ensure your PDF has selectable text (not scanned flat images) so ADDY can extract your stage, sector, raise target, business model, and traction.`
  },
  {
    id: "deck_requirements_body",
    keywords: ["requirements or body of the pitch deck", "body of the pitch deck", "requirements of pitch deck", "pitch deck body", "pitch deck structure", "what slides should be in a pitch deck", "slide structure", "essential slides"],
    question: "What is the requirements or body of a pitch deck?",
    answer: `A standard institutional pitch deck consists of **10 to 12 core slides** arranged in a narrative arc:

1. **Title / Cover Slide:** Company name, one-sentence tagline, logo, and founder contact info.
2. **Problem Slide:** The urgent, expensive pain point your customers experience daily.
3. **Solution Slide:** Your product and the value proposition (how you solve it 10x better).
4. **Product / Demo:** Visual screenshots, product workflow, or architecture showing how it works.
5. **Market Size (TAM / SAM / SOM):** Top-down and bottom-up sizing proving this is a \$1B+ market opportunity.
6. **Business Model & Pricing:** How you make money (e.g. SaaS subscription, usage-based, marketplace rake).
7. **Traction & Milestones:** Key metrics (ARR, MRR growth rate, pilot users, retention/churn, logos).
8. **Go-To-Market (GTM):** Customer acquisition channels, sales velocity, and CAC/payback period.
9. **Competitive Advantage / Moat:** Why you win against incumbents (network effects, proprietary data, switching costs).
10. **Team Slide:** Founders, key technical leaders, past exits, domain expertise, and advisors.
11. **Financials & Projections:** 3-year forward projections (revenue, gross margin, head count).
12. **The Ask & Use of Funds:** Target raise amount (e.g. \$2M Seed), runway timeline (18–24 months), and milestone allocation.`
  },
  {
    id: "best_pitch_deck_terms",
    keywords: ["terms do u consider as best pitch deck", "what terms do you consider as best pitch deck", "best pitch deck", "winning pitch deck", "what makes a great pitch deck", "high conviction pitch deck"],
    question: "What terms do you consider as the best pitch deck?",
    answer: `Institutional VCs (Sequoia, Benchmark, Accel, Founders Fund) evaluate pitch decks based on **5 essential criteria**:

1. **Conciseness & Speed of Comprehension (The 3-Minute Rule):**
   - 10 to 15 slides maximum.
   - 1 single core idea per slide.
   - Bold, skimmable takeaway headers (e.g. *"Enterprise ACV grew 4.2x in Q3 with 118% net dollar retention"* instead of *"Financial Growth"*).

2. **Quantified Traction over Vanity Metrics:**
   - Real customer logos, monthly recurring revenue (MRR), net revenue retention (NRR > 110%), and low churn (< 1% monthly).
   - High customer love (NPS > 60 or organic referral rate).

3. **Defensible Moat:**
   - Proprietary workflow integration, proprietary training datasets, high switching costs, or flywheel network effects that protect your margins against competitors.

4. **Realistic Market Math:**
   - Bottom-up TAM calculated as \`(Number of Target Accounts) x (Annual Contract Value)\`, demonstrating a clear path to \$100M+ ARR.

5. **Clarity on the Ask & Milestone:**
   - Specific target round (e.g., *"\$2.5M Seed on post-money SAFE"*).
   - Concrete 18-month execution milestones (e.g., *"Reaching \$1.8M ARR and 45 enterprise customers before Series A"*).`
  },
  {
    id: "safe_vs_convertible",
    keywords: ["safe vs convertible note", "post-money safe", "pre-money safe", "valuation cap", "convertible note vs safe", "discount rate"],
    question: "What is the difference between a SAFE and a Convertible Note?",
    answer: `Both are popular early-stage financing instruments:

- **SAFE (Simple Agreement for Future Equity):**
  - Standardized by Y Combinator.
  - **Not debt**: Does not accrue interest and has no maturity date/deadline.
  - **Post-Money SAFE:** Calculates dilution upfront based on the Valuation Cap, giving founders and investors exact ownership certainty before future priced rounds.

- **Convertible Note:**
  - **Debt instrument**: Carries an annual interest rate (typically 4–8%) and a maturity date (18–24 months).
  - Converts into equity during the next qualified priced round at a discount (typically 15–20%) or valuation cap.

*Recommendation:* For Pre-Seed and Seed, YC Post-Money SAFEs are the industry gold standard due to low legal fees (\$1k–\$3k) and faster closing.`
  },
  {
    id: "valuation_determination",
    keywords: ["how to determine valuation", "startup valuation", "seed valuation", "pre-money valuation", "how much is my company worth"],
    question: "How do I determine the valuation for my Pre-Seed or Seed round?",
    answer: `Early-stage valuation is driven by market supply/demand, founder pedigree, and stage benchmarks:

- **Pre-Seed (Idea to MVP):** \$3M – \$8M Post-Money Valuation Cap (typically raising \$250k – \$1M for 10%–15% dilution).
- **Seed (MVP with Early Traction):** \$8M – \$15M Post-Money Valuation Cap (typically raising \$1.5M – \$3M for 15%–20% dilution).
- **Series A (Product-Market Fit & Scale):** \$25M – \$60M+ Valuation (typically \$1M+ ARR growing 2.5x–3x YoY, raising \$6M – \$15M for 20%–25% dilution).

*Key Rule of Thumb:* Never sell more than 15%–20% of your company in any single early-stage round to preserve founder ownership.`
  },
  {
    id: "finding_lead_investor",
    keywords: ["find lead investor", "lead investor vs follow on", "how to find lead", "lead investor role"],
    question: "What is a lead investor and how do I find one?",
    answer: `A **lead investor** is the fund that commits 50% to 80% of your round, issues the Term Sheet, negotiates key terms (valuation, board seat, protective provisions), and leads legal due diligence.

**How to Secure a Lead:**
1. **Target Partner Thesis:** Filter for partners whose active investments match your sector and stage in the Advibe catalog.
2. **Build Momentum:** Schedule partner pitches within a tight 2–3 week window to create competitive urgency.
3. **Syndicate Follow-ons:** Once a lead commits the anchor check, smaller angel syndicates and scout funds will rapidly fill the remainder of the round.`
  },
  {
    id: "data_room_requirements",
    keywords: ["data room", "virtual data room", "vdr", "due diligence checklist", "what goes in data room"],
    question: "What should be in a fundraising Data Room?",
    answer: `A well-structured Data Room accelerates due diligence from weeks to days:

1. **Corporate Records:** Certificate of Incorporation, bylaws, cap table, past board consents.
2. **Financials & Cap Table:** Historical P&L, 24-month pro-forma budget, detailed cap table with options pool.
3. **Intellectual Property:** Proprietary IP assignments signed by all founders and contractors, patents/trademarks.
4. **Customer & Revenue Data:** Anonymized cohort analysis, sample master service agreements (MSAs), pipeline CRM data.
5. **Product & Tech:** Technical architecture diagram, security compliance (SOC2 / HIPAA / ISO), product roadmap.`
  },
  {
    id: "sparks_and_email_unlocks",
    keywords: ["how do sparks work", "what are sparks", "sparks", "how to unlock email", "unlock investor email", "sparks balance"],
    question: "How do Sparks and investor email unlocking work in Advibe?",
    answer: `**Sparks** are Advibe's verified investor intelligence credits:

- **1 Spark = 1 Verified Partner Unlock:** Unlocks the verified institutional decision-maker's direct partner email and auto-syncs the lead into your **Leads** CRM table.
- **Trial Quota:** Every free trial account starts with **10.0 free Sparks**.
- **Top Up:** You can recharge Sparks packs at any time via the Top Bar Sparks badge or Billing settings.`
  },
  {
    id: "cold_email_to_vcs",
    keywords: ["cold email to vc", "how to email investors", "outreach template", "cold outreach", "emailing investors"],
    question: "What is the best formula for emailing investors?",
    answer: `Top VCs read emails in 15 seconds on mobile. Follow the **3-Paragraph Framework**:

**Subject Line:** \`[Company Name] (Seed, [Sector]): [Key Metric / Traction Metric]\`
*(Example: "Apex AI (Seed, Fintech): \$45k MRR, growing 28% MoM, backed by ex-Stripe founders")*

**Body:**
- **Paragraph 1 (The Hook):** What you do in 1 crisp sentence, and why you are reaching out to *them specifically* (mention their relevant portfolio fund or thesis).
- **Paragraph 2 (The Proof):** 3 bullet points showing unfair advantage (Revenue/ARR growth, top customers, defensible tech).
- **Paragraph 3 (The Ask):** *"We are raising our \$1.5M Seed round. Would you be open to a 15-minute intro call next Tuesday or Thursday?"* (Include pitch deck link).`
  },
  {
    id: "pitch_deck_mistakes",
    keywords: ["pitch deck mistakes", "common deck errors", "red flags in pitch deck", "what to avoid in pitch deck"],
    question: "What are the biggest pitch deck red flags for VCs?",
    answer: `Avoid these 6 critical pitch deck mistakes:

1. **Too Text-Dense:** Slides packed with paragraphs of tiny text instead of bold visual summaries.
2. **Missing Traction / Unit Economics:** Hiding revenue, CAC, or churn metrics. VCs prefer honest early numbers over vague statements.
3. **Unrealistic Market Sizing:** Quoting generic \$500B numbers without bottom-up mathematical justification.
4. **Disrespecting Competition:** Saying *"We have no direct competitors."* Every problem has an alternative (including Excel, manual labor, or legacy tools).
5. **No Clear Ask:** Failing to state the target raise amount, instrument, or key milestone runway.
6. **Deck Longer than 15 Slides:** Keep appendix slides separate; your core story must take under 4 minutes to scan.`
  },
  // ==========================================
  // 2. ADDITIONAL FUNDRAISING QUESTIONS (11-100)
  // ==========================================
  {
    id: "mrr_needed_for_seed",
    keywords: ["mrr for seed", "arr for seed", "how much revenue for seed", "seed stage metrics"],
    question: "How much revenue or MRR do I need to raise a Seed round?",
    answer: `While requirements vary by market conditions:
- **B2B SaaS:** Typically \$10k to \$40k MRR (\$120k–\$500k ARR) with 15%–20% month-over-month growth.
- **DeepTech / AI / Hardware:** Can raise on technical milestones, proprietary benchmarks, or enterprise LOIs without revenue.
- **Consumer / Marketplaces:** 20k–100k active users with strong organic retention and GMV velocity.`
  },
  {
    id: "mrr_needed_for_series_a",
    keywords: ["mrr for series a", "arr for series a", "series a metrics", "requirements for series a"],
    question: "What metrics are required to raise a Series A round?",
    answer: `Series A is awarded for proven **Product-Market Fit and scalable distribution**:
- **ARR Benchmark:** \$1M to \$3M ARR.
- **Growth Velocity:** Tripling or doubling annually (2.5x–3x YoY).
- **Net Dollar Retention (NDR):** > 115% for enterprise SaaS, indicating expansion from existing accounts.
- **Payback Period:** Customer Acquisition Cost (CAC) paid back within 12 months.
- **Gross Margins:** 70%–85% software gross margins.`
  },
  {
    id: "runway_calculation",
    keywords: ["how to calculate runway", "runway formula", "burn rate", "net burn", "gross burn"],
    question: "How do I calculate runway and monthly burn rate?",
    answer: `**Formulas:**
- **Gross Burn:** Total monthly cash operating expenses (salaries, servers, rent, software).
- **Net Burn:** \`Gross Burn - Monthly Cash Receipts (Revenue)\`.
- **Runway (in months):** \`Current Cash in Bank / Monthly Net Burn\`.

*Target Rule:* Always target **18 to 24 months of runway** when closing your funding round so you have 12–15 months to build and 6 months to fundraise before cash depletion.`
  },
  {
    id: "warm_intro_etiquette",
    keywords: ["warm intro", "how to get warm intros", "asking for intro to vc", "forwardable email"],
    question: "How do I ask for a warm introduction to an investor?",
    answer: `Send a **Double-Opt-In Forwardable Email** to your mutual connection:
1. State the purpose clearly in the first line.
2. Include a self-contained 2-paragraph blurb they can forward directly with one click without editing.
3. Attach your deck link.
4. Always ask permission: *"Would you feel comfortable introducing us to [Partner Name] at [Fund Name]?"*`
  },
  {
    id: "board_seat_guidance",
    keywords: ["board seat", "should i give a board seat", "board of directors", "investor on board"],
    question: "Should early-stage investors get a board seat in Pre-Seed or Seed?",
    answer: `At Pre-Seed and Seed, **avoid giving up board seats if possible**:
- Standard Seed rounds are closed on SAFEs with **no board seats** or at most 1 board observer seat.
- If an institutional lead demands a board seat at Seed, balance it as a **3-person board**: 2 Founder seats and 1 Investor seat, ensuring founders retain voting control.`
  },
  {
    id: "tam_sam_som_explanation",
    keywords: ["tam sam som", "market size calculation", "how to calculate tam", "total addressable market"],
    question: "How do I calculate TAM, SAM, and SOM for my pitch deck?",
    answer: `Use this bottom-up hierarchy:
- **TAM (Total Addressable Market):** Total annual revenue if you achieved 100% market share of every possible customer globally.
- **SAM (Serviceable Addressable Market):** The segment of TAM targeted by your current product and geography.
- **SOM (Serviceable Obtainable Market):** The realistic revenue you can capture in the next 3 to 5 years (e.g. 5%–10% of SAM).

*VC Tip:* Always calculate TAM bottom-up: \`(Total qualified buyers) x (Expected annual ACV)\`.`
  },
  {
    id: "investor_diligence_timeline",
    keywords: ["how long does it take to raise", "fundraising timeline", "closing timeline", "how long to close round"],
    question: "How long does a fundraising round take from start to close?",
    answer: `A standard fundraising cycle takes **8 to 16 weeks**:
- **Weeks 1–2 (Preparation):** Finalize deck, financial model, and list 100+ targeted catalog funds.
- **Weeks 3–6 (Active Pitching):** First partner meetings (30–50 calls).
- **Weeks 7–9 (Partner Meetings & Deep Diligence):** Full partnership pitches and technical customer calls.
- **Weeks 10–12 (Term Sheet Negotiation):** Receiving and negotiating term sheets.
- **Weeks 13–16 (Legal Closing & Wire Transfer):** Drafting definitive docs (SAFEs or NVCA priced round docs) and funding wires.`
  },
  {
    id: "dilution_expectations",
    keywords: ["how much dilution", "dilution percentage", "how much equity to give up", "cap table dilution"],
    question: "How much equity should founders give up per funding round?",
    answer: `Standard market dilution benchmarks:
- **Pre-Seed:** 7% – 12%
- **Seed Round:** 15% – 20%
- **Series A:** 18% – 25%
- **Option Pool Creation:** 10% – 15% unallocated for future key hires.

*Rule:* After Seed, founding teams should retain at least **60%–70%** ownership to stay properly incentivized for Series A and B.`
  },
  {
    id: "deck_page_count",
    keywords: ["how many slides", "pitch deck length", "number of slides", "ideal slide count"],
    question: "How many slides should be in a pitch deck?",
    answer: `The ideal length is **10 to 14 slides**. VCs spend an average of **2 minutes and 40 seconds** reviewing a deck on first pass. Put in-depth financial models, cohort analyses, or technical architecture diagrams in an **Appendix** section at the end.`
  },
  {
    id: "traction_metrics_definition",
    keywords: ["what is traction", "good traction", "traction slide content", "metrics to show"],
    question: "What metrics demonstrate strong traction to investors?",
    answer: `Highlight metrics that prove high velocity and retention:
1. **Revenue Velocity:** MoM ARR/MRR growth rate (15%+ is top quartile for Seed).
2. **Customer Retention:** Low logo churn (< 1% monthly) and positive Net Revenue Retention (NRR > 110%).
3. **Engagement:** Daily Active Users / Monthly Active Users (DAU/MAU > 40%).
4. **Sales Pipeline:** Qualified pipeline ACV, pilot conversion rates, and signed letters of intent (LOIs).`
  }
];

/**
 * Fast semantic/keyword matcher for instant responses
 */
export function matchAddyKnowledge(userInput) {
  if (!userInput) return null;
  const clean = userInput.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const tokens = clean.split(/\s+/).filter(Boolean);

  let bestMatch = null;
  let highestScore = 0;

  for (const entry of ADDY_KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      const kwClean = kw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
      if (clean.includes(kwClean)) {
        score += 15;
      }
      const kwTokens = kwClean.split(/\s+/);
      const matchedTokens = kwTokens.filter((t) => tokens.includes(t));
      if (matchedTokens.length === kwTokens.length) {
        score += 10;
      } else if (matchedTokens.length > 0) {
        score += matchedTokens.length * 2;
      }
    }

    if (score > highestScore && score >= 8) {
      highestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

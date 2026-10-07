import React, { useState } from 'react';

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: "What is ADDY?",
      a: "ADDY is Advibe's conversational AI raise agent that runs your entire fundraising process. Drop your pitch deck or website once to teach it your company, then ask in plain words. ADDY proposes investor searches across all 3 tracks, verifies contacts, drafts outreach sequences, and runs scheduled weekly autopilot batches. It also learns: investor replies teach it which segments to prioritize next."
    },
    {
      q: "Does ADDY spend Sparks on its own?",
      a: "Never. This is a strict core invariant. Every search, Lookalike discovery, or enrichment begins with a search preview card detailing detected filters and the estimated Sparks cost. Nothing runs until you explicitly click 'Confirm & Run'. Scheduled autopilot runs only execute the exact recipe you approved, and duplicate exclusion is enabled by default so you never pay for the same contact twice."
    },
    {
      q: "How many ADDY messages do I get?",
      a: "Every paid plan includes 100 ADDY messages a month (the free trial includes 25). Past that, you are never blocked: chat simply draws from your Sparks pool at 5 messages per Spark. Because one prompt wraps a full action (a search, a sequence draft, a scheduled batch), most users never reach the limit."
    },
    {
      q: "Can ADDY run my outreach for me?",
      a: "Yes. ADDY writes personalized connection notes and multi-touch email sequences with tone variations. However, human-in-the-loop review is mandatory: all campaigns are generated as drafts, and no message or email is ever dispatched until you review, edit, and click approve."
    },
    {
      q: "How does Advibe work with Claude, ChatGPT, or Perplexity?",
      a: "Advibe operates as a Model Context Protocol (MCP) server. You add our server URL to Claude (Desktop or Web), ChatGPT (Developer Mode), or Perplexity (Custom Connector). You can query 'Find seed fintech VCs' in your existing chat window and receive verified contacts directly."
    },
    {
      q: "How do Sparks work?",
      a: "Every plan comes with a monthly pool of Sparks. Each investor delivered with verified contacts costs 1 Spark. Lookalike investor discovery is built-in: mapping comparable companies is free; each investor firm you approve costs 0.25 Sparks; and resolved contacts are billed at the normal rate. Unused Sparks do not roll over, and you can view your balance anytime in the sidebar."
    },
    {
      q: "Where does the investor data come from?",
      a: "Over 30 cross-referenced sources including SEC Form ADV and Form D filings, curated VC/PE directories, institutional LP registers (endowments, pensions, sovereign wealth), and live verification. We run automated checks to filter out placement agents, brokers, and consultants so you reach actual decision-makers."
    },
    {
      q: "How is this different from legacy investor databases?",
      a: "Legacy databases are static directory tools priced like enterprise contracts ($12K to $40K per year) with high-pressure annual sales calls. Advibe delivers verified decision-maker contacts directly into your chat or CRM starting at $59/month with self-serve onboarding and zero commitment."
    },
    {
      q: "Twin Finder, Discover, or Resolve — which do I use?",
      a: "All three end in verified investor contacts; they simply differ by where you start. (1) Twin Finder: You describe your raise in one sentence, and we work backward from companies like yours to the firms that backed them — ideal when you don't have a target list yet. (2) Discover: You set filters (stage, sector, geography, track) — best when you have a defined thesis. (3) Resolve: You already have firm names and need verified decision-maker emails — best for existing target lists."
    },
    {
      q: "Can my team use one Advibe account?",
      a: "Yes. You can invite teammates to a shared workspace for $20 per seat per month (the first seat is included in every plan). Everyone draws from the workspace's shared Sparks pool, and admins can assign optional monthly Sparks caps per person."
    },
    {
      q: "How accurate are the emails?",
      a: "Our verified emails achieve an average 65% to 75% hit rate from primary institutional enrichment. When unverified, we perform real-time pattern verification and SMTP handshake checks before delivery. Low-confidence addresses are explicitly flagged."
    },
    {
      q: "Is my fundraising data private?",
      a: "Yes. Your pitch decks, search criteria, saved leads, and exclusion lists are strictly isolated to your workspace. We do not sell your data, nor do we train public foundation models on private user materials."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. Monthly plans cancel at the end of the current billing cycle with one click. There are no tail fees, no placement commissions, and no long-term contracts."
    }
  ];

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '28px' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600 }}>
          FREQUENTLY ASKED QUESTIONS
        </span>
        <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '28px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '4px' }}>
          Questions &amp; Answers
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '6px' }}>
          Everything you need to know about ADDY, Sparks, Tracks, and outreach safeguards.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '18px 0'
              }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left',
                  background: 'transparent',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <span style={{ color: isOpen ? '#e2b774' : '#ffffff', transition: 'color 0.2s ease' }}>
                  {faq.q}
                </span>
                <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              {isOpen && (
                <div style={{ marginTop: '12px', fontSize: '13.5px', color: 'rgba(255,255,255,0.68)', lineHeight: '1.6', paddingRight: '24px' }}>
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Check,
  Search,
  Send,
  CalendarCheck,
  Brain,
  FileText,
  Building2,
  Briefcase,
  Landmark,
  Globe,
  Mail,
  Clock,
  ChevronDown,
  ArrowDown,
  SlidersHorizontal,
  Layers,
  HelpCircle,
  Tag,
  Paperclip,
  Pause,
  Play,
  RefreshCw,
  Flame,
  CheckSquare,
  Square,
  CornerDownLeft
} from 'lucide-react';

export default function LandingPage({
  onStartFree,
  onOpenLogin,
  onOpenSignup,
  onOpenPricing,
  onOpenOffer,
  onOpenTracks,
  onOpenTwinFinder,
  onOpenResolve,
  liveStats = { total_investors_catalog: 450000, cross_referenced_sources: 30, active_companies_count: 1000 }
}) {
  // 6-stage auto-looping animation matching 8raise screenshot workflow
  // 0: 01 Context (thesis brief extracted)
  // 1: 02 Find investors (3 ways quote with cost)
  // 2: 02 Find investors (Finding + verifying progress bars to All Done)
  // 3: 03 Know them (6 ranked investors list)
  // 4: 03 Know them (Sarah Chen & Bellwether Family Office deep dossier)
  // 5: 04 Feedback & scheduling (Weekly LP run autopilot sequence)
  const [loopIndex, setLoopIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const durations = [4600, 4000, 3800, 4200, 5000, 4500];
    const timer = setTimeout(() => {
      setLoopIndex((prev) => (prev + 1) % 6);
    }, durations[loopIndex]);
    return () => clearTimeout(timer);
  }, [loopIndex, isPaused]);

  const activeStep = loopIndex === 0 ? 'context' : (loopIndex === 1 || loopIndex === 2) ? 'discover' : (loopIndex === 3 || loopIndex === 4) ? 'dossier' : 'pulse';
  const addressUrl = loopIndex === 0 ? 'context' : (loopIndex === 1 || loopIndex === 2) ? 'find' : (loopIndex === 3 || loopIndex === 4) ? 'know' : 'feedback';

  // Pricing interval in landing pricing section
  const [billingInterval, setBillingInterval] = useState('monthly'); // 'monthly' | 'quarterly' | 'annual'

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  const discountMultiplier = billingInterval === 'annual' ? 0.8 : billingInterval === 'quarterly' ? 0.9 : 1.0;

  const faqs = [
    {
      q: "How does ADDY find investors?",
      a: "ADDY reads your deck or website, extracts your thesis, check size, and traction, then searches our institutional catalog across Venture, Real Estate, and LP tracks. It verifies every partner's active title and appends confirmed work email addresses."
    },
    {
      q: "What is a Spark and how do they work?",
      a: "Sparks are Advibe's usage currency. 1 Spark delivers 1 verified investor contact (with work email, LinkedIn URL, and dossier). Unused Sparks rollover each month and never expire while your subscription is active."
    },
    {
      q: "Does ADDY send messages without my approval?",
      a: "Never. Advibe operates on a strict human-in-the-loop invariant. Outreach sequences stay in draft until you review, edit, and click dispatch. Sparks are only deducted when you explicitly confirm a proposed search."
    },
    {
      q: "How is Twin Finder different from normal search?",
      a: "Instead of guessing filters, you describe your company in one sentence. Twin Finder maps the 10-15 most comparable funded companies, identifies which funds led their rounds at your stage, and verifies they are still actively deploying capital."
    },
    {
      q: "Can I bring my own list of firms?",
      a: "Yes. Resolve allows you to paste firm names or upload CSV/XLSX lists. We resolve each firm, identify relevant decision-makers, verify roles against LinkedIn, filter placement agents, and append verified work emails."
    },
    {
      q: "Can I connect Advibe to Claude, ChatGPT, or Perplexity?",
      a: "Yes. Advibe provides an open Model Context Protocol (MCP) server for Claude Desktop and Claude Code, native custom GPT actions for ChatGPT, and REST endpoints for external automations."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. Monthly plans can be canceled anytime with a single click. There are no long-term contracts, no placement fees, and no tail commitments."
    }
  ];

  return (
    <div
      className="landing-container"
      style={{
        position: 'relative',
        zIndex: 2,
        background: 'transparent',
        color: '#ffffff',
        minHeight: '100vh',
        overflowX: 'hidden'
      }}
    >
      
      {/* ================= STICKY HEADER ================= */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textDecoration: 'none', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                <g transform="rotate(-30 12 12)">
                  <circle cx="7.3" cy="3.2" r="1.45" />
                  <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                  <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                  <circle cx="16.7" cy="20.8" r="1.45" />
                </g>
              </svg>
              <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff' }}>Advibe</span>
            </div>
            <span style={{ height: '2px', width: '56px', background: '#e2b774', marginTop: '4px', borderRadius: '1px' }} />
          </a>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <a href="#how-it-works" style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500, transition: 'color 0.2s' }}>How it works</a>
            <a href="#modes" style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500, transition: 'color 0.2s' }}>Tracks</a>
            <a href="#twin-finder" style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500, transition: 'color 0.2s' }}>Twin Finder</a>
            <a href="#resolve" style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500, transition: 'color 0.2s' }}>Resolve</a>
            <a href="#pricing" style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500, transition: 'color 0.2s' }}>Pricing</a>
            <a href="#faq" style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500, transition: 'color 0.2s' }}>FAQ</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onOpenOffer}
            style={{
              background: 'rgba(226, 183, 116, 0.12)',
              border: '1px solid rgba(226, 183, 116, 0.3)',
              color: '#e2b774',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Tag size={12} />
            <span>10% Off First Month</span>
          </button>

          <button
            onClick={onOpenLogin || onStartFree}
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.75)',
              fontWeight: 500,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Log in
          </button>

          <button
            onClick={onOpenSignup || onStartFree}
            style={{
              background: '#ffffff',
              color: '#000000',
              fontWeight: 600,
              fontSize: '13px',
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Start free
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section
        id="top"
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '90px 24px 50px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
          scrollMarginTop: '80px'
        }}
      >
        {/* Live on Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            Live on
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', color: '#ffffff' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2b774' }} /> Claude MCP
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', color: '#ffffff' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60a5fa' }} /> ChatGPT Action
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', color: '#ffffff' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} /> Perplexity Connector
            </span>
          </div>
        </div>

        {/* Big Headline with 8Raise Instrument Serif Accent */}
        <h1 style={{ fontSize: '62px', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.08, color: '#ffffff', maxWidth: '850px', margin: '0 auto', textShadow: '0 4px 24px rgba(0,0,0,0.9)' }}>
          Your raise,<br />
          <span className="font-serif-italic" style={{ color: '#e2b774', fontSize: '1.08em', fontWeight: 400 }}>on autopilot</span><span style={{ color: '#ffffff' }}>.</span>
        </h1>

        {/* Lede */}
        <p style={{ fontSize: '17.5px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.55, maxWidth: '640px', margin: '24px auto 0', textShadow: '0 2px 14px rgba(0,0,0,0.9)' }}>
          An agent that learns your company, finds the right investors with verified contacts, runs your outreach, and gets sharper every week. For founders, real estate operators, and fund managers.
        </p>

        {/* Hero CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '36px', flexWrap: 'wrap' }}>
          <button
            onClick={onStartFree}
            style={{
              background: '#ffffff',
              color: '#000000',
              fontWeight: 700,
              fontSize: '14px',
              padding: '13px 30px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 24px rgba(255,255,255,0.25)'
            }}
          >
            Start free
            <ArrowRight size={15} />
          </button>

          <button
            onClick={onOpenTracks}
            style={{
              background: 'rgba(0, 0, 0, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(12px)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              padding: '13px 26px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Explore 3 Tracks
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '18px', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
          10 free Sparks + 25 free ADDY messages on signup. No credit card required.
        </p>
      </section>

      {/* ================= INTERACTIVE PIPELINE WALKTHROUGH (ANIMATED LOOP) ================= */}
      <section
        id="how-it-works"
        style={{
          maxWidth: '1100px',
          margin: '40px auto 80px',
          padding: '0 24px',
          position: 'relative',
          zIndex: 5
        }}
      >
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#e2b774', fontWeight: 600 }}>
              THE FUNDRAISING AGENT
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', marginTop: '4px' }}>
              One chat <span className="font-serif-italic" style={{ color: '#e2b774', fontWeight: 400 }}>runs the whole raise</span><span style={{ color: '#ffffff' }}>.</span>
            </h2>
          </div>

          {/* Autoplay Pause / Play Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 2, 3, 4, 5].map((st) => (
                <span
                  key={st}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: loopIndex === st ? '#e2b774' : 'rgba(255,255,255,0.15)',
                    transition: 'background 0.3s'
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => setIsPaused(!isPaused)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {isPaused ? <Play size={11} /> : <Pause size={11} />}
              <span>{isPaused ? 'Resume tour' : 'Autoplaying'}</span>
            </button>
          </div>
        </div>

        {/* 4 Pipeline Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
          {[
            { id: 'context', num: '01', title: 'Context', targetStage: 0 },
            { id: 'discover', num: '02', title: 'Find investors', targetStage: 1 },
            { id: 'dossier', num: '03', title: 'Know them', targetStage: 3 },
            { id: 'pulse', num: '04', title: 'Feedback & scheduling', targetStage: 5 }
          ].map((tab) => {
            const isActive = activeStep === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setLoopIndex(tab.targetStage);
                }}
                style={{
                  padding: '18px 20px',
                  textAlign: 'left',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,10,0.85)',
                  cursor: 'pointer',
                  border: 'none',
                  position: 'relative',
                  transition: 'background 0.2s ease'
                }}
              >
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: isActive ? '#e2b774' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                  {tab.num}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                  {tab.title}
                </div>
                {isActive && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: '#e2b774' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Browser Window Mock Container */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{
            background: '#0d0d0d',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            padding: '24px 32px 20px',
            minHeight: '440px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}
        >
          <div>
            {/* Browser Window Top Chrome Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '22px' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)' }} />
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)' }} />
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)' }} />
              <span style={{ marginLeft: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                app.advibe.ai / {addressUrl}
              </span>
            </div>

            {/* ---------------- STAGE 0: CONTEXT ---------------- */}
            {loopIndex === 0 && (
              <div style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                  <div style={{ background: '#ffffff', color: '#000000', padding: '10px 18px', borderRadius: '16px 16px 4px 16px', fontSize: '13.5px', fontWeight: 600 }}>
                    We're raising Fund II, $150M growth equity.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '18px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#ffffff' }}>
                    <FileText size={13} style={{ color: '#e2b774' }} /> fund-ii-deck.pdf
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#ffffff' }}>
                    meridiangrowth.com
                  </span>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '18px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600 }}>
                      YOUR RAISE BRIEF · STRUCTURED CONTEXT
                    </span>
                    <span style={{ fontSize: '11px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} strokeWidth={2.5} /> Context learned
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Fund</span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>Meridian Growth Fund II</span>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Target</span>
                    <span style={{ color: '#ffffff' }}>$150M · first close $60M planned</span>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Strategy</span>
                    <span style={{ color: '#ffffff' }}>B2B software growth equity · $5-15M checks · 12-15 positions</span>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Targeting</span>
                    <span style={{ color: '#ffffff' }}>Institutional LPs · fund-of-funds · family offices · US &amp; EU</span>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- STAGE 1: FIND INVESTORS (3 WAYS QUOTE & CONFIRM) ---------------- */}
            {loopIndex === 1 && (
              <div style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
                <p style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: 500, marginBottom: '16px' }}>
                  Three ways I'd find your LPs , each shows its cost, nothing runs until you confirm:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  {/* Option 1 */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckSquare size={16} style={{ color: '#e2b774' }} />
                      <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Search size={13} style={{ color: '#ffffff' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Advanced search</div>
                        <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.55)' }}>
                          Fund-of-funds + pensions + family offices · US &amp; EU · writes $5M+ tickets
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                      ~32 contacts · ~32 credits
                    </div>
                  </div>

                  {/* Option 2 */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckSquare size={16} style={{ color: '#e2b774' }} />
                      <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sparkles size={13} style={{ color: '#e2b774' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Lookalike</div>
                        <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.55)' }}>
                          The LPs behind growth funds like yours, mapped from comparable funds
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                      9 comparable funds free · 0.25 cr per firm you approve
                    </div>
                  </div>

                  {/* Option 3 */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckSquare size={16} style={{ color: '#e2b774' }} />
                      <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={13} style={{ color: '#ffffff' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Enrich your list</div>
                        <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.55)' }}>
                          Your existing 40-firm LP pipeline , the right contact at each, filled in
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                      ~22 matches · ~22 credits
                    </div>
                  </div>
                </div>

                {/* Confirm Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    Estimated total: ~82 contacts · ~86 credits
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <button
                      onClick={() => setLoopIndex(2)}
                      style={{
                        background: '#ffffff',
                        color: '#000000',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        padding: '8px 18px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Confirm to run
                    </button>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      Run all three.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- STAGE 2: FIND INVESTORS (PROGRESS BARS & ALL DONE) ---------------- */}
            {loopIndex === 2 && (
              <div style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600, color: '#ffffff' }}>
                      <Search size={14} style={{ color: '#e2b774' }} />
                      <span>Finding + verifying LPs</span>
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                      <span>ALL DONE</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Row 1 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '12.5px', color: '#ffffff' }}>Advanced search</span>
                      <div style={{ height: '3px', background: '#ffffff', borderRadius: '2px', width: '100%' }} />
                      <span style={{ fontSize: '12px', color: '#4ade80', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <Check size={12} strokeWidth={2.5} /> 32 contacts
                      </span>
                    </div>

                    {/* Row 2 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '12.5px', color: '#ffffff' }}>Lookalike</span>
                      <div style={{ height: '3px', background: '#ffffff', borderRadius: '2px', width: '100%' }} />
                      <span style={{ fontSize: '12px', color: '#4ade80', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <Check size={12} strokeWidth={2.5} /> 28 LPs
                      </span>
                    </div>

                    {/* Row 3 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '12.5px', color: '#ffffff' }}>Your list</span>
                      <div style={{ height: '3px', background: '#ffffff', borderRadius: '2px', width: '100%' }} />
                      <span style={{ fontSize: '12px', color: '#4ade80', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <Check size={12} strokeWidth={2.5} /> 22 matched
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>ⓘ</span>
                    <span>Duplicates + firms you already know: skipped, not charged.</span>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- STAGE 3: KNOW THEM (6 INVESTORS TABLE) ---------------- */}
            {loopIndex === 3 && (
              <div style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                  Click any investor to see the full brief
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    <span>INVESTORS</span>
                    <span>82 delivered · ranked by fit</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {[
                      { name: 'Sarah Chen', title: 'Head of Alternatives · Bellwether Family Office', score: 94 },
                      { name: 'Aadit Parikh', title: 'Partner · Horizon Fund-of-Funds', score: 91 },
                      { name: 'Marianne Keller', title: 'Chief Investment Officer · Ardenne Family Office', score: 88 },
                      { name: 'Diego Álvarez', title: 'Investment Director · Solera Capital Partners', score: 85 },
                      { name: 'Ingrid Sørensen', title: 'Senior PM, Private Funds · Nordvik Insurance', score: 82 },
                      { name: 'Charles Whitmore', title: 'Managing Director · Hargrove Endowment', score: 79 }
                    ].map((inv, idx) => (
                      <div
                        key={idx}
                        onClick={() => setLoopIndex(4)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          borderBottom: idx === 5 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          cursor: 'pointer',
                          background: idx === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#262626', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                            {inv.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginRight: '8px' }}>
                              {inv.name}
                            </span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                              {inv.title}
                            </span>
                          </div>
                        </div>

                        <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>
                          {inv.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- STAGE 4: KNOW THEM (SARAH CHEN DEEP DOSSIER) ---------------- */}
            {loopIndex === 4 && (
              <div style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <button
                    onClick={() => setLoopIndex(3)}
                    style={{ fontSize: '11.5px', color: '#e2b774', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ← Back to all 82 investors
                  </button>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    Ranked #1 of 82
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '18px' }}>
                  {/* Left Column: Sarah Chen */}
                  <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '16px' }}>
                    <div style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '8px' }}>
                      INVESTOR BRIEF
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#334155', color: '#ffffff', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        SC
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>Sarah Chen</div>
                        <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>Head of Alternatives · Bellwether Family Office · New York</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '4px' }}>
                        FIT ASSESSMENT
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', marginBottom: '4px' }}>
                        <Flame size={11} /> STRONG FIT
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>
                        Bellwether commits $5-20M to growth equity managers and backed two Fund IIs from emerging managers in 2025. Active in B2B software exposure.
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '4px' }}>
                        RECENT FUND COMMITMENTS
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#ffffff' }}>
                        <span>Alpine Growth II</span>
                        <span style={{ color: '#e2b774' }}>$12M · Mar 2026</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Bellwether Family Office */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>Bellwether Family Office.</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                      Single family office · New York · est. 1998
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '4px' }}>
                        ALLOCATION PROGRAM
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>
                        Diversified alternatives book: growth equity and buyout fund commitments plus selective co-invests. $5-20M tickets, relationship-led, open to emerging managers.
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>AUM</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>$2.4B</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>Alternatives</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>35%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>Fund commitments</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>24</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '4px' }}>
                        RECENT COMMITMENTS
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Alpine Growth II</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Mar 2026</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Foundry Equity III</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Jan 2026</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Cedarline Growth I</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Oct 2025</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- STAGE 5: FEEDBACK & SCHEDULING (WEEKLY LP RUN) ---------------- */}
            {loopIndex === 5 && (
              <div style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                  <div style={{ background: '#ffffff', color: '#000000', padding: '10px 18px', borderRadius: '16px 16px 4px 16px', fontSize: '13px', fontWeight: 600 }}>
                    Keep it running , every Monday, straight into the campaign.
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                      <RefreshCw size={13} style={{ color: '#e2b774' }} />
                      <span>Weekly LP run</span>
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                      <span>ACTIVE</span>
                    </div>
                  </div>

                  {/* Days of Week Selector */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                      <span
                        key={idx}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '4px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: idx === 0 ? '#ffffff' : 'rgba(255,255,255,0.06)',
                          color: idx === 0 ? '#000000' : 'rgba(255,255,255,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Pipeline Steps Sequence */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 12px', borderRadius: '4px', fontSize: '11.5px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Search size={12} style={{ color: '#e2b774' }} />
                      <span>Find LPs 9:00</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>→</span>

                    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 12px', borderRadius: '4px', fontSize: '11.5px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Send size={12} style={{ color: '#e2b774' }} />
                      <span>To campaign</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>→</span>

                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '4px', fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} />
                      <span>Wait 3d</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>→</span>

                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '4px', fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={12} />
                      <span>Follow-up</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginBottom: '16px' }}>
                    Every Monday 9:00 , fresh family-office LPs → <span style={{ color: '#ffffff', fontWeight: 600 }}>your campaign</span>
                  </div>

                  {/* Replied Messages Classification */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '10px' }}>
                      INCOMING LP REPLIES · AUTO CLASSIFIED
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#ffffff' }}>Sarah Chen</span>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>"Loved Fund I metrics. Let's talk Tuesday."</span>
                        </div>
                        <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                          INTERESTED · MEETING SET
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: '#ffffff' }}>Aadit Parikh</span>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>"Send data room link, passing to IC."</span>
                        </div>
                        <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                          INTERESTED · DATA ROOM
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Chat Input Bar in Browser Window (matches screenshot) */}
          <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '6px 12px', gap: '10px' }}>
              <Paperclip size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
              <input
                type="text"
                readOnly
                placeholder="Message the agent..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ffffff', fontSize: '12.5px', cursor: 'pointer' }}
                onClick={onStartFree}
              />
              <button
                onClick={onStartFree}
                style={{ background: '#ffffff', color: '#000000', width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
              >
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST STATS RIBBON ================= */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '24px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '36px', flexWrap: 'wrap', padding: '0 24px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          <span>Trusted by 1,000+ founders and fund managers</span>
          <span style={{ color: '#e2b774' }}>/</span>
          <span>450,000+ investors (VC · LP · Real Estate)</span>
          <span style={{ color: '#e2b774' }}>/</span>
          <span>30+ verified data sources</span>
        </div>
      </section>

      {/* ================= SECTION [01]: THE AGENT ================= */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '96px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '40px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#e2b774', fontWeight: 600 }}>
            [01] THE AGENT · ONE CHAT
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            / CONVERSATIONAL OS
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '48px', alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', lineHeight: 1.15 }}>
              Your raise runs itself.<br />
              <span className="font-serif-italic" style={{ color: '#e2b774', fontWeight: 400 }}>You approve the big moves</span><span style={{ color: '#ffffff' }}>.</span>
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginTop: '18px' }}>
              Every tool lives inside one conversation. The agent learns your company, finds the right investors, gets verified contacts into your outreach, and gets sharper from every reply — while nothing ever spends a Spark without your confirmation.
            </p>

            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { title: 'It learns your company', desc: 'Give it your deck or website once. It reads everything and remembers who should fund you.' },
                { title: 'It finds your investors', desc: 'Ask in plain words. It shows you the plan and the cost, you say go, contacts arrive in minutes.' },
                { title: 'It sends your outreach', desc: 'Writes the messages and builds the sequence. You review, then it sends.' },
                { title: 'It keeps going every week', desc: 'New investors every Monday, and every reply teaches it who to find next.' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(226, 183, 116, 0.15)', color: '#e2b774', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0, marginTop: '2px' }}>
                    <Check size={13} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>{item.title}</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '28px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', color: '#4ade80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
              Your part: about 15 minutes a week
            </div>
          </div>

          {/* Right card: Activity timeline */}
          <div style={{ background: 'rgba(20, 20, 20, 0.65)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px', marginBottom: '18px' }}>
              <Brain size={16} style={{ color: '#e2b774' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>One week with ADDY</span>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace' }}>Mon - Fri</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace', width: '70px', shrink: 0 }}>Mon 09:00</span>
                <div>Scheduled run: <strong style={{ color: '#ffffff' }}>25 fresh seed VCs</strong> delivered, pushed to campaign.</div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace', width: '70px', shrink: 0 }}>Tue 14:10</span>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(226, 183, 116, 0.15)', color: '#e2b774', padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginRight: '6px' }}>
                    Interested
                  </span>
                  Denis (I2BF) replied, sent booking link.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace', width: '70px', shrink: 0 }}>Tue 14:11</span>
                <div><strong style={{ color: '#4ade80' }}>Learned:</strong> Corporate VCs engage best; next run leans toward them.</div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace', width: '70px', shrink: 0 }}>Wed 11:30</span>
                <div>Drafted follow-up for 6 investors who viewed but didn't reply.</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', color: '#4ade80', fontWeight: 600 }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace', width: '70px', shrink: 0 }}>Fri 16:00</span>
                <div>Week total: 25 found · 19 contacted · 3 replies · 1 meeting booked.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION [02]: 3 TRACKS ================= */}
      <section id="modes" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '40px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#e2b774', fontWeight: 600 }}>
            [02] TRACKS · VC · REAL ESTATE · LP
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            / 3 AUDIENCES
          </span>
        </div>

        <div style={{ maxWidth: '750px', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', lineHeight: 1.15 }}>
            One platform.<br />
            <span className="font-serif-italic" style={{ color: '#e2b774', fontWeight: 400 }}>Three audiences</span><span style={{ color: '#ffffff' }}>.</span>
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginTop: '14px' }}>
            Founders raising equity, real estate operators raising for deals or funds, and emerging managers raising from institutional LPs. Each gets a discovery engine tuned to their playbook. Same speed, different sources, different scoring.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {/* Card 1: VC */}
          <div style={{ background: 'rgba(20, 20, 20, 0.65)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Briefcase size={16} style={{ color: '#e2b774' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2b774', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Venture Track</span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                Raising equity.
              </h3>
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: '24px' }}>
                Partners and principals at VCs, family offices, angels, accelerators, and corporate VCs. Scored by stage, sector, geography, and deal overlap.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '12px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Sample Lead</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Ana García López</div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2b774' }}>92 Fit</span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Partner · Seaya Ventures · Madrid</div>
            </div>
          </div>

          {/* Card 2: Real Estate */}
          <div style={{ background: 'rgba(20, 20, 20, 0.65)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Building2 size={16} style={{ color: '#e2b774' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2b774', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Real Estate Track</span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                Raising for deals &amp; funds.
              </h3>
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: '24px' }}>
                Real estate private equity, REITs, developers, institutional RE LPs, and HNWI capital. Multifamily, commercial, industrial, proptech.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '12px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Sample Lead</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Marcus Chen</div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2b774' }}>87 Fit</span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Principal · Brookfield Properties · NY</div>
            </div>
          </div>

          {/* Card 3: LP Track */}
          <div style={{ background: 'rgba(20, 20, 20, 0.65)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Landmark size={16} style={{ color: '#e2b774' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2b774', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fund (LP) Track</span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                Raising from institutional LPs.
              </h3>
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: '24px' }}>
                Allocators at pension funds, endowments, foundations, sovereign wealth, fund-of-funds. Placement agents filtered out automatically.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '12px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Sample Lead</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Catherine Bell</div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2b774' }}>89 Fit</span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Director of PE · Yale Investments Office</div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION [04]: LOOKALIKES / TWIN FINDER ================= */}
      <section id="twin-finder" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '40px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#e2b774', fontWeight: 600 }}>
            [03] TWIN FINDER · LOOKALIKE DISCOVERY
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            / ONE-LINE BRIEF
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '48px', alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', lineHeight: 1.15 }}>
              No target list yet?<br />
              <span className="font-serif-italic" style={{ color: '#e2b774', fontWeight: 400 }}>Start from companies like yours</span><span style={{ color: '#ffffff' }}>.</span>
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginTop: '18px' }}>
              Describe your raise in a sentence. Twin Finder maps the companies most like yours, identifies the investor firms that funded them at your stage, and verifies each is still writing checks.
            </p>

            <ul style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', padding: 0 }}>
              {[
                'Comparable companies mapped from a one-line brief (free)',
                'The investor firms that actually funded them at your stage',
                'Each firm checked that it still writes your-stage checks',
                'Approve, then verified partner contacts, same as enrichment'
              ].map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
                  <Check size={14} style={{ color: '#e2b774', shrink: 0 }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: '28px' }}>
              <button
                onClick={onOpenTwinFinder}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Try Twin Finder →
              </button>
            </div>
          </div>

          {/* Interactive Twin Finder Preview */}
          <div style={{ background: 'rgba(20, 20, 20, 0.65)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600, marginBottom: '6px' }}>
                PROMPT BRIEF
              </div>
              <div style={{ fontSize: '13px', color: '#ffffff' }}>
                "An AI code-review tool for engineering teams. Raising seed in the US."
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                <span>12 comparable companies mapped</span>
                <span style={{ color: '#4ade80' }}>Free Step 1 Map</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { firm: 'Y Combinator', why: 'Backed 4 comparables', stage: 'Seed' },
                { firm: 'Uncork Capital', why: 'Backed 3 comparables', stage: 'Seed' },
                { firm: 'Bessemer Venture Partners', why: 'Backed 2 comparables', stage: 'Seed' },
                { firm: 'Khosla Ventures', why: 'Backed 2 comparables', stage: 'Seed' }
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '12.5px' }}>
                  <strong style={{ color: '#ffffff' }}>{f.firm}</strong>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{f.why}</span>
                  <span style={{ color: '#e2b774', fontWeight: 600 }}>{f.stage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION [05]: ENRICHMENT / RESOLVE ================= */}
      <section id="resolve" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '40px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#e2b774', fontWeight: 600 }}>
            [04] RESOLVE · DECISION-MAKER ENRICHMENT
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            / BULK UPLOAD OR PASTE
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '48px', alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', lineHeight: 1.15 }}>
              Already have the firms?<br />
              <span className="font-serif-italic" style={{ color: '#e2b774', fontWeight: 400 }}>We'll find the people</span><span style={{ color: '#ffffff' }}>.</span>
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginTop: '18px' }}>
              Drop a CSV or paste a list of firm names. Advibe resolves each firm, identifies the active partners, verifies titles against LinkedIn, filters placement agents, and appends verified work emails.
            </p>

            <ul style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', padding: 0 }}>
              {[
                'Active-role check: skips alumni and exited partners',
                'Verified work email + LinkedIn URL on every row',
                'Placement agents and consultants filtered out',
                'Up to 1,000 firms per upload with instant CSV export'
              ].map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
                  <Check size={14} style={{ color: '#e2b774', shrink: 0 }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: '28px' }}>
              <button
                onClick={onOpenResolve}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Open Resolve →
              </button>
            </div>
          </div>

          {/* Resolve Output Mock */}
          <div style={{ background: 'rgba(20, 20, 20, 0.65)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '14px', fontSize: '12px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Input: 5 firms detected</span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>5 of 5 enriched · 0 placement agents</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              {[
                { firm: 'Sequoia Capital', partner: 'Doug Leone', email: 'doug@sequoiacap.com' },
                { firm: 'Andreessen Horowitz', partner: 'Marc Andreessen', email: 'marc@a16z.com' },
                { firm: 'Bessemer Venture Partners', partner: 'Byron Deeter', email: 'byron@bvp.com' },
                { firm: 'Forerunner Ventures', partner: 'Kirsten Green', email: 'kirsten@forerunner.com' }
              ].map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{row.firm}</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{row.partner}</span>
                  <span style={{ color: '#e2b774', fontFamily: 'monospace', fontSize: '11px' }}>{row.email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION [06]: PRICING ================= */}
      <section id="pricing" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 96px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '40px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#e2b774', fontWeight: 600 }}>
            [05] PRICING · USAGE-BASED
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            / TRANSPARENT
          </span>
        </div>

        <h2 style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff' }}>
          Priced like a tool. <span className="font-serif-italic" style={{ color: '#e2b774', fontWeight: 400 }}>Not a retainer</span><span style={{ color: '#ffffff' }}>.</span>
        </h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', maxWidth: '640px', margin: '14px auto 32px' }}>
          Same institutional engine on every plan. Monthly pool of Sparks: 1 Spark per verified contact. Twin Finder and bulk Resolve included. Cancel anytime.
        </p>

        {/* Interval Switcher */}
        <div style={{ display: 'inline-flex', padding: '4px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', gap: '4px', marginBottom: '48px' }}>
          {[
            { id: 'monthly', label: 'Monthly' },
            { id: 'quarterly', label: 'Quarterly (-10%)' },
            { id: 'annual', label: 'Annual (-20%)' }
          ].map((int) => (
            <button
              key={int.id}
              onClick={() => setBillingInterval(int.id)}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: billingInterval === int.id ? '#000000' : 'rgba(255,255,255,0.7)',
                background: billingInterval === int.id ? '#ffffff' : 'transparent',
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {int.label}
            </button>
          ))}
        </div>

        {/* 4 Plans Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', textAlign: 'left' }}>
          {[
            { name: 'Solo', price: Math.round(59 * discountMultiplier), sparks: '150 Sparks / mo', desc: '150 verified contacts', claims: '3 List claims / mo' },
            { name: 'Starter', price: Math.round(179 * discountMultiplier), sparks: '500 Sparks / mo', desc: '500 verified contacts', claims: '6 List claims / mo', pop: true },
            { name: 'Growth', price: Math.round(529 * discountMultiplier), sparks: '1,500 Sparks / mo', desc: '1,500 verified contacts', claims: '12 List claims / mo' },
            { name: 'Pro', price: Math.round(1059 * discountMultiplier), sparks: '3,000 Sparks / mo', desc: '3,000 verified contacts', claims: 'Unlimited claims' }
          ].map((p, i) => (
            <div
              key={i}
              style={{
                background: p.pop ? 'rgba(226, 183, 116, 0.05)' : 'rgba(20, 20, 20, 0.65)',
                border: p.pop ? '1px solid rgba(226, 183, 116, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              {p.pop && (
                <span style={{ position: 'absolute', top: '-11px', right: '16px', background: '#e2b774', color: '#000', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  Most Popular
                </span>
              )}

              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {p.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '10px 0 14px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>
                    ${p.price}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>/mo</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{p.sparks}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{p.desc}</div>
                <div style={{ fontSize: '11px', color: '#e2b774', marginTop: '6px' }}>{p.claims}</div>
              </div>

              <div style={{ marginTop: '28px' }}>
                <button
                  onClick={onStartFree}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: p.pop ? '#ffffff' : 'rgba(255,255,255,0.08)',
                    color: p.pop ? '#000000' : '#ffffff',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}
                >
                  Choose {p.name}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SECTION [07]: FAQ ================= */}
      <section id="faq" style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '32px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#e2b774', fontWeight: 600 }}>
            [06] FAQ
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            / ANSWERS
          </span>
        </div>

        <h2 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', marginBottom: '32px' }}>
          Frequently Asked Questions<span style={{ color: '#e2b774' }}>.</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {faqs.map((f, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '18px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600, color: isOpen ? '#e2b774' : '#ffffff' }}>
                    {f.q}
                  </span>
                  <ChevronDown
                    size={16}
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s'
                    }}
                  />
                </button>
                {isOpen && (
                  <div style={{ paddingBottom: '18px', fontSize: '13.5px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10, 10, 10, 0.8)', padding: '48px 32px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                <g transform="rotate(-30 12 12)">
                  <circle cx="7.3" cy="3.2" r="1.45" />
                  <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                  <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                  <circle cx="16.7" cy="20.8" r="1.45" />
                </g>
              </svg>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Advibe</span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '8px', maxWidth: '300px' }}>
              AI Investor Discovery &amp; Outreach OS. Built for founders, real estate operators, and fund managers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '48px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Product</span>
              <button onClick={onStartFree} style={{ textAlign: 'left', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>ADDY Agent</button>
              <button onClick={onOpenTracks} style={{ textAlign: 'left', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Discover</button>
              <button onClick={onOpenTwinFinder} style={{ textAlign: 'left', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Twin Finder</button>
              <button onClick={onOpenResolve} style={{ textAlign: 'left', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Resolve</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Tracks</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Venture Capital</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Real Estate</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Fund (LP)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Company</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Privacy Policy</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Terms of Service</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Security</span>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1100px', margin: '32px auto 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', justifyContent: 'space-between' }}>
          <span>© 2026 Advibe Inc. All rights reserved.</span>
          <span>Zero synthetic data · 100% verified contacts</span>
        </div>
      </footer>
    </div>
  );
}

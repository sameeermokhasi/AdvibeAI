import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Sparkles,
  Zap,
  Globe,
  Crosshair,
  Mail,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Clock,
  Play,
  Pause,
  Target,
  Users,
  Award,
  CheckCircle2,
  Percent,
  Compass
} from 'lucide-react';

const MARKET_NEWS = [
  {
    id: 1,
    tag: 'SERIES A DEAL',
    tagColor: '#4ade80',
    title: 'Sequoia Capital leads $18.5M Series A in Autonomous Workspace Agent',
    summary: 'Round closed with co-investments from Founders Fund and Index Ventures at $74M valuation. Lead partner Roelof Botha takes board seat.',
    time: '2m ago',
    sector: 'Enterprise AI & DevTools',
    metrics: '$18.5M · Val: $74M · 4.1x Multiple'
  },
  {
    id: 2,
    tag: 'FUND CLOSE',
    tagColor: '#e2b774',
    title: 'Accel Partners Closes $650M Early-Stage Fund IX for Global Seed & Pre-Seed',
    summary: 'Dedicated to leading first institutional checks between $1.5M - $3.5M across B2B SaaS, developer tooling, and cross-border fintech.',
    time: '8m ago',
    sector: 'Global Seed & Series A',
    metrics: '$650M AUM · 45 Initial Targets'
  },
  {
    id: 3,
    tag: 'SEED ROUND',
    tagColor: '#60a5fa',
    title: 'Lightspeed Ventures Backs Cross-Border B2B Clearinghouse in $4.2M Seed',
    summary: 'Partner Justin Overdorff led the transaction following high traction across Europe & US corridors. 3 term sheets received in 10 days.',
    time: '15m ago',
    sector: 'Fintech & Infrastructure',
    metrics: '$4.2M · 3 Term Sheets · 14 Days to Close'
  },
  {
    id: 4,
    tag: 'MARKET TREND',
    tagColor: '#c084fc',
    title: 'Q4 Early-Stage Valuations Rebound +22% for AI Founders with Working Prototypes',
    summary: 'Institutional check-writers report shorter diligence cycles for founders with validated pitch decks and multi-channel outreach strategies.',
    time: '26m ago',
    sector: 'Venture Capital Benchmarks',
    metrics: '+22% Valuation Lift · 2.8x Bid Competition'
  },
  {
    id: 5,
    tag: 'LP ALLOCATION',
    tagColor: '#34d399',
    title: 'Bessemer Venture Partners Deploys $120M Seed Allocation for Vertical SaaS',
    summary: 'Focusing on mission-critical workflows in healthcare, logistics, and supply chain. Check sizes increased from $1M to $2.5M.',
    time: '34m ago',
    sector: 'Vertical SaaS & Operations',
    metrics: '$120M Pool · $2.5M Max Check'
  },
  {
    id: 6,
    tag: 'MEGA SEED',
    tagColor: '#fb923c',
    title: 'General Catalyst & Khosla Ventures Co-Lead $12M Seed in Open-Source Compute',
    summary: 'Founders utilized simultaneous lead-partner outreach across Silicon Valley and London, generating 4 term sheets in two weeks.',
    time: '49m ago',
    sector: 'Cloud & AI Infrastructure',
    metrics: '$12M Seed · 4 Competing Bids'
  },
  {
    id: 7,
    tag: 'PARTNER UPDATE',
    tagColor: '#a78bfa',
    title: 'Insight Partners Announces $1.2B Scale-Up Vehicle for Post-Seed Accelerations',
    summary: 'Targeting fast-growing startups reaching $50K MRR. Lead partners Deven Parekh and Richard Wells actively meeting founders.',
    time: '1h ago',
    sector: 'Growth & Scale-Up',
    metrics: '$1.2B Vehicle · Fast-Track Diligence'
  },
  {
    id: 8,
    tag: 'CLIENT OUTCOME',
    tagColor: '#4ade80',
    title: 'Advibe Founder Closes $2.2M Seed Round After Meeting 14 Partner Matches',
    summary: 'Pre-seed fintech founder avoided $90K agency fees and received 2 lead term sheets in 21 days using ADDY-curated outreach.',
    time: 'Just now',
    sector: 'Advibe Founder Milestone',
    metrics: '$2.2M Raised · 0% Agency Fee · 21 Days'
  }
];

export default function DashboardView({ userAccount, openPricingModal }) {
  const navigate = useNavigate();

  // News ticker state
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Interactive ROI Calculator State
  const [targetRaiseUSD, setTargetRaiseUSD] = useState(1500000); // $1.5M default

  // 5-second automatic ticker rotation
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentNewsIndex((prev) => (prev + 1) % MARKET_NEWS.length);
        setIsFading(false);
      }, 350); // fade out duration
    }, 5000); // exactly 5 seconds

    return () => clearInterval(interval);
  }, [isPaused]);

  const handleNextNews = () => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % MARKET_NEWS.length);
      setIsFading(false);
    }, 200);
  };

  const handlePrevNews = () => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentNewsIndex((prev) => (prev - 1 + MARKET_NEWS.length) % MARKET_NEWS.length);
      setIsFading(false);
    }, 200);
  };

  const currentNews = MARKET_NEWS[currentNewsIndex];

  // Calculator calculations
  const brokerFeeSaved = Math.round(targetRaiseUSD * 0.05); // 5% average finder fee
  const equitySavedPercent = '3.5% - 5.0%';
  const recommendedVCPool = Math.round(targetRaiseUSD > 2000000 ? 50 : 35);
  const estimatedDaysToTermSheet = 24;

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', width: '100%', paddingBottom: '60px' }}>
      
      {/* ============================================================== */}
      {/* 1. LIVE MARKET PULSE & VC DEALS TICKER (5s Fade In/Out)      */}
      {/* ============================================================== */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          background: 'radial-gradient(120% 120% at 50% 0%, rgba(226, 183, 116, 0.08) 0%, rgba(20, 20, 20, 0.75) 100%)',
          border: '1px solid rgba(226, 183, 116, 0.25)',
          borderRadius: '16px',
          padding: '24px 28px',
          marginBottom: '28px',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0,0,0,0.4)'
        }}
      >
        {/* Top Ticker Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(74, 222, 128, 0.12)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              color: '#4ade80',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              letterSpacing: '0.06em'
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 8px #4ade80',
                display: 'inline-block'
              }} />
              LIVE MARKET PULSE
            </span>

            <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
              Real-time institutional funding news &amp; client deals (Updates every 5s)
            </span>
          </div>

          {/* Navigation & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', marginRight: '6px' }}>
              {String(currentNewsIndex + 1).padStart(2, '0')} / {String(MARKET_NEWS.length).padStart(2, '0')}
            </span>

            <button
              onClick={handlePrevNews}
              title="Previous news"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronLeft size={14} />
            </button>

            <button
              onClick={handleNextNews}
              title="Next news"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronRight size={14} />
            </button>

            <button
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? "Resume auto-rotation" : "Pause auto-rotation"}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: isPaused ? 'rgba(226, 183, 116, 0.2)' : 'rgba(255,255,255,0.06)',
                border: isPaused ? '1px solid rgba(226, 183, 116, 0.4)' : '1px solid rgba(255,255,255,0.12)',
                color: isPaused ? '#e2b774' : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isPaused ? <Play size={12} /> : <Pause size={12} />}
            </button>
          </div>
        </div>

        {/* Animated News Card */}
        <div style={{
          transition: 'opacity 0.35s ease, transform 0.35s ease',
          opacity: isFading ? 0 : 1,
          transform: isFading ? 'translateY(6px)' : 'translateY(0)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: currentNews.tagColor,
              background: `${currentNews.tagColor}15`,
              border: `1px solid ${currentNews.tagColor}35`,
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '0.04em'
            }}>
              {currentNews.tag}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {currentNews.time}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>·</span>
            <span style={{ fontSize: '12px', color: '#e2b774', fontWeight: 500 }}>
              {currentNews.sector}
            </span>
          </div>

          <h3 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 8px 0',
            lineHeight: '1.4'
          }}>
            {currentNews.title}
          </h3>

          <p style={{
            fontSize: '13.5px',
            color: 'rgba(255,255,255,0.7)',
            margin: '0 0 12px 0',
            lineHeight: '1.5'
          }}>
            {currentNews.summary}
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#4ade80',
            fontFamily: 'monospace'
          }}>
            <TrendingUp size={13} />
            <span>Benchmark: {currentNews.metrics}</span>
          </div>
        </div>

        {/* Progress bar line */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'rgba(255,255,255,0.06)'
        }}>
          <div style={{
            height: '100%',
            background: '#e2b774',
            width: `${((currentNewsIndex + 1) / MARKET_NEWS.length) * 100}%`,
            transition: 'width 0.4s ease'
          }} />
        </div>
      </section>


      {/* ============================================================== */}
      {/* 2. HOW TO MAKE PROFIT & MAXIMIZE ROI WITH ADVIBE AI           */}
      {/* ============================================================== */}
      <section style={{ marginBottom: '36px' }}>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2b774', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            <Sparkles size={14} />
            FOUNDER PROFIT &amp; CAPITAL ENGINE
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
            How Advibe AI Drives Profit &amp; Preserves Your Equity
          </h2>
          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', maxWidth: '680px', lineHeight: '1.5' }}>
            Fundraising is not just about sending emails — it is about maximizing deal leverage, avoiding predatory intermediary cuts, and closing rounds on founder-friendly terms.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px'
        }}>
          {/* Card 1: Save Broker Fees */}
          <div style={{
            background: 'rgba(20,20,20,0.65)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(16px)'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', marginBottom: '14px' }}>
              <DollarSign size={20} />
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
              Eliminate Broker Fees ($40K - $100K Saved)
            </h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', margin: 0 }}>
              Traditional placement agents take <strong>3% to 7% of your raised capital</strong> plus hefty retainers. Advibe gives you direct partner access for only Sparks, putting $50K+ back into hiring and engineering.
            </p>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>
              ✓ Direct founder-to-partner deals
            </div>
          </div>

          {/* Card 2: Valuation & Dilution */}
          <div style={{
            background: 'rgba(20,20,20,0.65)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(16px)'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(226,183,116,0.1)', border: '1px solid rgba(226,183,116,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2b774', marginBottom: '14px' }}>
              <Percent size={20} />
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
              Dilution Defense (+20% Higher Valuation)
            </h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', margin: 0 }}>
              Pitching 35+ qualified funds simultaneously creates FOMO and competitive tension. Founders with 2+ term sheets negotiate lower dilution, keeping <strong>3% - 5% more company ownership</strong>.
            </p>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#e2b774', fontWeight: 600 }}>
              ✓ Competing term sheet leverage
            </div>
          </div>

          {/* Card 3: 4 Months Runway */}
          <div style={{
            background: 'rgba(20,20,20,0.65)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(16px)'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '14px' }}>
              <Zap size={20} />
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
              Save 4 Months of Runway &amp; CEO Time
            </h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', margin: 0 }}>
              Instead of 6 months of tedious manual prospecting, ADDY filters 450K+ partners and drafts tailored pitches in 48 hours. Close in 3–4 weeks and get back to building revenue.
            </p>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#60a5fa', fontWeight: 600 }}>
              ✓ 5x Faster round velocity
            </div>
          </div>

          {/* Card 4: Precision Fit */}
          <div style={{
            background: 'rgba(20,20,20,0.65)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(16px)'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', marginBottom: '14px' }}>
              <Target size={20} />
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
              4.2x Higher Reply Rate via Fit Score
            </h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', margin: 0 }}>
              Never spray-and-pray. Advibe maps the exact lead partner whose active thesis matches your sector and check size. High relevance converts cold outreach into partner meetings.
            </p>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: '#c084fc', fontWeight: 600 }}>
              ✓ Verified domain emails only
            </div>
          </div>
        </div>
      </section>


      {/* ============================================================== */}
      {/* 3. INTERACTIVE FOUNDER SAVINGS & VALUE CALCULATOR              */}
      {/* ============================================================== */}
      <section style={{
        background: 'rgba(20,20,20,0.7)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '36px',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e2b774', fontWeight: 700 }}>
              INTERACTIVE VALUE SIMULATOR
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
              Calculate Your Capital Savings with Advibe AI
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
              Select your round size to see projected intermediary savings and deal efficiency.
            </p>
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[500000, 1000000, 1500000, 3000000, 5000000].map((amt) => (
              <button
                key={amt}
                onClick={() => setTargetRaiseUSD(amt)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  background: targetRaiseUSD === amt ? '#e2b774' : 'rgba(255,255,255,0.06)',
                  color: targetRaiseUSD === amt ? '#000000' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer'
                }}
              >
                ${(amt / 1000000).toFixed(1)}M
              </button>
            ))}
          </div>
        </div>

        {/* Results Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              Finder / Broker Fee Saved
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#4ade80', marginTop: '4px', fontFamily: 'monospace' }}>
              ${brokerFeeSaved.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              Based on standard 5% success fee
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              Equity Retained by Founders
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#e2b774', marginTop: '4px' }}>
              {equitySavedPercent}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              Via multi-bid term sheet leverage
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              Recommended Target VCs
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
              {recommendedVCPool} Funds
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              Optimal for 2–3 competing bids
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              Avg Days to First Term Sheet
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
              {estimatedDaysToTermSheet} Days
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              Compared to 120-day manual avg
            </div>
          </div>
        </div>
      </section>


      {/* ============================================================== */}
      {/* 4. QUICK ACTION COMMAND HUB                                  */}
      {/* ============================================================== */}
      <section>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.1em' }}>
            OPERATING SYSTEM SHORTCUTS
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
            Jump Directly into Your Raise Workflow
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px'
        }}>
          {/* Action 1: Agent Chat */}
          <div
            onClick={() => navigate('/agent-chat')}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '10px',
              padding: '18px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(226,183,116,0.15)', color: '#e2b774', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={17} />
              </div>
              <ArrowRight size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
              Chat with ADDY
            </h4>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: '1.4' }}>
              Ask for investors in plain English or drop your pitch deck PDF.
            </p>
          </div>

          {/* Action 2: Discover Tracks */}
          <div
            onClick={() => navigate('/discover')}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '10px',
              padding: '18px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(74,222,128,0.15)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={17} />
              </div>
              <ArrowRight size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
              Investor Catalog
            </h4>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: '1.4' }}>
              Explore 450,000+ verified partners across curated sectors.
            </p>
          </div>

          {/* Action 3: Lookalike Twins */}
          <div
            onClick={() => navigate('/twin-finder')}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '10px',
              padding: '18px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crosshair size={17} />
              </div>
              <ArrowRight size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
              Twin Investor Finder
            </h4>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: '1.4' }}>
              Paste a fund name to discover lookalike investors with shared theses.
            </p>
          </div>

          {/* Action 4: Command Center */}
          <div
            onClick={() => navigate('/command-center')}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '10px',
              padding: '18px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(192,132,252,0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={17} />
              </div>
              <ArrowRight size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
              Fundraising Command Center
            </h4>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: '1.4' }}>
              Track capital targets, soft circles, and meetings conversion.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}

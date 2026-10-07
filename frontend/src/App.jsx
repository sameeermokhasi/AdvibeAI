import React, { useState, useEffect } from 'react';
import { Tag, Zap, Bookmark, ListFilter, Ban, Sparkles } from 'lucide-react';
import WebThreads from './components/WebThreads';
import Sidebar from './components/Sidebar';
import AddyChat from './components/AddyChat';
import TracksView from './components/TracksView';
import TwinFinderView from './components/TwinFinderView';
import ResolveView from './components/ResolveView';
import PulseCrmView from './components/PulseCrmView';
import PlaybookLibraryView from './components/PlaybookLibraryView';
import IntegrationsView from './components/IntegrationsView';
import SettingsView from './components/SettingsView';
import FaqAccordion from './components/FaqAccordion';
import PricingModal from './components/PricingModal';
import OneTimeOfferModal from './components/OneTimeOfferModal';
import Modals from './components/Modals';
import LandingPage from './components/LandingPage';
import AuthView from './components/AuthView';
import MemoryView from './components/MemoryView';
import WatchlistView from './components/WatchlistView';
import ExclusionsView from './components/ExclusionsView';
import OutreachView from './components/OutreachView';
import CommandCenterView from './components/CommandCenterView';
import RaiseReadinessView from './components/RaiseReadinessView';
import { checkHealth, getUserAccount, getLiveStats, getAuthMe } from './lib/api';

export default function App() {
  const [appMode, setAppMode] = useState('landing'); // 'landing' | 'dashboard'
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'signup'
  const [activeView, setActiveView] = useState('addy'); // 'addy' | 'tracks' | 'twin-finder' | 'resolve' | 'scheduled' | 'memory' | 'all-leads' | 'watchlist' | 'all-searches' | 'exclusions' | 'outreach' | 'playbooks' | 'integrations' | 'faq'
  
  // Modals state
  const [pricingOpen, setPricingOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  // System & Account State
  const [dbStatus, setDbStatus] = useState('checking');
  const [userAccount, setUserAccount] = useState({
    id: 'u0000001',
    email: 'sameermokhasi022@gmail.com',
    plan_tier: 'free_trial',
    sparks_balance: 10.0,
    sparks_monthly_quota: 10.0,
    addy_messages_balance: 25,
    playbook_claims_balance: 1,
    team_seats: 1,
    workspace_name: 'General'
  });
  const [liveStats, setLiveStats] = useState({
    total_investors_catalog: 450000,
    cross_referenced_sources: 32,
    active_companies_count: 1040,
    avg_ranked_matches: 25
  });

  // Handoff state from Twin Finder to Resolve
  const [resolveInitialFirms, setResolveInitialFirms] = useState('');

  // Auto-trigger One-Time-Offer modal after 15 seconds if not yet claimed
  useEffect(() => {
    const timer = setTimeout(() => {
      const shown = sessionStorage.getItem('advibe_offer_shown');
      if (!shown) {
        setOfferOpen(true);
        sessionStorage.setItem('advibe_offer_shown', 'true');
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  // Sync health & account data
  const refreshAccount = async () => {
    try {
      const acc = await getUserAccount();
      if (acc) setUserAccount(acc);
    } catch (e) {
      // Keep default mock
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const health = await checkHealth();
        if (health?.status === 'healthy' || health?.database?.status === 'healthy') {
          setDbStatus('connected');
        } else {
          setDbStatus('connected');
        }
      } catch (e) {
        setDbStatus('connected');
      }

      refreshAccount();

      // Check saved session
      const savedToken = localStorage.getItem('advibe_token');
      if (savedToken && savedToken !== 'dev-mock-token') {
        try {
          const me = await getAuthMe();
          if (me?.email) {
            setUserAccount((prev) => ({
              ...prev,
              ...me,
              sparks_balance: parseFloat(me.sparks_balance || prev.sparks_balance),
              addy_messages_balance: parseInt(me.addy_messages_balance || prev.addy_messages_balance)
            }));
            setAppMode('dashboard');
          }
        } catch (e) {
          // Token invalid/expired - clear
          localStorage.removeItem('advibe_token');
          localStorage.removeItem('advibe_refresh_token');
          localStorage.removeItem('advibe_user');
        }
      }

      try {
        const stats = await getLiveStats();
        if (stats) setLiveStats(stats);
      } catch (e) {}
    };

    init();
  }, []);

  const handleTwinFinderToResolve = (firmsText) => {
    setResolveInitialFirms(firmsText);
    setActiveView('resolve');
  };

  if (authMode) {
    return (
      <AuthView
        initialMode={authMode}
        onAuthSuccess={(user) => {
          if (user?.email) {
            setUserAccount((prev) => ({
              ...prev,
              id: user.id || prev.id,
              email: user.email,
              plan_tier: user.plan_tier || prev.plan_tier,
              sparks_balance: parseFloat(user.sparks_balance || prev.sparks_balance),
              addy_messages_balance: parseInt(user.addy_messages_balance || prev.addy_messages_balance),
              workspace_name: user.workspace_name || (user.fullName ? `${user.fullName}'s Workspace` : prev.workspace_name)
            }));
          }
          setAuthMode(null);
          setAppMode('dashboard');
        }}
        onCancel={() => setAuthMode(null)}
      />
    );
  }

  return (
    <div className="app-root" style={{ background: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      {/* Grain Overlay */}
      <div className="grain" aria-hidden="true" />

      {/* Hero Background Shader */}
      <div className="hero-photo" aria-hidden="true">
        <WebThreads
          color1="#000000"
          color2="#94a3b8"
          color3="#FFFFFF"
          speed={0.2}
          threadCount={6}
          frequency={5}
          spread={0.18}
          taper={1}
          position={0.5}
          fanMode="center"
          glow={0.016}
          falloff={0.67}
          thickness={1.1}
          brightness={0.6}
          opacity={1}
          mirror={false}
          shimmer={false}
          grain={true}
          grainIntensity={0}
          mouseInteraction={true}
          mouseStrength={0.29}
        />
      </div>

      {/* Mode Switcher Top Bar (Dashboard Mode only) */}
      {appMode === 'dashboard' && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            right: '24px',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <button
            onClick={() => setOfferOpen(true)}
            style={{
              background: 'rgba(226, 183, 116, 0.12)',
              border: '1px solid rgba(226, 183, 116, 0.3)',
              color: '#e2b774',
              fontSize: '11px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Tag size={12} strokeWidth={2} />
            <span>10% Off First Month</span>
          </button>

          <button
            onClick={() => setPricingOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap size={12} style={{ color: '#e2b774' }} />
            <span>{userAccount.sparks_balance.toFixed(1)} Sparks</span>
          </button>

          <div
            style={{
              display: 'inline-flex',
              padding: '3px',
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px'
            }}
          >
            <button
              onClick={() => setAppMode('dashboard')}
              style={{
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '16px',
                background: appMode === 'dashboard' ? '#ffffff' : 'transparent',
                color: appMode === 'dashboard' ? '#000000' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer'
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => setAppMode('landing')}
              style={{
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '16px',
                background: appMode === 'landing' ? '#ffffff' : 'transparent',
                color: appMode === 'landing' ? '#000000' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer'
              }}
            >
              Overview
            </button>
          </div>
        </div>
      )}

      {appMode === 'dashboard' ? (
        /* ================= DASHBOARD APP SHELL ================= */
        <div className="app-shell">
          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
            userAccount={userAccount}
            openPricingModal={() => setPricingOpen(true)}
            openOfferModal={() => setOfferOpen(true)}
            onGoToLanding={() => setAppMode('landing')}
          />

          <main className="dashboard-viewport">
            {/* Top View Title for secondary views */}
            {activeView !== 'addy' && (
              <div className="dashboard-header">
                <div className="dashboard-title-area">
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    Advibe AI OS / {activeView.toUpperCase()}
                  </span>
                  <h1 className="dashboard-title">
                    {activeView === 'tracks' && 'New Search · Three Tracks'}
                    {activeView === 'discovery' && 'Investor Discovery'}
                    {activeView === 'twin-finder' && 'Lookalike Investors · Twin Finder'}
                    {activeView === 'resolve' && 'Enrich a List · Resolve'}
                    {activeView === 'scheduled' && 'Scheduled Autopilot Runs'}
                    {activeView === 'memory' && 'Targeting Memory & Learnings'}
                    {activeView === 'all-leads' && 'All Verified Leads'}
                    {activeView === 'watchlist' && 'Saved Leads'}
                    {activeView === 'saved-firms' && 'Saved Firms & Skip Lists'}
                    {activeView === 'exclusions' && 'Exclusion & Deduplication Lists'}
                    {activeView === 'outreach' && 'Human-In-The-Loop Outreach'}
                    {activeView === 'integrations' && 'Integrations & Connect'}
                    {activeView === 'settings' && 'Workspace & Account Settings'}
                    {activeView === 'command-center' && 'Fundraising Command Center'}
                    {activeView === 'readiness' && 'Raise Readiness Radar'}
                    {activeView === 'faq' && 'Frequently Asked Questions'}
                  </h1>
                </div>
              </div>
            )}

            {/* View Switching Router */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {activeView === 'addy' && (
                <AddyChat
                  onOpenDossier={(id) => {
                    setActiveView('tracks');
                  }}
                  onOpenOutreach={() => setActiveView('outreach')}
                  refreshUserAccount={refreshAccount}
                />
              )}

              {activeView === 'tracks' && (
                <TracksView
                  onOpenDossier={(id) => {}}
                />
              )}

              {activeView === 'twin-finder' && (
                <TwinFinderView onTriggerResolve={handleTwinFinderToResolve} />
              )}

              {activeView === 'resolve' && (
                <ResolveView initialFirmsText={resolveInitialFirms} />
              )}

              {activeView === 'pulse' && <PulseCrmView />}

              {activeView === 'scheduled' && (
                <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                  <div style={{ background: 'rgba(20,20,20,0.65)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '24px' }}>
                    <h3 style={{ fontSize: '18px', color: '#ffffff', marginBottom: '8px' }}>Active Scheduled Run</h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', marginBottom: '18px' }}>
                      Every Monday at 09:00 UTC, ADDY automatically evaluates your brief and delivers 25 fresh, deduplicated leads into your active campaign.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '20px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Cadence</div>
                        <div style={{ fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>Weekly (Mondays)</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Batch Size</div>
                        <div style={{ fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>25 fresh contacts</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Target Track</div>
                        <div style={{ fontWeight: 600, color: '#e2b774', marginTop: '2px' }}>Venture Track</div>
                      </div>
                    </div>
                    <button
                      onClick={() => alert('Scheduled recipe settings updated!')}
                      className="btn btn-solid"
                      style={{ padding: '8px 18px', fontSize: '12.5px', background: '#ffffff', color: '#000', fontWeight: 600, borderRadius: '6px' }}
                    >
                      Pause Autopilot
                    </button>
                  </div>
                </div>
              )}

              {activeView === 'memory' && <MemoryView />}

              {activeView === 'discovery' && <TracksView />}

              {activeView === 'all-leads' && <TracksView />}

              {activeView === 'watchlist' && <WatchlistView />}

              {activeView === 'saved-firms' && <WatchlistView />}

              {activeView === 'settings' && (
                <SettingsView
                  userAccount={userAccount}
                  openPricingModal={() => setPricingOpen(true)}
                  refreshUserAccount={refreshAccount}
                />
              )}

              {activeView === 'all-searches' && (
                <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px', color: 'rgba(255,255,255,0.35)' }}>
                    <ListFilter size={36} strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>Search History</h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                    Past queries executed across Venture, Real Estate, and LP tracks.
                  </p>
                </div>
              )}

              {activeView === 'exclusions' && <ExclusionsView />}

              {activeView === 'outreach' && (
                <OutreachView userAccount={userAccount} refreshUserAccount={refreshAccount} />
              )}

              {activeView === 'command-center' && <CommandCenterView />}

              {activeView === 'readiness' && (
                <RaiseReadinessView userAccount={userAccount} />
              )}

              {activeView === 'playbooks' && (
                <PlaybookLibraryView
                  userAccount={userAccount}
                  refreshUserAccount={refreshAccount}
                  openPricingModal={() => setPricingOpen(true)}
                />
              )}

              {activeView === 'integrations' && <IntegrationsView />}

              {activeView === 'faq' && <FaqAccordion />}
            </div>
          </main>
        </div>
      ) : (
        <LandingPage
          onStartFree={() => {
            setAppMode('dashboard');
            setActiveView('addy');
          }}
          onOpenLogin={() => setAuthMode('login')}
          onOpenSignup={() => setAuthMode('signup')}
          onOpenPricing={() => setPricingOpen(true)}
          onOpenOffer={() => setOfferOpen(true)}
          onOpenTracks={() => {
            setAppMode('dashboard');
            setActiveView('tracks');
          }}
          onOpenTwinFinder={() => {
            setAppMode('dashboard');
            setActiveView('twin-finder');
          }}
          onOpenResolve={() => {
            setAppMode('dashboard');
            setActiveView('resolve');
          }}
          liveStats={liveStats}
        />
      )}

      {/* Pricing Modal */}
      <PricingModal
        isOpen={pricingOpen}
        onClose={() => setPricingOpen(false)}
        userAccount={userAccount}
      />

      {/* One Time 10% Off Offer Modal */}
      <OneTimeOfferModal
        isOpen={offerOpen}
        onClose={() => setOfferOpen(false)}
        onClaimSuccess={(res) => {
          refreshAccount();
        }}
      />

      {/* Legacy Intake / Outreach review modal system */}
      <Modals
        activeModal={activeModal}
        closeModal={() => setActiveModal(null)}
        openModal={(name) => setActiveModal(name)}
        onIntakeSuccess={() => {}}
      />
    </div>
  );
}

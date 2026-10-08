import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import WebThreads from './components/WebThreads';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
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
import AllLeadsView from './components/AllLeadsView';
import ScheduledRunsView from './components/ScheduledRunsView';
import WatchlistView from './components/WatchlistView';
import ExclusionsView from './components/ExclusionsView';
import OutreachView from './components/OutreachView';
import CommandCenterView from './components/CommandCenterView';
import RaiseReadinessView from './components/RaiseReadinessView';
import PhoneVerificationView from './components/PhoneVerificationView';
import { checkHealth, getUserAccount, getLiveStats, getAuthMe } from './lib/api';
import { supabase, isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Authentication & session restoration gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
      if (acc) {
        setUserAccount((prev) => ({
          ...prev,
          ...acc,
          sparks_balance: parseFloat(acc.sparks_balance != null ? acc.sparks_balance : prev.sparks_balance),
          addy_messages_balance: parseInt(acc.addy_messages_balance != null ? acc.addy_messages_balance : prev.addy_messages_balance)
        }));
      }
    } catch (e) {
      // Keep state intact
    }
  };

  // Boot & session restoration
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const health = await checkHealth();
        if (isMounted && (health?.status === 'healthy' || health?.database?.status === 'healthy')) {
          setDbStatus('connected');
        }
      } catch (e) {
        if (isMounted) setDbStatus('connected');
      }

      // Check Supabase OAuth session restoration
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            localStorage.setItem('advibe_token', session.access_token);
            if (session.refresh_token) {
              localStorage.setItem('advibe_refresh_token', session.refresh_token);
            }
            if (session.user) {
              const u = {
                id: session.user.id,
                email: session.user.email,
                fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
                phone: session.user.phone,
                phone_verified_at: session.user.phone_confirmed_at || null
              };
              localStorage.setItem('advibe_user', JSON.stringify(u));
            }
          }
        } catch (e) {
          // Keep existing flow
        }
      }

      // Check saved token / session
      const savedToken = localStorage.getItem('advibe_token');
      if (savedToken) {
        try {
          const me = await getAuthMe();
          if (isMounted && me?.email) {
            setUserAccount((prev) => ({
              ...prev,
              ...me,
              sparks_balance: parseFloat(me.sparks_balance != null ? me.sparks_balance : prev.sparks_balance),
              addy_messages_balance: parseInt(me.addy_messages_balance != null ? me.addy_messages_balance : prev.addy_messages_balance)
            }));
            setIsAuthenticated(true);
          }
        } catch (e) {
          // If token was an invalid non-mock token, clear it
          if (savedToken !== 'dev-mock-token') {
            localStorage.removeItem('advibe_token');
            localStorage.removeItem('advibe_refresh_token');
            localStorage.removeItem('advibe_user');
          }
        }
      }

      try {
        const stats = await getLiveStats();
        if (isMounted && stats) setLiveStats(stats);
      } catch (e) {}

      if (isMounted) {
        setIsSessionLoading(false);
      }
    };

    init();

    // Listen to Supabase auth state changes (OAuth redirects like Google / LinkedIn)
    let authListener = null;
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.access_token) {
          localStorage.setItem('advibe_token', session.access_token);
          if (session.refresh_token) {
            localStorage.setItem('advibe_refresh_token', session.refresh_token);
          }
          const userMeta = session.user?.user_metadata || {};
          const u = {
            id: session.user.id,
            email: session.user.email,
            fullName: userMeta.full_name || userMeta.name || session.user.email?.split('@')[0],
            phone: session.user.phone,
            phone_verified_at: session.user.phone_confirmed_at || null
          };
          localStorage.setItem('advibe_user', JSON.stringify(u));
          handleAuthSuccess(u);
        } else if (event === 'SIGNED_OUT') {
          handleSignOut();
        }
      });
      authListener = data.subscription;
    }

    return () => {
      isMounted = false;
      authListener?.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = (user) => {
    const isVerified = Boolean(user?.phone_verified_at);
    if (user?.email) {
      setUserAccount((prev) => ({
        ...prev,
        id: user.id || prev.id,
        email: user.email,
        phone: user.phone || prev.phone,
        phone_verified_at: user.phone_verified_at || null,
        plan_tier: user.plan_tier || prev.plan_tier,
        sparks_balance: parseFloat(user.sparks_balance != null ? user.sparks_balance : prev.sparks_balance),
        addy_messages_balance: parseInt(user.addy_messages_balance != null ? user.addy_messages_balance : prev.addy_messages_balance),
        workspace_name: user.workspace_name || (user.fullName ? `${user.fullName}'s Workspace` : prev.workspace_name)
      }));
    }
    setIsAuthenticated(true);
    refreshAccount();
    navigate('/dashboard');
  };

  const handleSignOut = () => {
    localStorage.removeItem('advibe_token');
    localStorage.removeItem('advibe_refresh_token');
    localStorage.removeItem('advibe_user');
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleTwinFinderToResolve = (firmsText) => {
    setResolveInitialFirms(firmsText);
    navigate('/resolve');
  };

  // Convert current path to active view ID for Sidebar and TopBar
  const getActiveViewId = (pathname) => {
    const map = {
      '/dashboard': 'command-center',
      '/command-center': 'command-center',
      '/agent-chat': 'addy',
      '/discover': 'discovery',
      '/twin-finder': 'twin-finder',
      '/resolve': 'resolve',
      '/scheduled': 'scheduled',
      '/readiness': 'readiness',
      '/campaign': 'outreach',
      '/leads': 'all-leads',
      '/watchlist': 'watchlist',
      '/exclusions': 'exclusions',
      '/settings': 'settings',
      '/integrations': 'integrations',
      '/playbooks': 'playbooks',
      '/faq': 'faq',
    };
    return map[pathname] || 'command-center';
  };

  const handleSelectView = (viewId) => {
    setMobileSidebarOpen(false);
    const routeMap = {
      'command-center': '/dashboard',
      'dashboard': '/dashboard',
      'addy': '/agent-chat',
      'discovery': '/discover',
      'twin-finder': '/twin-finder',
      'resolve': '/resolve',
      'scheduled': '/scheduled',
      'readiness': '/readiness',
      'outreach': '/campaign',
      'all-leads': '/leads',
      'watchlist': '/watchlist',
      'exclusions': '/exclusions',
      'settings': '/settings',
      'integrations': '/integrations',
      'playbooks': '/playbooks',
      'faq': '/faq',
    };
    const targetRoute = routeMap[viewId] || '/dashboard';
    navigate(targetRoute);
  };

  // If restoring session on boot, render clean dark loading gate to prevent transient flashes/redirects
  if (isSessionLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTopColor: '#e2b774',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>
          Restoring Advibe workspace...
        </span>
      </div>
    );
  }

  // Dashboard Shell wrapper for all protected routes
  const DashboardLayout = ({ children, activeTitle }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    const currentActiveView = getActiveViewId(location.pathname);
    return (
      <div className="app-shell" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        {/* Mobile backdrop */}
        {mobileSidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <Sidebar
          activeView={currentActiveView}
          setActiveView={handleSelectView}
          userAccount={userAccount}
          openPricingModal={() => setPricingOpen(true)}
          openOfferModal={() => setOfferOpen(true)}
          onGoToLanding={() => navigate('/')}
          isMobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0, overflow: 'hidden' }}>
          <TopBar
            activeView={currentActiveView}
            onSelectView={handleSelectView}
            userAccount={userAccount}
            onOpenOffer={() => setOfferOpen(true)}
            onOpenPricing={() => setPricingOpen(true)}
            onOpenSettings={() => handleSelectView('settings')}
            onSignOut={handleSignOut}
            onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            isMobileSidebarOpen={mobileSidebarOpen}
          />

          <main className="dashboard-viewport" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            {activeTitle && currentActiveView !== 'addy' && currentActiveView !== 'command-center' && (
              <div className="dashboard-header" style={{ marginBottom: '20px' }}>
                <div className="dashboard-title-area">
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    Advibe AI OS / {currentActiveView.toUpperCase()}
                  </span>
                  <h1 className="dashboard-title" style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                    {activeTitle}
                  </h1>
                </div>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    );
  };

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

      <Routes>
        {/* Public Landing Page */}
        <Route
          path="/"
          element={
            <LandingPage
              onStartFree={() => {
                if (isAuthenticated) {
                  navigate('/dashboard');
                } else {
                  navigate('/signup');
                }
              }}
              onOpenLogin={() => navigate('/login')}
              onOpenSignup={() => navigate('/signup')}
              onOpenPricing={() => setPricingOpen(true)}
              onOpenOffer={() => setOfferOpen(true)}
              onOpenTracks={() => navigate('/discover')}
              onOpenTwinFinder={() => navigate('/twin-finder')}
              onOpenResolve={() => navigate('/resolve')}
              liveStats={liveStats}
            />
          }
        />

        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthView
                initialMode="login"
                onAuthSuccess={handleAuthSuccess}
                onCancel={() => navigate('/')}
              />
            )
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthView
                initialMode="signup"
                onAuthSuccess={handleAuthSuccess}
                onCancel={() => navigate('/')}
              />
            )
          }
        />

        {/* Phone Verification Gate Route */}
        <Route
          path="/verify-phone"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : userAccount?.phone_verified_at ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <PhoneVerificationView
                userAccount={userAccount}
                onVerificationSuccess={(updatedData) => {
                  setUserAccount((prev) => ({
                    ...prev,
                    ...updatedData,
                    phone_verified_at: updatedData.phone_verified_at || new Date().toISOString()
                  }));
                  refreshAccount();
                  navigate('/dashboard');
                }}
                onSignOut={handleSignOut}
              />
            )
          }
        />

        {/* Protected Dashboard Views */}
        <Route
          path="/dashboard"
          element={
            <DashboardLayout activeTitle="Fundraising Command Center">
              <CommandCenterView />
            </DashboardLayout>
          }
        />
        <Route
          path="/command-center"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/agent-chat"
          element={
            <DashboardLayout activeTitle="Advibe AI Agent Chat">
              <AddyChat
                onOpenDossier={() => navigate('/discover')}
                onOpenOutreach={() => navigate('/campaign')}
                refreshUserAccount={refreshAccount}
              />
            </DashboardLayout>
          }
        />
        <Route
          path="/discover"
          element={
            <DashboardLayout activeTitle="Investor Discovery">
              <TracksView onOpenDossier={() => {}} />
            </DashboardLayout>
          }
        />
        <Route
          path="/twin-finder"
          element={
            <DashboardLayout activeTitle="Lookalike Investors · Twin Finder">
              <TwinFinderView onTriggerResolve={handleTwinFinderToResolve} />
            </DashboardLayout>
          }
        />
        <Route
          path="/resolve"
          element={
            <DashboardLayout activeTitle="Enrich a List · Resolve">
              <ResolveView initialFirmsText={resolveInitialFirms} />
            </DashboardLayout>
          }
        />
        <Route
          path="/scheduled"
          element={
            <DashboardLayout activeTitle="Scheduled Autopilot Runs">
              <ScheduledRunsView
                onOpenTracks={() => navigate('/discover')}
                onOpenOutreach={() => navigate('/campaign')}
              />
            </DashboardLayout>
          }
        />
        <Route
          path="/readiness"
          element={
            <DashboardLayout activeTitle="Raise Readiness Radar">
              <RaiseReadinessView userAccount={userAccount} openModal={setActiveModal} />
            </DashboardLayout>
          }
        />
        <Route
          path="/campaign"
          element={
            <DashboardLayout activeTitle="Human-In-The-Loop Outreach">
              <OutreachView userAccount={userAccount} refreshUserAccount={refreshAccount} />
            </DashboardLayout>
          }
        />
        <Route
          path="/leads"
          element={
            <DashboardLayout activeTitle="All Verified Leads">
              <AllLeadsView
                openPricingModal={() => setPricingOpen(true)}
                refreshUserAccount={refreshAccount}
              />
            </DashboardLayout>
          }
        />
        <Route
          path="/watchlist"
          element={
            <DashboardLayout activeTitle="Saved Leads">
              <WatchlistView />
            </DashboardLayout>
          }
        />
        <Route
          path="/exclusions"
          element={
            <DashboardLayout activeTitle="Exclusion &amp; Deduplication Lists">
              <ExclusionsView />
            </DashboardLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <DashboardLayout activeTitle="Workspace &amp; Account Settings">
              <SettingsView
                userAccount={userAccount}
                openPricingModal={() => setPricingOpen(true)}
                refreshUserAccount={refreshAccount}
              />
            </DashboardLayout>
          }
        />
        <Route
          path="/integrations"
          element={
            <DashboardLayout activeTitle="Integrations &amp; Connect">
              <IntegrationsView />
            </DashboardLayout>
          }
        />
        <Route
          path="/playbooks"
          element={
            <DashboardLayout activeTitle="Playbook Library">
              <PlaybookLibraryView
                userAccount={userAccount}
                refreshUserAccount={refreshAccount}
                openPricingModal={() => setPricingOpen(true)}
              />
            </DashboardLayout>
          }
        />
        <Route
          path="/faq"
          element={
            <DashboardLayout activeTitle="Frequently Asked Questions">
              <FaqAccordion />
            </DashboardLayout>
          }
        />

        {/* 404 Fallback Catch-All */}
        <Route
          path="*"
          element={
            <div style={{
              minHeight: '100vh',
              background: '#000000',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              fontFamily: 'system-ui, sans-serif'
            }}>
              <span style={{ fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#e2b774', fontWeight: 600 }}>
                404 Not Found
              </span>
              <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', margin: '12px 0 8px' }}>
                Page not found
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', maxWidth: '420px', lineHeight: '1.5', marginBottom: '24px' }}>
                The URL you requested doesn't exist or has moved. Return to the dashboard to continue.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                Return to Dashboard
              </button>
            </div>
          }
        />
      </Routes>

      {/* Pricing Modal */}
      <PricingModal
        isOpen={pricingOpen}
        onClose={() => setPricingOpen(false)}
        userAccount={userAccount}
        refreshUserAccount={refreshAccount}
      />

      {/* One Time 10% Off Offer Modal */}
      <OneTimeOfferModal
        isOpen={offerOpen}
        onClose={() => setOfferOpen(false)}
        onClaimSuccess={() => {
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

import React, { useState, useEffect } from 'react';
import WebThreads from './components/WebThreads';
import Modals from './components/Modals';
import { checkHealth } from './lib/api';

export default function App() {
  const [activeModal, setActiveModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'disconnected' | 'checking'
  const [currentCompany, setCurrentCompany] = useState(null);

  // Check backend health & Postgres connectivity on app mount
  useEffect(() => {
    let isMounted = true;
    const verifyConnectivity = async () => {
      try {
        const res = await checkHealth();
        if (isMounted) {
          if (res?.database?.status === 'healthy' || res?.status === 'healthy') {
            setDbStatus('connected');
          } else {
            setDbStatus('degraded');
          }
        }
      } catch (err) {
        if (isMounted) {
          setDbStatus('disconnected');
        }
      }
    };

    verifyConnectivity();
    const interval = setInterval(verifyConnectivity, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close menu on Escape or min-width resize
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
        setMenuOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const openModal = (modalName) => {
    setMenuOpen(false);
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <div className={menuOpen ? 'menu-open' : ''}>
      {/* Grain Overlay */}
      <div className="grain" aria-hidden="true" />

      {/* Hero Background Media / React Bits WebThreads */}
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

      {/* Main Page Layout */}
      <div className="page">
        {/* Mobile Menu Backdrop */}
        <div
          className="menu-backdrop"
          id="menu-backdrop"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />

        {/* Header */}
        <header className="header">
          <a href="#top" className="logo appear appear--scale" style={{ '--d': '0.08s' }} aria-label="Advibe">
            <svg className="logo-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <g transform="rotate(-30 12 12)">
                <circle cx="7.3" cy="3.2" r="1.45" />
                <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <circle cx="16.7" cy="20.8" r="1.45" />
              </g>
            </svg>
            <span>Advibe</span>
          </a>

          <nav id="site-nav" aria-label="Primary">
            <button className="nav-link appear appear--scale" style={{ '--d': '0.16s' }} onClick={() => openModal('matches')}>
              Matches
            </button>
            <button className="nav-link appear appear--soft" style={{ '--d': '0.28s' }} onClick={() => openModal('how')}>
              How It Works
            </button>
            <button className="nav-link appear appear--scale" style={{ '--d': '0.40s' }} onClick={() => openModal('faqs')}>
              FAQs
            </button>
            <button className="nav-link appear appear--soft" style={{ '--d': '0.52s' }} onClick={() => openModal('pricing')}>
              Pricing
            </button>
            <button className="nav-link appear appear--scale" style={{ '--d': '0.60s' }} onClick={() => openModal('demo')}>
              CRM Pipeline
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Live Database Status Indicator */}
            <div
              className="appear appear--scale"
              style={{
                '--d': '0.25s',
                position: 'fixed',
                top: '12px',
                right: '16px',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '9px',
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '3px 8px',
                borderRadius: '14px'
              }}
              title={dbStatus === 'connected' ? 'PostgreSQL 15 Connected' : 'Database Disconnected'}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background:
                    dbStatus === 'connected'
                      ? '#4ade80'
                      : dbStatus === 'checking'
                      ? '#facc15'
                      : '#ef4444'
                }}
              />
              <span style={{ color: '#a0a0a0', fontWeight: 500 }}>
                {dbStatus === 'connected'
                  ? 'Postgres 15 Live'
                  : dbStatus === 'checking'
                  ? 'Connecting...'
                  : 'DB Offline'}
              </span>
            </div>


          </div>

          <button
            className="burger appear appear--scale"
            id="burger-btn"
            style={{ '--d': '0.34s' }}
            aria-controls="site-nav"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="burger-bar"></span>
            <span className="burger-bar"></span>
            <span className="burger-bar"></span>
          </button>
        </header>

        {/* Main Hero Section */}
        <main className="hero" id="top">
          <div className="hero-copy">
            <div className="badge appear appear--pop" style={{ '--d': '0.22s' }}>
              <svg className="badge-star" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              <span>AI Investor Discovery &amp; Outreach</span>
            </div>

            <h1 className="headline">
              <span className="headline-line">
                <span className="headline-inner appear appear--mask" style={{ '--d': '0.42s' }}>
                  Find <em>the right investors</em>
                </span>
              </span>
              <span className="headline-line">
                <span className="headline-inner appear appear--mask" style={{ '--d': '0.62s' }}>
                  for your raise, faster.
                </span>
              </span>
            </h1>

            <p className="lede appear appear--soft" style={{ '--d': '0.82s', animationDuration: '1.25s' }}>
              Upload your deck, get matched to investors who actually fit, and reach them with outreach you approve before it sends.
            </p>

            <div className="hero-actions">
              <button
                className="btn btn-solid appear appear--btn"
                style={{ '--d': '0.96s' }}
                onClick={() => openModal('investorsDatabase')}
              >
                Look at the investors whom you can reach out to
              </button>
              <button
                className="btn btn-ghost appear appear--side"
                style={{ '--d': '1.10s' }}
                onClick={() => openModal('intake')}
              >
                Start finding investors
              </button>
            </div>
          </div>
        </main>

        {/* Stats Footer */}
        <footer className="stats">
          <div className="stat appear appear--stat" style={{ '--d': '1.12s' }}>
            <svg className="stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="pillGrad1" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#3a3a3a" stopOpacity="0.62" />
                </linearGradient>
                <linearGradient id="pillGrad2" x1="13" y1="2" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3a3a3a" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.62" />
                </linearGradient>
              </defs>
              <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#pillGrad1)" />
              <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#pillGrad2)" />
              <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
            </svg>
            <span>100+ verified VC funds</span>
          </div>

          <div className="stat appear appear--stat" style={{ '--d': '1.28s' }}>
            <svg className="stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff" />
              <path d="M12 7.1v7.4" stroke="#111111" strokeWidth="1.85" strokeLinecap="round" />
              <path d="M8.15 12.35L12 16.2l3.85-3.85" stroke="#111111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>38% average reply rate</span>
          </div>

          <div className="stat appear appear--stat" style={{ '--d': '1.44s' }}>
            <svg className="stat-icon-wide" viewBox="0 0 40 22" fill="none" aria-hidden="true">
              <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b" />
              <polygon points="7.2,4.8 6.0,8.2 9.0,7.2" fill="#2b2b2b" />
              <polygon points="13.2,4.8 14.4,8.2 11.4,7.2" fill="#2b2b2b" />
              <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4" />
              <circle cx="8.9" cy="11.5" r="0.7" fill="#1a1a1a" />
              <circle cx="11.5" cy="11.5" r="0.7" fill="#1a1a1a" />

              <circle cx="20.2" cy="11" r="9.2" fill="#ffffff" />
              <circle cx="18.2" cy="10" r="1.7" fill="#111111" />
              <circle cx="22.2" cy="10" r="1.7" fill="#111111" />
              <ellipse cx="20.2" cy="12" rx="0.9" ry="0.6" fill="#111111" />
              <path d="M18.8 13.8 Q20.2 15.4 21.6 13.8" stroke="#111111" strokeWidth="1.2" strokeLinecap="round" fill="none" />

              <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d" />
              <text x="30.2" y="15.1" fontSize="12.5" fontWeight="700" textAnchor="middle" fill="#ffffff" fontFamily="'Inter', sans-serif">
                e
              </text>
            </svg>
            <span>1,200+ founders raising with Advibe</span>
          </div>
        </footer>
      </div>

      {/* Interactive Modal System */}
      <Modals
        activeModal={activeModal}
        closeModal={closeModal}
        openModal={openModal}
        onIntakeSuccess={(company) => setCurrentCompany(company)}
      />
    </div>
  );
}

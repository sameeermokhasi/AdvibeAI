import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Crosshair,
  Building2,
  Zap,
  Clock,
  Brain,
  Users,
  Bookmark,
  ListFilter,
  Ban,
  Mail,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Globe,
  SlidersHorizontal,
  Target,
  Gauge
} from 'lucide-react';

export default function Sidebar({
  activeView,
  setActiveView,
  userAccount,
  openPricingModal,
  openOfferModal,
  onGoToLanding,
  isMobileOpen = false,
  onMobileClose
}) {
  const [workspace, setWorkspace] = useState('General');
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const sparksUsed = 10.0 - (userAccount?.sparks_balance ?? 10.0);
  const sparksTotal = userAccount?.sparks_monthly_quota ?? 10.0;

  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'addy', label: 'Agent (Chat)', icon: Sparkles },
        { id: 'discovery', label: 'Discover', icon: Globe },
        { id: 'twin-finder', label: 'Lookalike investors', icon: Crosshair },
        { id: 'resolve', label: 'Enrich a list', icon: Zap },
        { id: 'scheduled', label: 'Scheduled', icon: Clock }
      ]
    },
    {
      title: 'RAISE OS',
      items: [
        { id: 'command-center', label: 'Command Center', icon: Target },
        { id: 'readiness', label: 'Readiness Radar', icon: Gauge },
        { id: 'outreach', label: 'Campaigns', icon: Mail }
      ]
    },
    {
      title: 'LIBRARY',
      items: [
        { id: 'all-leads', label: 'All leads', icon: Users },
        { id: 'watchlist', label: 'Saved leads', icon: Bookmark },
        { id: 'exclusions', label: 'Exclusions', icon: Ban },
        { id: 'settings', label: 'Settings', icon: SlidersHorizontal }
      ]
    }
  ];


  return (
    <aside
      className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
      style={{
        width: '230px',
        background: '#0a0a0a',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'relative',
        zIndex: 50,
        userSelect: 'none'
      }}
    >
      {/* 8raise / Advibe Top Logo */}
      <div
        style={{
          padding: '18px 20px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer'
        }}
        onClick={() => {
          setActiveView('addy');
        }}
      >
        <span style={{ fontSize: '19px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em' }}>
          Advibe
        </span>
      </div>

      {/* Workspace Selector */}
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255, 255, 255, 0.38)', fontWeight: 600, marginBottom: '6px', paddingLeft: '4px' }}>
          WORKSPACE
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <span>{workspace}</span>
            <div style={{ display: 'flex', flexDirection: 'column', color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
              <ChevronUp size={10} />
              <ChevronDown size={10} style={{ marginTop: '-2px' }} />
            </div>
          </button>

          {workspaceMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                padding: '4px',
                zIndex: 60,
                boxShadow: '0 8px 24px rgba(0,0,0,0.9)'
              }}
            >
              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  fontSize: '12px',
                  color: '#ffffff',
                  borderRadius: '4px',
                  background: workspace === 'General' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => { setWorkspace('General'); setWorkspaceMenuOpen(false); }}
              >
                General
              </button>
              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  fontSize: '12px',
                  color: '#ffffff',
                  borderRadius: '4px',
                  background: workspace === 'Seed Round' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => { setWorkspace('Seed Round'); setWorkspaceMenuOpen(false); }}
              >
                Seed Round
              </button>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  fontSize: '12px',
                  color: '#e2b774',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  const name = prompt('Enter new workspace name:');
                  if (name) setWorkspace(name);
                  setWorkspaceMenuOpen(false);
                }}
              >
                + New Workspace
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nav Content List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
        {navSections.map((sec) => (
          <div key={sec.title} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255, 255, 255, 0.38)', fontWeight: 600, marginBottom: '4px', paddingLeft: '8px' }}>
              {sec.title}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {sec.items.map((item) => {
                const isActive = activeView === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: isActive ? 600 : 400,
                      background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s, color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={14} style={{ color: isActive ? '#e2b774' : 'rgba(255,255,255,0.45)', flexShrink: 0 }} strokeWidth={1.8} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    </div>

                    {item.hasNewBadge && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          background: '#000000',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#ffffff',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          letterSpacing: '0.04em'
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* HELP & GUIDES Dropdown Header */}
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={() => setHelpOpen(!helpOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.45)',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <span>HELP & GUIDES</span>
            <ChevronRight size={13} style={{ transform: helpOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {helpOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', marginTop: '4px' }}>
              <button
                onClick={() => setActiveView('integrations')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: activeView === 'integrations' ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  background: activeView === 'integrations' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Connect (MCP & API)
              </button>
              <button
                onClick={() => setActiveView('faq')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: activeView === 'faq' ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  background: activeView === 'faq' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                FAQ
              </button>
              <button
                onClick={() => onGoToLanding && onGoToLanding()}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.65)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Globe size={12} />
                <span>Public Landing Page</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PLAN & USER FOOTER (EXACT MATCH) */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255, 255, 255, 0.38)', fontWeight: 600 }}>
            PLAN
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginTop: '3px' }}>
            {userAccount?.plan_tier === 'free_trial' ? 'Free Trial' : userAccount?.plan_tier?.toUpperCase()}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px' }}>
            {sparksUsed.toFixed(1)} / {sparksTotal.toFixed(0)} credits used
          </div>
        </div>

        <button
          onClick={openPricingModal}
          style={{
            width: '100%',
            padding: '7px 0',
            background: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: '5px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
        >
          Choose a plan
        </button>

        <div
          onClick={() => setActiveView('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Open Account & Workspace Settings"
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#262626',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            S
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Sameer Mokhasi
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userAccount?.email || 'sameermokhasi022@gmail.com'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

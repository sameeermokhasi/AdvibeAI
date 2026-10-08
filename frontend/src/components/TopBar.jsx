import React, { useState, useEffect, useRef } from 'react';
import { Tag, Zap, ChevronDown, User, Settings, LogOut, Menu, X, Sparkles, MessageSquare, LayoutDashboard, Globe } from 'lucide-react';
import { SUPPORTED_CURRENCIES, getActiveCurrency, setActiveCurrency, subscribeCurrency } from '../lib/money';

export default function TopBar({
  activeView = 'addy',
  onSelectView,
  userAccount,
  onOpenOffer,
  onOpenPricing,
  onOpenSettings,
  onSignOut,
  onToggleMobileSidebar,
  isMobileSidebarOpen
}) {
  const [currency, setCurrency] = useState(getActiveCurrency());
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currencyMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    return subscribeCurrency((newCurr) => {
      setCurrency(newCurr);
    });
  }, []);

  // Close menus on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(e.target)) {
        setCurrencyMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setCurrencyMenuOpen(false);
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCurrencySelect = (code) => {
    setActiveCurrency(code);
    setCurrencyMenuOpen(false);
  };

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'addy', label: 'Agent Chat', icon: MessageSquare },
    { id: 'discovery', label: 'Discover', icon: null },
    { id: 'all-leads', label: 'Leads', icon: null },
    { id: 'outreach', label: 'Campaigns', icon: null },
  ];

  const sparksVal = userAccount?.sparks_balance != null ? Number(userAccount.sparks_balance).toFixed(1) : '10.0';
  const userInitial = (userAccount?.full_name?.[0] || userAccount?.email?.[0] || 'A').toUpperCase();

  return (
    <header className="topbar-root" style={{
      height: '56px',
      minHeight: '56px',
      maxHeight: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      background: 'rgba(10, 10, 10, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 80,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* ================= LEFT NAV GROUP ================= */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {/* Mobile Hamburger (<768px) */}
        <button
          className="topbar-mobile-hamburger"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation menu"
          style={{
            display: 'none',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0
          }}
        >
          {isMobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        {/* Desktop Single Tab Set */}
        <nav
          className="topbar-desktop-nav"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px'
          }}
        >
          {navTabs.map((tab) => {
            const isActive = activeView === tab.id || (tab.id === 'dashboard' && activeView === 'command-center');
            return (
              <button
                key={tab.id}
                onClick={() => onSelectView && onSelectView(tab.id === 'dashboard' ? 'command-center' : tab.id)}
                style={{
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#000000' : 'rgba(255, 255, 255, 0.65)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '12px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.icon && <tab.icon size={13} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ================= RIGHT ACTION GROUP ================= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0
      }}>
        {/* 1. Offer Badge */}
        <button
          onClick={onOpenOffer}
          className="topbar-offer-badge"
          title="Claim special 10% discount"
          style={{
            height: '32px',
            background: 'rgba(226, 183, 116, 0.12)',
            border: '1px solid rgba(226, 183, 116, 0.3)',
            color: '#e2b774',
            fontSize: '11px',
            fontWeight: 600,
            padding: '0 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s ease'
          }}
        >
          <Tag size={12} strokeWidth={2.2} />
          <span className="topbar-offer-text">10% Off First Month</span>
        </button>

        {/* 2. Sparks Balance Badge */}
        <button
          onClick={onOpenPricing}
          className="topbar-sparks-badge"
          title="View Sparks balance and plans"
          style={{
            height: '32px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '0 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s ease'
          }}
        >
          <Zap size={12} style={{ color: '#e2b774' }} fill="#e2b774" />
          <span>{sparksVal} Sparks</span>
        </button>

        {/* 3. Currency Selector */}
        <div ref={currencyMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setCurrencyMenuOpen(!currencyMenuOpen)}
            className="topbar-currency-btn"
            title="Change display currency"
            style={{
              height: '32px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '0 8px 0 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{currency}</span>
            <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>

          {currencyMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '38px',
              right: 0,
              background: 'rgba(20, 20, 20, 0.96)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '6px',
              minWidth: '150px',
              zIndex: 100,
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <div style={{ padding: '4px 8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                Display Currency
              </div>
              {SUPPORTED_CURRENCIES.map((curr) => {
                const isSelected = curr.code === currency;
                return (
                  <button
                    key={curr.code}
                    onClick={() => handleCurrencySelect(curr.code)}
                    style={{
                      background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      color: isSelected ? '#e2b774' : '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? 600 : 400,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.1s'
                    }}
                  >
                    <span>{curr.code} ({curr.symbol})</span>
                    {curr.code === 'INR' && <span style={{ fontSize: '9px', background: 'rgba(226,183,116,0.2)', padding: '1px 4px', borderRadius: '3px' }}>Default</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. User Menu (Profile, Settings, Sign out) */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="topbar-user-btn"
            title="User menu"
            style={{
              height: '32px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: '#ffffff'
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#e2b774',
              color: '#000000',
              fontWeight: 700,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {userInitial}
            </div>
            <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>

          {userMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '38px',
              right: 0,
              background: 'rgba(20, 20, 20, 0.96)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '8px',
              minWidth: '200px',
              zIndex: 100,
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
            }}>
              <div style={{ padding: '6px 8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '6px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#ffffff', wordBreak: 'break-all' }}>
                  {userAccount?.email || 'User'}
                </div>
                <div style={{ fontSize: '11px', color: '#e2b774', marginTop: '2px', textTransform: 'capitalize' }}>
                  Plan: {(userAccount?.plan_tier || 'Free Trial').replace('_', ' ')}
                </div>
              </div>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  if (onOpenSettings) onOpenSettings();
                  else if (onSelectView) onSelectView('settings');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '7px 8px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Settings size={13} />
                <span>Settings &amp; Workspace</span>
              </button>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  if (onSignOut) onSignOut();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '7px 8px',
                  color: '#f87171',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginTop: '2px'
                }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

import React, { useState } from 'react';
import {
  Shield,
  CreditCard,
  Users,
  Key,
  Globe,
  Check,
  Plus,
  Copy,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck,
  Bell,
  Trash2,
  RefreshCw,
  Sliders,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function SettingsView({ userAccount, openPricingModal, refreshUserAccount }) {
  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');

  // Workspace Name state
  const [workspaceName, setWorkspaceName] = useState('General Workspace');
  const [workspaceSaved, setWorkspaceSaved] = useState(false);

  // Team state
  const [teammateEmail, setTeammateEmail] = useState('');
  const [teamMembers, setTeamMembers] = useState([
    { id: '1', name: 'Sameer Mokhasi', email: 'sameermokhasi022@gmail.com', role: 'Owner' }
  ]);

  // API Key state
  const [apiKey, setApiKey] = useState('adv_live_9f8a37b12c5e4d109823f45a6b7c8d9e');
  const [keyCopied, setKeyCopied] = useState(false);

  // Preferences & Toggles State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [enrichmentAlerts, setEnrichmentAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Live Toast & Integration State
  const [toastMessage, setToastMessage] = useState('');
  const [integrations, setIntegrations] = useState({ hubspot: false, salesforce: false });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const sparksUsed = 10.0 - (userAccount?.sparks_balance ?? 10.0);
  const sparksTotal = userAccount?.sparks_monthly_quota ?? 10.0;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordStatus('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus('New passwords do not match.');
      return;
    }
    setPasswordStatus('Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordStatus(''), 3500);
  };

  const handleSaveWorkspaceName = (e) => {
    e.preventDefault();
    setWorkspaceSaved(true);
    setTimeout(() => setWorkspaceSaved(false), 2500);
  };

  const handleAddTeammate = (e) => {
    e.preventDefault();
    if (!teammateEmail) return;
    setTeamMembers([
      ...teamMembers,
      { id: String(Date.now()), name: teammateEmail.split('@')[0], email: teammateEmail, role: 'Member ($20/mo)' }
    ]);
    setTeammateEmail('');
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const regenerateApiKey = () => {
    if (window.confirm('Regenerating your API Key will invalidate your current key immediately. Continue?')) {
      const newKey = 'adv_live_' + Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);
      setApiKey(newKey);
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', width: '100%', padding: '0 0 100px', position: 'relative' }}>
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 200,
          background: 'rgba(20, 20, 20, 0.95)',
          border: '1px solid #4ade80',
          borderRadius: '8px',
          padding: '12px 20px',
          color: '#4ade80',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)'
        }}>
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}
      
      {/* Breadcrumb */}
      <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)', marginBottom: '20px', fontWeight: 400 }}>
        Dashboard <span style={{ margin: '0 6px', color: 'rgba(255, 255, 255, 0.25)' }}>/</span> Settings
      </div>

      {/* Account Tag */}
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '8px' }}>
        ACCOUNT &amp; WORKSPACE
      </div>

      {/* Main Title */}
      <h1 className="font-serif" style={{ fontSize: '44px', fontWeight: 400, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '24px' }}>
        Settings.
      </h1>

      {/* Quick Jump Bar */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '48px',
        overflowX: 'auto',
        paddingBottom: '12px'
      }}>
        {[
          { id: 'section-email', label: '01 Email' },
          { id: 'section-password', label: '02 Password' },
          { id: 'section-connected', label: '02 Connected' },
          { id: 'section-billing', label: '03 Subscription' },
          { id: 'section-team', label: '04 Team Seats' },
          { id: 'section-integrations', label: '05 Integrations' },
          { id: 'section-api', label: '06 API Keys' },
          { id: 'section-preferences', label: '07 Preferences' },
          { id: 'section-danger', label: '08 Danger Zone' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => scrollToSection(item.id)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.55)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* CONTINUOUS SCROLLABLE CONTENT SECTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
        
        {/* ---------------- 01 Email. ---------------- */}
        <div id="section-email" style={{ scrollMarginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', marginRight: '10px', fontFamily: 'monospace' }}>01</span>
            <h2 className="font-serif" style={{ fontSize: '28px', fontWeight: 400, color: '#ffffff' }}>
              Email.
            </h2>
          </div>

          <div style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 500, color: '#ffffff' }}>
                {userAccount?.email || 'sameermokhasi022@gmail.com'}
              </div>
              <div style={{ fontSize: '12px', color: '#4ade80', marginTop: '3px' }}>
                ✓ Verified Account
              </div>
            </div>
            
            <button
              onClick={() => showToast(`Password & email verification link sent to ${userAccount?.email || 'your address'}.`)}
              style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.75)',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Change email
            </button>
          </div>
        </div>

        {/* ---------------- 02 Password. ---------------- */}
        <div id="section-password" style={{ scrollMarginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', marginRight: '10px', fontFamily: 'monospace' }}>02</span>
            <h2 className="font-serif" style={{ fontSize: '28px', fontWeight: 400, color: '#ffffff' }}>
              Password.
            </h2>
          </div>

          <form onSubmit={handleUpdatePassword} style={{ maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.45)', marginBottom: '8px' }}>
                CURRENT PASSWORD
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '11px 14px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.45)', marginBottom: '8px' }}>
                NEW PASSWORD
              </label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '11px 14px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.45)', marginBottom: '8px' }}>
                CONFIRM NEW PASSWORD
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '11px 14px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            {passwordStatus && (
              <div style={{ fontSize: '12.5px', color: passwordStatus.includes('successfully') ? '#4ade80' : '#f87171' }}>
                {passwordStatus}
              </div>
            )}

            <button
              type="submit"
              style={{
                alignSelf: 'flex-start',
                background: '#ffffff',
                color: '#000000',
                fontSize: '13px',
                fontWeight: 600,
                padding: '11px 22px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              Update password
            </button>
          </form>
        </div>

        {/* ---------------- 02 Connected accounts. ---------------- */}
        <div id="section-connected" style={{ scrollMarginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', marginRight: '10px', fontFamily: 'monospace' }}>02</span>
            <h2 className="font-serif" style={{ fontSize: '28px', fontWeight: 400, color: '#ffffff' }}>
              Connected accounts.
            </h2>
          </div>

          <div style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Check size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              <span style={{ fontSize: '14.5px', fontWeight: 500, color: '#ffffff' }}>Google</span>
            </div>
            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)' }}>Linked</span>
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '8px' }}>
            Unlinking social logins isn't currently supported in-app. Contact hi@8raise.com if needed.
          </p>
        </div>

        {/* ---------------- 03 Plan & Billing. ---------------- */}
        <div id="section-billing" style={{ scrollMarginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', marginRight: '10px', fontFamily: 'monospace' }}>03</span>
            <h2 className="font-serif" style={{ fontSize: '28px', fontWeight: 400, color: '#ffffff' }}>
              Subscription &amp; Billing.
            </h2>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600 }}>
                  CURRENT SUBSCRIPTION
                </span>
                <h3 className="font-serif" style={{ fontSize: '30px', fontWeight: 400, color: '#ffffff', marginTop: '4px' }}>
                  {userAccount?.plan_tier === 'free_trial' ? 'Free Trial.' : `${userAccount?.plan_tier?.toUpperCase()}.`}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                  10 free Sparks + 25 free Agent messages included on signup.
                </p>
              </div>

              <button
                onClick={openPricingModal}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Choose a plan
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '10px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Monthly Sparks Allowance</span>
                  <strong style={{ color: '#ffffff' }}>{sparksUsed.toFixed(1)} / {sparksTotal.toFixed(0)} used</strong>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (sparksUsed / sparksTotal) * 100)}%`, background: '#e2b774' }} />
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '10px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>ADDY Agent Messages</span>
                  <strong style={{ color: '#ffffff' }}>{userAccount?.addy_messages_balance ?? 25} remaining</strong>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '80%', background: '#ffffff' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 04 Team Seats. ---------------- */}
        <div id="section-team" style={{ scrollMarginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', marginRight: '10px', fontFamily: 'monospace' }}>04</span>
            <h2 className="font-serif" style={{ fontSize: '28px', fontWeight: 400, color: '#ffffff' }}>
              Team Seats &amp; Collaboration.
            </h2>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '28px' }}>
            {/* Workspace Name Input */}
            <form onSubmit={handleSaveWorkspaceName} style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.45)', marginBottom: '8px' }}>
                WORKSPACE NAME
              </label>
              <div style={{ display: 'flex', gap: '12px', maxWidth: '460px' }}>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    padding: '9px 14px',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '0 16px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer'
                  }}
                >
                  {workspaceSaved ? 'Saved' : 'Save'}
                </button>
              </div>
            </form>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                Add teammates to your workspace for $20/seat/mo to share one credit pool and saved investor lists.
              </p>
            </div>

            <form onSubmit={handleAddTeammate} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <input
                type="email"
                placeholder="teammate@company.com"
                value={teammateEmail}
                onChange={(e) => setTeammateEmail(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  padding: '11px 14px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '0 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={14} /> Add Teammate ($20/mo)
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {teamMembers.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{m.email}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: m.role === 'Owner' ? '#ffffff' : 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '4px' }}>
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------------- 05 Integrations & MCP. ---------------- */}
        <div id="section-integrations" style={{ scrollMarginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', marginRight: '10px', fontFamily: 'monospace' }}>05</span>
            <h2 className="font-serif" style={{ fontSize: '28px', fontWeight: 400, color: '#ffffff' }}>
              Integrations &amp; Export.
            </h2>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Globe size={20} style={{ color: '#ffffff' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>
                Claude Desktop &amp; MCP Integration
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
              Advibe runs a native Model Context Protocol (MCP) server so you can query your catalog directly from Claude Desktop or ChatGPT Actions.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '14px', fontSize: '13px', fontFamily: 'monospace', color: '#ffffff', marginBottom: '24px' }}>
              http://localhost:8000/mcp/v1
            </div>

            {/* Additional CRM Integrations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#ffffff' }}>HubSpot CRM</div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                    {integrations.hubspot ? '✓ Connected · Syncing leads to deals' : 'Sync leads to deals'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !integrations.hubspot;
                    setIntegrations(prev => ({ ...prev, hubspot: next }));
                    showToast(next ? 'HubSpot CRM connected successfully!' : 'HubSpot CRM disconnected.');
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: integrations.hubspot ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.1)',
                    color: integrations.hubspot ? '#4ade80' : '#fff',
                    borderRadius: '4px',
                    border: integrations.hubspot ? '1px solid rgba(74,222,128,0.3)' : 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {integrations.hubspot ? 'Connected ✓' : 'Connect'}
                </button>
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#ffffff' }}>Salesforce</div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                    {integrations.salesforce ? '✓ Connected · Exporting investor contacts' : 'Export investor contacts'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !integrations.salesforce;
                    setIntegrations(prev => ({ ...prev, salesforce: next }));
                    showToast(next ? 'Salesforce integration activated!' : 'Salesforce disconnected.');
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: integrations.salesforce ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.1)',
                    color: integrations.salesforce ? '#4ade80' : '#fff',
                    borderRadius: '4px',
                    border: integrations.salesforce ? '1px solid rgba(74,222,128,0.3)' : 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {integrations.salesforce ? 'Connected ✓' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 06 API Keys. ---------------- */}
        <div id="section-api" style={{ scrollMarginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', marginRight: '10px', fontFamily: 'monospace' }}>06</span>
            <h2 className="font-serif" style={{ fontSize: '28px', fontWeight: 400, color: '#ffffff' }}>
              Secret API Keys.
            </h2>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '28px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
              Use this key to authenticate REST API requests, custom Python scripts, or automated workflows.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input
                type="text"
                readOnly
                value={apiKey}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  padding: '11px 14px',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontFamily: 'monospace'
                }}
              />
              <button
                onClick={copyApiKey}
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '0 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {keyCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>{keyCopied ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>

            <button
              onClick={regenerateApiKey}
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={12} /> Regenerate key
            </button>
          </div>
        </div>

        {/* ---------------- 07 Preferences & Notifications. ---------------- */}
        <div id="section-preferences" style={{ scrollMarginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', marginRight: '10px', fontFamily: 'monospace' }}>07</span>
            <h2 className="font-serif" style={{ fontSize: '28px', fontWeight: 400, color: '#ffffff' }}>
              Preferences &amp; Notifications.
            </h2>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { label: 'Email digest on new matching investors', desc: 'Receive instant notifications when new investors match your filter criteria.', state: emailAlerts, setState: setEmailAlerts },
              { label: 'Enrichment job completion alerts', desc: 'Get notified when bulk lead enrichment tasks finish running.', state: enrichmentAlerts, setState: setEnrichmentAlerts },
              { label: 'Weekly campaign performance summary', desc: 'Summary of email opens, responses, and investor interactions.', state: weeklyDigest, setState: setWeeklyDigest },
              { label: 'Product updates and feature releases', desc: 'Occasional announcements about new features in Advibe.', state: marketingEmails, setState: setMarketingEmails }
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: idx < 3 ? '16px' : '0', borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{item.desc}</div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => item.setState(!item.state)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: item.state ? '#ffffff' : 'rgba(255,255,255,0.15)',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: item.state ? '#000000' : '#ffffff',
                    position: 'absolute',
                    top: '3px',
                    left: item.state ? '23px' : '3px',
                    transition: 'left 0.2s ease'
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- 08 Danger Zone. ---------------- */}
        <div id="section-danger" style={{ scrollMarginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', color: 'rgba(248, 113, 113, 0.5)', marginRight: '10px', fontFamily: 'monospace' }}>08</span>
            <h2 className="font-serif" style={{ fontSize: '28px', fontWeight: 400, color: '#f87171' }}>
              Danger Zone.
            </h2>
          </div>

          <div style={{ background: 'rgba(248, 113, 113, 0.04)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '10px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Delete Saved Searches &amp; History</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Permanently clear all saved investor filters, lead enrichment lists, and conversation logs.</div>
              </div>
              <button
                onClick={() => {
                  showToast('Workspace search history and conversation cache cleared.');
                }}
                style={{
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#f87171',
                  background: 'rgba(248, 113, 113, 0.1)',
                  border: '1px solid rgba(248, 113, 113, 0.25)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Clear History
              </button>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(248, 113, 113, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f87171' }}>Delete Workspace &amp; Account</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Permanently delete your account, workspace seats, and terminate active subscriptions.</div>
              </div>
              <button
                onClick={() => {
                  showToast('Account cancellation request noted.');
                }}
                style={{
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}



import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Mail, ShieldCheck, ExternalLink, Key, Unlink } from 'lucide-react';
import { getCampaigns, sendOutreach, getHeyReachStatus, connectHeyReach, disconnectHeyReach } from '../lib/api';

export default function OutreachView({ userAccount, refreshUserAccount }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // HeyReach Integration State
  const [heyreachConnected, setHeyreachConnected] = useState(null); // null = checking
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [connectingHeyreach, setConnectingHeyreach] = useState(false);
  const [heyreachError, setHeyreachError] = useState('');

  const checkHeyReach = async () => {
    try {
      const res = await getHeyReachStatus();
      setHeyreachConnected(Boolean(res?.connected));
    } catch (err) {
      setHeyreachConnected(false);
    }
  };

  const handleConnectHeyReach = async (e) => {
    if (e) e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setConnectingHeyreach(true);
    setHeyreachError('');
    try {
      const res = await connectHeyReach(apiKeyInput.trim());
      if (res.connected) {
        setHeyreachConnected(true);
        setApiKeyInput('');
        loadData();
      }
    } catch (err) {
      setHeyreachError(err.message || 'Invalid HeyReach API Key or connection failed.');
    } finally {
      setConnectingHeyreach(false);
    }
  };

  const handleDisconnectHeyReach = async () => {
    if (!window.confirm('Disconnect your HeyReach integration?')) return;
    try {
      await disconnectHeyReach();
      setHeyreachConnected(false);
    } catch (err) {
      alert(err.message || 'Failed to disconnect');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const companyId = userAccount?.id || '00000000-0000-0000-0000-000000000001';
      const data = await getCampaigns(companyId);
      setCampaigns(data || []);
      if (data && data.length > 0 && !expandedCampaignId) {
        setExpandedCampaignId(data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHeyReach();
    loadData();
  }, []);

  const handleApprove = async (campaignId, messageId) => {
    // Local approve state update
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          messages: (c.messages || []).map((m) =>
            m.id === messageId ? { ...m, status: 'approved' } : m
          )
        };
      })
    );
  };

  const handleSendApproved = async (campaignId) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    const approvedMessageIds = (campaign.messages || [])
      .filter((m) => m.status === 'approved')
      .map((m) => m.id);

    if (approvedMessageIds.length === 0) {
      alert('No approved messages to send. Please approve at least one draft first.');
      return;
    }

    setActionLoading(true);
    setSendResult(null);
    try {
      const result = await sendOutreach(campaignId, approvedMessageIds);
      setSendResult(result);
      if (refreshUserAccount) refreshUserAccount();
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to dispatch approved emails');
    } finally {
      setActionLoading(false);
    }
  };

  if (heyreachConnected === false) {
    return (
      <div style={{ maxWidth: '680px', margin: '40px auto', width: '100%', padding: '0 16px' }}>
        <div style={{
          background: 'rgba(20,20,20,0.75)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '14px',
          padding: '36px',
          backdropFilter: 'blur(20px)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'rgba(226, 183, 116, 0.1)',
            border: '1px solid rgba(226, 183, 116, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#e2b774'
          }}>
            <Key size={26} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
            Connect to HeyReach
          </h2>
          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.5', maxWidth: '480px', margin: '0 auto 24px' }}>
            Advibe pairs your curated investor targets directly with your LinkedIn outreach sequences. Enter your HeyReach API key to connect your account.
          </p>

          {heyreachError && (
            <div style={{
              padding: '10px 14px',
              marginBottom: '20px',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '12.5px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={15} />
              {heyreachError}
            </div>
          )}

          <form onSubmit={handleConnectHeyReach} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                HeyReach API Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="e.g. hr_live_sk_..."
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={connectingHeyreach || !apiKeyInput.trim()}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                background: apiKeyInput.trim() ? '#ffffff' : 'rgba(255,255,255,0.1)',
                color: apiKeyInput.trim() ? '#000000' : 'rgba(255,255,255,0.4)',
                cursor: apiKeyInput.trim() && !connectingHeyreach ? 'pointer' : 'default',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {connectingHeyreach ? 'Verifying with HeyReach API...' : 'Connect HeyReach Account →'}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>
            🔒 <strong>Enterprise Invariant:</strong> Key is validated against <code>api.heyreach.io/api/public/auth/CheckApiKey</code> and encrypted at rest with Fernet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
      {/* HeyReach Connected Banner */}
      <div style={{
        marginBottom: '20px',
        background: 'rgba(74, 222, 128, 0.05)',
        border: '1px solid rgba(74, 222, 128, 0.2)',
        borderRadius: '10px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} style={{ color: '#4ade80' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
              HeyReach Connected & Synchronized
            </div>
            <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
              Outreach sequences active on LinkedIn via encrypted credentials
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href="https://app.heyreach.io"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#ffffff',
              color: '#000000',
              fontSize: '12px',
              fontWeight: 600,
              padding: '7px 14px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Launch HeyReach Web App</span>
            <ExternalLink size={12} />
          </a>

          <button
            onClick={handleDisconnectHeyReach}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '12px',
              fontWeight: 500,
              padding: '7px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Unlink size={12} />
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      <div style={{
        background: 'rgba(20,20,20,0.65)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: '#4ade80' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                Human-In-The-Loop Outreach Campaign Manager
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Non-negotiable invariant: Zero autonomous sending. Every message is drafted for your review and requires explicit approval before Resend API dispatch.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            marginBottom: '16px',
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '6px',
            color: '#f87171',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {sendResult && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            background: 'rgba(74,222,128,0.1)',
            border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: '6px',
            color: '#4ade80',
            fontSize: '13px'
          }}>
            <strong>Dispatch Completed:</strong> {sendResult.sent_count} sent, {sendResult.failed_count} failed. Sparks deducted only on successful delivery.
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            Loading outreach campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px dashed rgba(255,255,255,0.08)'
          }}>
            <Mail size={32} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>No Active Outreach Campaigns</h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', maxWidth: '400px', margin: '4px auto 0' }}>
              Create your first outreach campaign by asking ADDY to draft messages or selecting contacts in New Search.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {campaigns.map((camp) => {
              const isExpanded = expandedCampaignId === camp.id;
              const messages = camp.messages || [];
              const approvedCount = messages.filter((m) => m.status === 'approved').length;
              const draftCount = messages.filter((m) => m.status === 'draft').length;
              const sentCount = messages.filter((m) => m.status === 'sent').length;

              return (
                <div
                  key={camp.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Campaign Header Row */}
                  <div
                    onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ fontSize: '14px', color: '#ffffff' }}>{camp.name}</strong>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: camp.status === 'active' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                          color: camp.status === 'active' ? '#4ade80' : 'rgba(255,255,255,0.6)',
                          textTransform: 'capitalize'
                        }}>
                          {camp.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', marginTop: '4px', fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
                        <span>Total: {messages.length}</span>
                        <span style={{ color: '#e2b774' }}>Draft: {draftCount}</span>
                        <span style={{ color: '#60a5fa' }}>Approved: {approvedCount}</span>
                        <span style={{ color: '#4ade80' }}>Sent: {sentCount}</span>
                        {camp.interested_count > 0 && (
                          <span style={{ color: '#4ade80', fontWeight: 600 }}>🔥 {camp.interested_count} Interested</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {approvedCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendApproved(camp.id);
                          }}
                          disabled={actionLoading}
                          style={{
                            padding: '6px 14px',
                            fontSize: '12px',
                            background: '#4ade80',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <Send size={13} />
                          Dispatch {approvedCount} Approved
                        </button>
                      )}
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded Messages List */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 18px' }}>
                      {messages.length === 0 ? (
                        <div style={{ padding: '20px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12.5px' }}>
                          No messages in this campaign yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              style={{
                                padding: '12px 14px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <strong style={{ fontSize: '13px', color: '#ffffff' }}>{msg.recipient_name}</strong>
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                      ({msg.firm_name})
                                    </span>
                                    <span style={{
                                      fontSize: '10px',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 600,
                                      background:
                                        msg.status === 'sent' ? 'rgba(74,222,128,0.15)' :
                                        msg.status === 'approved' ? 'rgba(96,165,250,0.15)' :
                                        'rgba(226,183,116,0.15)',
                                      color:
                                        msg.status === 'sent' ? '#4ade80' :
                                        msg.status === 'approved' ? '#60a5fa' :
                                        '#e2b774'
                                    }}>
                                      {msg.status.toUpperCase()}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '3px', fontWeight: 500 }}>
                                    Subject: {msg.subject}
                                  </div>
                                </div>

                                {msg.status === 'draft' && (
                                  <button
                                    onClick={() => handleApprove(camp.id, msg.id)}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '11px',
                                      background: 'rgba(74,222,128,0.15)',
                                      border: '1px solid rgba(74,222,128,0.3)',
                                      borderRadius: '4px',
                                      color: '#4ade80',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <CheckCircle2 size={12} />
                                    Approve
                                  </button>
                                )}
                              </div>

                              <p style={{
                                fontSize: '12px',
                                color: 'rgba(255,255,255,0.65)',
                                lineHeight: '1.45',
                                marginTop: '6px',
                                background: 'rgba(255,255,255,0.02)',
                                padding: '8px',
                                borderRadius: '4px',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {msg.body}
                              </p>

                              {msg.outcome && (
                                <div style={{
                                  marginTop: '8px',
                                  padding: '6px 10px',
                                  background: 'rgba(74,222,128,0.08)',
                                  border: '1px solid rgba(74,222,128,0.2)',
                                  borderRadius: '4px',
                                  fontSize: '11.5px',
                                  color: '#4ade80'
                                }}>
                                  <strong>Reply Outcome:</strong> {msg.outcome.outcome_type}
                                  {msg.outcome.reply_text && ` — "${msg.outcome.reply_text}"`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

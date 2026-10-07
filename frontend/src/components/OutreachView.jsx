import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Mail, ShieldCheck } from 'lucide-react';
import { getCampaigns, sendOutreach } from '../lib/api';

export default function OutreachView({ userAccount, refreshUserAccount }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // In development, company ID is user-scoped
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

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
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

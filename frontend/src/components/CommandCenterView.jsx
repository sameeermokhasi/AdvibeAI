import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, CheckCircle, Clock, Plus, RefreshCw, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { getCommandCenter, recordCommitment } from '../lib/api';
import { formatMoney, convertUSDToINR, subscribeCurrency, getActiveCurrency } from '../lib/money';

export default function CommandCenterView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCommitmentModal, setShowCommitmentModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // New commitment form
  const [investorName, setInvestorName] = useState('');
  const [amount, setAmount] = useState('');
  const [commitmentStatus, setCommitmentStatus] = useState('soft_circle');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCommandCenter();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load command center');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecord = async (e) => {
    e.preventDefault();
    if (!investorName || !amount) return;
    setSaving(true);
    try {
      await recordCommitment({
        investor_name: investorName,
        amount: parseFloat(amount),
        status: commitmentStatus,
        notes: notes || undefined
      });
      setInvestorName('');
      setAmount('');
      setNotes('');
      setShowCommitmentModal(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to record commitment');
    } finally {
      setSaving(false);
    }
  };

  const [currentCurrency, setCurrentCurrency] = useState(getActiveCurrency());

  useEffect(() => {
    return subscribeCurrency((curr) => setCurrentCurrency(curr));
  }, []);

  const targetUSD = data?.raise_target || 2000000;
  const committedUSD = data?.total_committed || 0;
  const softUSD = data?.soft_circles || 0;
  const progressPercent = Math.min(100, Math.round(((committedUSD + softUSD) / (targetUSD || 1)) * 100));

  const totalRaisedINR = convertUSDToINR(committedUSD + softUSD);
  const targetINR = convertUSDToINR(targetUSD);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
      <div style={{
        background: 'rgba(20,20,20,0.65)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} style={{ color: '#4ade80' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                Fundraising Command Center
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Real-time capital progress, active pipeline conversion, and verified investor activity timeline.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
            <button
              onClick={() => setShowCommitmentModal(true)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                background: '#4ade80',
                border: 'none',
                borderRadius: '6px',
                color: '#000000',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Plus size={14} />
              Record Commitment
            </button>
          </div>
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

        {/* Target Progress Bar */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                Round Capital Progress
              </span>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {formatMoney(totalRaisedINR, currentCurrency, { compact: true })}{' '}
                <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>
                  / {formatMoney(targetINR, currentCurrency, { compact: true })} Target
                </span>
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#4ade80' }}>
              {progressPercent}%
            </div>
          </div>

          <div style={{
            height: '10px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '5px',
            overflow: 'hidden',
            display: 'flex'
          }}>
            <div style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #4ade80, #60a5fa)',
              borderRadius: '5px',
              transition: 'width 0.4s ease'
            }} />
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
              Self-Reported Commitments & Soft Circles
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60a5fa' }} />
              Active Partner Pipeline
            </span>
          </div>
        </div>

        {/* Pipeline Stage Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Contacted', value: data?.pipeline?.contacted || 0, color: '#94a3b8' },
            { label: 'Replied', value: data?.pipeline?.replied || 0, color: '#60a5fa', rate: data?.response_rate },
            { label: 'Meetings Booked', value: data?.pipeline?.meetings || 0, color: '#e2b774', rate: data?.meeting_rate },
            { label: 'Committed / Circles', value: data?.commitments?.length || 0, color: '#4ade80' },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '16px'
              }}
            >
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color, marginTop: '4px' }}>
                {stat.value}
              </div>
              {stat.rate && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {stat.rate} conversion
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Activity Timeline */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
            Recent Outreach & Reply Events
          </h3>
          {(!data?.recent_activity || data.recent_activity.length === 0) ? (
            <div style={{
              textAlign: 'center',
              padding: '30px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '6px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '12.5px'
            }}>
              No recorded events yet. Activity updates automatically when you dispatch campaigns or receive replies.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.recent_activity.map((act, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '6px',
                    fontSize: '12.5px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      background:
                        act.event === 'meeting_requested' ? 'rgba(74,222,128,0.15)' :
                        act.event === 'replied' ? 'rgba(96,165,250,0.15)' :
                        'rgba(255,255,255,0.06)',
                      color:
                        act.event === 'meeting_requested' ? '#4ade80' :
                        act.event === 'replied' ? '#60a5fa' :
                        'rgba(255,255,255,0.6)'
                    }}>
                      {act.event.toUpperCase()}
                    </span>
                    <span style={{ color: '#ffffff' }}>
                      {act.partner_name} ({act.firm_name})
                    </span>
                    {act.subject && (
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11.5px' }}>
                        · {act.subject}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: act.source === 'provider' ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
                    color: act.source === 'provider' ? '#4ade80' : 'rgba(255,255,255,0.4)'
                  }}>
                    {act.source === 'provider' ? 'Provider Confirmed' : 'Self Reported'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commitment Modal */}
        {showCommitmentModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}>
            <form onSubmit={handleRecord} style={{
              background: '#161616',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
                Record Round Commitment
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  Investor / Firm Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Chen · Bellwether Capital"
                  value={investorName}
                  onChange={(e) => setInvestorName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                    Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    placeholder="250000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '13px',
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      outline: 'none'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    value={commitmentStatus}
                    onChange={(e) => setCommitmentStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '13px',
                      background: '#111111',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      outline: 'none'
                    }}
                  >
                    <option value="soft_circle">Soft Circle</option>
                    <option value="verbal">Verbal Agreement</option>
                    <option value="term_sheet">Term Sheet Signed</option>
                    <option value="committed">Committed (SAFE)</option>
                    <option value="closed">Wired / Closed</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  Notes / Conditions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Depends on finding lead investor"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCommitmentModal(false)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    background: '#4ade80',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#000000',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {saving ? 'Recording...' : 'Record Commitment'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

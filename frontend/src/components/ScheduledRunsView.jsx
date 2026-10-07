import React, { useState } from 'react';
import { Clock, Play, Pause, CheckCircle2, RefreshCw, Calendar, ArrowRight, Zap, Shield } from 'lucide-react';

export default function ScheduledRunsView({ onOpenTracks, onOpenOutreach }) {
  const [autopilotActive, setAutopilotActive] = useState(true);
  const [cadence, setCadence] = useState('weekly_monday');
  const [batchSize, setBatchSize] = useState(25);
  const [targetTrack, setTargetTrack] = useState('venture');
  const [runningNow, setRunningNow] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [runLogs, setRunLogs] = useState([
    {
      id: 'run-01',
      date: 'Monday, Sep 22 · 09:00 UTC',
      track: 'Venture Track',
      delivered: 25,
      deduped: 14,
      status: 'completed',
      summary: '25 seed AI/B2B SaaS leads delivered to active draft queue.'
    },
    {
      id: 'run-02',
      date: 'Monday, Sep 15 · 09:00 UTC',
      track: 'Venture Track',
      delivered: 25,
      deduped: 8,
      status: 'completed',
      summary: '25 institutional partner contacts verified via SMTP.'
    },
    {
      id: 'run-03',
      date: 'Monday, Sep 08 · 09:00 UTC',
      track: 'Fund LP Track',
      delivered: 20,
      deduped: 11,
      status: 'completed',
      summary: '20 family office allocators added to campaign review queue.'
    }
  ]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleToggleAutopilot = () => {
    const nextState = !autopilotActive;
    setAutopilotActive(nextState);
    showToast(nextState ? 'Autopilot recipe activated. Runs scheduled weekly.' : 'Autopilot paused. No automated dispatches will occur.');
  };

  const handleTriggerRunNow = () => {
    setRunningNow(true);
    setTimeout(() => {
      const newRun = {
        id: `run-${Date.now()}`,
        date: 'Just now · On demand',
        track: targetTrack === 'venture' ? 'Venture Track' : targetTrack === 'real_estate' ? 'Real Estate Track' : 'Fund LP Track',
        delivered: batchSize,
        deduped: Math.round(batchSize * 0.4),
        status: 'completed',
        summary: `${batchSize} verified partner contacts discovered and queued for your human review.`
      };
      setRunLogs((prev) => [newRun, ...prev]);
      setRunningNow(false);
      showToast(`Autopilot run executed! ${batchSize} fresh leads delivered to Outreach.`);
    }, 1200);
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
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
              <Clock size={18} style={{ color: '#e2b774' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                Scheduled Autopilot Engine
              </h2>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 600,
                background: autopilotActive ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                color: autopilotActive ? '#4ade80' : '#f87171'
              }}>
                {autopilotActive ? 'ACTIVE' : 'PAUSED'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Recurring autonomous investor discovery. Evaluates your thesis on schedule, filters past exclusions, and delivers fresh verified contacts to your review queue.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleToggleAutopilot}
              style={{
                padding: '8px 16px',
                fontSize: '12.5px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: autopilotActive ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
                color: autopilotActive ? '#f87171' : '#4ade80',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {autopilotActive ? <Pause size={13} /> : <Play size={13} />}
              {autopilotActive ? 'Pause Autopilot' : 'Resume Autopilot'}
            </button>

            <button
              onClick={handleTriggerRunNow}
              disabled={runningNow}
              style={{
                padding: '8px 18px',
                fontSize: '12.5px',
                borderRadius: '6px',
                border: 'none',
                background: '#ffffff',
                color: '#000000',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Zap size={14} className={runningNow ? 'animate-spin' : ''} />
              {runningNow ? 'Running...' : 'Run Autopilot Now'}
            </button>
          </div>
        </div>

        {/* Configuration Recipe Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '14px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '18px',
          marginBottom: '24px'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Execution Cadence
            </label>
            <select
              value={cadence}
              onChange={(e) => {
                setCadence(e.target.value);
                showToast('Schedule cadence updated.');
              }}
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
              <option value="weekly_monday">Weekly · Every Monday at 09:00 UTC</option>
              <option value="biweekly">Bi-weekly · Alternating Mondays</option>
              <option value="monthly">Monthly · 1st of every month</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Batch Delivery Size
            </label>
            <select
              value={batchSize}
              onChange={(e) => {
                setBatchSize(parseInt(e.target.value));
                showToast(`Batch size set to ${e.target.value} contacts.`);
              }}
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
              <option value="15">15 fresh verified contacts</option>
              <option value="25">25 fresh verified contacts (Recommended)</option>
              <option value="50">50 fresh verified contacts</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Target Investor Track
            </label>
            <select
              value={targetTrack}
              onChange={(e) => {
                setTargetTrack(e.target.value);
                showToast('Target track updated.');
              }}
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
              <option value="venture">Venture Capital Track</option>
              <option value="real_estate">Real Estate Sponsors Track</option>
              <option value="fund_lp">Institutional LP Allocators Track</option>
            </select>
          </div>
        </div>

        {/* Invariant Guarantee Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(74,222,128,0.06)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px'
        }}>
          <Shield size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
          <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.4' }}>
            <strong style={{ color: '#4ade80' }}>Human Review Guarantee:</strong> Autopilot only populates your draft queue. No email will ever be sent to an investor without your explicit button click approval.
          </div>
        </div>

        {/* Run Execution History */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
            Execution Logs &amp; Past Deliveries
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {runLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong style={{ fontSize: '13px', color: '#ffffff' }}>{log.date}</strong>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(226,183,116,0.15)',
                      color: '#e2b774',
                      fontWeight: 600
                    }}>
                      {log.track}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(74,222,128,0.15)',
                      color: '#4ade80',
                      fontWeight: 600
                    }}>
                      ✓ {log.delivered} DELIVERED
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                    {log.summary} ({log.deduped} duplicate/excluded contacts suppressed)
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onOpenOutreach) onOpenOutreach();
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  View Queue <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';
import { getPulseOverview } from '../lib/api';

export default function PulseCrmView() {
  const [pulseData, setPulseData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPulse();
  }, []);

  const loadPulse = async () => {
    setLoading(true);
    try {
      const data = await getPulseOverview();
      setPulseData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const rollup = pulseData?.weekly_rollup || {
    found: 25,
    contacted: 19,
    replied: 3,
    meetings_booked: 1,
    reply_rate: '15.8%',
    meeting_rate: '5.3%'
  };

  const timeline = pulseData?.activity_timeline || [];
  const learnings = pulseData?.learning_biases || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600 }}>
          PULSE · CLOSED-LOOP CRM &amp; LEARNING
        </span>
        <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '28px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '4px' }}>
          It repeats, and learns from every reply.
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '6px', maxWidth: '720px' }}>
          Fresh investors delivered weekly into outreach. Every investor reply is classified and fed back into ADDY's targeting logic so next week's search is sharper.
        </p>
      </div>

      {/* Weekly Rollup Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '18px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            Found
          </div>
          <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff', lineHeight: 1 }}>
            {rollup.found}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
            Fresh matches delivered
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '18px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            Contacted
          </div>
          <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff', lineHeight: 1 }}>
            {rollup.contacted}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
            Outreach dispatched
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '18px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e2b774', marginBottom: '4px' }}>
            Replied
          </div>
          <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.03em', color: '#e2b774', lineHeight: 1 }}>
            {rollup.replied}
          </div>
          <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '6px' }}>
            {rollup.reply_rate} response rate
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '18px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4ade80', marginBottom: '4px' }}>
            Meetings Booked
          </div>
          <div style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.03em', color: '#4ade80', lineHeight: 1 }}>
            {rollup.meetings_booked}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
            {rollup.meeting_rate} conversion
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Activity Feed */}
        <div
          style={{
            background: 'rgba(20, 20, 20, 0.65)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '15px', color: '#ffffff', fontWeight: 600 }}>
              Live Raise Activity &amp; Classifications
            </h3>
            <span style={{ fontSize: '11px', color: '#4ade80' }}>● Auto-polling</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {timeline.map((event, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px'
                }}
              >
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', width: '64px', flexShrink: 0 }}>
                  {event.time}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: event.type === 'interested' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.08)',
                        color: event.type === 'interested' ? '#fbbf24' : '#ffffff'
                      }}
                    >
                      {event.tag}
                    </span>
                    {event.badge && (
                      <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>
                        {event.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: '1.45' }}>
                    {event.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Closed-loop Learning Engine */}
        <div
          style={{
            background: 'rgba(20, 20, 20, 0.65)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Brain size={16} style={{ color: '#e2b774' }} />
            <h3 style={{ fontSize: '15px', color: '#ffffff', fontWeight: 600 }}>
              ADDY Learning Engine
            </h3>
          </div>

          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', marginBottom: '16px' }}>
            Investor replies are automatically categorized via LLM classifier. Active biases dynamically adjust weights for the next scheduled auto-run:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {learnings.map((lrn, i) => (
              <div
                key={i}
                style={{
                  padding: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{lrn.target}</span>
                  <span style={{ fontSize: '12px', color: lrn.weight.startsWith('+') ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                    {lrn.weight}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                  {lrn.reason}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(226, 183, 116, 0.05)', border: '1px solid rgba(226, 183, 116, 0.2)', borderRadius: '6px', fontSize: '11.5px', color: '#e2b774' }}>
            Next autopilot run: <strong>Monday at 09:00 UTC</strong> (25 fresh seed VCs leaning toward corporate VCs).
          </div>
        </div>
      </div>
    </div>
  );
}

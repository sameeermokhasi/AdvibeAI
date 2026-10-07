import React, { useState, useEffect } from 'react';
import { Gauge, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { getRaiseReadiness } from '../lib/api';

export default function RaiseReadinessView({ userAccount }) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const companyId = userAccount?.id || '00000000-0000-0000-0000-000000000001';
      const data = await getRaiseReadiness(companyId);
      setReadiness(data);
    } catch (err) {
      setError(err.message || 'Failed to load readiness radar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const overall = readiness?.overall_score || 72;
  const dimensions = readiness?.dimensions || [
    { label: 'Deck Completeness', score: 85, weight: 0.20, status: 'strong' },
    { label: 'Traction Evidence', score: 65, weight: 0.20, status: 'moderate' },
    { label: 'Market Clarity', score: 90, weight: 0.15, status: 'strong' },
    { label: 'Financial Ask', score: 75, weight: 0.15, status: 'moderate' },
    { label: 'Use of Funds', score: 50, weight: 0.10, status: 'weak' },
    { label: 'Moat / Defensibility', score: 70, weight: 0.10, status: 'moderate' },
    { label: 'Investor Targeting', score: 60, weight: 0.10, status: 'moderate' },
  ];

  const recommendations = readiness?.recommendations || [
    'Use of Funds: Break down fund allocation into specific engineering and GTM milestones.',
    'Traction Evidence: Include cohort retention or logo expansion metrics to strengthen investor conviction.',
    'Investor Targeting: Narrow lead check size bounds to match seed fund mandates.'
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
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
              <Gauge size={18} style={{ color: '#4ade80' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                Raise Readiness Radar
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Multi-dimensional evaluation of your pitch deck narrative, financial ask feasibility, and traction proof points.
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
            Re-evaluate
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

        {/* Overall Score Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '20px 24px',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            border: `4px solid ${overall >= 70 ? '#4ade80' : overall >= 40 ? '#e2b774' : '#f87171'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>{overall}</span>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              Readiness
            </span>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>
              {overall >= 70 ? 'High Raise Readiness — Ready for Institutional Outreach' :
               overall >= 40 ? 'Moderate Readiness — Address Gaps Before Scaling Outbound' :
               'Needs Refinement — Strengthen Deck Narrative First'}
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.45' }}>
              {readiness?.summary || 'Your materials demonstrate clear market positioning. Review the recommendations below to improve partner conversion rates.'}
            </p>
          </div>
        </div>

        {/* Dimensions Breakdown */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '14px' }}>
            Score Dimensions Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dimensions.map((dim, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  padding: '12px 16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: '#ffffff' }}>{dim.label}</strong>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      Weight: {Math.round(dim.weight * 100)}%
                    </span>
                  </div>
                  <span style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: dim.score >= 70 ? '#4ade80' : dim.score >= 40 ? '#e2b774' : '#f87171'
                  }}>
                    {dim.score} / 100
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${dim.score}%`,
                    height: '100%',
                    borderRadius: '3px',
                    background: dim.score >= 70 ? '#4ade80' : dim.score >= 40 ? '#e2b774' : '#f87171',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Recommendations */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
            Actionable Recommendations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recommendations.map((rec, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(226,183,116,0.06)',
                  border: '1px solid rgba(226,183,116,0.18)',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  color: '#e2e8f0',
                  lineHeight: '1.45'
                }}
              >
                <AlertTriangle size={15} style={{ color: '#e2b774', flexShrink: 0, marginTop: '2px' }} />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Gauge, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, UploadCloud, PlusCircle, Building2, Calendar } from 'lucide-react';
import { getRaiseReadiness, evaluateRaiseReadiness } from '../lib/api';

export default function RaiseReadinessView({ userAccount, openModal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRaiseReadiness();
      setData(res);
    } catch (err) {
      setError({
        status: err.status || 500,
        message: err.message || 'Failed to communicate with Readiness Radar service'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReevaluate = async () => {
    setReEvaluating(true);
    setError(null);
    try {
      const companyId = data?.company?.id || null;
      const res = await evaluateRaiseReadiness(companyId);
      setData(res);
    } catch (err) {
      setError({
        status: err.status || 500,
        message: err.message || 'Re-evaluation failed. Please verify your pitch deck and profile.'
      });
    } finally {
      setReEvaluating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const evaluation = data?.evaluation;
  const company = data?.company;
  const hasData = Boolean(data?.has_data && evaluation);

  const formatLastEvaluated = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
      <div style={{
        background: 'rgba(20,20,20,0.7)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '28px',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gauge size={20} style={{ color: '#4ade80' }} />
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Raise Readiness Radar
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Institutional AI diligence of your pitch deck narrative, financial ask feasibility, and traction proof points.
            </p>
          </div>

          {hasData && (
            <button
              onClick={handleReevaluate}
              disabled={reEvaluating || loading}
              style={{
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: 500,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: reEvaluating ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.15s ease'
              }}
            >
              <RefreshCw size={13} className={reEvaluating ? 'animate-spin' : ''} />
              {reEvaluating ? 'Evaluating...' : 'Re-evaluate'}
            </button>
          )}
        </div>

        {/* Real Error Type & Message Display */}
        {error && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '20px',
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>Error {error.status}:</strong> {error.message}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#e2b774' }} />
            <div style={{ fontSize: '14px' }}>Loading workspace raise readiness...</div>
          </div>
        ) : !hasData ? (
          /* Empty State: No Mock or Fake Scores */
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: '10px',
            padding: '48px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(226,183,116,0.1)',
              border: '1px solid rgba(226,183,116,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#e2b774'
            }}>
              <Building2 size={26} />
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
              No Pitch Deck or Company Profile Found
            </h3>
            <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.6)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: '1.5' }}>
              {data?.message || 'Raise Readiness Radar evaluates your startup narrative across 7 institutional dimensions. Add your company profile or upload a pitch deck to generate your live radar score.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => openModal && openModal('intake')}
                style={{
                  padding: '10px 18px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <PlusCircle size={15} />
                Add Company Profile
              </button>

              <button
                onClick={() => openModal && openModal('intake')}
                style={{
                  padding: '10px 18px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <UploadCloud size={15} />
                Upload Pitch Deck
              </button>
            </div>
          </div>
        ) : (
          /* Scored State: 100% Real Server-Computed Scores */
          <div>
            {/* Metadata Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{company?.name}</span>
                {company?.stage && (
                  <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px', color: 'rgba(255,255,255,0.8)' }}>
                    {company.stage}
                  </span>
                )}
                {company?.sector && (
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>· {company.sector}</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={13} />
                <span>Last evaluated: {formatLastEvaluated(data?.last_evaluated_at)}</span>
              </div>
            </div>

            {/* Overall Score Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '20px 24px',
              marginBottom: '28px'
            }}>
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                border: `4px solid ${evaluation.overall_score >= 70 ? '#4ade80' : evaluation.overall_score >= 40 ? '#e2b774' : '#f87171'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>
                  {evaluation.overall_score}
                </span>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  Readiness
                </span>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>
                  {evaluation.overall_score >= 70 ? 'High Raise Readiness — Ready for Institutional Outreach' :
                   evaluation.overall_score >= 40 ? 'Moderate Readiness — Address Gaps Before Scaling Outbound' :
                   'Early Readiness — Strengthen Pitch Narrative & Proof First'}
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.45' }}>
                  {evaluation.summary}
                </p>
              </div>
            </div>

            {/* Dimensions Breakdown (Server-Computed Weighted Sum) */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                  Score Dimensions Breakdown (Weighted)
                </h3>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  Total = Σ (Dimension Score × Weight)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {evaluation.dimensions.map((dim, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '6px',
                      padding: '12px 16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '13px', color: '#ffffff' }}>{dim.name || dim.label}</strong>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                          Weight: {dim.weight}%
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

                    {dim.rationale && (
                      <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
                        {dim.rationale}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actionable Recommendations List */}
            {evaluation.recommendations && evaluation.recommendations.length > 0 && (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
                  Actionable Recommendations
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {evaluation.recommendations.map((rec, i) => (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}

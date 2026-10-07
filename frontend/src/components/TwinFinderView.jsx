import React, { useState } from 'react';
import { getTwinFinderComps, getTwinFinderFirms } from '../lib/api';

export default function TwinFinderView({ onTriggerResolve }) {
  const [brief, setBrief] = useState('An AI code-review tool for engineering teams. Raising seed in the US.');
  const [loading, setLoading] = useState(false);
  const [comparables, setComparables] = useState(null);
  const [firms, setFirms] = useState(null);
  const [selectedFirms, setSelectedFirms] = useState({});

  const handleDiscoverLookalikes = async (e) => {
    if (e) e.preventDefault();
    if (!brief.trim() || loading) return;

    setLoading(true);
    try {
      // Step 1: Comps (Free)
      const compRes = await getTwinFinderComps(brief);
      setComparables(compRes.comparables || []);

      // Step 2: Firms that funded them
      const firmRes = await getTwinFinderFirms(brief);
      setFirms(firmRes.firms || []);

      // Select all by default
      const initialSel = {};
      (firmRes.firms || []).forEach((f) => {
        initialSel[f.firm_name] = true;
      });
      setSelectedFirms(initialSel);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error running Twin Finder.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFirm = (name) => {
    setSelectedFirms((prev) => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const approvedCount = Object.values(selectedFirms).filter(Boolean).length;

  const handleApproveAndEnrich = () => {
    const approvedNames = Object.keys(selectedFirms).filter((k) => selectedFirms[k]);
    if (approvedNames.length === 0) {
      alert('Please select at least one firm to approve and resolve.');
      return;
    }
    if (onTriggerResolve) {
      onTriggerResolve(approvedNames.join('\n'));
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600 }}>
          TWIN FINDER · LOOKALIKE DISCOVERY
        </span>
        <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '28px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '4px' }}>
          No target list yet? Start from companies like yours.
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '6px', maxWidth: '720px' }}>
          Describe your raise in a sentence. Advibe maps the companies most like yours, identifies the investor firms that funded them at your stage, and verifies each is still writing checks.
        </p>
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleDiscoverLookalikes}
        style={{
          background: 'rgba(20, 20, 20, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '28px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>
            Describe your raise in one sentence
          </span>
          <span style={{ fontSize: '11px', color: '#4ade80' }}>
            ✓ Step 1 Comparable Map is Free
          </span>
        </div>

        <textarea
          rows={2}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. 'An AI code-review tool for engineering teams. Raising seed in the US.'"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '12px 14px',
            fontSize: '14px',
            color: '#ffffff',
            outline: 'none',
            resize: 'none',
            marginBottom: '14px'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'rgba(255,255,255,0.6)' }}>
              Startup
            </span>
            <span style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'rgba(255,255,255,0.6)' }}>
              Seed / Series A
            </span>
            <span style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'rgba(255,255,255,0.6)' }}>
              Fund
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !brief.trim()}
            className="btn btn-solid"
            style={{
              padding: '10px 22px',
              fontSize: '13px',
              background: '#ffffff',
              color: '#000000',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Analyzing Comparables...' : 'Find Lookalike Investors →'}
          </button>
        </div>
      </form>

      {/* Results View */}
      {comparables && firms && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Step 1: Comparables Section */}
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', color: '#ffffff', fontWeight: 600 }}>
                Step 1: {comparables.length} Comparable Companies Mapped
              </h3>
              <span style={{ fontSize: '11px', color: '#4ade80' }}>Free Analysis</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {comparables.map((comp) => (
                <div
                  key={comp.id}
                  style={{
                    padding: '14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: 600 }}>{comp.name}</span>
                    <span style={{ fontSize: '11px', color: '#e2b774' }}>{comp.funding_amount}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                    {comp.description}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                    Backed by: <strong>{comp.lead_investors.join(', ')}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Lookalike Investor Firms Section */}
          <div
            style={{
              background: 'rgba(20, 20, 20, 0.65)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600 }}>
                  Step 2: Investor Firms Backing Your Comparables
                </h3>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  Checked that each still writes checks at your stage. Select which firms to enrich.
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: '#e2b774', fontWeight: 600 }}>
                  {approvedCount} firms approved
                </span>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                  Cost: 0.25 Sparks / approved firm
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {firms.map((f) => {
                const isSelected = !!selectedFirms[f.firm_name];
                return (
                  <div
                    key={f.firm_name}
                    onClick={() => toggleFirm(f.firm_name)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px 1.4fr 1.2fr 100px 90px',
                      alignItems: 'center',
                      padding: '14px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      background: isSelected ? 'rgba(226, 183, 116, 0.04)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFirm(f.firm_name)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{f.firm_name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>{f.why_it_fits}</div>
                    <div style={{ color: '#4ade80', fontSize: '12px' }}>✓ {f.funded_stage}</div>
                    <div style={{ color: '#e2b774', fontWeight: 600, textAlign: 'right' }}>{f.score}% fit</div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Approval Footer */}
            <div
              style={{
                padding: '16px 20px',
                background: 'rgba(0,0,0,0.4)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                {approvedCount} firms approved · Sparks spent only on approved firms
              </span>

              <button
                className="btn btn-solid"
                style={{
                  padding: '10px 24px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={handleApproveAndEnrich}
              >
                Approve &amp; Enrich Partners in Resolve →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

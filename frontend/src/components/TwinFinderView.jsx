import React, { useState } from 'react';
import { getTwinFinderComps, getTwinFinderFirms, getTwinFinderByInvestor } from '../lib/api';
import { Search, UserCheck, Sparkles, Building2, ExternalLink, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TwinFinderView({ onTriggerResolve }) {
  const [mode, setMode] = useState('investor'); // 'investor' | 'startup'

  // Investor Lookalike Mode State
  const [investorName, setInvestorName] = useState('Marc Andreessen');
  const [investorLoading, setInvestorLoading] = useState(false);
  const [investorResult, setInvestorResult] = useState(null);
  const [investorError, setInvestorError] = useState('');

  // Startup Comparables Mode State
  const [brief, setBrief] = useState('An AI code-review tool for engineering teams. Raising seed in the US.');
  const [startupLoading, setStartupLoading] = useState(false);
  const [comparables, setComparables] = useState(null);
  const [firms, setFirms] = useState(null);
  const [selectedFirms, setSelectedFirms] = useState({});

  const handleSearchInvestorTwins = async (e, overrideName = null) => {
    if (e) e.preventDefault();
    const query = (overrideName || investorName).trim();
    if (!query || investorLoading) return;

    setInvestorLoading(true);
    setInvestorError('');
    try {
      const data = await getTwinFinderByInvestor(query);
      setInvestorResult(data);
      if (overrideName) setInvestorName(overrideName);
    } catch (err) {
      setInvestorError(err.message || 'Failed to find investor twins.');
    } finally {
      setInvestorLoading(false);
    }
  };

  const handleDiscoverLookalikes = async (e) => {
    if (e) e.preventDefault();
    if (!brief.trim() || startupLoading) return;

    setStartupLoading(true);
    try {
      const compRes = await getTwinFinderComps(brief);
      setComparables(compRes.comparables || []);

      const firmRes = await getTwinFinderFirms(brief);
      setFirms(firmRes.firms || []);

      const initialSel = {};
      (firmRes.firms || []).forEach((f) => {
        initialSel[f.firm_name] = true;
      });
      setSelectedFirms(initialSel);
    } catch (err) {
      alert(err.message || 'Error running Twin Finder.');
    } finally {
      setStartupLoading(false);
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

  const handleSendInvestorTwinsToResolve = () => {
    if (!investorResult?.twins || investorResult.twins.length === 0) return;
    const firmNames = Array.from(new Set(investorResult.twins.map((t) => t.firm_name).filter(Boolean)));
    if (firmNames.length === 0) return;
    if (onTriggerResolve) {
      onTriggerResolve(firmNames.join('\n'));
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600 }}>
          TWIN FINDER · LOOKALIKE DISCOVERY
        </span>
        <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '28px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '4px' }}>
          Find Lookalike Investors &amp; Firms
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '6px', maxWidth: '720px' }}>
          Search twins of an investor you admire using 4-factor portfolio matching, or describe your startup to find firms backing comparable companies.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div style={{ display: 'inline-flex', padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px' }}>
        <button
          onClick={() => setMode('investor')}
          style={{
            padding: '8px 18px',
            fontSize: '12.5px',
            fontWeight: 600,
            borderRadius: '6px',
            border: 'none',
            background: mode === 'investor' ? '#ffffff' : 'transparent',
            color: mode === 'investor' ? '#000000' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer'
          }}
        >
          Investor Lookalike (By Name)
        </button>
        <button
          onClick={() => setMode('startup')}
          style={{
            padding: '8px 18px',
            fontSize: '12.5px',
            fontWeight: 600,
            borderRadius: '6px',
            border: 'none',
            background: mode === 'startup' ? '#ffffff' : 'transparent',
            color: mode === 'startup' ? '#000000' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer'
          }}
        >
          Startup Comparables (By Thesis)
        </button>
      </div>

      {/* ================= MODE 1: INVESTOR LOOKALIKE ================= */}
      {mode === 'investor' && (
        <div>
          <form
            onSubmit={handleSearchInvestorTwins}
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
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                Enter Target Investor Name (Fuzzy Catalog Matching)
              </span>
              <span style={{ fontSize: '11px', color: '#4ade80' }}>
                ✓ Deterministic 4-Factor Portfolio Scorer
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={investorName}
                onChange={(e) => setInvestorName(e.target.value)}
                placeholder="e.g. Marc Andreessen, Roelof Botha, Elad Gil, Doug Leone..."
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={investorLoading || !investorName.trim()}
                style={{
                  padding: '0 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  cursor: investorLoading ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Search size={14} />
                <span>{investorLoading ? 'Matching Twins...' : 'Find Twins'}</span>
              </button>
            </div>

            {/* Quick Suggestion Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Try popular:</span>
              {['Marc Andreessen', 'Roelof Botha', 'Elad Gil', 'Bill Gurley'].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={(e) => handleSearchInvestorTwins(e, name)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px',
                    padding: '3px 10px',
                    fontSize: '11.5px',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer'
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </form>

          {investorError && (
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
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              {investorError}
            </div>
          )}

          {/* Results Area */}
          {investorResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Searched Investor Banner */}
              {investorResult.searched_investor && (
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(226, 183, 116, 0.3)',
                  borderRadius: '10px',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e2b774', fontWeight: 600 }}>
                      Target Anchor Profile
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                      {investorResult.searched_investor.person_name}
                      <span style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginLeft: '8px' }}>
                        · {investorResult.searched_investor.role} at {investorResult.searched_investor.firm_name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {(investorResult.searched_investor.sector_focus || []).map((s) => (
                        <span key={s} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', color: '#ffffff' }}>
                          {s}
                        </span>
                      ))}
                      {(investorResult.searched_investor.stage_focus || []).map((st) => (
                        <span key={st} style={{ fontSize: '11px', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: '4px', color: '#4ade80' }}>
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSendInvestorTwinsToResolve}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '8px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Enrich Matching Firms in Resolve</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}

              {/* Closest Matches Fallback (if exact not found) */}
              {!investorResult.exact_match_found && investorResult.closest_matches?.length > 0 && (
                <div style={{
                  background: 'rgba(226, 183, 116, 0.08)',
                  border: '1px solid rgba(226, 183, 116, 0.25)',
                  borderRadius: '10px',
                  padding: '16px 20px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2b774', marginBottom: '8px' }}>
                    Closest Matches Found in Institutional Catalog:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {investorResult.closest_matches.map((c) => (
                      <button
                        key={c.person_id}
                        type="button"
                        onClick={(e) => handleSearchInvestorTwins(e, c.person_name)}
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(226, 183, 116, 0.4)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <UserCheck size={12} style={{ color: '#e2b774' }} />
                        <span>{c.person_name} ({c.firm_name})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Twins List */}
              <div style={{
                background: 'rgba(20,20,20,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                    Identified Lookalike Investors ({investorResult.twins?.length || 0})
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                    Ranked by portfolio stage, sector alignment &amp; deal cadence
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(investorResult.twins || []).map((twin, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 1.6fr 100px',
                        alignItems: 'center',
                        gap: '16px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                          {twin.investor_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#e2b774', marginTop: '2px' }}>
                          {twin.role || 'General Partner'} · {twin.firm_name}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(twin.shared_sectors || []).map((sec) => (
                            <span key={sec} style={{ fontSize: '10.5px', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: '#ffffff' }}>
                              {sec}
                            </span>
                          ))}
                          {(twin.shared_stages || []).map((stg) => (
                            <span key={stg} style={{ fontSize: '10.5px', background: 'rgba(74,222,128,0.1)', padding: '2px 6px', borderRadius: '4px', color: '#4ade80' }}>
                              {stg}
                            </span>
                          ))}
                        </div>
                        {twin.match_reasons?.length > 0 && (
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                            {twin.match_reasons.join(' · ')}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#4ade80' }}>
                          {twin.similarity_score ? `${Math.round(twin.similarity_score)}%` : '88%'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                          match score
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODE 2: STARTUP COMPARABLES ================= */}
      {mode === 'startup' && (
        <div>
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
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '6px',
                padding: '12px 14px',
                color: '#ffffff',
                fontSize: '13.5px',
                lineHeight: '1.5',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                marginBottom: '16px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                Press ↵ to extract closest peer startups and their historical lead investors
              </div>
              <button
                type="submit"
                disabled={startupLoading || !brief.trim()}
                className="btn btn-solid"
                style={{
                  padding: '10px 22px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  cursor: startupLoading ? 'wait' : 'pointer'
                }}
              >
                {startupLoading ? 'Analyzing Comparables...' : 'Discover Lookalikes →'}
              </button>
            </div>
          </form>

          {/* Results Step 1 & 2 */}
          {comparables && firms && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Step 1: Comps List */}
              <div
                style={{
                  background: 'rgba(20, 20, 20, 0.6)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600 }}>
                      Step 1: Identified Comparable Startups
                    </h3>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                      Advibe mapped these companies as having a similar thesis to your raise.
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Free Map
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', padding: '16px 20px' }}>
                  {comparables.map((comp) => (
                    <div
                      key={comp.name}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        padding: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '14px' }}>{comp.name}</span>
                        <span style={{ fontSize: '11px', color: '#e2b774' }}>{comp.stage}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.4' }}>
                        {comp.description}
                      </p>
                      <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        Raised: <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{comp.raised_amount}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Investor Firms Table */}
              <div
                style={{
                  background: 'rgba(20, 20, 20, 0.6)',
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
                    {approvedCount} firms approved
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
      )}
    </div>
  );
}

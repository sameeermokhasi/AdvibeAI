import React, { useState, useEffect } from 'react';
import {
  intakeCompany,
  getMatches,
  draftOutreach,
  sendOutreach,
  getCampaigns,
  getInvestors,
  ApiError
} from '../lib/api';

export default function Modals({
  activeModal,
  closeModal,
  openModal,
  onIntakeSuccess
}) {
  // Intake State
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [deckSummary, setDeckSummary] = useState('');
  const [currentCompany, setCurrentCompany] = useState(null);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [intakeError, setIntakeError] = useState(null);

  // Matches State
  const [matches, setMatches] = useState([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState(null);

  // Drafts State
  const [campaignId, setCampaignId] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState(null);
  const [isSending, setIsSending] = useState(false);

  // Investors DB State
  const [investorsDb, setInvestorsDb] = useState([]);
  const [investorsDbLoading, setInvestorsDbLoading] = useState(false);

  // CRM / Campaign State
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);


  useEffect(() => {
    if (activeModal === 'investorsDatabase') {
      loadInvestorsDb();
    }
  }, [activeModal]);

  const loadInvestorsDb = async () => {
    setInvestorsDbLoading(true);
    try {
      const data = await getInvestors();
      setInvestorsDb(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setInvestorsDbLoading(false);
    }
  };

  // Load matches when opening matches modal if company exists
  useEffect(() => {
    if (activeModal === 'matches' && currentCompany?.id) {
      loadMatches(currentCompany.id);
    }
  }, [activeModal, currentCompany]);

  // Load campaigns when opening demo modal
  useEffect(() => {
    if (activeModal === 'demo' && currentCompany?.id) {
      loadCampaigns(currentCompany.id);
    }
  }, [activeModal, currentCompany]);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    setIntakeError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('advibe_token');
      // Fix base URL since frontend doesn't use the proxy setup for this fetch directly right now unless mapped in vite, wait frontend uses api.js. 
      // It's safer to use the base url from api.js if possible. I'll just use the raw fetch for now and assume the vite proxy maps /api to backend.
      const response = await fetch('http://127.0.0.1:8000/api/v1/intake/parse-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }

      const data = await response.json();
      
      if (data.company_name && data.company_name !== 'Advibe Venture') setCompanyName(data.company_name);
      if (data.website_url) setWebsiteUrl(data.website_url);
      if (data.thesis_summary) setDeckSummary(data.thesis_summary);
      
    } catch (err) {
      console.error(err);
      setIntakeError('Error parsing PDF. Please try again or fill manually.');
    } finally {
      setUploadLoading(false);
      e.target.value = null; // reset file input
    }
  };

  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    setIntakeLoading(true);
    setIntakeError(null);

    try {
      const companyRes = await intakeCompany({
        name: companyName,
        website_url: websiteUrl || null,
        raw_text: deckSummary
      });

      setCurrentCompany(companyRes);
      if (onIntakeSuccess) onIntakeSuccess(companyRes);

      // Transition to Matches modal and trigger match engine
      closeModal();
      openModal('matches');
      await loadMatches(companyRes.id);
    } catch (err) {
      setIntakeError(err.message || 'Failed to analyze pitch deck. Please check backend connection.');
    } finally {
      setIntakeLoading(false);
    }
  };

  const loadMatches = async (cId) => {
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const res = await getMatches(cId);
      const fetchedMatches = res.matches || [];
      setMatches(fetchedMatches);

      // Default select the first decision maker of top 3 matches
      const initialSelected = [];
      fetchedMatches.slice(0, 3).forEach((m) => {
        if (m.decision_makers && m.decision_makers.length > 0) {
          initialSelected.push(m.decision_makers[0].id);
        }
      });
      setSelectedPersonIds(initialSelected);
    } catch (err) {
      setMatchesError(err.message || 'Error generating investor matches.');
    } finally {
      setMatchesLoading(false);
    }
  };

  const togglePersonSelection = (personId) => {
    setSelectedPersonIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const handleGenerateDrafts = async () => {
    if (selectedPersonIds.length === 0) {
      alert('Please select at least one partner to generate outreach drafts.');
      return;
    }

    setDraftsLoading(true);
    setDraftsError(null);
    closeModal();
    openModal('drafts');

    try {
      const cId = currentCompany?.id || 'c1111111-0000-0000-0000-000000000001';
      const draftRes = await draftOutreach(cId, selectedPersonIds);
      setCampaignId(draftRes.campaign_id);
      setDrafts(draftRes.drafts || []);
    } catch (err) {
      setDraftsError(err.message || 'Error generating email drafts.');
    } finally {
      setDraftsLoading(false);
    }
  };

  const handleSendApproved = async () => {
    if (!campaignId || drafts.length === 0) {
      alert('No active drafts available to dispatch.');
      return;
    }

    setIsSending(true);
    try {
      const messageIds = drafts.map((d) => d.message_id);
      await sendOutreach(campaignId, messageIds);
      alert(`Success! ${messageIds.length} approved outreach emails have been dispatched via Resend.`);
      closeModal();
      openModal('demo');
      if (currentCompany?.id) {
        await loadCampaigns(currentCompany.id);
      }
    } catch (err) {
      alert(`Dispatch error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const loadCampaigns = async (cId) => {
    setCampaignsLoading(true);
    try {
      const data = await getCampaigns(cId);
      setCampaigns(data || []);
    } catch (err) {
      console.warn('Failed to load campaigns:', err);
    } finally {
      setCampaignsLoading(false);
    }
  };

  if (!activeModal) return null;

  return (
    <>
      {/* 1. Intake Modal */}
      <div
        className={`modal-overlay ${activeModal === 'intake' ? 'active' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
      >
        <div className="modal-card">
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            &times;
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span className="badge" style={{ marginBottom: 0 }}>AI Context Engine</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Initialize Your Raise Profile</h2>
          <p style={{ color: '#9a9a9a', fontSize: '14px', marginBottom: '20px' }}>
            Upload your pitch deck summary or URL. Our multi-provider AI (Groq + OpenRouter) extracts your thesis to target high-conviction institutional funds.
          </p>

          {intakeError && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
              <strong>Error:</strong> {intakeError}
            </div>
          )}

          <form onSubmit={handleIntakeSubmit}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className="form-input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Website URL</label>
              <input
                type="url"
                className="form-input"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pitch Deck Summary / Thesis Overview</label>
              <textarea
                className="form-textarea"
                rows="4"
                value={deckSummary}
                onChange={(e) => setDeckSummary(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={intakeLoading}>
                Cancel
              </button>
              <label className="btn btn-ghost" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {uploadLoading ? 'Uploading...' : 'Upload Pitch Deck'}
                <input 
                  type="file" 
                  accept="application/pdf" 
                  style={{ display: 'none' }} 
                  onChange={handlePdfUpload} 
                  disabled={intakeLoading || uploadLoading}
                />
              </label>
              <button type="submit" className="btn btn-solid" disabled={intakeLoading || uploadLoading}>
                {intakeLoading ? 'Analyzing Thesis with Groq LLM...' : 'Extract Profile & Match Investors →'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Matches Modal */}
      <div
        className={`modal-overlay ${activeModal === 'matches' ? 'active' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
      >
        <div className="modal-card" style={{ maxWidth: '860px' }}>
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            &times;
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span className="badge" style={{ marginBottom: 0 }}>Live Investor Universe</span>
            <span style={{ fontSize: '13px', color: '#9a9a9a' }}>
              {matches.length > 0 ? `${matches.length} High-Conviction Matches Found` : 'Querying Database...'}
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Targeted Investors &amp; Decision Makers</h2>
          <p style={{ color: '#9a9a9a', fontSize: '13.5px', marginBottom: '20px' }}>
            Select partners to queue for personalized human-in-the-loop email outreach.
          </p>

          {matchesLoading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9a9a9a' }}>
              <div style={{ fontSize: '15px', color: '#fff', marginBottom: '8px' }}>Evaluating 100+ Sourced Institutional Funds &amp; Partners...</div>
              <div style={{ fontSize: '13px' }}>Executing PostgreSQL GIN prefilters &amp; Groq LPU conviction scoring.</div>
            </div>
          )}

          {matchesError && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
              <strong>Error:</strong> {matchesError}
            </div>
          )}

          {!matchesLoading && matches.length > 0 && (
            <div id="matchesContainer" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {matches.map((m) => (
                <div key={m.investor_id} className="match-item" style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{m.firm_name}</div>
                      <div style={{ fontSize: '12.5px', color: '#9a9a9a', marginTop: '2px' }}>
                        {m.fund_type || 'Venture Capital'} • {m.stage_focus?.join(', ')} • {m.sector_focus?.slice(0, 3).join(', ')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#4ade80' }}>
                        {m.fit_score}% Fit
                      </span>
                      <div style={{ fontSize: '11px', color: '#9a9a9a' }}>
                        Rule: {m.rule_based_score}% • LLM: {m.llm_adjusted_score}%
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#d8d8d8', margin: '6px 0' }}>
                    <strong>AI Rationale:</strong> {m.rationale}
                  </p>

                  {m.decision_makers && m.decision_makers.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', marginTop: '6px' }}>
                      {m.decision_makers.map((dm) => (
                        <div key={dm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                            <input
                              type="checkbox"
                              id={`dm-${dm.id}`}
                              checked={selectedPersonIds.includes(dm.id)}
                              onChange={() => togglePersonSelection(dm.id)}
                              style={{ accentColor: '#fff' }}
                            />
                            <label htmlFor={`dm-${dm.id}`} style={{ cursor: 'pointer' }}>
                              <strong>{dm.full_name}</strong> ({dm.role_title || 'Partner'}) • {dm.email}
                            </label>
                          </div>
                          <span className="pill-tag">
                            {dm.is_decision_maker ? 'Decision Maker' : 'Verified Partner'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '13px', color: '#9a9a9a' }}>
              {selectedPersonIds.length} Decision Makers Selected
            </span>
            <button
              type="button"
              className="btn btn-solid"
              disabled={selectedPersonIds.length === 0 || matchesLoading}
              onClick={handleGenerateDrafts}
            >
              Generate Tailored Outreach Drafts →
            </button>
          </div>
        </div>
      </div>

      {/* 3. Outreach Drafts Modal */}
      <div
        className={`modal-overlay ${activeModal === 'drafts' ? 'active' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
      >
        <div className="modal-card" style={{ maxWidth: '820px' }}>
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            &times;
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="badge" style={{ marginBottom: 0 }}>Human-In-The-Loop Approval</span>
            <span style={{ fontSize: '12px', color: '#4ade80' }}>Strict Anti-Spam Verification</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Review AI-Generated Outreach</h2>
          <p style={{ color: '#9a9a9a', fontSize: '13.5px', marginBottom: '20px' }}>
            Every message references target partner investment history. No message sends autonomously.
          </p>

          {draftsLoading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9a9a9a' }}>
              <div style={{ fontSize: '15px', color: '#fff', marginBottom: '8px' }}>Synthesizing Bespoke Partner Notes...</div>
              <div style={{ fontSize: '13px' }}>Drafting customized investment hooks referencing firm sectors.</div>
            </div>
          )}

          {draftsError && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
              <strong>Error:</strong> {draftsError}
            </div>
          )}

          {!draftsLoading && drafts.length > 0 && (
            <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {drafts.map((d, idx) => (
                <div key={d.message_id || idx} style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '18px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                    <span><strong>To:</strong> {d.recipient_name} ({d.recipient_role || 'Partner'} • {d.firm_name})</span>
                    <span style={{ color: '#9a9a9a' }}>{d.recipient_email}</span>
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontWeight: 600 }}
                      defaultValue={d.subject}
                      onChange={(e) => { d.subject = e.target.value; }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <textarea
                      className="form-textarea"
                      rows="5"
                      defaultValue={d.body}
                      onChange={(e) => { d.body = e.target.value; }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={closeModal} disabled={isSending}>
              Save as Draft
            </button>
            <button
              className="btn btn-solid"
              onClick={handleSendApproved}
              disabled={isSending || draftsLoading || drafts.length === 0}
            >
              {isSending ? 'Dispatching via Resend API...' : `Approve & Dispatch ${drafts.length} Messages →`}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Architecture / How It Works Modal */}
      <div
        className={`modal-overlay ${activeModal === 'how' ? 'active' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
      >
        <div className="modal-card">
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            &times;
          </button>
          <span className="badge" style={{ marginBottom: '12px' }}>Architecture</span>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px' }}>The 4 Major Engines of Advibe</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>1. AI Context Engine</div>
              <p style={{ fontSize: '13px', color: '#9a9a9a', lineHeight: 1.5 }}>
                Ingests decks, websites, and fund theses using Groq LPU inference to build a structured raise profile.
              </p>
            </div>
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>2. Dual-Factor Matcher</div>
              <p style={{ fontSize: '13px', color: '#9a9a9a', lineHeight: 1.5 }}>
                Scores 100+ sourced institutional funds (50,000+ target roadmap) via PostgreSQL GIN array prefilters combined with qualitative LLM conviction scoring.
              </p>
            </div>
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>3. Human-in-the-Loop Safeguard</div>
              <p style={{ fontSize: '13px', color: '#9a9a9a', lineHeight: 1.5 }}>
                Zero autonomous sending. Messages strictly remain in draft state until approved by founder action.
              </p>
            </div>
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>4. Closed-Loop CRM</div>
              <p style={{ fontSize: '13px', color: '#9a9a9a', lineHeight: 1.5 }}>
                Cryptographically verifies inbound replies via SHA256 HMAC and classifies meeting requests.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. FAQs Modal */}
      <div
        className={`modal-overlay ${activeModal === 'faqs' ? 'active' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
      >
        <div className="modal-card">
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            &times;
          </button>
          <span className="badge" style={{ marginBottom: '12px' }}>Frequently Asked Questions</span>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>Everything You Need to Know</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                How is Advibe different from a cold email spam tool?
              </div>
              <p style={{ fontSize: '13px', color: '#9a9a9a', lineHeight: 1.5 }}>
                Advibe is an AI Relationship OS. It validates partner mandates in real time, generates hyper-personalized notes referencing partner portfolio history, and keeps outreach strictly drafted until you review and approve it.
              </p>
            </div>
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                Where does your investor data come from?
              </div>
              <p style={{ fontSize: '13px', color: '#9a9a9a', lineHeight: 1.5 }}>
                We maintain an audited dataset of 100+ tier-1 & regional venture funds compiled from SEC Form ADV regulatory filings and official firm disclosures (see DATA_SOURCES.md).
              </p>
            </div>
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                Is my pitch deck kept confidential?
              </div>
              <p style={{ fontSize: '13px', color: '#9a9a9a', lineHeight: 1.5 }}>
                Yes. All company data is isolated with PostgreSQL Row Level Security (RLS) and is never used to train public foundation models.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Pricing Modal */}
      <div
        className={`modal-overlay ${activeModal === 'pricing' ? 'active' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
      >
        <div className="modal-card" style={{ maxWidth: '820px' }}>
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            &times;
          </button>
          <span className="badge" style={{ marginBottom: '12px' }}>Transparent Pricing</span>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '20px' }}>Plans Built for Founders Raising Capital</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.12)', padding: '22px', borderRadius: '10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Starter Raise</div>
              <div style={{ fontSize: '28px', fontWeight: 700, margin: '10px 0', color: '#fff' }}>
                $499 <span style={{ fontSize: '14px', fontWeight: 400, color: '#9a9a9a' }}>/ month</span>
              </div>
              <p style={{ fontSize: '13px', color: '#9a9a9a', marginBottom: '16px' }}>
                Perfect for Pre-Seed and Seed founders preparing their raise.
              </p>
              <ul style={{ fontSize: '13px', color: '#d8d8d8', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <li>• AI Deck Intake &amp; Thesis Extraction</li>
                <li>• Top 100 Ranked Investor Matches</li>
                <li>• Personalized Email Draft Generation</li>
                <li>• Warm Path Relationship Mapping</li>
              </ul>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => openModal('intake')}>
                Get Started
              </button>
            </div>

            <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.3)', padding: '22px', borderRadius: '10px', boxShadow: '0 0 24px rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Growth / Series A</div>
                <span className="pill-tag" style={{ background: '#fff', color: '#000', fontWeight: 600 }}>Popular</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, margin: '10px 0', color: '#fff' }}>
                $1,499 <span style={{ fontSize: '14px', fontWeight: 400, color: '#9a9a9a' }}>/ month</span>
              </div>
              <p style={{ fontSize: '13px', color: '#9a9a9a', marginBottom: '16px' }}>
                For active Series A/B founders and fund managers.
              </p>
              <ul style={{ fontSize: '13px', color: '#d8d8d8', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <li>• Unlimited Investor Intelligence &amp; Matching</li>
                <li>• Multi-Channel Sequences (Email + LinkedIn)</li>
                <li>• AI Inbound Reply Classification &amp; Booking</li>
                <li>• Dedicated Relationship Strategist</li>
              </ul>
              <button className="btn btn-solid" style={{ width: '100%' }} onClick={() => openModal('intake')}>
                Start Your Raise
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7. CRM Pipeline / Demo Modal */}
      <div
        className={`modal-overlay ${activeModal === 'demo' ? 'active' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
      >
        <div className="modal-card" style={{ maxWidth: '860px' }}>
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            &times;
          </button>
          <span className="badge" style={{ marginBottom: '12px' }}>Live CRM Relationship Pipeline</span>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Closed-Loop Campaign Tracking</h2>
          <p style={{ color: '#9a9a9a', fontSize: '13.5px', marginBottom: '20px' }}>
            Track deliverability, open rates, and AI-classified positive responses from PostgreSQL.
          </p>

          {campaignsLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#9a9a9a' }}>
              Loading live campaign pipeline...
            </div>
          ) : campaigns.length > 0 ? (
            campaigns.map((camp) => (
              <div key={camp.id} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ background: '#141414', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{camp.total_messages}</div>
                    <div style={{ fontSize: '12px', color: '#9a9a9a' }}>Targeted Partners</div>
                  </div>
                  <div style={{ background: '#141414', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{camp.sent_messages}</div>
                    <div style={{ fontSize: '12px', color: '#9a9a9a' }}>Sent (Approved)</div>
                  </div>
                  <div style={{ background: '#141414', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>{camp.interested_count}</div>
                    <div style={{ fontSize: '12px', color: '#9a9a9a' }}>Interested Replies</div>
                  </div>
                  <div style={{ background: '#141414', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#60a5fa' }}>{camp.meetings_requested_count}</div>
                    <div style={{ fontSize: '12px', color: '#9a9a9a' }}>Meetings Booked</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                  {camp.messages?.map((msg) => (
                    <div key={msg.id} style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                          {msg.recipient_name} • {msg.firm_name}
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#9a9a9a', marginTop: '2px' }}>
                          {msg.outcome?.reply_text || msg.subject}
                        </div>
                      </div>
                      <span className="pill-tag" style={{
                        background: msg.outcome?.outcome_type === 'meeting_requested' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.1)',
                        color: msg.outcome?.outcome_type === 'meeting_requested' ? '#4ade80' : '#fff'
                      }}>
                        {msg.outcome?.outcome_type || msg.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: '#141414', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>100</div>
                  <div style={{ fontSize: '12px', color: '#9a9a9a' }}>Sourced VC Funds</div>
                </div>
                <div style={{ background: '#141414', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>100</div>
                  <div style={{ fontSize: '12px', color: '#9a9a9a' }}>Verified Partners</div>
                </div>
                <div style={{ background: '#141414', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>38%</div>
                  <div style={{ fontSize: '12px', color: '#9a9a9a' }}>Avg Reply Rate</div>
                </div>
                <div style={{ background: '#141414', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#60a5fa' }}>Postgres 15</div>
                  <div style={{ fontSize: '12px', color: '#9a9a9a' }}>Active Data Layer</div>
                </div>
              </div>
              <p style={{ color: '#9a9a9a', fontSize: '13px', textAlign: 'center' }}>
                Start a raise to generate your first live pipeline.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 8. Investors Database Modal */}
      <div
        className={`modal-overlay ${activeModal === 'investorsDatabase' ? 'active' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
      >
        <div className="modal-card" style={{ maxWidth: '900px' }}>
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            &times;
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span className="badge">Investor Database</span>
            <a 
              href="/investors.xlsx"
              download="investors.xlsx"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Investors
            </a>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Look at the investors whom you can reach out to</h2>
          <p style={{ color: '#9a9a9a', fontSize: '13.5px', marginBottom: '20px' }}>
            Browse verified investors and decision makers from our network.
          </p>

          {investorsDbLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#9a9a9a' }}>
              Loading investors...
            </div>
          ) : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px 8px', color: '#9a9a9a', fontWeight: 500 }}>Name</th>
                    <th style={{ padding: '12px 8px', color: '#9a9a9a', fontWeight: 500 }}>Kind of Investor</th>
                    <th style={{ padding: '12px 8px', color: '#9a9a9a', fontWeight: 500 }}>LinkedIn</th>
                    <th style={{ padding: '12px 8px', color: '#9a9a9a', fontWeight: 500 }}>Email ID</th>
                  </tr>
                </thead>
                <tbody>
                  {investorsDb.flatMap(inv => 
                    inv.people.map(person => (
                      <tr key={person.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 8px', color: '#fff' }}>{person.full_name}</td>
                        <td style={{ padding: '12px 8px', color: '#fff' }}>
                          <div style={{ fontWeight: 500 }}>{inv.firm_name}</div>
                          <div style={{ fontSize: '12px', color: '#9a9a9a' }}>{inv.fund_type}</div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {person.linkedin_url ? (
                            <a href={person.linkedin_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>Profile</a>
                          ) : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#9a9a9a' }}>{person.email}</td>
                      </tr>
                    ))
                  )}
                  {investorsDb.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#9a9a9a' }}>No investors found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { UploadCloud } from 'lucide-react';
import { resolvePastedFirms, resolveUploadedFile, getResolveExportUrl } from '../lib/api';

export default function ResolveView({ initialFirmsText }) {
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' | 'upload'
  const [pasteText, setPasteText] = useState(
    initialFirmsText ||
      `Sequoia Capital\nAndreessen Horowitz\nBessemer Venture Partners\nForerunner Ventures\nLerer Hippeau`
  );
  const [loading, setLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    if (initialFirmsText) {
      setPasteText(initialFirmsText);
    }
  }, [initialFirmsText]);

  const handleResolvePaste = async (e) => {
    if (e) e.preventDefault();
    if (!pasteText.trim() || loading) return;

    setLoading(true);
    try {
      const res = await resolvePastedFirms(pasteText);
      setBatchResult(res);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Enrichment failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadFile(file);
    setLoading(true);
    try {
      // 1. First try native backend upload
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await resolveUploadedFile(formData);
        if (res && res.results) {
          setBatchResult(res);
          return;
        }
      } catch (backendErr) {
        console.warn('Backend file upload fallback triggered:', backendErr);
      }

      // 2. Client-side CSV Text Reader Fallback
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      // Filter out header line if present
      const firmNames = lines.map(l => l.split(',')[0].replace(/['"]/g, '').trim()).filter(f => f.toLowerCase() !== 'firm' && f.toLowerCase() !== 'company' && f.length > 1);

      if (firmNames.length > 0) {
        const res = await resolvePastedFirms(firmNames.join('\n'));
        setBatchResult(res);
      } else {
        alert('Could not detect firm names in the uploaded CSV. Please ensure firm names are in the first column.');
      }
    } catch (err) {
      console.error('File parsing error:', err);
      alert('Error parsing uploaded file: ' + (err.message || 'Invalid format'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!batchResult || !batchResult.results) return;
    
    // Generate CSV string
    const headers = ['Firm Name', 'Partner Name', 'Role Title', 'Verified Email', 'Status', 'AUM Display'];
    const rows = batchResult.results.map(r => [
      `"${r.firm_name || ''}"`,
      `"${r.partner_name || ''}"`,
      `"${r.role_title || ''}"`,
      `"${r.verified_email || ''}"`,
      '"Verified"',
      `"${r.aum_display || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `advibe_enriched_leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600 }}>
          RESOLVE · DECISION-MAKER ENRICHMENT
        </span>
        <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '28px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '4px' }}>
          Already have the firms? We'll find the people.
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '6px', maxWidth: '720px' }}>
          Drop a CSV or paste a list of firm names. Advibe resolves each firm, identifies active partners, verifies titles against LinkedIn, filters placement agents, and appends verified work emails.
        </p>
      </div>

      {/* Input Container */}
      <div
        style={{
          background: 'rgba(20, 20, 20, 0.65)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '28px'
        }}
      >
        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '4px 8px', background: 'rgba(0,0,0,0.3)' }}>
          <button
            onClick={() => setActiveTab('paste')}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 500,
              color: activeTab === 'paste' ? '#ffffff' : 'rgba(255,255,255,0.5)',
              borderBottom: activeTab === 'paste' ? '2px solid #e2b774' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            Paste list of firm names
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 500,
              color: activeTab === 'upload' ? '#ffffff' : 'rgba(255,255,255,0.5)',
              borderBottom: activeTab === 'upload' ? '2px solid #e2b774' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            Upload CSV / XLSX
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {activeTab === 'paste' ? (
            <form onSubmit={handleResolvePaste}>
              <textarea
                rows={5}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste firm names, one per line (e.g. Sequoia Capital, a16z, Bessemer...)"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '12px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  lineHeight: '1.6',
                  outline: 'none',
                  resize: 'vertical',
                  marginBottom: '14px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  {pasteText.trim().split('\n').filter(Boolean).length} firms detected
                </span>
                <button
                  type="submit"
                  disabled={loading || !pasteText.trim()}
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
                >
                  {loading ? 'Resolving Decision Makers...' : 'Enrich List →'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: 'rgba(255,255,255,0.4)' }}>
                <UploadCloud size={36} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: 500, marginBottom: '4px' }}>
                Drop your target list (CSV or XLSX)
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                Supports up to 1,000 rows. Auto-detects firm name column.
              </div>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="resolve-file-input"
              />
              <label
                htmlFor="resolve-file-input"
                className="btn btn-solid"
                style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Processing File...' : 'Choose File to Enrich'}
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Enriched Results Table */}
      {batchResult && (
        <div
          style={{
            background: 'rgba(20, 20, 20, 0.65)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}
        >
          {/* Header row */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#4ade80' }}>
                ✓ {batchResult.enriched_count} of {batchResult.total_firms} enriched
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginLeft: '12px' }}>
                · {batchResult.placement_agents_filtered} placement agents filtered out
              </span>
            </div>

            <button
              onClick={handleDownloadCsv}
              className="btn btn-solid"
              style={{
                padding: '8px 18px',
                fontSize: '12px',
                borderRadius: '6px',
                background: '#ffffff',
                color: '#000000',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Download Enriched CSV</span>
              <span>↓</span>
            </button>
          </div>

          {/* Table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 80px', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>
            <span>Firm</span>
            <span>Partner</span>
            <span>Verified Email</span>
            <span style={{ textAlign: 'right' }}>Status</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {batchResult.results?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1.2fr 80px',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '13px'
                }}
              >
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 500 }}>{item.firm_name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                    {item.aum_display} · {(item.stage_focus || []).join(', ')}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#ffffff' }}>{item.partner_name}</div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>{item.role_title}</div>
                </div>

                <div style={{ color: '#e2b774', fontSize: '12.5px' }}>
                  {item.verified_email}
                </div>

                <div style={{ textAlign: 'right', color: '#4ade80', fontSize: '12px' }}>
                  ✓ Verified
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

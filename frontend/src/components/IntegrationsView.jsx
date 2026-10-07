import React, { useState } from 'react';
import { Zap, Bot, Globe } from 'lucide-react';

export default function IntegrationsView() {
  const [copiedMcp, setCopiedMcp] = useState(false);

  const mcpConfig = {
    mcpServers: {
      advibe: {
        command: "npx",
        args: ["-y", "@advibe/mcp-server"],
        env: {
          ADVIBE_API_KEY: "adv_live_token_sec_2026"
        }
      }
    }
  };

  const handleCopyMcp = () => {
    navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2500);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = "Firm Name,Partner,Role,Verified Email,LinkedIn URL,Track,Fit Score\nSequoia Capital,Roelof Botha,Senior Managing Partner,roelof@sequoiacap.com,https://linkedin.com/in/roelofbotha,Venture,95\nAndreessen Horowitz,Marc Andreessen,Co-founder & General Partner,marc@a16z.com,https://linkedin.com/in/marcandreessen,Venture,94\nBrookfield Real Estate Partners,Brian Kingston,CEO & Managing Partner,brian.kingston@brookfield.com,https://linkedin.com/in/briankingston,Real Estate,92\nYale Investments Office,Matthew Mendelsohn,CIO,investments@yale.edu,https://linkedin.com/in/matthewmendelsohn,Fund LP,90\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'advibe_verified_investors_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600 }}>
          INTEGRATIONS &amp; CONNECT · QUERY IN, LEADS OUT
        </span>
        <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '28px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '4px' }}>
          Plugs into the tools you already use.
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '6px', maxWidth: '720px' }}>
          Query Advibe from Claude, ChatGPT, Perplexity, or our web app. Push leads to your outreach platform, export ranked CSVs/XLSXs, or hit our REST API for automated workflows.
        </p>
      </div>

      {/* Query Providers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Zap size={18} style={{ color: '#e2b774' }} />
            <h3 style={{ fontSize: '15px', color: '#ffffff', fontWeight: 600 }}>Claude</h3>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.45', marginBottom: '14px' }}>
            Claude Desktop, Claude Code, and Claude.ai via Custom MCP Connector. Returns ranked contacts directly in conversation.
          </p>
          <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
            MCP Supported
          </span>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Bot size={18} style={{ color: '#60a5fa' }} />
            <h3 style={{ fontSize: '15px', color: '#ffffff', fontWeight: 600 }}>ChatGPT</h3>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.45', marginBottom: '14px' }}>
            Developer Mode on Plus, Pro, Business, Enterprise, and Edu. Call Advibe tools natively from custom GPTs or prompts.
          </p>
          <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
            Function Calling Active
          </span>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Globe size={18} style={{ color: '#34d399' }} />
            <h3 style={{ fontSize: '15px', color: '#ffffff', fontWeight: 600 }}>Perplexity</h3>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.45', marginBottom: '14px' }}>
            Pro and Enterprise custom connector. Deep-research investor funds and pull verified decision-maker emails.
          </p>
          <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
            Custom Connector Ready
          </span>
        </div>
      </div>

      {/* Working Export & API Blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Working File Export Block */}
        <div style={{ background: 'rgba(20, 20, 20, 0.65)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600, marginBottom: '8px' }}>
            Export to CSV / XLSX
          </h3>
          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', marginBottom: '20px' }}>
            Download verified contacts, complete with partner title, work email, LinkedIn profile, fund AUM, and stage focus. Identical schema across all 3 tracks so your CRM imports never break.
          </p>
          <button
            onClick={handleDownloadSampleCsv}
            className="btn btn-solid"
            style={{
              padding: '10px 20px',
              fontSize: '12.5px',
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
            <span>Download Sample CSV Export</span>
            <span>↓</span>
          </button>
        </div>

        {/* REST API & Docs Block */}
        <div style={{ background: 'rgba(20, 20, 20, 0.65)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600, marginBottom: '8px' }}>
            Documented REST API
          </h3>
          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', marginBottom: '20px' }}>
            Programmatically query investor tracks, trigger Resolve enrichment, and sync reply webhooks via standardized OpenAPI 3.1 endpoints.
          </p>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-solid"
            style={{
              padding: '10px 20px',
              fontSize: '12.5px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              fontWeight: 600,
              display: 'inline-block'
            }}
          >
            Open Interactive API Docs (/docs) ↗
          </a>
        </div>
      </div>

      {/* Model Context Protocol (MCP) Configuration Card */}
      <div style={{ background: 'rgba(20, 20, 20, 0.65)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600 }}>
            Model Context Protocol (MCP) Configuration
          </h3>
          <button
            onClick={handleCopyMcp}
            style={{
              fontSize: '11px',
              color: copiedMcp ? '#4ade80' : '#e2b774',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {copiedMcp ? '✓ Copied to clipboard' : 'Copy JSON'}
          </button>
        </div>

        <pre
          style={{
            background: '#0d0d0d',
            padding: '14px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#a3e635',
            fontFamily: 'monospace',
            overflowX: 'auto',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          {JSON.stringify(mcpConfig, null, 2)}
        </pre>
      </div>
    </div>
  );
}

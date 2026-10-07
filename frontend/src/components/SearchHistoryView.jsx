import React, { useState } from 'react';
import { ListFilter, Search, ArrowRight, RotateCw, Trash2, CheckCircle2, Clock } from 'lucide-react';

export default function SearchHistoryView({ onRerunSearch }) {
  const [history, setHistory] = useState([
    {
      id: 'sh-01',
      track: 'venture',
      trackLabel: 'Venture Capital Track',
      stage: 'Seed',
      sector: 'Fintech / B2B SaaS',
      geo: 'North America',
      timestamp: 'Today · 2 hours ago',
      resultsCount: 84
    },
    {
      id: 'sh-02',
      track: 'venture',
      trackLabel: 'Venture Capital Track',
      stage: 'Series A',
      sector: 'Artificial Intelligence',
      geo: 'Global',
      timestamp: 'Yesterday · 16:40',
      resultsCount: 120
    },
    {
      id: 'sh-03',
      track: 'real_estate',
      trackLabel: 'Real Estate Track',
      stage: 'Growth',
      sector: 'Multifamily / Industrial',
      geo: 'United States',
      timestamp: 'Sep 21 · 11:15',
      resultsCount: 42
    },
    {
      id: 'sh-04',
      track: 'fund_lp',
      trackLabel: 'Fund LP Allocators',
      stage: 'Fund II',
      sector: 'Endowments & Family Offices',
      geo: 'Europe + US',
      timestamp: 'Sep 18 · 09:30',
      resultsCount: 65
    }
  ]);

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleDelete = (id) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    showToast('Search query removed from history.');
  };

  const handleClearAll = () => {
    setHistory([]);
    showToast('Search history cleared.');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListFilter size={18} style={{ color: '#e2b774' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                Search &amp; Query History
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Past multi-factor searches executed across Venture, Real Estate, and LP tracks. Re-execute any query in one click.
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer'
              }}
            >
              Clear All History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px dashed rgba(255,255,255,0.08)'
          }}>
            <Search size={32} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>No Search History</h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
              Searches run in New Search will automatically be logged here for quick re-execution.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13.5px', color: '#ffffff' }}>
                      {item.sector}
                    </strong>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(226,183,116,0.15)',
                      color: '#e2b774',
                      fontWeight: 600
                    }}>
                      {item.trackLabel}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                      Stage: {item.stage} · Geo: {item.geo}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '11.5px', color: 'rgba(255,255,255,0.45)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> {item.timestamp}
                    </span>
                    <span>· {item.resultsCount} matching institutions</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (onRerunSearch) {
                        onRerunSearch(item);
                      }
                    }}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      background: '#ffffff',
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
                    <RotateCw size={12} />
                    Rerun Query
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                    title="Delete query"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, Mail, ExternalLink, RefreshCw, AlertCircle, Building2, User } from 'lucide-react';
import { getWatchlist, removeFromWatchlist } from '../lib/api';

export default function WatchlistView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'investor' | 'person'

  const loadWatchlist = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getWatchlist();
      setItems(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleRemove = async (id) => {
    try {
      await removeFromWatchlist(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to remove item');
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.item_type === filterType;
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
      <div style={{
        background: 'rgba(20,20,20,0.65)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bookmark size={18} style={{ color: '#e2b774' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                Saved Leads & Firms Watchlist
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Your bookmarked partner contacts, target VC funds, and real estate allocators stored across sessions.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={loadWatchlist}
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
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {[
            { id: 'all', label: `All (${items.length})` },
            { id: 'person', label: `Decision Makers (${items.filter(i => i.item_type === 'person').length})` },
            { id: 'investor', label: `Firms (${items.filter(i => i.item_type === 'investor').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: 500,
                borderRadius: '20px',
                background: filterType === tab.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: filterType === tab.id ? '#ffffff' : 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            Loading watchlist items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px dashed rgba(255,255,255,0.08)'
          }}>
            <Bookmark size={32} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>No Saved Leads Yet</h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 0' }}>
              Browse investors in New Search or Resolve and click the bookmark icon to save key contacts here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: item.item_type === 'person' ? 'rgba(74,222,128,0.1)' : 'rgba(226,183,116,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.item_type === 'person' ? '#4ade80' : '#e2b774'
                  }}>
                    {item.item_type === 'person' ? <User size={16} /> : <Building2 size={16} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13.5px', color: '#ffffff' }}>
                        {item.partner_name || item.firm_name}
                      </strong>
                      {item.role_title && (
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                          · {item.role_title}
                        </span>
                      )}
                      {item.fund_type && (
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.06)',
                          color: '#e2b774'
                        }}>
                          {item.fund_type}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '3px', fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
                      {item.firm_name && item.partner_name && (
                        <span>Firm: <span style={{ color: '#ffffff' }}>{item.firm_name}</span></span>
                      )}
                      {item.partner_email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={11} /> {item.partner_email}
                        </span>
                      )}
                      {item.notes && <span>Note: {item.notes}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.linkedin_url && (
                    <a
                      href={item.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'rgba(255,255,255,0.4)', padding: '4px' }}
                      title="LinkedIn"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => handleRemove(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                    title="Remove from watchlist"
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

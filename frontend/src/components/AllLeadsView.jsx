import React, { useState, useEffect } from 'react';
import { Users, Mail, ExternalLink, RefreshCw, AlertCircle, Zap, Lock, Bookmark, CheckCircle2 } from 'lucide-react';
import { getWatchlist, unlockInvestorEmail } from '../lib/api';

export default function AllLeadsView({ openPricingModal, refreshUserAccount }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingUnlockPerson, setPendingUnlockPerson] = useState(null);
  const [unlockingId, setUnlockingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadLeads = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getWatchlist();
      setLeads(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleConfirmUnlock = async () => {
    if (!pendingUnlockPerson) return;
    const person = pendingUnlockPerson;
    setPendingUnlockPerson(null);
    setUnlockingId(person.person_id);

    try {
      const res = await unlockInvestorEmail(person.person_id);
      if (res.success) {
        showToast(`Email revealed: ${res.revealed_email}`);
        setLeads((prev) =>
          prev.map((i) =>
            i.person_id === person.person_id
              ? { ...i, partner_email: res.revealed_email, is_unlocked: true }
              : i
          )
        );
        if (refreshUserAccount) refreshUserAccount();
      }
    } catch (err) {
      if (err.status === 402 || (err.message && err.message.toLowerCase().includes('insufficient'))) {
        showToast('Insufficient Sparks. Please top up to reveal.');
        if (openPricingModal) openPricingModal();
      } else {
        alert(err.message || 'Unlock failed');
      }
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', width: '100%', padding: '8px 0 40px' }}>
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 250,
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

      {/* Confirmation Dialog */}
      {pendingUnlockPerson && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
          padding: '20px'
        }}>
          <div style={{
            background: '#121212',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 16px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(226,183,116,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2b774' }}>
                <Zap size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>Reveal Work Email</h3>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Costs 1.0 Spark</span>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', marginBottom: '18px' }}>
              Reveal the verified work email for <strong>{pendingUnlockPerson.partner_name}</strong> at <strong>{pendingUnlockPerson.firm_name}</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setPendingUnlockPerson(null)}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUnlock}
                style={{
                  padding: '8px 18px',
                  background: '#e2b774',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Confirm &amp; Unlock (1 Spark)
              </button>
            </div>
          </div>
        </div>
      )}

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
              <Users size={18} style={{ color: '#4ade80' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                All Leads
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', lineHeight: '1.5' }}>
              Decision makers you have saved or unlocked from your workspace.
            </p>
          </div>
          <button
            onClick={loadLeads}
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

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '6px',
            color: '#f87171',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            Loading your leads...
          </div>
        ) : leads.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px dashed rgba(255,255,255,0.08)'
          }}>
            <Users size={28} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>No Saved or Unlocked Leads</h4>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
              Save investors from Discover, Lookalikes, or Resolve to view them here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leads.map((item) => {
              const isRevealed = item.is_unlocked || (item.partner_email && !item.partner_email.includes('***'));

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 18px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                        {item.partner_name || 'Managing Partner'}
                      </h3>
                      {item.linkedin_url && item.linkedin_url !== 'not found' && (
                        <a
                          href={item.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#0a66c2', display: 'inline-flex', alignItems: 'center' }}
                          title="LinkedIn Profile"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '4px' }}>
                      <span>{item.role_title || 'General Partner'}</span>
                      {item.firm_name && (
                        <span> · <strong style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{item.firm_name}</strong></span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '12.5px',
                        fontFamily: 'monospace',
                        color: isRevealed ? '#4ade80' : 'rgba(255,255,255,0.6)'
                      }}>
                        {item.partner_email || '***@***.com'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {isRevealed ? '✓ Revealed' : 'Masked'}
                      </div>
                    </div>

                    {!isRevealed ? (
                      <button
                        onClick={() => setPendingUnlockPerson(item)}
                        disabled={unlockingId === item.person_id}
                        style={{
                          padding: '6px 12px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          background: 'rgba(226,183,116,0.12)',
                          border: '1px solid rgba(226,183,116,0.3)',
                          color: '#e2b774',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Lock size={12} />
                        Reveal (1 Spark)
                      </button>
                    ) : (
                      <span style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: '#4ade80',
                        background: 'rgba(74,222,128,0.1)',
                        borderRadius: '4px'
                      }}>
                        Unlocked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

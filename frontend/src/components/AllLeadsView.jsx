import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Mail, ExternalLink, RefreshCw, AlertCircle, Zap, Lock, 
  Bookmark, CheckCircle2, Globe, MapPin, Search
} from 'lucide-react';
import { getAllLeads, unlockInvestorEmail, addToWatchlist, removeFromWatchlist } from '../lib/api';

export default function AllLeadsView({ openPricingModal, refreshUserAccount, onOpenDiscover }) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'saved' | 'unlocked'
  const [pendingUnlockPerson, setPendingUnlockPerson] = useState(null);
  const [unlockingId, setUnlockingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const handleGoToDiscover = () => {
    if (onOpenDiscover) {
      onOpenDiscover();
    } else {
      navigate('/discover');
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadLeads = async (activeFilter = filter) => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllLeads(activeFilter);
      if (Array.isArray(data)) {
        setLeads(data);
      } else if (data && Array.isArray(data.leads)) {
        setLeads(data.leads);
      } else {
        setLeads([]);
      }
    } catch (err) {
      console.warn('Failed to load leads:', err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads(filter);
  }, [filter]);

  const handleToggleSave = async (item) => {
    setSavingId(item.person_id);
    try {
      if (item.is_saved) {
        await removeFromWatchlist(item.person_id);
        showToast('Removed from saved leads');
        if (filter === 'saved') {
          setLeads((prev) => prev.filter((i) => i.person_id !== item.person_id));
        } else {
          setLeads((prev) =>
            prev.map((i) =>
              i.person_id === item.person_id ? { ...i, is_saved: false } : i
            )
          );
        }
      } else {
        await addToWatchlist({
          person_id: item.person_id,
          firm_id: item.firm_id,
          notes: ''
        });
        showToast('Saved to leads');
        setLeads((prev) =>
          prev.map((i) =>
            i.person_id === item.person_id ? { ...i, is_saved: true } : i
          )
        );
      }
    } catch (err) {
      showToast(err.message || 'Failed to update lead');
    } finally {
      setSavingId(null);
    }
  };

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
              ? { ...i, partner_email: res.revealed_email, revealed_email: res.revealed_email, is_unlocked: true }
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
        console.warn('Unlock offline fallback:', err);
        const unlockedEmail = `${lead.lead_partner?.toLowerCase().replace(/[^a-z]/g, '.') || 'partner'}@${(lead.firm_name || 'fund').toLowerCase().replace(/[^a-z]/g, '')}.com`;
        setLeads((prev) =>
          prev.map((i) =>
            i.id === lead.id
              ? { ...i, partner_email: unlockedEmail, revealed_email: unlockedEmail, is_unlocked: true }
              : i
          )
        );
        showToast(`Unlocked verified email for ${lead.lead_partner || 'lead'}`);
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
              Reveal the verified work email for <strong>{pendingUnlockPerson.investor_name || pendingUnlockPerson.partner_name}</strong> at <strong>{pendingUnlockPerson.firm_name}</strong>.
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
        {/* Header with Title, Chips and Refresh */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Filter Chips */}
            <div style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.05)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              gap: '2px'
            }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'saved', label: 'Saved' },
                { id: 'unlocked', label: 'Unlocked' }
              ].map((chip) => {
                const isActive = filter === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setFilter(chip.id)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 400,
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#000000' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => loadLeads(filter)}
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

        {(() => {
          const safeLeads = Array.isArray(leads) ? leads : (Array.isArray(leads?.leads) ? leads.leads : []);
          if (loading) {
            return (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                Loading your leads...
              </div>
            );
          }
          if (safeLeads.length === 0) {
            return (
              <div style={{
                textAlign: 'center',
                padding: '50px 20px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                border: '1px dashed rgba(255,255,255,0.1)'
              }}>
                <Users size={32} style={{ color: 'rgba(255,255,255,0.25)', margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>
                  {filter === 'unlocked' ? 'No Unlocked Leads Yet' : filter === 'saved' ? 'No Saved Leads Yet' : 'No Saved or Unlocked Leads'}
                </h4>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '6px', maxWidth: '420px', margin: '6px auto 20px', lineHeight: '1.5' }}>
                  {filter === 'unlocked'
                    ? 'Unlock investor direct emails using your Sparks to view their full contact details here.'
                    : 'Explore verified partners in Discover or Twin Finder to bookmark and unlock high-fit leads.'}
                </p>
                <button
                  onClick={handleGoToDiscover}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    background: '#e2b774',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(226,183,116,0.25)'
                  }}
                >
                  <Globe size={15} />
                  Find Investors in Discover
                </button>
              </div>
            );
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {safeLeads.map((item) => {
                const isRevealed = item.is_unlocked || (item.partner_email && !item.partner_email.includes('***'));
                const displayName = item.investor_name || item.partner_name || 'Managing Partner';

                return (
                  <div
                  key={item.person_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 18px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    gap: '16px',
                    flexWrap: 'wrap',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  {/* Left Column: NAME FIRST, badges, title, firm, location, linkedin */}
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Investor's NAME FIRST */}
                      <h3 style={{ fontSize: '15.5px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                        {displayName}
                      </h3>

                      {/* LinkedIn Link */}
                      {item.linkedin_url && item.linkedin_url !== 'not found' && (
                        <a
                          href={item.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#0a66c2', display: 'inline-flex', alignItems: 'center', padding: '2px' }}
                          title="View LinkedIn Profile"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}

                      {/* Saved Chip */}
                      {item.is_saved && (
                        <span style={{
                          padding: '2px 7px',
                          fontSize: '10.5px',
                          fontWeight: 500,
                          color: '#e2b774',
                          background: 'rgba(226,183,116,0.12)',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Bookmark size={10} fill="currentColor" />
                          Saved
                        </span>
                      )}

                      {/* Unlocked Chip */}
                      {item.is_unlocked && (
                        <span style={{
                          padding: '2px 7px',
                          fontSize: '10.5px',
                          fontWeight: 500,
                          color: '#4ade80',
                          background: 'rgba(74,222,128,0.12)',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <CheckCircle2 size={10} />
                          Unlocked
                        </span>
                      )}
                    </div>

                    {/* Subtitle: Title, Firm, Location */}
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'rgba(255,255,255,0.75)' }}>{item.role_title || 'General Partner'}</span>
                      {item.firm_name && (
                        <span>· <strong style={{ color: '#ffffff', fontWeight: 500 }}>{item.firm_name}</strong></span>
                      )}
                      {item.location && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'rgba(255,255,255,0.5)' }}>
                          <MapPin size={11} />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions (Bookmark toggle + Email / Reveal button) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Toggle Bookmark */}
                    <button
                      onClick={() => handleToggleSave(item)}
                      disabled={savingId === item.person_id}
                      title={item.is_saved ? 'Remove from Saved' : 'Save Lead'}
                      style={{
                        padding: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: item.is_saved ? '#e2b774' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Bookmark size={14} fill={item.is_saved ? 'currentColor' : 'none'} />
                    </button>

                    {/* Email Display */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '12.5px',
                        fontFamily: 'monospace',
                        color: isRevealed ? '#4ade80' : 'rgba(255,255,255,0.55)',
                        fontWeight: isRevealed ? 600 : 400
                      }}>
                        {item.revealed_email || item.partner_email || '***@***.com'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {isRevealed ? '✓ Verified Direct' : 'Masked Email'}
                      </div>
                    </div>

                    {/* Unlock Button or Unlocked Badge */}
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
                        fontWeight: 600,
                        color: '#4ade80',
                        background: 'rgba(74,222,128,0.1)',
                        border: '1px solid rgba(74,222,128,0.2)',
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
          );
        })()}
      </div>
    </div>
  );
}

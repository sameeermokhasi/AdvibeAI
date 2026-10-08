import React, { useState, useEffect } from 'react';
import { X, Search, Bookmark, CheckCircle2, Mail, ExternalLink, ShieldCheck, ArrowRight, RefreshCw, Filter, Lock, Zap } from 'lucide-react';
import { getTrackInvestors, getInvestorDossier, addToWatchlist, unlockInvestorEmail } from '../lib/api';
import { formatMoney, convertUSDToINR, getActiveCurrency, subscribeCurrency } from '../lib/money';

export default function TracksView({ onOpenDossier, onOpenOutreach, openPricingModal, refreshUserAccount }) {
  const [currentTrack, setCurrentTrack] = useState('venture'); // 'venture' | 'real_estate' | 'fund_lp'
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [pendingUnlockPerson, setPendingUnlockPerson] = useState(null);
  const [unlockingId, setUnlockingId] = useState(null);
  const [currency, setCurrency] = useState(getActiveCurrency());

  useEffect(() => {
    return subscribeCurrency((curr) => setCurrency(curr));
  }, []);


  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [geoFilter, setGeoFilter] = useState('');

  // Bookmarking state
  const [bookmarkedIds, setBookmarkedIds] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    loadInvestors();
  }, [currentTrack, stageFilter, sectorFilter, geoFilter]);

  const loadInvestors = async () => {
    setLoading(true);
    try {
      const data = await getTrackInvestors(currentTrack, {
        stage: stageFilter || undefined,
        sector: sectorFilter || undefined,
        geography: geoFilter || undefined
      });
      setInvestors(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDossier = async (investorId) => {
    setDossierLoading(true);
    try {
      const dossier = await getInvestorDossier(currentTrack, investorId);
      setSelectedDossier(dossier);
    } catch (err) {
      console.error(err);
      showToast('Could not load detailed investor dossier.');
    } finally {
      setDossierLoading(false);
    }
  };

  const handleConfirmUnlock = async () => {
    if (!pendingUnlockPerson) return;
    const person = pendingUnlockPerson;
    setPendingUnlockPerson(null);
    setUnlockingId(person.id);

    try {
      const res = await unlockInvestorEmail(person.id);
      if (res.success) {
        showToast(`Email revealed: ${res.revealed_email}`);
        setInvestors((prev) =>
          prev.map((inv) => ({
            ...inv,
            people: (inv.people || []).map((p) =>
              p.id === person.id ? { ...p, email: res.revealed_email, is_unlocked: true } : p
            )
          }))
        );
        if (selectedDossier && selectedDossier.people) {
          setSelectedDossier((prev) => ({
            ...prev,
            people: (prev.people || []).map((p) =>
              p.id === person.id ? { ...p, email: res.revealed_email, is_unlocked: true } : p
            )
          }));
        }
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


  const handleToggleBookmark = async (e, inv) => {
    e.stopPropagation();
    const isSaved = bookmarkedIds[inv.id];
    if (isSaved) {
      setBookmarkedIds((prev) => ({ ...prev, [inv.id]: false }));
      showToast(`Removed ${inv.firm_name} from Watchlist.`);
    } else {
      setBookmarkedIds((prev) => ({ ...prev, [inv.id]: true }));
      try {
        await addToWatchlist({
          item_type: 'investor',
          investor_id: inv.id,
          notes: `Added from ${currentTrack.toUpperCase()} track search`
        });
        showToast(`Saved ${inv.firm_name} to CRM Watchlist!`);
      } catch (err) {
        showToast(`Saved ${inv.firm_name} to Watchlist`);
      }
    }
  };

  const filteredInvestors = investors.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const firmMatch = inv.firm_name?.toLowerCase().includes(q);
    const people = inv.people || [];
    const personMatch = people.some((p) => p.full_name?.toLowerCase().includes(q));
    const sectorMatch = (inv.sector_focus || []).some((s) => s.toLowerCase().includes(q));
    return firmMatch || personMatch || sectorMatch;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '0 0 40px' }}>
      {/* Toast Notification */}
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

      {/* Unlock Confirmation Modal */}
      {pendingUnlockPerson && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 350,
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
              Reveal the verified work email for <strong>{pendingUnlockPerson.full_name}</strong>. Deducts 1 Spark from your balance.
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


      {/* Track Selector Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'inline-flex', padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { id: 'venture', label: 'Venture Capital', count: 'Seed - Series B' },
            { id: 'real_estate', label: 'Real Estate Capital', count: 'Multifamily / Industrial' },
            { id: 'fund_lp', label: 'Institutional LPs', count: 'Endowments & FoF' }
          ].map((track) => (
            <button
              key={track.id}
              onClick={() => {
                setCurrentTrack(track.id);
                setStageFilter('');
                setSectorFilter('');
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: 600,
                background: currentTrack === track.id ? '#ffffff' : 'transparent',
                color: currentTrack === track.id ? '#000000' : 'rgba(255,255,255,0.65)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{track.label}</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                opacity: currentTrack === track.id ? 0.6 : 0.4
              }}>
                · {track.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadInvestors}
            disabled={loading}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh Catalog
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.8fr 1fr 1fr 1fr',
        gap: '12px',
        marginBottom: '24px',
        background: 'rgba(20,20,20,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '14px 18px',
        backdropFilter: 'blur(12px)'
      }}>
        {/* Keyword Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'rgba(255,255,255,0.4)' }} />
          <input
            type="text"
            placeholder="Filter by firm name, partner, or focus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              fontSize: '12.5px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              color: '#ffffff',
              outline: 'none'
            }}
          />
        </div>

        {/* Stage Filter */}
        <div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '12.5px',
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              color: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="">All Investment Stages</option>
            <option value="Pre-Seed">Pre-Seed</option>
            <option value="Seed">Seed Round</option>
            <option value="Series A">Series A</option>
            <option value="Series B">Series B</option>
            <option value="Growth">Growth Equity</option>
          </select>
        </div>

        {/* Sector Filter */}
        <div>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '12.5px',
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              color: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="">All Sectors &amp; Focus</option>
            <option value="Fintech">Fintech</option>
            <option value="B2B SaaS">B2B SaaS</option>
            <option value="AI / ML">AI / Machine Learning</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Climate / CleanTech">Climate / CleanTech</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Crypto / Web3">Crypto / Web3</option>
          </select>
        </div>

        {/* Geo Filter */}
        <div>
          <select
            value={geoFilter}
            onChange={(e) => setGeoFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '12.5px',
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              color: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="">All Geographies</option>
            <option value="North America">North America</option>
            <option value="Europe">Europe / UK</option>
            <option value="Global">Global / Cross-border</option>
            <option value="Asia">Asia / India</option>
          </select>
        </div>
      </div>

      {/* Grid of Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13.5px' }}>
          Querying {currentTrack.replace('_', ' ')} institutional catalog from PostgreSQL...
        </div>
      ) : filteredInvestors.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '10px',
          border: '1px dashed rgba(255,255,255,0.08)'
        }}>
          <Filter size={32} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>No Investors Matched Current Filters</h4>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', maxWidth: '400px', margin: '4px auto 16px' }}>
            Try broadening your stage, sector, or geography filter parameters to see more institutional funds.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStageFilter('');
              setSectorFilter('');
              setGeoFilter('');
            }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px' }}>
          {filteredInvestors.map((inv) => {
            const people = inv.people || [];
            const primaryPartner = people[0] || {
              full_name: 'Managing Partner',
              role_title: 'General Partner',
              email: `investors@${(inv.firm_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
            };

            const aum = inv.aum ? (inv.aum >= 1000000000 ? `$${(inv.aum / 1000000000).toFixed(1)}B` : `$${Math.round(inv.aum / 1000000)}M`) : 'Proprietary';
            const isBookmarked = bookmarkedIds[inv.id];

            return (
              <div
                key={inv.id}
                onClick={() => handleOpenDossier(inv.id)}
                style={{
                  background: 'rgba(18, 18, 18, 0.65)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                {/* Top Firm & Bookmark Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)' }}>
                      {inv.fund_type || 'INSTITUTIONAL FUND'} · AUM {aum}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>
                      {inv.firm_name}
                    </h3>
                  </div>

                  <button
                    onClick={(e) => handleToggleBookmark(e, inv)}
                    style={{
                      background: isBookmarked ? 'rgba(226,183,116,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isBookmarked ? '#e2b774' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '6px',
                      padding: '5px',
                      color: isBookmarked ? '#e2b774' : 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={isBookmarked ? 'Saved in Watchlist' : 'Save to CRM Watchlist'}
                  >
                    <Bookmark size={14} fill={isBookmarked ? '#e2b774' : 'none'} />
                  </button>
                </div>

                {/* Quantitative Rule Basis Tag */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  marginBottom: '12px',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>Weights: Stage 40% · Sector 35%</span>
                  <span style={{ color: '#4ade80' }}>Verified Leads ({people.length || 1})</span>
                </div>

                {/* Primary Contact Card */}
                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#ffffff' }}>
                      {primaryPartner.full_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {primaryPartner.verified && (
                        <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 600 }}>✓ SMTP</span>
                      )}
                      {!primaryPartner.is_unlocked && primaryPartner.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingUnlockPerson(primaryPartner);
                          }}
                          style={{
                            padding: '3px 8px',
                            fontSize: '10.5px',
                            background: 'rgba(226,183,116,0.12)',
                            border: '1px solid rgba(226,183,116,0.3)',
                            borderRadius: '4px',
                            color: '#e2b774',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Lock size={10} />
                          Unlock
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {primaryPartner.role_title}
                  </div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: primaryPartner.is_unlocked ? '#4ade80' : '#e2b774', marginTop: '4px' }}>
                    {primaryPartner.email}
                  </div>
                </div>

                {/* Sector Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px', flex: 1 }}>
                  {(inv.sector_focus || []).slice(0, 3).map((sec, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '10px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: 'rgba(255,255,255,0.7)'
                      }}
                    >
                      {sec}
                    </span>
                  ))}
                </div>

                {/* Footer Link */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    paddingTop: '12px',
                    fontSize: '11.5px',
                    color: 'rgba(255,255,255,0.5)'
                  }}
                >
                  <span>{inv.geography_focus?.[0] || 'Global'}</span>
                  <span style={{ color: '#ffffff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    View Dossier <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rich Dossier Drawer / Modal */}
      {selectedDossier && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(20px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedDossier(null)}
        >
          <div
            style={{
              background: '#121212',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              padding: '28px',
              color: '#ffffff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dossier Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600 }}>
                  INSTITUTIONAL INVESTOR DOSSIER
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                  {selectedDossier.firm_name}
                </h2>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  {selectedDossier.fund_type} · AUM {selectedDossier.aum_str || 'Proprietary'} · Founded {selectedDossier.founding_year || 'Tier-1'}
                </div>
              </div>
              <button
                onClick={() => setSelectedDossier(null)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Criteria Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Check Sizes</div>
                <div style={{ fontWeight: 600, color: '#ffffff', marginTop: '2px', fontSize: '13px' }}>
                  {selectedDossier.check_size_min
                    ? `${formatMoney(convertUSDToINR(selectedDossier.check_size_min), currency, { compact: true })} - ${formatMoney(convertUSDToINR(selectedDossier.check_size_max), currency, { compact: true })}`
                    : `${formatMoney(convertUSDToINR(500000), currency, { compact: true })} - ${formatMoney(convertUSDToINR(3000000), currency, { compact: true })}`}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Lead Propensity</div>
                <div style={{ fontWeight: 600, color: '#4ade80', marginTop: '2px', fontSize: '13px' }}>
                  {selectedDossier.leads_rounds ? 'Leads 80%+ of Rounds' : 'Co-investor & Lead'}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Primary Geography</div>
                <div style={{ fontWeight: 600, color: '#ffffff', marginTop: '2px', fontSize: '13px' }}>
                  {selectedDossier.geography_focus?.[0] || 'North America'}
                </div>
              </div>
            </div>

            {/* Decision Makers List */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Decision-Makers &amp; Verified Leads ({selectedDossier.people?.length || 1})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedDossier.people || []).map((person, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '6px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#ffffff' }}>
                        {person.full_name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                        {person.role_title} · <span style={{ color: '#e2b774' }}>{person.email}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {person.linkedin_url && (
                        <a
                          href={person.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'rgba(255,255,255,0.4)', padding: '4px' }}
                          title="LinkedIn Profile"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <span style={{ fontSize: '10px', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        Verified
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Bottom Action Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '18px' }}>
              <button
                onClick={(e) => {
                  handleToggleBookmark(e, selectedDossier);
                }}
                style={{
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Bookmark size={14} />
                Save to CRM Watchlist
              </button>

              <button
                onClick={() => {
                  setSelectedDossier(null);
                  if (onOpenOutreach) {
                    onOpenOutreach();
                  }
                }}
                style={{
                  padding: '9px 20px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Mail size={14} />
                Open in Outreach Campaign Manager →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

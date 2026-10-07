import React, { useState, useEffect } from 'react';
import { getPlaybookResources, claimPlaybook } from '../lib/api';

export default function PlaybookLibraryView({ userAccount, refreshUserAccount, openPricingModal }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    loadPlaybooks();
  }, []);

  const loadPlaybooks = async () => {
    setLoading(true);
    try {
      const data = await getPlaybookResources();
      setResources(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (resource) => {
    if (resource.is_claimed) {
      alert(`Downloading '${resource.title}'...`);
      return;
    }

    setClaimingId(resource.id);
    try {
      const res = await claimPlaybook(resource.id);
      alert(res.message);
      loadPlaybooks();
      if (refreshUserAccount) refreshUserAccount();
    } catch (err) {
      alert(err.message || 'Could not claim resource. Upgrade your plan for more claims.');
      if (openPricingModal) openPricingModal();
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600 }}>
            PLAYBOOK LIBRARY · CURATED RESOURCES
          </span>
          <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '28px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '4px' }}>
            Fundraising Playbooks &amp; Curated Lists
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '6px' }}>
            Guides are free on every plan. Curated investor lists are unlocked using monthly list claims (shared across your workspace).
          </p>
        </div>

        <div style={{ background: 'rgba(226, 183, 116, 0.1)', border: '1px solid rgba(226, 183, 116, 0.25)', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', color: '#ffffff' }}>
          <span>Monthly List Claims Left: </span>
          <strong style={{ color: '#e2b774', fontSize: '14px' }}>
            {userAccount?.playbook_claims_balance ?? 1}
          </strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {resources.map((item) => (
          <div
            key={item.id}
            style={{
              background: 'rgba(20, 20, 20, 0.65)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: item.is_guide ? 'rgba(74, 222, 128, 0.15)' : 'rgba(226, 183, 116, 0.15)',
                  color: item.is_guide ? '#4ade80' : '#e2b774',
                  fontWeight: 600
                }}
              >
                {item.category}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                {item.items_count} items
              </span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
              {item.title}
            </h3>

            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', flex: 1, marginBottom: '18px' }}>
              {item.description}
            </p>

            <button
              onClick={() => handleClaim(item)}
              disabled={claimingId === item.id}
              className="btn btn-solid"
              style={{
                width: '100%',
                padding: '9px',
                fontSize: '12.5px',
                borderRadius: '6px',
                background: item.is_claimed ? 'rgba(255,255,255,0.1)' : '#ffffff',
                color: item.is_claimed ? '#ffffff' : '#000000',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {item.is_claimed ? '✓ Access / Download' : claimingId === item.id ? 'Claiming...' : 'Claim List (1 Claim)'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

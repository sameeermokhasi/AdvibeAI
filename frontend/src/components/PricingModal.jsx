import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function PricingModal({ isOpen, onClose, userAccount }) {
  const [interval, setInterval] = useState('monthly'); // 'monthly' | 'quarterly' | 'annual'

  if (!isOpen) return null;

  // Pricing matrix
  const pricingData = {
    solo: {
      name: 'Solo',
      monthly: 59,
      quarterly: 53,
      annual: 47,
      sparks: '150 Sparks/mo',
      investors: '~150 investors',
      claims: '3 Playbook list claims/mo',
      desc: 'Single-operator entry tier.'
    },
    starter: {
      name: 'Starter',
      monthly: 179,
      quarterly: 161,
      annual: 143,
      sparks: '500 Sparks/mo',
      investors: '~500 investors',
      claims: '6 Playbook list claims/mo',
      desc: 'For active fundraises.'
    },
    growth: {
      name: 'Growth',
      popular: true,
      monthly: 529,
      quarterly: 476,
      annual: 423,
      sparks: '1,500 Sparks/mo',
      investors: '~1,500 investors',
      claims: '12 Playbook list claims/mo',
      desc: 'Most teams pick this.'
    },
    pro: {
      name: 'Pro',
      monthly: 1059,
      quarterly: 953,
      annual: 847,
      sparks: '3,000 Sparks/mo',
      investors: '~3,000 investors',
      claims: 'Unlimited list claims',
      desc: 'For serial raisers, agencies, and large funds.'
    }
  };

  const handleSelectPlan = (tier) => {
    alert(`Redirecting to secure checkout for ${tier.toUpperCase()} (${interval} billing)...`);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(24px)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0d0d0d',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          maxWidth: '1080px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '36px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#e2b774', fontWeight: 600 }}>
            PRICING · TRANSPARENT &amp; USAGE-BASED
          </span>
          <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '30px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.025em', marginTop: '6px' }}>
            Priced like a tool. Not a retainer<span style={{ color: '#e2b774' }}>.</span>
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '8px', maxWidth: '640px', margin: '8px auto 0' }}>
            Same institutional engine on every plan. Monthly pool of Sparks: 1 Spark per verified contact. Lookalike Twin Finder and bulk Resolve included. Cancel anytime.
          </p>
        </div>

        {/* Free Trial Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            background: 'rgba(226, 183, 116, 0.05)',
            border: '1px solid rgba(226, 183, 116, 0.25)',
            borderRadius: '8px',
            marginBottom: '28px'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e2b774', fontWeight: 600 }}>
              Free Trial
            </div>
            <div style={{ fontSize: '13.5px', color: '#ffffff', marginTop: '2px' }}>
              <strong>10 free Sparks + 25 free ADDY messages on signup.</strong> No credit card required.
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>
            Active on your account
          </span>
        </div>

        {/* Interval Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              gap: '4px'
            }}
          >
            <button
              onClick={() => setInterval('monthly')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 500,
                background: interval === 'monthly' ? '#ffffff' : 'transparent',
                color: interval === 'monthly' ? '#000000' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer'
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('quarterly')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 500,
                background: interval === 'quarterly' ? '#ffffff' : 'transparent',
                color: interval === 'quarterly' ? '#000000' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer'
              }}
            >
              Quarterly <span style={{ fontSize: '10px', color: '#e2b774', marginLeft: '4px' }}>Save 10%</span>
            </button>
            <button
              onClick={() => setInterval('annual')}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 500,
                background: interval === 'annual' ? '#ffffff' : 'transparent',
                color: interval === 'annual' ? '#000000' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer'
              }}
            >
              Annually <span style={{ fontSize: '10px', color: '#e2b774', marginLeft: '4px' }}>Save 20%</span>
            </button>
          </div>
        </div>

        {/* 4 Tiers Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '36px' }}>
          {Object.entries(pricingData).map(([tierKey, plan]) => {
            const price = plan[interval];
            return (
              <div
                key={tierKey}
                style={{
                  background: plan.popular ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: plan.popular ? '1px solid #e2b774' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {plan.popular && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#e2b774',
                      color: '#000000',
                      fontSize: '9.5px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}
                  >
                    Popular
                  </span>
                )}

                <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                  {plan.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
                  <span style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '34px', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff', lineHeight: 1 }}>
                    ${price}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>/mo</span>
                </div>

                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#ffffff', marginBottom: '2px' }}>
                  {plan.sparks}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>
                  {plan.investors}
                </div>
                <div style={{ fontSize: '11px', color: '#e2b774', marginBottom: '16px' }}>
                  {plan.claims}
                </div>

                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', flex: 1, marginBottom: '20px', lineHeight: '1.45' }}>
                  {plan.desc}
                </p>

                <button
                  onClick={() => handleSelectPlan(tierKey)}
                  className="btn btn-solid"
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    fontSize: '12.5px',
                    borderRadius: '6px',
                    background: plan.popular ? '#ffffff' : 'rgba(255,255,255,0.1)',
                    border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    color: plan.popular ? '#000000' : '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Choose {plan.name}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature Checklist */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '24px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e2b774', fontWeight: 600, marginBottom: '14px' }}>
            Every plan includes
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 24px', fontSize: '12.5px', color: 'rgba(255,255,255,0.8)' }}>
            <div>✓ ADDY Agent: One chat that finds investors, runs outreach, and schedules it all (100 messages/mo, then 5 messages/Spark)</div>
            <div>✓ Full institutional catalog across Venture, Real Estate, and LP tracks</div>
            <div>✓ Twin Finder: Describe your raise, get firms that funded companies like yours</div>
            <div>✓ Bulk firm Resolve enrichment: Paste or upload your own firm list</div>
            <div>✓ Verified work email + LinkedIn URL + phone on decision makers</div>
            <div>✓ Rich investor dossiers: AUM, vintage, stage focus, recent deals led</div>
            <div>✓ Team seats: Add teammates for $20/seat/mo, sharing one Sparks pool</div>
            <div>✓ CSV and XLSX ranked exports with identical schemas across tracks</div>
            <div>✓ Playbook library fundraising guides free on every tier</div>
            <div>✓ Unused Sparks do not expire while your subscription is active</div>
          </div>
        </div>
      </div>
    </div>
  );
}

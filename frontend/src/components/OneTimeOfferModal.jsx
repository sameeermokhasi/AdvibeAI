import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { claimDiscount } from '../lib/api';
import { formatMoney, getActiveCurrency, subscribeCurrency } from '../lib/money';

export default function OneTimeOfferModal({ isOpen, onClose, onClaimSuccess }) {
  const [claiming, setClaiming] = useState(false);
  const [currency, setCurrency] = useState(getActiveCurrency());

  useEffect(() => {
    return subscribeCurrency((newCurr) => setCurrency(newCurr));
  }, []);

  if (!isOpen) return null;

  const handleClaim = async (tier = 'solo') => {
    setClaiming(true);
    try {
      const res = await claimDiscount(tier, 'monthly');
      alert(res.message);
      if (onClaimSuccess) onClaimSuccess(res);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Discount activated for your next checkout session!');
      onClose();
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(20px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="offer-box"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', textAlign: 'left' }}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Tag */}
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#e2b774', fontWeight: 600, marginBottom: '12px' }}>
          ONE-TIME OFFER
        </div>

        {/* Headline */}
        <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '28px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: '14px' }}>
          Take 10% off your first month<span style={{ color: '#e2b774' }}>.</span>
        </h2>

        {/* Description */}
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', marginBottom: '20px' }}>
          New accounts only. Applies to any monthly plan when you check out in the next session. Cancel anytime, no card stored if you don't want to keep going.
        </p>

        {/* Pricing Box */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(226, 183, 116, 0.25)',
            borderRadius: '8px',
            padding: '18px',
            marginBottom: '24px'
          }}
        >
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontWeight: 600 }}>
            AFTER 10% OFF
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Solo</span>
              <span><strong style={{ color: '#ffffff', fontSize: '15px' }}>{formatMoney(4499, currency, { decimals: 0 })}</strong><span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>/mo</span></span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Starter</span>
              <span><strong style={{ color: '#ffffff', fontSize: '15px' }}>{formatMoney(13499, currency, { decimals: 0 })}</strong><span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>/mo</span></span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Growth</span>
              <span><strong style={{ color: '#ffffff', fontSize: '15px' }}>{formatMoney(40499, currency, { decimals: 0 })}</strong><span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>/mo</span></span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Pro</span>
              <span><strong style={{ color: '#ffffff', fontSize: '15px' }}>{formatMoney(80999, currency, { decimals: 0 })}</strong><span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>/mo</span></span>
            </div>
          </div>
        </div>

        {/* Claim CTA */}
        <button
          className="btn btn-solid"
          style={{
            width: '100%',
            height: '46px',
            background: '#ffffff',
            color: '#000000',
            fontWeight: 600,
            fontSize: '14px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '14px'
          }}
          disabled={claiming}
          onClick={() => handleClaim('solo')}
        >
          {claiming ? 'Claiming discount...' : 'Claim 10% off →'}
        </button>

        {/* Secondary dismissal */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.45)',
              cursor: 'pointer'
            }}
          >
            No thanks, I'll stay on the trial
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  Plus,
  QrCode,
  CreditCard,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Check,
  Smartphone
} from 'lucide-react';
import {
  topUpSparks,
  createRazorpayOrder,
  verifyRazorpayPayment,
  createQrPayment,
  getQrPaymentStatus,
  submitManualPayment
} from '../lib/api';
import { formatMoney, getActiveCurrency, subscribeCurrency } from '../lib/money';

export default function PricingModal({ isOpen, onClose, userAccount, refreshUserAccount }) {
  const [interval, setInterval] = useState('monthly'); // 'monthly' | 'quarterly' | 'annual'
  const [currency, setCurrency] = useState(getActiveCurrency());

  // Checkout flow state: null | { itemType: 'plan' | 'sparks_pack', itemId: string, name: string, price: number, interval: string, sparks: string }
  const [selectedItem, setSelectedItem] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('qr'); // 'qr' | 'razorpay' | 'phonepe'

  // Dynamic QR state
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins (in seconds)
  const [isQrExpired, setIsQrExpired] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Manual PhonePe UTR state
  const [utrNumber, setUtrNumber] = useState('');
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrStatus, setUtrStatus] = useState(null);
  const [manualQrEnabled, setManualQrEnabled] = useState(true);

  // Razorpay standard checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [topUpMsg, setTopUpMsg] = useState('');
  const [toppingUp, setToppingUp] = useState(false);

  useEffect(() => {
    return subscribeCurrency((newCurr) => setCurrency(newCurr));
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleModalClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleModalClose = () => {
    setSelectedItem(null);
    setQrData(null);
    setPaymentSuccessData(null);
    setUtrStatus(null);
    setUtrNumber('');
    onClose();
  };

  // 15-minute countdown timer for active QR code
  useEffect(() => {
    if (!qrData || isQrExpired || paymentSuccessData) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsQrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrData, isQrExpired, paymentSuccessData]);

  // Polling payment status every 3 seconds
  useEffect(() => {
    if (!qrData?.qr_id || isQrExpired || paymentSuccessData) return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await getQrPaymentStatus(qrData.qr_id);
        if (res?.paid) {
          clearInterval(pollInterval);
          setPaymentSuccessData({
            message: `Payment received! ${res.sparks_credited || qrData.sparks || ''} Sparks added to your account`,
            new_balance: res.new_sparks_balance
          });
          if (refreshUserAccount) {
            await refreshUserAccount();
          }
        }
      } catch (e) {
        // Silently tolerate transient polling network failures
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [qrData?.qr_id, isQrExpired, paymentSuccessData, refreshUserAccount]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Generate new Dynamic QR Code
  const handleGenerateQr = async (item) => {
    setQrLoading(true);
    setQrError('');
    setIsQrExpired(false);
    setPaymentSuccessData(null);
    setTimeLeft(900);
    try {
      const data = await createQrPayment(item.itemId);
      setQrData(data);
      if (data?.manual_qr_enabled !== undefined) {
        setManualQrEnabled(data.manual_qr_enabled);
      }
    } catch (err) {
      setQrError(err.message || 'Failed to generate dynamic UPI QR code.');
    } finally {
      setQrLoading(false);
    }
  };

  // Plan Selection Handler
  const handleOpenCheckout = (tierKey, plan) => {
    const item = {
      itemType: 'plan',
      itemId: tierKey,
      name: plan.name,
      price: plan[interval],
      interval,
      sparks: plan.sparks
    };
    setSelectedItem(item);
    setPaymentMethod('qr');
    setUtrStatus(null);
    setUtrNumber('');
    handleGenerateQr(item);
  };

  // Razorpay Checkout Script loader
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Traditional Razorpay Checkout
  const handleRazorpayStandardCheckout = async () => {
    if (!selectedItem) return;
    setCheckoutLoading(true);
    try {
      const order = await createRazorpayOrder(selectedItem.itemType, selectedItem.itemId, selectedItem.interval);
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        // Test fallback for dev sandbox
        const verifyRes = await verifyRazorpayPayment(
          order.order_id,
          `pay_${Date.now()}`,
          `simulated_${Date.now()}`
        );
        if (verifyRes.success) {
          setPaymentSuccessData({
            message: verifyRes.message,
            new_balance: verifyRes.new_sparks_balance
          });
          if (refreshUserAccount) await refreshUserAccount();
        }
        return;
      }

      const options = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: 'INR',
        name: 'Advibe AI',
        description: `${selectedItem.name} Plan (${selectedItem.interval})`,
        order_id: order.order_id,
        modal: {
          ondismiss: () => setCheckoutLoading(false),
          escape: true,
          backdropclose: true
        },
        handler: async (response) => {
          try {
            const verifyRes = await verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            if (verifyRes.success) {
              setPaymentSuccessData({
                message: verifyRes.message,
                new_balance: verifyRes.new_sparks_balance
              });
              if (refreshUserAccount) await refreshUserAccount();
            }
          } catch (err) {
            alert(err.message || 'Payment verification failed');
          }
        },
        prefill: {
          email: userAccount?.email || '',
        },
        theme: {
          color: '#e2b774',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setCheckoutLoading(false);
        try { rzp.close(); } catch (_) {}
        const reason = resp?.error?.description || resp?.error?.reason || 'Payment cancelled or declined.';
        alert(`Payment not completed: ${reason}`);
      });
      rzp.open();
    } catch (err) {
      alert(err.message || 'Failed to initiate checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Submit 12-digit UTR for PhonePe direct
  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    const clean = utrNumber.trim();
    if (clean.length !== 12) {
      setUtrStatus({ success: false, message: 'UTR / Transaction ID must be exactly 12 alphanumeric characters.' });
      return;
    }
    setUtrSubmitting(true);
    setUtrStatus(null);
    try {
      const res = await submitManualPayment(clean, selectedItem.itemId);
      if (res?.success) {
        setUtrStatus({
          success: true,
          message: 'UTR submitted for review! Sparks will be credited immediately upon confirmation.'
        });
      }
    } catch (err) {
      setUtrStatus({
        success: false,
        message: err.message || 'Failed to submit UTR. Please verify the 12-digit reference.'
      });
    } finally {
      setUtrSubmitting(false);
    }
  };

  // Instant Sparks Top-Up
  const handleTopUp = async (amount) => {
    setToppingUp(true);
    setTopUpMsg('');
    try {
      const order = await createRazorpayOrder('sparks_pack', String(amount));
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        const res = await topUpSparks(amount, `Instant Top-Up (${amount} Sparks)`);
        if (res.success) {
          setTopUpMsg(`Added ${amount} Sparks! Balance: ${res.new_balance.toFixed(1)}`);
          if (refreshUserAccount) await refreshUserAccount();
          setTimeout(() => setTopUpMsg(''), 4000);
        }
        return;
      }

      const options = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: 'INR',
        name: 'Advibe AI',
        description: `Sparks Top-Up (+${amount} Sparks)`,
        order_id: order.order_id,
        modal: {
          ondismiss: () => setToppingUp(false),
          escape: true,
          backdropclose: true
        },
        handler: async (response) => {
          try {
            const verifyRes = await verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            if (verifyRes.success) {
              setTopUpMsg(verifyRes.message);
              if (refreshUserAccount) await refreshUserAccount();
              setTimeout(() => setTopUpMsg(''), 4000);
            }
          } catch (err) {
            alert(err.message || 'Payment verification failed');
          }
        },
        prefill: {
          email: userAccount?.email || '',
        },
        theme: {
          color: '#e2b774',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setToppingUp(false);
        try { rzp.close(); } catch (_) {}
      });
      rzp.open();
    } catch (e) {
      alert(e.message || 'Top-up failed');
    } finally {
      setToppingUp(false);
    }
  };

  // Base INR Pricing Matrix
  const pricingData = {
    solo: {
      name: 'Solo',
      monthly: 4999,
      quarterly: 4499,
      annual: 3999,
      sparks: '150 Sparks/mo',
      investors: '~150 investors',
      claims: '3 Playbook list claims/mo',
      desc: 'Single-operator entry tier.'
    },
    starter: {
      name: 'Starter',
      monthly: 14999,
      quarterly: 13499,
      annual: 11999,
      sparks: '500 Sparks/mo',
      investors: '~500 investors',
      claims: '6 Playbook list claims/mo',
      desc: 'For active fundraises.'
    },
    growth: {
      name: 'Growth',
      popular: true,
      monthly: 44999,
      quarterly: 40499,
      annual: 35999,
      sparks: '1,500 Sparks/mo',
      investors: '~1,500 investors',
      claims: '12 Playbook list claims/mo',
      desc: 'Most teams pick this.'
    },
    pro: {
      name: 'Pro',
      monthly: 89999,
      quarterly: 80999,
      annual: 71999,
      sparks: '3,000 Sparks/mo',
      investors: '~3,000 investors',
      claims: 'Unlimited list claims',
      desc: 'For serial raisers, agencies, and large funds.'
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(24px)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}
      onClick={handleModalClose}
    >
      <div
        style={{
          background: '#0d0d11',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          maxWidth: selectedItem ? '720px' : '1080px',
          width: '100%',
          maxHeight: '94vh',
          overflowY: 'auto',
          padding: '36px 32px',
          position: 'relative',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleModalClose();
          }}
          aria-label="Close pricing modal"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.75)',
            cursor: 'pointer',
            zIndex: 60,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
          }}
        >
          <X size={18} />
        </button>

        {/* =========================================================================
            CHECKOUT VIEW (When a plan is selected)
           ========================================================================= */}
        {selectedItem ? (
          <div>
            {/* Back Button */}
            <button
              onClick={() => {
                setSelectedItem(null);
                setQrData(null);
                setPaymentSuccessData(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '13px',
                cursor: 'pointer',
                marginBottom: '20px',
                padding: '4px 0'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
            >
              <ArrowLeft size={16} />
              <span>Back to all plans</span>
            </button>

            {/* PAYMENT SUCCESS SCREEN */}
            {paymentSuccessData ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: 'rgba(74, 222, 128, 0.04)',
                border: '1px solid rgba(74, 222, 128, 0.25)',
                borderRadius: '16px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(74, 222, 128, 0.15)',
                  border: '1px solid #4ade80',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  color: '#4ade80'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                  Payment Confirmed!
                </h3>
                <p style={{ fontSize: '15px', color: '#4ade80', marginBottom: '16px', fontWeight: 500 }}>
                  {paymentSuccessData.message}
                </p>
                {paymentSuccessData.new_balance != null && (
                  <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px' }}>
                    Updated Balance: <strong style={{ color: '#ffffff' }}>{Number(paymentSuccessData.new_balance).toFixed(1)} Sparks</strong>
                  </p>
                )}
                <button
                  onClick={handleModalClose}
                  style={{
                    background: '#e2b774',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 28px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Continue to Workspace
                </button>
              </div>
            ) : (
              <div>
                {/* Checkout Header: Plan details summary */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  marginBottom: '24px'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e2b774', fontWeight: 600 }}>
                      Selected Plan
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: '2px 0 0' }}>
                      Advibe {selectedItem.name} ({selectedItem.interval})
                    </h3>
                    <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                      Includes {selectedItem.sparks}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', display: 'block' }}>Total Due</span>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>
                      ₹{selectedItem.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Payment Method Switcher Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingBottom: '12px',
                  marginBottom: '24px'
                }}>
                  <button
                    onClick={() => setPaymentMethod('qr')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: paymentMethod === 'qr' ? 'rgba(226, 183, 116, 0.15)' : 'transparent',
                      border: paymentMethod === 'qr' ? '1px solid #e2b774' : '1px solid transparent',
                      color: paymentMethod === 'qr' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <QrCode size={16} style={{ color: '#e2b774' }} />
                    <span>UPI QR Code (Instant)</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('razorpay')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: paymentMethod === 'razorpay' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      border: paymentMethod === 'razorpay' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                      color: paymentMethod === 'razorpay' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <CreditCard size={16} />
                    <span>Cards, Netbanking, Wallets</span>
                  </button>

                  {manualQrEnabled && (
                    <button
                      onClick={() => setPaymentMethod('phonepe')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: paymentMethod === 'phonepe' ? 'rgba(103, 58, 183, 0.2)' : 'transparent',
                        border: paymentMethod === 'phonepe' ? '1px solid #9c27b0' : '1px solid transparent',
                        color: paymentMethod === 'phonepe' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Smartphone size={16} style={{ color: '#ba68c8' }} />
                      <span>PhonePe Direct</span>
                    </button>
                  )}
                </div>

                {/* --- TAB 1: DYNAMIC UPI QR CODE --- */}
                {paymentMethod === 'qr' && (
                  <div>
                    {qrLoading ? (
                      <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255, 255, 255, 0.6)' }}>
                        <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
                        <p style={{ fontSize: '13px' }}>Generating dynamic UPI QR code with server-verified amount...</p>
                      </div>
                    ) : isQrExpired ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 24px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '12px'
                      }}>
                        <Clock size={36} style={{ color: '#f87171', margin: '0 auto 12px' }} />
                        <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                          QR Code Expired
                        </h4>
                        <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '20px' }}>
                          For security and price protection, dynamic QR codes expire after 15 minutes.
                        </p>
                        <button
                          onClick={() => handleGenerateQr(selectedItem)}
                          style={{
                            background: '#e2b774',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 22px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Generate new QR code
                        </button>
                      </div>
                    ) : qrData ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
                        {/* QR Image Box */}
                        <div style={{
                          background: '#ffffff',
                          padding: '20px',
                          borderRadius: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                        }}>
                          <img
                            src={qrData.image_url}
                            alt="Scan UPI QR Code to pay"
                            style={{
                              width: '240px',
                              height: '240px',
                              objectFit: 'contain',
                              display: 'block'
                            }}
                          />
                          <div style={{ marginTop: '12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#666666', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              Advibe AI · UPI Single-Use QR
                            </span>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#000000', marginTop: '2px' }}>
                              ₹{qrData.amount_inr.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>

                        {/* QR Instructions & Countdown */}
                        <div>
                          {/* Countdown badge */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(226, 183, 116, 0.1)',
                            border: '1px solid rgba(226, 183, 116, 0.3)',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            marginBottom: '16px',
                            color: '#e2b774'
                          }}>
                            <Clock size={15} />
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>
                              Expires in {formatCountdown(timeLeft)}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                            Scan with any UPI app
                          </h4>
                          <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.55)', marginBottom: '16px', lineHeight: 1.45 }}>
                            Google Pay, PhonePe, Paytm, BHIM, CRED, Navi or any bank app.
                          </p>

                          {/* Instructions Box */}
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.75)',
                            lineHeight: 1.6,
                            marginBottom: '16px'
                          }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ color: '#e2b774', fontWeight: 700 }}>1.</span>
                              <span>Open your camera or preferred UPI scanner.</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ color: '#e2b774', fontWeight: 700 }}>2.</span>
                              <span>Verify recipient as <strong>Advibe AI</strong> and exact amount ₹{qrData.amount_inr}.</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span style={{ color: '#e2b774', fontWeight: 700 }}>3.</span>
                              <span>Approve payment. This screen will auto-refresh immediately.</span>
                            </div>
                          </div>

                          {/* Live Status indicator */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>
                            <RefreshCw size={13} className="spin" style={{ color: '#e2b774' }} />
                            <span>Listening for payment confirmation (polls every 3s)...</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px' }}>
                        <p style={{ color: '#f87171' }}>{qrError || 'Failed to initialize QR code.'}</p>
                        <button
                          onClick={() => handleGenerateQr(selectedItem)}
                          style={{
                            marginTop: '12px',
                            background: '#e2b774',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB 2: RAZORPAY STANDARD CHECKOUT --- */}
                {paymentMethod === 'razorpay' && (
                  <div style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                      Cards, Netbanking & Wallets
                    </h4>
                    <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.5, marginBottom: '24px' }}>
                      Pay via Credit/Debit Card (Visa, Mastercard, RuPay, Amex), Netbanking (all 50+ Indian banks), EMI, or international cards.
                    </p>

                    <button
                      onClick={handleRazorpayStandardCheckout}
                      disabled={checkoutLoading}
                      style={{
                        width: '100%',
                        padding: '14px 0',
                        background: '#ffffff',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: checkoutLoading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {checkoutLoading ? (
                        <>
                          <RefreshCw size={16} className="spin" />
                          <span>Opening Razorpay Secure Checkout...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={18} />
                          <span>Open Razorpay Secure Checkout (₹{selectedItem.price.toLocaleString('en-IN')})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* --- TAB 3: PHONEPE DIRECT (MANUAL UTR FALLBACK) --- */}
                {paymentMethod === 'phonepe' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
                    {/* User-provided PhonePe QR image from public/phonepe-qr.jpeg */}
                    <div style={{
                      background: '#181126',
                      border: '1px solid rgba(186, 104, 200, 0.3)',
                      padding: '16px',
                      borderRadius: '16px',
                      textAlign: 'center'
                    }}>
                      <img
                        src="/phonepe-qr.jpeg"
                        alt="PhonePe Direct QR"
                        style={{
                          width: '230px',
                          height: '230px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          display: 'block',
                          margin: '0 auto'
                        }}
                      />
                      <div style={{ marginTop: '10px', fontSize: '13px', color: '#e1bee7', fontWeight: 600 }}>
                        Scan with PhonePe or any UPI App
                      </div>
                    </div>

                    {/* UTR Input Form */}
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                        PhonePe Direct Transfer
                      </h4>
                      <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)', lineHeight: 1.4, marginBottom: '16px' }}>
                        Send ₹{selectedItem.price.toLocaleString('en-IN')}, then enter your 12-digit UTR/Ref number below.
                      </p>

                      {utrStatus && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          marginBottom: '14px',
                          fontSize: '12px',
                          background: utrStatus.success ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          border: utrStatus.success ? '1px solid rgba(74, 222, 128, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                          color: utrStatus.success ? '#4ade80' : '#f87171'
                        }}>
                          {utrStatus.success ? <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> : <AlertCircle size={15} style={{ flexShrink: 0 }} />}
                          <span>{utrStatus.message}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmitUtr}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '6px' }}>
                          12-Digit UTR / Transaction Ref No.
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. 529182746193"
                          style={{
                            width: '100%',
                            height: '42px',
                            background: '#1a1a24',
                            border: '1px solid rgba(255, 255, 255, 0.14)',
                            borderRadius: '8px',
                            color: '#ffffff',
                            padding: '0 12px',
                            fontSize: '14px',
                            letterSpacing: '0.08em',
                            outline: 'none',
                            boxSizing: 'border-box',
                            marginBottom: '14px'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#ba68c8'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.14)'}
                        />

                        <button
                          type="submit"
                          disabled={utrSubmitting || utrNumber.trim().length !== 12}
                          style={{
                            width: '100%',
                            height: '42px',
                            background: utrSubmitting || utrNumber.trim().length !== 12 ? 'rgba(255, 255, 255, 0.08)' : '#9c27b0',
                            color: utrSubmitting || utrNumber.trim().length !== 12 ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: utrSubmitting || utrNumber.trim().length !== 12 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          {utrSubmitting ? (
                            <>
                              <RefreshCw size={14} className="spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <span>Submit 12-Digit UTR for Verification</span>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             PLANS CATALOG VIEW (Default)
             ========================================================================= */
          <div>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#e2b774', fontWeight: 600 }}>
                PRICING · TRANSPARENT &amp; USAGE-BASED
              </span>
              <h2 style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '30px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.025em', marginTop: '6px' }}>
                Priced like a tool. Not a retainer<span style={{ color: '#e2b774' }}>.</span>
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '8px', maxWidth: '640px', margin: '8px auto 0' }}>
                Same institutional engine on every plan. Monthly pool of Sparks: 1 Spark per verified contact. Lookalike Twin Finder and bulk Resolve included. Pay with instant UPI QR or Cards.
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
                      <span style={{ fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, sans-serif', fontSize: '30px', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff', lineHeight: 1 }}>
                        {formatMoney(price, currency, { decimals: 0 })}
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
                      onClick={() => handleOpenCheckout(tierKey, plan)}
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
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <QrCode size={14} />
                      <span>Choose {plan.name}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Instant Sparks Top-Up */}
            <div style={{
              background: 'rgba(226, 183, 116, 0.05)',
              border: '1px solid rgba(226, 183, 116, 0.25)',
              borderRadius: '10px',
              padding: '20px 24px',
              marginBottom: '28px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={16} style={{ color: '#e2b774' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                    Instant Sparks Top-Up (Pay-As-You-Go)
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
                  Current balance: <strong style={{ color: '#e2b774' }}>{userAccount?.sparks_balance != null ? Number(userAccount.sparks_balance).toFixed(1) : '10.0'} Sparks</strong>. Need more reveals without changing plans?
                </p>
                {topUpMsg && (
                  <div style={{ fontSize: '12px', color: '#4ade80', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} />
                    <span>{topUpMsg}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {[10, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleTopUp(amt)}
                    disabled={toppingUp}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '8px 14px',
                      borderRadius: '6px',
                      cursor: toppingUp ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'background 0.15s'
                    }}
                  >
                    <Plus size={12} style={{ color: '#e2b774' }} />
                    <span>+{amt} Sparks</span>
                  </button>
                ))}
              </div>
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

            {/* Bottom Close Button */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                type="button"
                onClick={handleModalClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.45)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: '6px 16px',
                  textDecoration: 'underline',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)'; }}
              >
                Close and return to dashboard
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

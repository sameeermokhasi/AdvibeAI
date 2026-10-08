import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Phone, RefreshCw, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { sendPhoneOtp, verifyPhoneOtp } from '../lib/api';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'United States / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+971', country: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
];

export default function PhoneVerificationView({ userAccount, onVerificationSuccess, onSignOut }) {
  // Step: 'input_phone' | 'input_otp'
  const [step, setStep] = useState('input_phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullPhone, setFullPhone] = useState('');

  // 6-digit OTP array
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devCode, setDevCode] = useState(null);

  // Countdown timer for resend
  useEffect(() => {
    let interval;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus first OTP field when switching to OTP step
  useEffect(() => {
    if (step === 'input_otp') {
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Handle phone send
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const target = fullPhone || `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    const cleanDigits = target.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 7 || cleanDigits.length > 15) {
      setErrorMsg('Please enter a valid phone number (7-15 digits).');
      return;
    }

    const formattedPhone = target.startsWith('+') ? target : `+${target}`;
    setFullPhone(formattedPhone);
    setLoading(true);

    try {
      const res = await sendPhoneOtp(formattedPhone);
      setStep('input_otp');
      setResendCooldown(30);
      setOtp(['', '', '', '', '', '']);
      if (res?.dev_code) {
        setDevCode(res.dev_code);
        setInfoMsg(`Development Mode: OTP is ${res.dev_code}`);
      } else {
        setInfoMsg(`A 6-digit verification code was sent via SMS to ${formattedPhone}`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send verification SMS. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit change
  const handleOtpChange = (index, value) => {
    setErrorMsg('');
    // Handle only numeric input
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    // Single character
    const char = cleanVal.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    // Auto-advance to next input
    if (index < 5 && char) {
      otpRefs.current[index + 1]?.focus();
    }

    // If 6 digits complete, auto verify
    if (index === 5 || newOtp.every((d) => d !== '')) {
      const completeCode = newOtp.join('');
      if (completeCode.length === 6) {
        handleVerifyOtp(completeCode);
      }
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  // Handle paste full 6-digit code
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pastedData.length >= 6) {
      const digits = pastedData.slice(0, 6).split('');
      setOtp(digits);
      otpRefs.current[5]?.focus();
      handleVerifyOtp(pastedData.slice(0, 6));
    } else if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      otpRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  // Handle verify submission
  const handleVerifyOtp = async (codeToVerify) => {
    const code = typeof codeToVerify === 'string' ? codeToVerify : otp.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await verifyPhoneOtp(fullPhone, code);
      if (res?.success) {
        setInfoMsg('Phone number successfully verified! Loading your workspace...');
        if (onVerificationSuccess) {
          onVerificationSuccess({
            phone: fullPhone,
            phone_verified_at: new Date().toISOString(),
            sparks_balance: res.sparks_balance
          });
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#0a0a0c',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#ffffff',
      position: 'relative'
    }}>
      {/* Background radial accent */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        height: '350px',
        background: 'radial-gradient(ellipse at center, rgba(226, 183, 116, 0.08) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Main Container Card */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#121217',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '36px 32px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand / Icon Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(226, 183, 116, 0.2), rgba(226, 183, 116, 0.05))',
              border: '1px solid rgba(226, 183, 116, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e2b774'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Advibe<span style={{ color: '#e2b774' }}>.ai</span>
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', display: 'block' }}>
                Security Verification
              </span>
            </div>
          </div>

          {onSignOut && (
            <button
              onClick={onSignOut}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.45)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => e.target.style.color = '#ffffff'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.45)'}
            >
              Sign out
            </button>
          )}
        </div>

        {/* Title & Description */}
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          {step === 'input_phone' ? 'Verify your phone number' : 'Enter 6-digit SMS code'}
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, marginBottom: '24px' }}>
          {step === 'input_phone'
            ? 'To protect investor privacy, maintain data integrity, and claim your free trial Sparks, please verify a real phone number via SMS OTP.'
            : `We sent a secure one-time verification code to ${fullPhone}.`}
        </p>

        {/* Error Banner */}
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '20px',
            color: '#f87171',
            fontSize: '13px',
            lineHeight: 1.4
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Info Banner */}
        {infoMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: 'rgba(226, 183, 116, 0.1)',
            border: '1px solid rgba(226, 183, 116, 0.25)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '20px',
            color: '#e2b774',
            fontSize: '13px',
            lineHeight: 1.4
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Step 1: Input Phone */}
        {step === 'input_phone' && (
          <form onSubmit={handleSendOtp}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>
              Mobile Phone Number
            </label>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {/* Country selector */}
              <div style={{ position: 'relative', width: '130px' }}>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    background: '#1a1a22',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '0 10px',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none'
                  }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code} style={{ background: '#1a1a22', color: '#ffffff' }}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.4)'
                }}>
                  ▼
                </div>
              </div>

              {/* Number input */}
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    height: '46px',
                    background: '#1a1a22',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '0 14px',
                    fontSize: '14px',
                    letterSpacing: '0.04em',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#e2b774'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !phoneNumber.trim()}
              style={{
                width: '100%',
                height: '46px',
                background: loading || !phoneNumber.trim() ? 'rgba(255, 255, 255, 0.08)' : '#e2b774',
                color: loading || !phoneNumber.trim() ? 'rgba(255, 255, 255, 0.3)' : '#000000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading || !phoneNumber.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Input 6-Digit OTP */}
        {step === 'input_otp' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>
                  6-Digit SMS Code
                </label>
                <button
                  onClick={() => {
                    setStep('input_phone');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#e2b774',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Change number
                </button>
              </div>

              {/* 6 Input Boxes */}
              <div
                style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}
                onPaste={handlePaste}
              >
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    style={{
                      width: '48px',
                      height: '56px',
                      background: '#1a1a22',
                      border: digit ? '1px solid #e2b774' : '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '22px',
                      fontWeight: 700,
                      textAlign: 'center',
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#e2b774'}
                    onBlur={(e) => {
                      if (!digit) e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <button
              onClick={() => handleVerifyOtp()}
              disabled={loading || otp.join('').length !== 6}
              style={{
                width: '100%',
                height: '46px',
                background: loading || otp.join('').length !== 6 ? 'rgba(255, 255, 255, 0.08)' : '#e2b774',
                color: loading || otp.join('').length !== 6 ? 'rgba(255, 255, 255, 0.3)' : '#000000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading || otp.join('').length !== 6 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '16px',
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Verify and Unlock Workspace</span>
                </>
              )}
            </button>

            {/* Resend Cooldown Counter */}
            <div style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
              {resendCooldown > 0 ? (
                <span>Resend SMS code in {resendCooldown}s</span>
              ) : (
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#e2b774',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Resend verification code
                </button>
              )}
            </div>
          </div>
        )}

        {/* Security & Spam Prevention Footer Note */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.4)',
          lineHeight: 1.4
        }}>
          <Lock size={14} style={{ flexShrink: 0 }} />
          <span>
            Verified phone numbers are protected with HMAC cryptographic hashing. Limit 1 account per phone.
          </span>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

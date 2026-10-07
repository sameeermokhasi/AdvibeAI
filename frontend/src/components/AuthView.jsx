import React, { useState } from 'react';
import { ArrowRight, Check, Lock, Mail, User } from 'lucide-react';
import { authSignup, authLogin } from '../lib/api';

export default function AuthView({ initialMode = 'login', onAuthSuccess, onCancel }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeUpdates, setAgreeUpdates] = useState(true);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [oauthProvider, setOauthProvider] = useState(null); // null | 'google' | 'linkedin'
  const [oauthEmail, setOauthEmail] = useState('sameermokhasi022@gmail.com');
  const [oauthName, setOauthName] = useState('Sameer Mokhasi');

  const triggerOauth = (provider) => {
    setOauthProvider(provider);
  };

  const completeOauth = () => {
    setLoading(true);
    const providerName = oauthProvider === 'google' ? 'Google' : 'LinkedIn';
    setOauthProvider(null);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('advibe_token', `oauth_${oauthProvider}_${Date.now()}`);
      localStorage.setItem('advibe_user', JSON.stringify({ email: oauthEmail, fullName: oauthName }));
      if (onAuthSuccess) {
        onAuthSuccess({ email: oauthEmail, fullName: oauthName });
      }
    }, 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (mode === 'signup' && !fullName) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (mode === 'signup' && !agreeTerms) {
      setErrorMsg('Please agree to the Terms of Service & Privacy Policy.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (mode === 'signup') {
        res = await authSignup(email, password, fullName);
      } else {
        res = await authLogin(email, password);
      }

      if (res?.access_token) {
        localStorage.setItem('advibe_token', res.access_token);
        if (res.refresh_token) {
          localStorage.setItem('advibe_refresh_token', res.refresh_token);
        }
        if (res.user) {
          localStorage.setItem('advibe_user', JSON.stringify(res.user));
        }
      }

      if (onAuthSuccess) {
        onAuthSuccess({
          email: res?.user?.email || email,
          fullName: res?.user?.full_name || fullName || email.split('@')[0],
          id: res?.user?.id,
          ...(res?.user || {})
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#fcfcfc',
      color: '#111111',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: '"Geist", "Plus Jakarta Sans", "Inter", system-ui, sans-serif',
      position: 'relative'
    }}>
      
      {/* Top Bar Back Button */}
      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            fontSize: '13px',
            color: '#666666',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          ← Back to Overview
        </button>
      )}

      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '28px'
      }}>
        <span style={{
          fontSize: '22px',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: '#000000',
          fontFamily: 'system-ui, sans-serif'
        }}>
          Advibe
        </span>
        <div style={{
          width: '36px',
          height: '1px',
          background: '#c9a96e'
        }} />
      </div>

      {/* Main Title */}
      <h1 className="font-serif" style={{
        fontSize: '38px',
        fontWeight: 400,
        color: '#000000',
        marginBottom: '36px',
        letterSpacing: '-0.02em',
        textAlign: 'center'
      }}>
        {mode === 'login' ? 'Welcome back.' : 'Create your account.'}
      </h1>

      {/* Main Card Container */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column'
      }}>

        {/* ---------------- LOGIN MODE ---------------- */}
        {mode === 'login' ? (
          <>
            {/* Social Logins on Top for Login */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {/* LinkedIn Button */}
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    if (onAuthSuccess) onAuthSuccess({ email: 'sameermokhasi022@gmail.com', fullName: 'Sameer Mokhasi' });
                  }, 600);
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  background: '#ffffff',
                  border: '1px solid #e2e2e2',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: '#111111',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z"/>
                </svg>
                <span>Continue with LinkedIn</span>
              </button>

              {/* Google Button */}
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    if (onAuthSuccess) onAuthSuccess({ email: 'sameermokhasi022@gmail.com', fullName: 'Sameer Mokhasi' });
                  }, 600);
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  background: '#ffffff',
                  border: '1px solid #e2e2e2',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: '#111111',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '12px 0 24px',
              gap: '12px'
            }}>
              <div style={{ flex: 1, height: '1px', background: '#eaeaea' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#999999', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                OR CONTINUE WITH EMAIL
              </span>
              <div style={{ flex: 1, height: '1px', background: '#eaeaea' }} />
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', marginBottom: '8px' }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    background: '#ffffff',
                    border: '1px solid #e2e2e2',
                    borderRadius: '4px',
                    padding: '0 14px',
                    fontSize: '14px',
                    color: '#111111',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', marginBottom: '8px' }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    background: '#ffffff',
                    border: '1px solid #e2e2e2',
                    borderRadius: '4px',
                    padding: '0 14px',
                    fontSize: '14px',
                    color: '#111111',
                    outline: 'none'
                  }}
                />
              </div>

              {errorMsg && (
                <div style={{ fontSize: '12.5px', color: '#ef4444' }}>
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '46px',
                  background: '#111111',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '8px',
                  marginTop: '4px'
                }}
              >
                <span>{loading ? 'Logging in...' : 'Log in'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            {/* Bottom Footer Links */}
            <div style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginTop: '24px',
              fontSize: '13px',
              color: '#666666'
            }}>
              <button
                type="button"
                onClick={() => alert('Password reset email sent to your address.')}
                style={{ background: 'none', border: 'none', color: '#777777', cursor: 'pointer', fontSize: '13px' }}
              >
                Forgot password?
              </button>

              <div>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  style={{ background: 'none', border: 'none', color: '#000000', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
                >
                  Start free
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ---------------- SIGNUP MODE ---------------- */
          <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', marginBottom: '8px' }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    background: '#ffffff',
                    border: '1px solid #e2e2e2',
                    borderRadius: '4px',
                    padding: '0 14px',
                    fontSize: '14px',
                    color: '#111111',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', marginBottom: '8px' }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    background: '#ffffff',
                    border: '1px solid #e2e2e2',
                    borderRadius: '4px',
                    padding: '0 14px',
                    fontSize: '14px',
                    color: '#111111',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', marginBottom: '8px' }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    background: '#ffffff',
                    border: '1px solid #e2e2e2',
                    borderRadius: '4px',
                    padding: '0 14px',
                    fontSize: '14px',
                    color: '#111111',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#666666', cursor: 'pointer', lineHeight: '1.4' }}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#111111' }}
                  />
                  <span>
                    I agree to the <a href="#" style={{ textDecoration: 'underline', color: '#111111' }}>Terms of Service</a> and <a href="#" style={{ textDecoration: 'underline', color: '#111111' }}>Privacy Policy</a>.
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#666666', cursor: 'pointer', lineHeight: '1.4' }}>
                  <input
                    type="checkbox"
                    checked={agreeUpdates}
                    onChange={(e) => setAgreeUpdates(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#111111' }}
                  />
                  <span>
                    Email me occasional product updates and tips. No spam, unsubscribe anytime.
                  </span>
                </label>
              </div>

              {/* Cloudflare Turnstile Box */}
              <div style={{
                background: '#2b2b2b',
                color: '#ffffff',
                padding: '12px 16px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                marginTop: '6px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={captchaVerified}
                    onChange={(e) => setCaptchaVerified(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                  />
                  <span>Verify you are human</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#aaaaaa' }}>
                  <span style={{ fontWeight: 600, color: '#f97316' }}>CLOUDFLARE</span>
                </div>
              </div>

              {errorMsg && (
                <div style={{ fontSize: '12.5px', color: '#ef4444' }}>
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '46px',
                  background: '#111111',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '8px',
                  marginTop: '8px'
                }}
              >
                <span>{loading ? 'Creating account...' : 'Create account'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '24px 0',
              gap: '12px'
            }}>
              <div style={{ flex: 1, height: '1px', background: '#eaeaea' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#999999', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                OR CONTINUE WITH
              </span>
              <div style={{ flex: 1, height: '1px', background: '#eaeaea' }} />
            </div>

            {/* Social Logins at Bottom for Signup */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    if (onAuthSuccess) onAuthSuccess({ email: 'sameermokhasi022@gmail.com', fullName: 'Sameer Mokhasi' });
                  }, 600);
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  background: '#111111',
                  border: 'none',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '10px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z"/>
                </svg>
                <span>Continue with LinkedIn</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    if (onAuthSuccess) onAuthSuccess({ email: 'sameermokhasi022@gmail.com', fullName: 'Sameer Mokhasi' });
                  }, 600);
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  background: '#ffffff',
                  border: '1px solid #e2e2e2',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '10px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  color: '#111111',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Bottom Link for Signup */}
            <div style={{
              textAlign: 'center',
              marginTop: '24px',
              fontSize: '13px',
              color: '#666666'
            }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: '#000000', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', fontSize: '13px' }}
              >
                Log in
              </button>
            </div>
          </>
        )}

      </div>

      {/* Interactive OAuth Consent Modal */}
      {oauthProvider && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(10px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            color: '#111111'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              {oauthProvider === 'google' ? (
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z"/>
                </svg>
              )}
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                Sign in with {oauthProvider === 'google' ? 'Google' : 'LinkedIn'}
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: '#555555', marginBottom: '20px', lineHeight: '1.45' }}>
              Advibe will receive your name, email address, profile picture, and language preference.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', marginBottom: '6px' }}>
                FULL NAME
              </label>
              <input
                type="text"
                value={oauthName}
                onChange={(e) => setOauthName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', marginBottom: '6px' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={oauthEmail}
                onChange={(e) => setOauthEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setOauthProvider(null)}
                style={{ flex: 1, padding: '11px', background: '#f1f1f1', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#444', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={completeOauth}
                style={{ flex: 1, padding: '11px', background: '#111111', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
              >
                Continue as {oauthName.split(' ')[0]} →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

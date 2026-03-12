'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // TODO: connect your auth logic here
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
  };

  return (
    <AuthLayout>
      <div className="auth-header">
        <h1>Create account</h1>
        <p>Get started — it only takes a minute</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" type="text" placeholder="Jane Smith"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            required autoComplete="name" />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="you@example.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            required autoComplete="email" />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <input id="password" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              required minLength={8} autoComplete="new-password" />
            <button type="button" className="toggle-pass" onClick={() => setShowPass(!showPass)}>
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
          {form.password && (
            <div className="strength-bar">
              <div className="strength-track">
                {[1,2,3,4].map(i => (
                  <div key={i} className="strength-seg"
                    style={{ background: i <= strength ? strengthColor : 'rgba(0,0,0,0.1)' }} />
                ))}
              </div>
              <span className="strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
            </div>
          )}
        </div>

        <button type="submit" className={`btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Create account'}
        </button>
      </form>

      <div className="divider"><span>or</span></div>

      <button className="btn-oauth">
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="auth-terms">
        By creating an account you agree to our{' '}
        <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
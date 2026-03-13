'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';
import { useRouter } from 'next/navigation';


export default function LoginPage() {
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) setError(error.message);
    else router.push('https://huggingface.co/spaces/RowanMartnishn/BlackBRANDRFP');
    setLoading(false);
  };

  return (
    <AuthLayout>
      <div className="auth-header">
        <h1>Welcome back</h1>
        <p>Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="you@example.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            required autoComplete="email" />
        </div>

        <div className="field">
          <label htmlFor="password">
            Password
            <Link href="/forgot-password" className="label-link">Forgot?</Link>
          </label>
          <div className="input-wrap">
            <input id="password" type={showPass ? 'text' : 'password'} placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              required autoComplete="current-password" />
            <button type="button" className="toggle-pass" onClick={() => setShowPass(!showPass)}>
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{error}</p>
        )}

        <button type="submit" className={`btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Sign in'}
        </button>
      </form>

      <div className="divider"><span>or</span></div>

      <button className="btn-oauth">
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="auth-switch">
        Don't have an account? <Link href="/signup">Sign up</Link>
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
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/config';
import Link from 'next/link';
import AuthLayout from '@/components/AuthLayout';
import { useRouter } from 'next/navigation';

const HEX = '#7b0300';

const TAG_OPTIONS = [
  'IT Services','Cybersecurity','Cloud','Construction','Engineering',
  'Healthcare','Consulting','Logistics','Research','Training',
  'Financial Services','Environmental','Architecture','Legal','Marketing',
];

const FIELD_INFO = {
  naics_codes: 'NAICS (North American Industry Classification System) codes identify your industry. Use them to match with relevant government contracts. Find yours at census.gov/naics.',
  cage: 'CAGE (Commercial and Government Entity) code is a 5-character ID assigned by the DoD. Required for federal contracting. Register at sam.gov.',
  company_description: 'Describe what your company does and the types of work you want matched to. Be specific — this is used by our AI to rank RFP opportunities.',
  core_competencies: 'List your key strengths and expertise areas, separated by commas. Example: Cloud architecture, DevSecOps, Program management.',
};

function InfoTooltip({ field }) {
  const [open, setOpen] = useState(false);
  const info = FIELD_INFO[field];
  if (!info) return null;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'inline-flex', alignItems: 'center', lineHeight: 1,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={open ? HEX : '#9ca3af'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'stroke 0.15s' }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </button>
      {open && (
        <span style={{
          position: 'absolute', bottom: '24px', left: '50%',
          transform: 'translateX(-50%)',
          background: '#1f2937', color: '#f9fafb',
          fontSize: '11px', lineHeight: '1.5',
          padding: '8px 12px', borderRadius: '8px',
          width: '220px', zIndex: 100,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          {info}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid #1f2937',
          }} />
        </span>
      )}
    </span>
  );
}

export default function SignupPage() {
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    company_description: '', tags: [], company_name: '', website: '',
    hq_location: '', service_areas: '', contact_name: '', contact_email: '',
    contact_phone: '', naics_codes: '', cage: '', core_competencies: '', password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();

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

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleTag = (tag) => setForm(prev => ({
    ...prev,
    tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signUp({
      email: form.contact_email,
      password: form.password,
      options: {
        data: { full_name: form.contact_name },
        emailRedirectTo: `${window.location.origin}/login?confirmed=true`,
      },
    });

    if (error) { setError(error.message); setLoading(false); return; }
    if (!data?.user?.id) { setError('Unable to create user account.'); setLoading(false); return; }

    try {
      const profileBody = {
        uuid: data.user.id,
        company_name: form.company_name,
        naics_codes: form.naics_codes.split(',').map(s => s.trim()).filter(Boolean),
        cage: form.cage,
        tags: form.tags,
        location: form.hq_location,
        core_competencies: form.core_competencies.split(',').map(s => s.trim()).filter(Boolean),
        website: form.website,
        hq_location: form.hq_location,
        service_areas: form.service_areas,
        years_in_business: 0,
        uei: '',
        company_description: form.company_description,
        differentiators: '',
        past_performance: [],
        portfolio_pdf_text: '',
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
      };

      const res = await fetch(getApiUrl('/api/users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileBody),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to save profile data.');
      }

      const responseData = await res.json();
      if (responseData?.data) {
        sessionStorage.setItem('vendor_profile', JSON.stringify(responseData.data));
      }

      router.push('/login?message=Account created successfully. Please sign in.');
    } catch (err) {
      setError(`Unable to save profile data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const LabelWithInfo = ({ htmlFor, children, field }) => (
    <label htmlFor={htmlFor} style={{ display: 'flex', alignItems: 'center' }}>
      {children}
      <InfoTooltip field={field} />
    </label>
  );

  return (
    <AuthLayout logo="wordmark" compactBrand>
      <div className="auth-header">
        <h1>Create account</h1>
        <p>Start with the essentials for your company profile</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="field">
          <LabelWithInfo htmlFor="company_description" field="company_description">
            Describe your company&apos;s functions / capabilities
          </LabelWithInfo>
          <textarea id="company_description" value={form.company_description}
            onChange={e => updateField('company_description', e.target.value)}
            placeholder="Describe what your company does, the services you provide, and the work you want to be matched to."
            required />
        </div>

        <div className="field">
          <label>Choose tags associated with your business</label>
          <div className="tags-wrap">
            {TAG_OPTIONS.map(tag => (
              <button key={tag} type="button"
                className={`tag-pill ${form.tags.includes(tag) ? 'active' : ''}`}
                onClick={() => toggleTag(tag)}>{tag}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="company_name">Legal Company Name</label>
          <input id="company_name" value={form.company_name}
            onChange={e => updateField('company_name', e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="website">Website</label>
          <input id="website" type="url" value={form.website}
            onChange={e => updateField('website', e.target.value)}
            placeholder="https://example.com" />
        </div>

        <div className="field">
          <label htmlFor="hq_location">HQ Location</label>
          <input id="hq_location" value={form.hq_location}
            onChange={e => updateField('hq_location', e.target.value)}
            placeholder="City, State" />
        </div>

        <div className="field">
          <label htmlFor="service_areas">Service Areas</label>
          <input id="service_areas" value={form.service_areas}
            onChange={e => updateField('service_areas', e.target.value)}
            placeholder="e.g. Southeast US, National" />
        </div>

        <div className="field">
          <label htmlFor="contact_name">Primary Contact Name</label>
          <input id="contact_name" type="text" placeholder="Jane Smith"
            value={form.contact_name} onChange={e => updateField('contact_name', e.target.value)}
            required autoComplete="name" />
        </div>

        <div className="field">
          <label htmlFor="contact_email">Contact Email</label>
          <input id="contact_email" type="email" placeholder="you@example.com"
            value={form.contact_email} onChange={e => updateField('contact_email', e.target.value)}
            required autoComplete="email" />
        </div>

        <div className="field">
          <label htmlFor="contact_phone">Contact Phone</label>
          <input id="contact_phone" value={form.contact_phone}
            onChange={e => updateField('contact_phone', e.target.value)}
            autoComplete="tel" />
        </div>

        <div className="field">
          <LabelWithInfo htmlFor="naics_codes" field="naics_codes">NAICS Code</LabelWithInfo>
          <input id="naics_codes" value={form.naics_codes}
            onChange={e => updateField('naics_codes', e.target.value)}
            placeholder="Comma-separated if multiple" />
        </div>

        <div className="field">
          <LabelWithInfo htmlFor="cage" field="cage">CAGE Code</LabelWithInfo>
          <input id="cage" value={form.cage} onChange={e => updateField('cage', e.target.value)} />
        </div>

        <div className="field">
          <LabelWithInfo htmlFor="core_competencies" field="core_competencies">Core Competencies</LabelWithInfo>
          <textarea id="core_competencies" value={form.core_competencies}
            onChange={e => updateField('core_competencies', e.target.value)}
            placeholder="Comma-separated" />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <input id="password" type={showPass ? 'text' : 'password'}
              placeholder="Min. 8 characters" value={form.password}
              onChange={e => updateField('password', e.target.value)}
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

        {error && <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

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
      <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
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

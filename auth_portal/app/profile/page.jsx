'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

const TAGS = [
  'IT Services', 'Cybersecurity', 'Cloud', 'Construction', 'Engineering',
  'Healthcare', 'Consulting', 'Logistics', 'Research', 'Training',
  'Financial Services', 'Environmental', 'Architecture', 'Legal', 'Marketing',
];

const CERTS = [
  '8(a)', 'HUBZone', 'SDVOSB', 'WOSB', 'VOSB', 'SDB', 'SBA Certified',
];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);

  const [form, setForm] = useState({
    legal_name: '', website: '', contact_name: '', contact_email: '',
    contact_phone: '', hq_location: '', service_areas: '',
    years_in_business: '', uei: '', cage: '', naics_codes: '',
    certifications: [], company_description: '', core_competencies: '',
    differentiators: '', selected_tags: [], location_keywords: '',
    open_only: true, max_age_days: 60, top_k: 10,
    portfolio_pdf_name: '', portfolio_pdf_text: '',
    past_performance: [
      { client: '', project_title: '', scope: '', completion_year: '', contract_value: '' },
      { client: '', project_title: '', scope: '', completion_year: '', contract_value: '' },
      { client: '', project_title: '', scope: '', completion_year: '', contract_value: '' },
    ],
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);

      const { data: info, error } = await supabase
        .from('user_information')
        .select('*')
        .eq('uuid', data.user.id)
        .single();

      if (!error && info) {
        setForm(prev => ({
          ...prev,
          legal_name: info.company_name || '',
          website: info.website || '',
          contact_name: info.contact_name || '',
          contact_email: info.contact_email || '',
          contact_phone: info.contact_phone || '',
          hq_location: info.hq_location || '',
          service_areas: info.service_areas || '',
          years_in_business: info.years_in_business || '',
          uei: info.uei || '',
          cage: info.cage || '',
          naics_codes: Array.isArray(info.naics_codes)
            ? info.naics_codes.join(', ')
            : (info.naics_codes || ''),
          certifications: info.certifications
            ? info.certifications.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          company_description: info.company_description || '',
          core_competencies: Array.isArray(info.core_competencies)
            ? info.core_competencies.join(', ')
            : (info.core_competencies || ''),
          differentiators: info.differentiators || '',
          selected_tags: Array.isArray(info.tags) ? info.tags : [],
          location_keywords: info.location_keywords || '',
          open_only: info.open_only ?? true,
          max_age_days: info.max_age_days || 60,
          top_k: info.top_k || 10,
          portfolio_pdf_name: info.portfolio_pdf_name || '',
          portfolio_pdf_text: info.portfolio_pdf_text || '',
          past_performance: info.past_performance?.length
            ? [...info.past_performance, ...Array(3).fill({ client: '', project_title: '', scope: '', completion_year: '', contract_value: '' })].slice(0, 3)
            : prev.past_performance,
        }));
      }
      setLoading(false);
    };
    load();
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleTag = (t) => set('selected_tags',
    form.selected_tags.includes(t)
      ? form.selected_tags.filter(x => x !== t)
      : [...form.selected_tags, t]);

  const toggleCert = (c) => set('certifications',
    form.certifications.includes(c)
      ? form.certifications.filter(x => x !== c)
      : [...form.certifications, c]);

  const updateProject = (i, field, val) => {
    const pp = [...form.past_performance];
    pp[i] = { ...pp[i], [field]: val };
    set('past_performance', pp);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set('portfolio_pdf_text', ev.target.result);
    set('portfolio_pdf_name', file.name);
    reader.readAsText(file);
  };

  const handleSaveAndSearch = async () => {
    setSearching(true);
    setError('');
    try {
      // Save to Supabase
      await supabase.from('user_information').update({
        company_name: form.legal_name,
        website: form.website,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        hq_location: form.hq_location,
        location: form.hq_location,
        service_areas: form.service_areas,
        years_in_business: Number(form.years_in_business) || 0,
        uei: form.uei,
        cage: form.cage,
        naics_codes: form.naics_codes,
        certifications: form.certifications.join(','),
        company_description: form.company_description,
        core_competencies: form.core_competencies,
        differentiators: form.differentiators,
        tags: form.selected_tags,
        past_performance: form.past_performance.filter(p => p.project_title),
        location_keywords: form.location_keywords,
        open_only: form.open_only,
        max_age_days: Number(form.max_age_days),
        top_k: Number(form.top_k),
        portfolio_pdf_name: form.portfolio_pdf_name,
        portfolio_pdf_text: form.portfolio_pdf_text,
      }).eq('uuid', userId);

      // Build profile for recommender
      const profile = {
        legal_name: form.legal_name,
        website: form.website,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        hq_location: form.hq_location,
        service_areas: form.service_areas,
        years_in_business: Number(form.years_in_business) || 0,
        uei: form.uei,
        cage: form.cage,
        naics_codes: form.naics_codes.split(',').map(s => s.trim()).filter(Boolean),
        certifications: form.certifications,
        company_description: form.company_description,
        core_competencies: form.core_competencies.split(',').map(s => s.trim()).filter(Boolean),
        differentiators: form.differentiators.split(',').map(s => s.trim()).filter(Boolean),
        selected_tags: form.selected_tags,
        past_performance: form.past_performance.filter(p => p.project_title),
        location_keywords: form.location_keywords,
        open_only: form.open_only,
        max_age_days: Number(form.max_age_days),
        top_k: Number(form.top_k),
        portfolio_pdf_name: form.portfolio_pdf_name,
        portfolio_pdf_text: form.portfolio_pdf_text,
      };

      sessionStorage.setItem('vendor_profile', JSON.stringify(profile));
      sessionStorage.removeItem('rfp_results');

      // Fetch new recommendations
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('rfp_results', JSON.stringify(data.results));
      }

      router.push('/results');
    } catch (err) {
      setError(err.message);
      setSearching(false);
    }
  };

  const steps = ['Company', 'Capabilities', 'Preferences'];

  if (loading) return (
    <div className="shell">
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading your profile…</p>
      </div>
    </div>
  );

  return (
    <div className="shell">
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px' }}>My Profile</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Update your company details and re-run recommendations</p>
        </div>

        {/* Step tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          {steps.map((label, i) => {
            const n = i + 1;
            return (
              <button key={label} onClick={() => setStep(n)} style={{
                padding: '0.6rem 1.1rem',
                fontSize: '13px',
                fontWeight: step === n ? 600 : 500,
                color: step === n ? '#2563eb' : 'var(--text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: step === n ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}>{label}</button>
            );
          })}
        </div>

        {/* Form card */}
        <div className="form-card">
          {/* STEP 1 — Company */}
          {step === 1 && (
            <>
              <div className="field-grid">
                {[
                  ['legal_name', 'Legal Business Name'],
                  ['website', 'Website'],
                  ['contact_name', 'Contact Name'],
                  ['contact_email', 'Contact Email'],
                  ['contact_phone', 'Contact Phone'],
                  ['hq_location', 'HQ Location'],
                  ['years_in_business', 'Years in Business'],
                  ['uei', 'UEI Number'],
                  ['cage', 'CAGE Code'],
                  ['naics_codes', 'NAICS Codes (comma-separated)'],
                ].map(([key, lbl]) => (
                  <div className="float-field" key={key}>
                    <input id={key} placeholder={lbl} value={form[key]}
                      onChange={e => set(key, e.target.value)} />
                    <label htmlFor={key}>{lbl}</label>
                  </div>
                ))}
                <div className="float-field span2">
                  <input id="service_areas" placeholder="Service Areas"
                    value={form.service_areas} onChange={e => set('service_areas', e.target.value)} />
                  <label htmlFor="service_areas">Service Areas</label>
                </div>
              </div>
              <div className="divider-line" />
              <p className="section-label">Certifications</p>
              <div className="tags-wrap">
                {CERTS.map(c => (
                  <button key={c} type="button"
                    className={`tag-pill ${form.certifications.includes(c) ? 'active' : ''}`}
                    onClick={() => toggleCert(c)}>{c}</button>
                ))}
              </div>
            </>
          )}

          {/* STEP 2 — Capabilities */}
          {step === 2 && (
            <>
              <div className="field-grid single">
                <div className="float-field">
                  <textarea id="company_description" placeholder="Company Description"
                    value={form.company_description}
                    onChange={e => set('company_description', e.target.value)}
                    style={{ minHeight: 100 }} />
                  <label htmlFor="company_description">Company Description</label>
                </div>
                <div className="float-field">
                  <textarea id="core_competencies" placeholder="Core Competencies"
                    value={form.core_competencies}
                    onChange={e => set('core_competencies', e.target.value)} />
                  <label htmlFor="core_competencies">Core Competencies (comma-separated)</label>
                </div>
                <div className="float-field">
                  <textarea id="differentiators" placeholder="Differentiators"
                    value={form.differentiators}
                    onChange={e => set('differentiators', e.target.value)} />
                  <label htmlFor="differentiators">Differentiators (comma-separated)</label>
                </div>
              </div>
              <div className="divider-line" />
              <p className="section-label">Sector Tags</p>
              <div className="tags-wrap" style={{ marginBottom: '1.5rem' }}>
                {TAGS.map(t => (
                  <button key={t} type="button"
                    className={`tag-pill ${form.selected_tags.includes(t) ? 'active' : ''}`}
                    onClick={() => toggleTag(t)}>{t}</button>
                ))}
              </div>
              <div className="divider-line" />
              <p className="section-label">Past Projects</p>
              {form.past_performance.map((proj, i) => (
                <div key={i} style={{
                  border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
                  padding: '1rem', marginBottom: '0.75rem', background: 'var(--surface-raised)',
                }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-subtle)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Project {i + 1}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {[['project_title','Project Title'],['client','Client Name'],['scope','Scope'],['completion_year','Year Completed'],['contract_value','Contract Value']].map(([field, lbl]) => (
                      <div className="float-field" key={field}>
                        <input id={`p${i}_${field}`} placeholder={lbl} value={proj[field] || ''}
                          onChange={e => updateProject(i, field, e.target.value)} />
                        <label htmlFor={`p${i}_${field}`}>{lbl}</label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="divider-line" />
              <p className="section-label">Business Resume</p>
              <label htmlFor="resume-upload" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '0.4rem', padding: '1.25rem', border: '1.5px dashed var(--border)',
                borderRadius: 'var(--radius)', cursor: 'pointer',
                background: 'var(--surface-raised)', textAlign: 'center',
              }}>
                <span style={{ fontSize: '1.4rem' }}>📄</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {form.portfolio_pdf_name || 'Click to upload PDF or text file'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>PDF, TXT up to 5MB</span>
              </label>
              <input id="resume-upload" type="file" accept=".pdf,.txt"
                style={{ display: 'none' }} onChange={handleFileUpload} />
            </>
          )}

          {/* STEP 3 — Preferences */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="toggle-row">
                <span className="toggle-label">Open opportunities only</span>
                <button type="button" className={`toggle ${form.open_only ? 'on' : ''}`}
                  onClick={() => set('open_only', !form.open_only)} />
              </div>
              <div className="float-field">
                <input id="location_keywords" placeholder="e.g. Virginia, DC, Remote"
                  value={form.location_keywords}
                  onChange={e => set('location_keywords', e.target.value)} />
                <label htmlFor="location_keywords">Location Keywords</label>
              </div>
              <div className="field-group">
                <label>Max Days Until Close — <span className="range-val">{form.max_age_days} days</span></label>
                <input type="range" min="7" max="365" step="7"
                  value={form.max_age_days} onChange={e => set('max_age_days', Number(e.target.value))} />
              </div>
              <div className="field-group">
                <label>Results to Return — <span className="range-val">{form.top_k}</span></label>
                <input type="range" min="5" max="50" step="5"
                  value={form.top_k} onChange={e => set('top_k', Number(e.target.value))} />
              </div>
            </div>
          )}

          {error && <p className="auth-error" style={{ marginTop: '1rem' }}>{error}</p>}
          {success && <p style={{ marginTop: '1rem', fontSize: '13px', color: '#16a34a', textAlign: 'center' }}>{success}</p>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
            {step > 1 && (
              <button className="btn-back" onClick={() => setStep(s => s - 1)}>← Back</button>
            )}
            {step < 3 ? (
              <button className="btn-next" onClick={() => setStep(s => s + 1)}>Next →</button>
            ) : (
              <button className="btn-next" onClick={handleSaveAndSearch} disabled={searching}>
                {searching ? 'Saving…' : 'Save & Find RFPs →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
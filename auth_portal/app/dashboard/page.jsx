'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/config';

const TAGS = [
  'IT Services', 'Cybersecurity', 'Cloud', 'Construction', 'Engineering',
  'Healthcare', 'Consulting', 'Logistics', 'Research', 'Training',
  'Financial Services', 'Environmental', 'Architecture', 'Legal', 'Marketing',
];

const CERTS = [
  '8(a)', 'HUBZone', 'SDVOSB', 'WOSB', 'VOSB', 'SDB', 'SBA Certified',
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    legal_name: '',
    website: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    hq_location: '',
    service_areas: '',
    years_in_business: '',
    uei: '',
    cage: '',
    naics_codes: '',
    certifications: [],
    company_description: '',
    core_competencies: '',
    differentiators: '',
    selected_tags: [],
    location_keywords: '',
    open_only: true,
    max_age_days: 60,
    top_k: 10,
    past_performance: [],
    portfolio_pdf_text: '',
    portfolio_pdf_name: '',
  });

  const toCsvString = (value) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value || '';
  };

  const toStringArray = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((item) => String(item).trim()).filter(Boolean);
  };

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/login');
        return;
      }

      const authUser = data.user;
      setUser(authUser);

      const cached = sessionStorage.getItem('vendor_profile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          console.log('Loaded cached profile:', parsed);
          setForm((prev) => ({
            ...prev,
            ...parsed,
            legal_name: parsed.legal_name || parsed.company_name || prev.legal_name,
            naics_codes: toCsvString(parsed.naics_codes || prev.naics_codes),
            certifications: toStringArray(parsed.certifications || prev.certifications),
            selected_tags: toStringArray(parsed.selected_tags || parsed.tags || prev.selected_tags),
            location_keywords: parsed.location_keywords || parsed.location || prev.location_keywords,
            core_competencies: toCsvString(parsed.core_competencies || prev.core_competencies),
            differentiators: toCsvString(parsed.differentiators || prev.differentiators),
            past_performance: Array.isArray(parsed.past_performance) ? parsed.past_performance : prev.past_performance,
            contact_name: parsed.contact_name || authUser.user_metadata?.full_name || prev.contact_name,
            contact_email: parsed.contact_email || authUser.email || prev.contact_email,
          }));
        } catch (err) {
          console.warn('Unable to parse cached vendor profile', err);
        }
      }

      try {
        console.log('Fetching profile from API for uuid:', data.user.id);
        const resp = await fetch(getApiUrl(`/api/me?uuid=${data.user.id}`));
        if (!resp.ok) return;
        const profile = await resp.json();
        const info = profile.user_information || {};
        console.log('Fetched profile from API:', info);
        setForm((prev) => ({
          ...prev,
          legal_name: info.company_name || prev.legal_name,
          website: info.website || prev.website,
          contact_name: info.contact_name || authUser.user_metadata?.full_name || prev.contact_name,
          contact_email: info.contact_email || authUser.email || prev.contact_email,
          contact_phone: info.contact_phone || prev.contact_phone,
          hq_location: info.hq_location || prev.hq_location,
          service_areas: info.service_areas || prev.service_areas,
          years_in_business: info.years_in_business ? String(info.years_in_business) : prev.years_in_business,
          uei: info.uei || prev.uei,
          cage: info.cage || prev.cage,
          naics_codes: Array.isArray(info.naics_codes) ? info.naics_codes.join(', ') : info.naics_codes || prev.naics_codes,
          certifications: toStringArray(info.certifications || prev.certifications),
          selected_tags: toStringArray(info.tags || prev.selected_tags),
          location_keywords: info.location || prev.location_keywords,
          core_competencies: Array.isArray(info.core_competencies) ? info.core_competencies.join(', ') : info.core_competencies || prev.core_competencies,
          company_description: info.company_description || prev.company_description,
          differentiators: info.differentiators || prev.differentiators,
          past_performance: Array.isArray(info.past_performance) ? info.past_performance : prev.past_performance,
          portfolio_pdf_text: info.portfolio_pdf_text || prev.portfolio_pdf_text,
        }));
      } catch (fetchErr) {
        console.warn('Could not load user profile:', fetchErr);
        setForm((prev) => ({
          ...prev,
          contact_name: prev.contact_name || authUser.user_metadata?.full_name || '',
          contact_email: prev.contact_email || authUser.email || '',
        }));
      }
    };

    loadProfile();
  }, [router]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedTags = Array.isArray(form.selected_tags) ? form.selected_tags : [];
  const certifications = Array.isArray(form.certifications) ? form.certifications : [];

  const toggleTag = (tag) => {
    set('selected_tags', selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]);
  };

  const toggleCert = (cert) => {
    set('certifications', certifications.includes(cert)
      ? certifications.filter(c => c !== cert)
      : [...certifications, cert]);
  };

  const addProject = () => {
    if (form.past_performance.length < 3) {
      set('past_performance', [...form.past_performance, {
        client: '',
        project_title: '',
        scope: '',
        completion_year: new Date().getFullYear(),
        contract_value: '',
      }]);
    }
  };

  const updateProject = (idx, field, value) => {
    const updated = [...form.past_performance];
    updated[idx] = { ...updated[idx], [field]: value };
    set('past_performance', updated);
  };

  const removeProject = (idx) => {
    set('past_performance', form.past_performance.filter((_, i) => i !== idx));
  };

  const toList = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  };

  const buildRecommendationPayload = () => ({
    ...form,
    naics_codes: toList(form.naics_codes),
    core_competencies: toList(form.core_competencies),
    differentiators: toList(form.differentiators),
    years_in_business: Number(form.years_in_business) || 0,
    max_age_days: Number(form.max_age_days),
    top_k: Number(form.top_k),
  });

  const saveProfile = async (payload) => {
    if (!user?.id) {
      throw new Error('Could not identify the current user.');
    }

    const profilePayload = {
      uuid: user.id,
      company_name: payload.legal_name,
      naics_codes: payload.naics_codes,
      cage: payload.cage,
      tags: payload.selected_tags,
      location: payload.location_keywords,
      core_competencies: payload.core_competencies,
      website: payload.website,
      hq_location: payload.hq_location,
      service_areas: payload.service_areas,
      years_in_business: payload.years_in_business,
      uei: payload.uei,
      company_description: payload.company_description,
      differentiators: Array.isArray(payload.differentiators)
        ? payload.differentiators.join(', ')
        : payload.differentiators,
      past_performance: payload.past_performance,
      portfolio_pdf_text: payload.portfolio_pdf_text,
      contact_name: payload.contact_name,
      contact_email: payload.contact_email,
      contact_phone: payload.contact_phone,
    };

    const profileRes = await fetch(getApiUrl('/api/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profilePayload),
    });

    if (!profileRes.ok) {
      throw new Error(await profileRes.text());
    }

    const profileData = await profileRes.json();
    const savedProfile = profileData?.data || profilePayload;

    sessionStorage.setItem('vendor_profile', JSON.stringify({
      ...payload,
      company_name: savedProfile.company_name || payload.legal_name,
    }));

    return savedProfile;
  };

  const handleNextStep = async () => {
    if (step !== 1) {
      setStep(s => s + 1);
      return;
    }

    setLoading(true);
    try {
      const payload = buildRecommendationPayload();
      await saveProfile(payload);
      setStep(2);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = buildRecommendationPayload();
      const savedProfile = await saveProfile(payload);

      const res = await fetch(getApiUrl('/api/recommend'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      sessionStorage.setItem('rfp_results', JSON.stringify(data.results));
      sessionStorage.setItem('vendor_profile', JSON.stringify({
        ...payload,
        company_name: savedProfile.company_name || payload.legal_name,
      }));
      router.push('/results');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Company', 'Capabilities', 'Preferences'];

  return (
    <>

      <div className="dash-shell">
        {/* NAV */}
        <nav className="nav">
          <span className="nav-brand">BLACK_BRAND</span>
          <div className="nav-right">
            {user && <span className="nav-user">{user.email}</span>}
            <button className="btn-ghost" onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}>Sign out</button>
          </div>
        </nav>

        {/* MAIN */}
        <div className="main">
          {/* SIDEBAR */}
          <aside className="sidebar">
            <p className="sidebar-title">Setup</p>
            {steps.map((label, i) => {
              const n = i + 1;
              const cls = n === step ? 'active' : n < step ? 'done' : '';
              return (
                <div key={label} className={`step-item ${cls}`} onClick={() => n < step && setStep(n)}>
                  <span className="step-num">{n < step ? '✓' : n}</span>
                  <span className="step-label">{label}</span>
                </div>
              );
            })}
          </aside>

          {/* FORM */}
          <div key={step} className="form-card">
            {step === 1 && (
              <>
                <div className="form-header">
                  <h2 className="form-title">Company Info</h2>
                  <p className="form-sub">Tell us about your business</p>
                </div>
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
                    ['naics_codes', 'NAICS Codes (comma-sep)'],
                  ].map(([key, label]) => (
                    <div className="field-group" key={key}>
                      <label>{label}</label>
                      <input
                        value={form[key]}
                        onChange={e => set(key, e.target.value)}
                        placeholder={label}
                      />
                    </div>
                  ))}
                  <div className="field-group span2">
                    <label>Service Areas</label>
                    <input
                      value={form.service_areas}
                      onChange={e => set('service_areas', e.target.value)}
                      placeholder="e.g. Southeast US, National"
                    />
                  </div>
                </div>

                <div className="divider" />
                <p className="section-label">Certifications</p>
                <div className="tags-wrap">
                  {CERTS.map(c => (
                    <button
                      key={c}
                      className={`tag-pill ${certifications.includes(c) ? 'active' : ''}`}
                      onClick={() => toggleCert(c)}
                    >{c}</button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="form-header">
                  <h2 className="form-title">Capabilities</h2>
                  <p className="form-sub">Describe what makes you competitive</p>
                </div>
                <div className="field-grid single">
                  <div className="field-group">
                    <label>Company Description</label>
                    <textarea
                      value={form.company_description}
                      onChange={e => set('company_description', e.target.value)}
                      placeholder="Describe your company's services and expertise…"
                      style={{ minHeight: 110 }}
                    />
                  </div>
                  <div className="field-group">
                    <label>Core Competencies (comma-separated)</label>
                    <textarea
                      value={form.core_competencies}
                      onChange={e => set('core_competencies', e.target.value)}
                      placeholder="e.g. Cloud architecture, DevSecOps, Program management"
                    />
                  </div>
                  <div className="field-group">
                    <label>Differentiators (comma-separated)</label>
                    <textarea
                      value={form.differentiators}
                      onChange={e => set('differentiators', e.target.value)}
                      placeholder="e.g. Cleared personnel, ISO 27001, 24/7 SOC"
                    />
                  </div>
                </div>

                <div className="divider" />
                <p className="section-label">Past Performance (up to 3 projects)</p>
                <div className="projects-list">
                  {form.past_performance.map((proj, idx) => (
                    <details key={idx} className="project-item">
                      <summary className="project-summary">
                        <span className="project-num">Project {idx + 1}</span>
                        <span className="project-title">{proj.project_title || 'Untitled'}</span>
                      </summary>
                      <div className="project-form">
                        <div className="field-group">
                          <label>Client Name</label>
                          <input
                            type="text"
                            value={proj.client}
                            onChange={e => updateProject(idx, 'client', e.target.value)}
                            placeholder="Client Name"
                          />
                        </div>
                        <div className="field-group">
                          <label>Project Title</label>
                          <input
                            type="text"
                            value={proj.project_title}
                            onChange={e => updateProject(idx, 'project_title', e.target.value)}
                            placeholder="Project Title"
                          />
                        </div>
                        <div className="field-group">
                          <label>Scope Summary</label>
                          <textarea
                            value={proj.scope}
                            onChange={e => updateProject(idx, 'scope', e.target.value)}
                            placeholder="Describe the project scope…"
                            style={{ minHeight: 80 }}
                          />
                        </div>
                        <div className="field-group">
                          <label>Completion Year</label>
                          <input
                            type="number"
                            value={proj.completion_year}
                            onChange={e => updateProject(idx, 'completion_year', Number(e.target.value))}
                            placeholder="2025"
                          />
                        </div>
                        <div className="field-group">
                          <label>Contract Value (optional)</label>
                          <input
                            type="text"
                            value={proj.contract_value}
                            onChange={e => updateProject(idx, 'contract_value', e.target.value)}
                            placeholder="Example: $250,000"
                          />
                        </div>
                        <button
                          className="btn-remove"
                          onClick={() => removeProject(idx)}
                          style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Remove Project
                        </button>
                      </div>
                    </details>
                  ))}
                </div>
                {form.past_performance.length < 3 && (
                  <button
                    className="btn-add-project"
                    onClick={addProject}
                    style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    + Add Project
                  </button>
                )}

                <div className="divider" />
                <p className="section-label">Sector Tags</p>
                <div className="tags-wrap">
                  {TAGS.map(t => (
                    <button
                      key={t}
                      className={`tag-pill ${selectedTags.includes(t) ? 'active' : ''}`}
                      onClick={() => toggleTag(t)}
                    >{t}</button>
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="form-header">
                  <h2 className="form-title">Match Preferences</h2>
                  <p className="form-sub">Tune how opportunities are filtered and ranked</p>
                </div>
                <div className="field-grid single" style={{ gap: '1rem' }}>
                  <div className="toggle-row">
                    <span className="toggle-label">Open opportunities only</span>
                    <button
                      className={`toggle ${form.open_only ? 'on' : ''}`}
                      onClick={() => set('open_only', !form.open_only)}
                    />
                  </div>

                  <div className="field-group">
                    <label>Location Keywords</label>
                    <input
                      value={form.location_keywords}
                      onChange={e => set('location_keywords', e.target.value)}
                      placeholder="e.g. Virginia, DC, Remote"
                    />
                  </div>

                  <div className="field-group">
                    <label>Max Days Until Close: <span className="range-val">{form.max_age_days} days</span></label>
                    <div className="range-row">
                      <input
                        type="range" min="7" max="365" step="7"
                        value={form.max_age_days}
                        onChange={e => set('max_age_days', Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label>Results to Return: <span className="range-val">{form.top_k}</span></label>
                    <div className="range-row">
                      <input
                        type="range" min="5" max="50" step="5"
                        value={form.top_k}
                        onChange={e => set('top_k', Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="btn-row">
              {step > 1 && (
                <button className="btn-back" onClick={() => setStep(s => s - 1)}>Back</button>
              )}
              {step < 3 ? (
                <button className="btn-next" onClick={handleNextStep} disabled={loading}>
                  Next <span>→</span>
                </button>
              ) : (
                <button className="btn-next" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Searching…' : 'Find Opportunities →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

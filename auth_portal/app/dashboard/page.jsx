'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login');
      else setUser(data.user);
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleTag = (tag) => {
    set('selected_tags', form.selected_tags.includes(tag)
      ? form.selected_tags.filter(t => t !== tag)
      : [...form.selected_tags, tag]);
  };

  const toggleCert = (cert) => {
    set('certifications', form.certifications.includes(cert)
      ? form.certifications.filter(c => c !== cert)
      : [...form.certifications, cert]);
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        naics_codes: form.naics_codes.split(',').map(s => s.trim()).filter(Boolean),
        core_competencies: form.core_competencies.split(',').map(s => s.trim()).filter(Boolean),
        differentiators: form.differentiators.split(',').map(s => s.trim()).filter(Boolean),
        years_in_business: Number(form.years_in_business) || 0,
        max_age_days: Number(form.max_age_days),
        top_k: Number(form.top_k),
      };

      const res = await fetch('http://localhost:8000/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      sessionStorage.setItem('rfp_results', JSON.stringify(data.results));
      sessionStorage.setItem('vendor_profile', JSON.stringify(payload));
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
                      className={`tag-pill ${form.certifications.includes(c) ? 'active' : ''}`}
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
                      className={`tag-pill ${form.selected_tags.includes(t) ? 'active' : ''}`}
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
                <button className="btn-next" onClick={() => setStep(s => s + 1)}>
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
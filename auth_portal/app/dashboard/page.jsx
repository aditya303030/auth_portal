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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080b12;
          color: #e8eaf0;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
        }

        .dash-shell {
          min-height: 100vh;
          display: grid;
          grid-template-rows: 64px 1fr;
        }

        /* ── NAV ── */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(8,11,18,0.9);
          backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 50;
        }
        .nav-brand {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 0.08em;
          color: #c8f060;
        }
        .nav-right { display: flex; align-items: center; gap: 1rem; }
        .nav-user {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.4);
        }
        .nav-logout {
          font-size: 0.78rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
          padding: 0.35rem 0.85rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-logout:hover { background: rgba(255,255,255,0.1); color: #fff; }

        /* ── MAIN GRID ── */
        .main {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 0;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 2.5rem 1.5rem;
        }

        /* ── SIDEBAR STEPS ── */
        .sidebar {
          padding-right: 2rem;
        }
        .sidebar-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          margin-bottom: 1.2rem;
        }
        .step-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .step-num {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1.5px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.3);
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .step-item.active .step-num {
          background: #c8f060;
          border-color: #c8f060;
          color: #080b12;
        }
        .step-item.done .step-num {
          background: rgba(200,240,96,0.15);
          border-color: rgba(200,240,96,0.4);
          color: #c8f060;
        }
        .step-label {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.3);
          transition: color 0.2s;
        }
        .step-item.active .step-label { color: #fff; font-weight: 500; }
        .step-item.done .step-label { color: rgba(255,255,255,0.5); }

        /* ── FORM CARD ── */
        .form-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 2.5rem;
          animation: slideUp 0.35s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-header { margin-bottom: 2rem; }
        .form-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.35rem;
        }
        .form-sub {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.4);
        }

        /* ── FIELD ── */
        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }
        .field-grid.single { grid-template-columns: 1fr; }
        .field-group { display: flex; flex-direction: column; gap: 0.45rem; }
        .field-group.span2 { grid-column: span 2; }
        label {
          font-size: 0.75rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          font-weight: 500;
        }
        input, textarea, select {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #e8eaf0;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          padding: 0.7rem 1rem;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          width: 100%;
        }
        input:focus, textarea:focus, select:focus {
          border-color: rgba(200,240,96,0.5);
          background: rgba(200,240,96,0.04);
        }
        textarea { resize: vertical; min-height: 90px; }
        input[type="range"] {
          padding: 0;
          border: none;
          background: transparent;
          accent-color: #c8f060;
        }
        .range-val {
          font-size: 0.85rem;
          color: #c8f060;
          font-weight: 600;
          margin-left: 0.5rem;
        }
        .range-row { display: flex; align-items: center; gap: 0.5rem; }

        /* ── TAGS ── */
        .tags-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .tag-pill {
          font-size: 0.78rem;
          padding: 0.3rem 0.75rem;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.12);
          background: transparent;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.18s;
        }
        .tag-pill:hover {
          border-color: rgba(200,240,96,0.4);
          color: rgba(200,240,96,0.8);
        }
        .tag-pill.active {
          background: rgba(200,240,96,0.12);
          border-color: #c8f060;
          color: #c8f060;
        }

        /* ── TOGGLE ── */
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.9rem 1rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
        }
        .toggle-label { font-size: 0.88rem; color: rgba(255,255,255,0.7); }
        .toggle {
          width: 44px; height: 24px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
          border: none;
          flex-shrink: 0;
        }
        .toggle.on { background: #c8f060; }
        .toggle::after {
          content: '';
          position: absolute;
          top: 3px; left: 3px;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #080b12;
          transition: transform 0.2s;
        }
        .toggle.on::after { transform: translateX(20px); }

        /* ── BUTTONS ── */
        .btn-row {
          display: flex;
          gap: 0.75rem;
          margin-top: 2rem;
          justify-content: flex-end;
        }
        .btn-back {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: transparent;
          color: rgba(255,255,255,0.6);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-back:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .btn-next {
          padding: 0.75rem 2rem;
          border-radius: 8px;
          border: none;
          background: #c8f060;
          color: #080b12;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .btn-next:hover { background: #d8ff70; transform: translateY(-1px); }
        .btn-next:disabled {
          opacity: 0.5; cursor: not-allowed; transform: none;
        }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 1.75rem 0;
        }

        .section-label {
          font-family: 'Syne', sans-serif;
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          margin-bottom: 1rem;
        }
      `}</style>

      <div className="dash-shell">
        {/* NAV */}
        <nav className="nav">
          <span className="nav-brand">BLACK_BRAND</span>
          <div className="nav-right">
            {user && <span className="nav-user">{user.email}</span>}
            <button className="nav-logout" onClick={async () => {
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
                    <label>Max Days Until Close — <span className="range-val">{form.max_age_days} days</span></label>
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
                    <label>Results to Return — <span className="range-val">{form.top_k}</span></label>
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

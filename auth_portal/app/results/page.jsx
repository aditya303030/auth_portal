'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selected, setSelected] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [rfpPdfText, setRfpPdfText] = useState('');
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [animatingId, setAnimatingId] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const chatEndRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.push('/login'); return; }

      const r = sessionStorage.getItem('rfp_results');
      const p = sessionStorage.getItem('vendor_profile');
      if (!r) { router.push('/dashboard'); return; }
      setResults(JSON.parse(r));
      if (p) setProfile(JSON.parse(p));

      // Load already-saved RFP ids
      const { data: saved } = await supabase
        .from('saved_rfps')
        .select('rfp')
        .eq('user_id', data.user.id);
      if (saved) {
        setSavedIds(new Set(saved.map(s => s.rfp?.id).filter(Boolean)));
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleSave = async (rfp, e) => {
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSavingId(rfp.id);
    setAnimatingId(rfp.id);
    setTimeout(() => setAnimatingId(null), 400);

    if (savedIds.has(rfp.id)) {
      // Unsave
      await supabase.from('saved_rfps')
        .delete()
        .eq('user_id', user.id)
        .eq('rfp->>id', rfp.id);
      setSavedIds(prev => { const s = new Set(prev); s.delete(rfp.id); return s; });
    } else {
      // Save
      await supabase.from('saved_rfps')
        .insert({ user_id: user.id, rfp });
      setSavedIds(prev => new Set(prev).add(rfp.id));
    }
    setSavingId(null);
  };

  const openChat = (rfp) => {
    setSelected(rfp);
    setMessages([{
      role: 'assistant',
      content: `I'm ready to help you evaluate **${rfp.title}**. What would you like to know? Ask about bid/no-bid, compliance, win themes, or what documents to prepare.`,
    }]);
    setChatOpen(true);
    setRfpPdfText('');
  };

  const sendMessage = async () => {
    if (!input.trim() || !profile || !selected) return;
    const userMsg = { role: 'user', content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setChatLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { ...profile, portfolio_pdf_text: profile.portfolio_pdf_text || '' },
          rfp: selected,
          rfp_pdf_text: rfpPdfText,
          portfolio_text: profile.portfolio_pdf_text || '',
          chat_history: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error reaching the assistant.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const scoreColor = (s) => {
    if (s >= 0.7) return '#16a34a';
    if (s >= 0.4) return '#d97706';
    return '#dc2626';
  };

  const scorePct = (s) => Math.round(s * 100);

  const getRfpLink = (rfp) => {
    if (rfp.link) return rfp.link;
    if (rfp.id) return `https://mvendor.cgieva.com/Vendor/public/IVDetails.jsp?PageTitle=SO%20Details&rfp_id_lot=${rfp.id}&rfp_id_round=1`;
    return null;
  };

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const pagedResults = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToPage = (n) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Close chat when changing page
    setChatOpen(false);
    setSelected(null);
  };

  return (
    <div className="shell">
      <Navbar resultCount={results.length} />

      <div className={`content ${chatOpen ? 'with-chat' : 'no-chat'}`}>
        <div className="results-panel">
          <div className="results-header">
            <h1 className="results-title">Matched Opportunities</h1>
            <span className="results-count">{results.length} results</span>
          </div>

          {results.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p className="empty-text">No opportunities matched your profile.</p>
            </div>
          )}

          {pagedResults.map((rfp, i) => (
            <div
              key={rfp.id || i}
              className={`rfp-card ${selected?.id === rfp.id ? 'active' : ''}`}
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => openChat(rfp)}
            >
              <div className="card-top">
                <h3 className="card-title">{rfp.title || 'Untitled RFP'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="score-badge" style={{ color: scoreColor(rfp.score) }}>
                    {scorePct(rfp.score)}%
                  </span>
                  {/* Save button */}
                  <button
                    onClick={(e) => toggleSave(rfp, e)}
                    disabled={savingId === rfp.id}
                    title={savedIds.has(rfp.id) ? 'Unsave' : 'Save'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: savingId === rfp.id ? 0.4 : 1,
                      transition: 'background 0.15s',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24"
                      fill={savedIds.has(rfp.id) ? '#2563eb' : 'none'}
                      stroke={savedIds.has(rfp.id) ? '#2563eb' : '#9ca3af'}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{
                        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: animatingId === rfp.id ? 'scale(1.45)' : 'scale(1)',
                      }}
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="card-meta">
                <span className={`meta-pill ${rfp.status?.toLowerCase() === 'open' ? 'open' : ''}`}>
                  ● {rfp.status || 'Unknown'}
                </span>
                {rfp.location && <span className="meta-pill">📍 {rfp.location}</span>}
                {rfp.close_dt && <span className="meta-pill">⏰ Closes {rfp.close_dt}</span>}
                {rfp.tags?.slice(0, 2).map(t => (
                  <span key={t} className="meta-pill">{t}</span>
                ))}
              </div>

              {rfp.description && <p className="card-desc">{rfp.description}</p>}

              {getRfpLink(rfp) && (
                <a
                  href={getRfpLink(rfp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '0.5rem',
                    marginBottom: '0.25rem',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#2563eb',
                    textDecoration: 'none',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '5px 12px',
                  }}
                >
                  📄 View / Download RFP ↗
                </a>
              )}

              <div className="card-scores">
                {[
                  ['Relevance', rfp.text_sim],
                  ['Recency', rfp.recency],
                  ['Tags', rfp.tag_match],
                  ['Location', rfp.location_match],
                ].map(([label, val]) => (
                  <div className="score-bar-wrap" key={label}>
                    <span className="score-bar-label">{label}</span>
                    <div className="score-bar-track">
                      <div className="score-bar-fill" style={{
                        width: `${Math.round((val || 0) * 100)}%`,
                        background: scoreColor(val || 0),
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="card-actions" onClick={e => e.stopPropagation()}>
                <button className="btn-chat" onClick={() => openChat(rfp)}>Chat about this →</button>
                {getRfpLink(rfp) && (
                  <a className="btn-link" href={getRfpLink(rfp)} target="_blank" rel="noopener noreferrer">
                    View RFP ↗
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', padding: '2rem 0 1rem', flexWrap: 'wrap',
            }}>
              <button onClick={() => goToPage(page - 1)} disabled={page === 1} style={{
                padding: '0.5rem 1rem', borderRadius: '8px',
                border: '1px solid #e5e7eb', background: 'white',
                color: page === 1 ? '#d1d5db' : '#374151',
                fontSize: '13px', fontWeight: 500,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>← Prev</button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => goToPage(n)} style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  border: n === page ? 'none' : '1px solid #e5e7eb',
                  background: n === page ? '#2563eb' : 'white',
                  color: n === page ? 'white' : '#374151',
                  fontSize: '13px', fontWeight: n === page ? 600 : 500,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{n}</button>
              ))}

              <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} style={{
                padding: '0.5rem 1rem', borderRadius: '8px',
                border: '1px solid #e5e7eb', background: 'white',
                color: page === totalPages ? '#d1d5db' : '#374151',
                fontSize: '13px', fontWeight: 500,
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>Next →</button>
            </div>
          )}
        </div>

        {/* CHAT PANEL */}
        {chatOpen && selected && (
          <div className="chat-panel">
            <div className="chat-header">
              <button className="chat-close" onClick={() => { setChatOpen(false); setSelected(null); }}>✕</button>
              <p className="chat-rfp-title">{selected.title}</p>
              <p className="chat-rfp-sub">AI Proposal Strategist</p>
            </div>
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <div className="msg-avatar">{m.role === 'assistant' ? 'AI' : 'You'}</div>
                  <div className="msg-bubble">{m.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="msg assistant">
                  <div className="msg-avatar">AI</div>
                  <div className="msg-bubble">
                    <div className="typing">
                      <div className="dot" /><div className="dot" /><div className="dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-footer">
              <textarea
                className="chat-input"
                placeholder="Ask about bid/no-bid, compliance, win themes…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                rows={1}
              />
              <button className="chat-send" onClick={sendMessage} disabled={chatLoading || !input.trim()}>↑</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
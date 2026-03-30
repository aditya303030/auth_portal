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

          {results.map((rfp, i) => (
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
                      fontSize: '1.1rem',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      transition: 'transform 0.15s',
                      opacity: savingId === rfp.id ? 0.4 : 1,
                      lineHeight: 1,
                    }}
                  >
                    {savedIds.has(rfp.id) ? '🔖' : '🏷️'}
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
                {rfp.link && (
                  <a className="btn-link" href={rfp.link} target="_blank" rel="noopener noreferrer">
                    View RFP ↗
                  </a>
                )}
              </div>
            </div>
          ))}
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
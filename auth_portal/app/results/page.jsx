'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
  const chatEndRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login');
    });
    const r = sessionStorage.getItem('rfp_results');
    const p = sessionStorage.getItem('vendor_profile');
    if (!r) { router.push('/dashboard'); return; }
    setResults(JSON.parse(r));
    if (p) setProfile(JSON.parse(p));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            ...profile,
            portfolio_pdf_text: profile.portfolio_pdf_text || '',
          },
          rfp: selected,
          rfp_pdf_text: rfpPdfText,
          portfolio_text: profile.portfolio_pdf_text || '',
          chat_history: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error reaching the assistant. Is the backend running?' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const scoreColor = (s) => {
    if (s >= 0.7) return '#c8f060';
    if (s >= 0.4) return '#f0c860';
    return '#f07060';
  };

  const scorePct = (s) => Math.round(s * 100);

  const formatDate = (d) => {
    if (!d) return '—';
    return d;
  };

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

        .shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── NAV ── */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          height: 64px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(8,11,18,0.9);
          backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 100;
          flex-shrink: 0;
        }
        .nav-brand {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #c8f060;
        }
        .nav-center {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.35);
        }
        .nav-right { display: flex; gap: 0.75rem; }
        .btn-ghost {
          font-size: 0.8rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.55);
          padding: 0.35rem 0.85rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.18s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.09); color: #fff; }

        /* ── LAYOUT ── */
        .content {
          flex: 1;
          display: grid;
          grid-template-columns: ${chatOpen ? '1fr 420px' : '1fr'};
          transition: grid-template-columns 0.3s ease;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          padding: 2rem 1.5rem;
          gap: 1.5rem;
          align-items: start;
        }

        /* ── RESULTS PANEL ── */
        .results-panel {}
        .results-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .results-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
        }
        .results-count {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.35);
        }

        /* ── RFP CARD ── */
        .rfp-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 1.4rem 1.5rem;
          margin-bottom: 0.75rem;
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
          cursor: pointer;
          animation: fadeUp 0.3s ease both;
        }
        .rfp-card:hover {
          border-color: rgba(200,240,96,0.25);
          background: rgba(200,240,96,0.03);
          transform: translateY(-2px);
        }
        .rfp-card.active {
          border-color: rgba(200,240,96,0.5);
          background: rgba(200,240,96,0.05);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        .card-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.98rem;
          font-weight: 700;
          line-height: 1.35;
          flex: 1;
        }
        .score-badge {
          flex-shrink: 0;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1rem;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
          background: rgba(0,0,0,0.3);
        }

        .card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.9rem;
        }
        .meta-pill {
          font-size: 0.72rem;
          padding: 0.2rem 0.6rem;
          border-radius: 4px;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
          display: flex; align-items: center; gap: 0.3rem;
        }
        .meta-pill.open { background: rgba(200,240,96,0.1); color: #c8f060; }

        .card-desc {
          font-size: 0.83rem;
          color: rgba(255,255,255,0.45);
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .card-scores {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .score-bar-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .score-bar-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: rgba(255,255,255,0.3);
        }
        .score-bar-track {
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          overflow: hidden;
        }
        .score-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.6s ease;
        }

        .card-actions {
          display: flex;
          gap: 0.6rem;
          align-items: center;
        }
        .btn-chat {
          font-family: 'Syne', sans-serif;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 0.45rem 1.1rem;
          border-radius: 6px;
          border: none;
          background: #c8f060;
          color: #080b12;
          cursor: pointer;
          transition: all 0.18s;
        }
        .btn-chat:hover { background: #d8ff70; }
        .btn-link {
          font-size: 0.78rem;
          padding: 0.45rem 0.9rem;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: all 0.18s;
        }
        .btn-link:hover { border-color: rgba(255,255,255,0.25); color: #fff; }

        /* ── CHAT PANEL ── */
        .chat-panel {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 100px);
          position: sticky;
          top: 80px;
          overflow: hidden;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .chat-header {
          padding: 1.1rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .chat-rfp-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 0.2rem;
        }
        .chat-rfp-sub {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.35);
        }
        .chat-close {
          float: right;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.4);
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: color 0.15s;
          margin-top: -2px;
        }
        .chat-close:hover { color: #fff; }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .msg {
          display: flex;
          gap: 0.6rem;
          animation: msgIn 0.2s ease;
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg.user { flex-direction: row-reverse; }

        .msg-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem;
          flex-shrink: 0;
          font-weight: 700;
        }
        .msg.assistant .msg-avatar { background: rgba(200,240,96,0.15); color: #c8f060; }
        .msg.user .msg-avatar { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }

        .msg-bubble {
          max-width: 88%;
          padding: 0.7rem 0.9rem;
          border-radius: 12px;
          font-size: 0.83rem;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .msg.assistant .msg-bubble {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.85);
          border-radius: 4px 12px 12px 12px;
        }
        .msg.user .msg-bubble {
          background: rgba(200,240,96,0.1);
          border: 1px solid rgba(200,240,96,0.2);
          color: #e8eaf0;
          border-radius: 12px 4px 12px 12px;
          text-align: right;
        }

        .typing {
          display: flex; gap: 4px; align-items: center;
          padding: 0.5rem 0.6rem;
        }
        .dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: rgba(200,240,96,0.5);
          animation: bounce 1.2s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }

        .chat-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex;
          gap: 0.6rem;
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #e8eaf0;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          padding: 0.65rem 0.9rem;
          outline: none;
          resize: none;
          min-height: 42px;
          max-height: 100px;
          transition: border-color 0.2s;
        }
        .chat-input:focus { border-color: rgba(200,240,96,0.4); }
        .chat-send {
          width: 42px; height: 42px;
          border-radius: 8px;
          border: none;
          background: #c8f060;
          color: #080b12;
          font-size: 1rem;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s;
          flex-shrink: 0;
        }
        .chat-send:hover { background: #d8ff70; }
        .chat-send:disabled { opacity: 0.4; cursor: not-allowed; }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(255,255,255,0.25);
        }
        .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
        .empty-text { font-size: 0.9rem; }
      `}</style>

      <div className="shell">
        {/* NAV */}
        <nav className="nav">
          <span className="nav-brand">BLACK_BRAND</span>
          <span className="nav-center">{results.length} opportunities matched</span>
          <div className="nav-right">
            <button className="btn-ghost" onClick={() => router.push('/dashboard')}>← New Search</button>
            <button className="btn-ghost" onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}>Sign out</button>
          </div>
        </nav>

        {/* CONTENT */}
        <div className="content">
          {/* RESULTS */}
          <div className="results-panel">
            <div className="results-header">
              <h1 className="results-title">Matched Opportunities</h1>
              <span className="results-count">{results.length} results</span>
            </div>

            {results.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p className="empty-text">No opportunities matched your profile. Try adjusting your preferences.</p>
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
                  <span className="score-badge" style={{ color: scoreColor(rfp.score) }}>
                    {scorePct(rfp.score)}%
                  </span>
                </div>

                <div className="card-meta">
                  <span className={`meta-pill ${rfp.status?.toLowerCase() === 'open' ? 'open' : ''}`}>
                    ● {rfp.status || 'Unknown'}
                  </span>
                  {rfp.location && <span className="meta-pill">📍 {rfp.location}</span>}
                  {rfp.close_dt && <span className="meta-pill">⏰ Closes {formatDate(rfp.close_dt)}</span>}
                  {rfp.tags?.slice(0, 2).map(t => (
                    <span key={t} className="meta-pill">{t}</span>
                  ))}
                </div>

                {rfp.description && (
                  <p className="card-desc">{rfp.description}</p>
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
                        <div
                          className="score-bar-fill"
                          style={{
                            width: `${Math.round((val || 0) * 100)}%`,
                            background: scoreColor(val || 0),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-chat" onClick={() => openChat(rfp)}>
                    Chat about this →
                  </button>
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
                    <div className="msg-avatar">
                      {m.role === 'assistant' ? 'AI' : 'You'}
                    </div>
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
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                />
                <button className="chat-send" onClick={sendMessage} disabled={chatLoading || !input.trim()}>
                  ↑
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

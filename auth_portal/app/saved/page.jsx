'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function SavedPage() {
  const router = useRouter();
  const [saved, setSaved] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [rfpPdfText, setRfpPdfText] = useState('');
  const [rfpPdfName, setRfpPdfName] = useState('');
  const chatMessagesRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.push('/login'); return; }
      const p = sessionStorage.getItem('vendor_profile');
      if (p) setProfile(JSON.parse(p));
      const { data: rows, error } = await supabase
        .from('saved_rfps').select('*').eq('user_id', data.user.id)
        .order('saved_at', { ascending: false });
      if (!error && rows) setSaved(rows);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  const unsave = async (row) => {
    await supabase.from('saved_rfps').delete().eq('id', row.id);
    setSaved(prev => prev.filter(s => s.id !== row.id));
    if (selected?.id === row.rfp?.id) { setChatOpen(false); setSelected(null); }
  };

  const openChat = (rfp) => {
    setSelected(rfp);
    setMessages([{
      role: 'assistant',
      content: `I'm ready to help you evaluate **${rfp.title}**. What would you like to know? Ask about bid/no-bid, compliance, win themes, or what documents to prepare.`,
    }]);
    setChatOpen(true);
    setRfpPdfText('');
    setRfpPdfName('');
  };

  const sendMessage = async () => {
    if ((!input.trim() && !rfpPdfText) || !profile || !selected) return;
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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error reaching the assistant.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRfpPdfName(file.name);
    let text = '';
    try {
      text = await file.text();
      setRfpPdfText(text.slice(0, 15000));
    } catch {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const raw = new TextDecoder('utf-8', { fatal: false }).decode(uint8);
        text = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        setRfpPdfText(text.slice(0, 15000));
      } catch (err) {
        console.error('File read error:', err);
        setRfpPdfName('');
      }
    }
    e.target.value = '';

    // Auto-send analysis prompt when PDF is loaded
    if (selected && profile) {
      const autoMsg = { role: 'user', content: 'I have uploaded the RFP document. Please analyze it and give me a summary of the key requirements, eligibility criteria, deadlines, and whether this is a good fit for my company.' };
      setMessages(prev => [...prev, autoMsg]);
      setChatLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: { ...profile, portfolio_pdf_text: profile.portfolio_pdf_text || '' },
            rfp: selected,
            rfp_pdf_text: text ? text.slice(0, 15000) : '',
            portfolio_text: profile.portfolio_pdf_text || '',
            chat_history: [autoMsg].map(m => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error analyzing the document.' }]);
      } finally {
        setChatLoading(false);
      }
    }
  };

  const maxScore = saved.length > 0 ? Math.max(...saved.map(r => r.rfp?.score || 0)) : 1;
  const scorePct = (s) => maxScore > 0 ? Math.round((s / maxScore) * 100) : 0;
  const scoreColor = (s) => {
    const pct = scorePct(s);
    if (pct >= 70) return '#16a34a';
    if (pct >= 40) return '#d97706';
    return '#dc2626';
  };

  const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  return (
    <div className="shell">
      <Navbar />
      <div className={`content ${chatOpen ? 'with-chat' : 'no-chat'}`}>
        <div className="results-panel">
          <div className="results-header">
            <h1 className="results-title">Saved RFPs</h1>
            <span className="results-count">{saved.length} saved</span>
          </div>

          {loading && (
            <div className="empty-state">
              <div style={{ width: 32, height: 32, margin: '0 auto 1rem', border: '2px solid var(--border)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <p className="empty-text">Loading saved RFPs...</p>
            </div>
          )}

          {!loading && saved.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔖</div>
              <p className="empty-text">No saved RFPs yet. Browse opportunities and bookmark ones you are interested in.</p>
              <button className="btn-primary" style={{ marginTop: '1rem', width: 'auto', padding: '0.6rem 1.5rem' }}
                onClick={() => router.push('/results')}>
                Browse Opportunities
              </button>
            </div>
          )}

          {saved.map((row) => {
            const rfp = row.rfp;
            return (
              <div key={row.id}
                className={`rfp-card ${selected?.id === rfp.id ? 'active' : ''}`}
                onClick={() => openChat(rfp)}>
                <div className="card-top">
                  <h3 className="card-title">{rfp.title || 'Untitled RFP'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {rfp.score && (
                      <span className="score-badge" style={{ color: scoreColor(rfp.score) }}>
                        {scorePct(rfp.score)}%
                      </span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); unsave(row); }} title="Remove from saved"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24"
                        fill="#2563eb" stroke="#2563eb" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.2s' }}>
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="card-meta">
                  <span className={`meta-pill ${rfp.status?.toLowerCase() === 'open' ? 'open' : ''}`}>
                    {rfp.status || 'Unknown'}
                  </span>
                  {rfp.location && <span className="meta-pill">📍 {rfp.location}</span>}
                  {rfp.close_dt && <span className="meta-pill">Closes {rfp.close_dt}</span>}
                  <span className="meta-pill">Saved {new Date(row.saved_at).toLocaleDateString()}</span>
                </div>

                {rfp.description && <p className="card-desc">{rfp.description}</p>}

                <div className="card-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-chat" onClick={() => openChat(rfp)}>Chat about this →</button>
                  {rfp.link && (
                    <a className="btn-link" href={rfp.link} target="_blank" rel="noopener noreferrer">
                      View RFP ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CHAT PANEL */}
        {chatOpen && selected && (
          <div className="chat-panel">
            <div className="chat-header">
              <div className="chat-header-text">
                <p className="chat-rfp-title">{selected.title}</p>
                <p className="chat-rfp-sub">AI Proposal Strategist</p>
              </div>
              <button className="chat-close" onClick={() => { setChatOpen(false); setSelected(null); }}>
                <CloseIcon />
              </button>
            </div>

            <div className="chat-messages" ref={chatMessagesRef}>
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
                    <div className="typing"><div className="dot" /><div className="dot" /><div className="dot" /></div>
                  </div>
                </div>
              )}
            </div>

            <div className="chat-footer">
              {rfpPdfName && (
                <div className="chat-pdf-banner">
                  <span>📄 {rfpPdfName}</span>
                  <button onClick={() => { setRfpPdfText(''); setRfpPdfName(''); }}><CloseIcon /></button>
                </div>
              )}
              <div className="chat-footer-row">
                <button
                  className="chat-upload-btn"
                  title="Upload RFP PDF or text file"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: rfpPdfName ? '#eff6ff' : undefined, borderColor: rfpPdfName ? '#2563eb' : undefined }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={rfpPdfName ? '#2563eb' : 'currentColor'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  style={{ display: 'none' }}
                  onChange={handlePdfUpload}
                />
                <textarea
                  className="chat-input"
                  placeholder="Ask about this RFP…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  rows={1}
                />
                <button className="chat-send" onClick={sendMessage} disabled={chatLoading || (!input.trim() && !rfpPdfText)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
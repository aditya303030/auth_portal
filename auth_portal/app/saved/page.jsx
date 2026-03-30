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
  const chatEndRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.push('/login'); return; }
      const p = sessionStorage.getItem('vendor_profile');
      if (p) setProfile(JSON.parse(p));
      const { data: rows, error } = await supabase
        .from('saved_rfps')
        .select('*')
        .eq('user_id', data.user.id)
        .order('saved_at', { ascending: false });
      if (!error && rows) setSaved(rows);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const unsave = async (row) => {
    await supabase.from('saved_rfps').delete().eq('id', row.id);
    setSaved(prev => prev.filter(s => s.id !== row.id));
    if (selected?.id === row.rfp?.id) { setChatOpen(false); setSelected(null); }
  };

  const openChat = (rfp) => {
    setSelected(rfp);
    setMessages([{ role: 'assistant', content: `I am ready to help you evaluate **${rfp.title}**. What would you like to know?` }]);
    setChatOpen(true);
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
          rfp: selected, rfp_pdf_text: '',
          portfolio_text: profile.portfolio_pdf_text || '',
          chat_history: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error reaching the assistant.' }]);
    } finally { setChatLoading(false); }
  };

  const scoreColor = (s) => s >= 0.7 ? '#16a34a' : s >= 0.4 ? '#d97706' : '#dc2626';

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
              <div style={{ width:32,height:32,margin:'0 auto 1rem',border:'2px solid var(--border)',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />
              <p className="empty-text">Loading saved RFPs...</p>
            </div>
          )}

          {!loading && saved.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔖</div>
              <p className="empty-text">No saved RFPs yet. Browse opportunities and bookmark ones you are interested in.</p>
              <button className="btn-primary" style={{ marginTop:'1rem',width:'auto',padding:'0.6rem 1.5rem' }} onClick={() => router.push('/results')}>
                Browse Opportunities
              </button>
            </div>
          )}

          {saved.map((row) => {
            const rfp = row.rfp;
            return (
              <div key={row.id} className={`rfp-card ${selected?.id === rfp.id ? 'active' : ''}`} onClick={() => openChat(rfp)}>
                <div className="card-top">
                  <h3 className="card-title">{rfp.title || 'Untitled RFP'}</h3>
                  <div style={{ display:'flex',alignItems:'center',gap:'0.5rem' }}>
                    {rfp.score && <span className="score-badge" style={{ color: scoreColor(rfp.score) }}>{Math.round(rfp.score * 100)}%</span>}
                    <button onClick={(e) => { e.stopPropagation(); unsave(row); }} title="Remove from saved"
                      style={{ background:'none',border:'none',cursor:'pointer',fontSize:'1.1rem',padding:'2px 4px',lineHeight:1 }}>
                      🔖
                    </button>
                  </div>
                </div>
                <div className="card-meta">
                  <span className={`meta-pill ${rfp.status?.toLowerCase() === 'open' ? 'open' : ''}`}>● {rfp.status || 'Unknown'}</span>
                  {rfp.location && <span className="meta-pill">📍 {rfp.location}</span>}
                  {rfp.close_dt && <span className="meta-pill">⏰ Closes {rfp.close_dt}</span>}
                  <span className="meta-pill">Saved {new Date(row.saved_at).toLocaleDateString()}</span>
                </div>
                {rfp.description && <p className="card-desc">{rfp.description}</p>}
                <div className="card-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-chat" onClick={() => openChat(rfp)}>Chat about this →</button>
                  {rfp.link && <a className="btn-link" href={rfp.link} target="_blank" rel="noopener noreferrer">View RFP ↗</a>}
                </div>
              </div>
            );
          })}
        </div>

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
                  <div className="msg-bubble"><div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-footer">
              <textarea className="chat-input" placeholder="Ask about bid/no-bid, compliance, win themes..." value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={1} />
              <button className="chat-send" onClick={sendMessage} disabled={chatLoading || !input.trim()}>↑</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
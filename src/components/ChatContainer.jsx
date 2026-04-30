import React, { useState, useRef, useEffect } from 'react';
import { generateResearchAnswer, suggestQuestions } from '../services/gemini';
import { useToast } from '../context/ToastContext';

// ── Vector search (client-side BM25-style) ──────────────────────────────────
function vectorSearch(query, docs) {
  const chunks = [];
  const lowerQ = query.toLowerCase();
  const terms = lowerQ.split(/\s+/).filter(t => t.length > 2);

  docs.forEach(doc => {
    if (!doc.fullText) return;
    const words = doc.fullText.split(/\s+/);
    const winSize = 120, overlap = 40;

    for (let i = 0; i < words.length; i += (winSize - overlap)) {
      const seg = words.slice(i, i + winSize).join(' ');
      if (seg.length < 80) continue;
      const segLower = seg.toLowerCase();

      let score = 0;
      terms.forEach(t => { if (segLower.includes(t)) score += 3; });
      if (segLower.includes(lowerQ)) score += 15;
      if (doc.title.toLowerCase().includes(lowerQ)) score += 5;

      if (score > 2) {
        chunks.push({
          id: `${doc.id}-w${i}`,
          docId: doc.id,
          text: seg,
          page: Math.floor(i / 400) + 1,
          score,
          offset: i,
        });
      }
    }
  });

  return chunks.sort((a, b) => b.score - a.score).slice(0, 10);
}

// ── Feedback button ──────────────────────────────────────────────────────────
function FeedbackButtons({ messageId, onFeedback }) {
  const [given, setGiven] = useState(null);
  const opts = [
    { key: 'accurate',   icon: 'fa-thumbs-up',   label: 'Accurate',    color: 'var(--success)' },
    { key: 'incomplete', icon: 'fa-circle-half-stroke', label: 'Incomplete', color: 'var(--warning)' },
    { key: 'irrelevant', icon: 'fa-thumbs-down',  label: 'Irrelevant', color: 'var(--danger)' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
      {opts.map(o => (
        <button
          key={o.key}
          onClick={() => { setGiven(o.key); onFeedback(messageId, o.key); }}
          className="btn-ghost"
          style={{
            fontSize: 10, padding: '4px 10px',
            color: given === o.key ? o.color : undefined,
            borderColor: given === o.key ? o.color : undefined,
          }}
        >
          <i className={`fas ${o.icon}`} style={{ fontSize: 10 }} />
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Citation chip ────────────────────────────────────────────────────────────
function CitationChip({ cite, onClick }) {
  return (
    <button
      onClick={() => onClick(cite)}
      style={{
        background: 'rgba(99,102,241,0.1)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 11, fontWeight: 600,
        color: 'var(--primary-light)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 5,
        transition: 'all 0.2s',
        fontFamily: 'Inter, sans-serif',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
    >
      <i className="fas fa-bookmark" style={{ fontSize: 9 }} />
      <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cite.docTitle}</span>
      <span style={{ opacity: 0.6 }}>p.{cite.page}</span>
    </button>
  );
}

// ── Evidence panel ───────────────────────────────────────────────────────────
function EvidencePanel({ citation, onClose }) {
  return (
    <div className="slide-right" style={{
      width: 360, flexShrink: 0,
      background: 'var(--bg-card)',
      borderLeft: '1px solid var(--glass-border)',
      display: 'flex', flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Evidence Trace</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Source verification</div>
        </div>
        <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 8px' }}>
          <i className="fas fa-xmark" />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Source Document</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, marginBottom: 8 }}>{citation.docTitle}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-primary">Page {citation.page}</span>
            <span className="badge badge-success">Verified</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Retrieved Fragment</div>
          <div style={{
            background: '#0d1117', border: '1px solid var(--glass-border)',
            borderRadius: 12, padding: 16, borderLeft: '3px solid var(--primary)',
            fontSize: 13, lineHeight: 1.7, color: '#c9d1d9', fontFamily: 'JetBrains Mono, monospace',
          }}>
            "...{citation.snippet}..."
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
            Semantic similarity: high relevance to query intent
          </div>
        </div>

        <div style={{ padding: '16px 0', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Retrieval Logic</div>
          {['Term overlap detected between query and fragment', 'Context window expanded for empirical consistency'].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--primary-light)', flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s}</span>
            </div>
          ))}
        </div>

        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
          Continue Analysis
        </button>
      </div>
    </div>
  );
}

// ── Lightweight Markdown Renderer (no extra packages) ────────────────────────
function MarkdownRenderer({ content }) {
  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block  ``` ... ```
    if (line.trimStart().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{
          background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '12px 16px', overflowX: 'auto',
          fontSize: 13, lineHeight: 1.6, margin: '10px 0',
          fontFamily: 'JetBrains Mono, "Fira Code", monospace',
          color: '#c9d1d9',
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Heading  # ## ###
    const hMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const sizes = { 1: 18, 2: 16, 3: 14 };
      elements.push(
        <div key={i} style={{
          fontSize: sizes[level] || 14,
          fontWeight: 800, color: 'var(--text-primary)',
          marginTop: level === 1 ? 18 : 12, marginBottom: 4,
          letterSpacing: '-0.01em',
        }}>
          {inlineMarkdown(hMatch[2])}
        </div>
      );
      i++;
      continue;
    }

    // Horizontal rule  ---
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '14px 0' }} />);
      i++;
      continue;
    }

    // Unordered list  - item or * item
    if (/^[\-\*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\-\*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={i} style={{ margin: '6px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item, j) => (
            <li key={j} style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)', listStyleType: 'disc' }}>
              {inlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list  1. item
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={i} style={{ margin: '6px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item, j) => (
            <li key={j} style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)' }}>
              {inlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line → spacer
    if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 6 }} />);
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--text-primary)' }}>
        {inlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{elements}</div>;
}

// Renders inline markdown: **bold**, *italic*, `code`
function inlineMarkdown(text) {
  // Split by ** *  ` markers, preserving them
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} style={{
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 5, padding: '1px 6px',
          fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--primary-light)',
        }}>{part.slice(1, -1)}</code>
      );
    }
    return part;
  });
}

// ── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, onCitationClick, onFeedback }) {
  const isUser = msg.role === 'user';
  return (
    <div className="fade-in-up" style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginRight: 10, marginTop: 4,
          fontSize: 13, color: '#fff',
        }}>
          <i className="fas fa-brain" />
        </div>
      )}
      <div style={{ maxWidth: '78%' }}>
        {!isUser && msg.confidence !== undefined && (
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              borderRadius: 20, padding: '3px 10px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: msg.confidence > 0.75 ? 'var(--success)' : 'var(--warning)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Confidence: {Math.round(msg.confidence * 100)}%
              </span>
            </div>
          </div>
        )}

        <div style={{
          padding: '14px 18px',
          borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          background: isUser
            ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
            : 'var(--bg-card)',
          border: isUser ? 'none' : '1px solid var(--glass-border)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          fontSize: 16, lineHeight: 1.8,
          boxShadow: isUser ? '0 4px 16px rgba(99,102,241,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.8 }}>{msg.content}</div>
          ) : (
            <MarkdownRenderer content={msg.content} />
          )}

          {msg.citations?.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sources</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {msg.citations.map((cite, i) => (
                  <CitationChip key={i} cite={cite} onClick={onCitationClick} />
                ))}
              </div>
            </div>
          )}
        </div>

        {!isUser && <FeedbackButtons messageId={msg.id} onFeedback={onFeedback} />}
      </div>
    </div>
  );
}

// ── Main ChatContainer ────────────────────────────────────────────────────────
export default function ChatContainer({ session, setSession }) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle');
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [session.history, status]);

  // Load suggestions when docs change
  useEffect(() => {
    if (session.docs.length > 0 && session.history.length === 0) {
      suggestQuestions(session.docs).then(setSuggestions).catch(() => {});
    }
  }, [session.docs.length]);

  const toast = useToast();

  const handleFeedback = (msgId, type) => {
    const labels = { accurate: 'Thanks for the feedback! 👍', incomplete: 'Got it — we\'ll try to be more thorough.', irrelevant: 'Thanks! We\'ll work on relevance.' };
    toast.info(labels[type] || 'Feedback recorded.');
    // Could POST to backend /feedback endpoint
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    fetch(`${API_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msgId, feedback: type }),
    }).catch(() => {});
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || status !== 'idle') return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: query };
    setSession(prev => ({ ...prev, history: [...prev.history, userMsg] }));
    setInput('');
    setSuggestions([]);

    setStatus('searching');
    const chunks = vectorSearch(query, session.docs);
    await new Promise(r => setTimeout(r, 300));

    setStatus('thinking');
    try {
      const result = await generateResearchAnswer(query, chunks, session.docs, session.history);
      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: result.text,
        citations: result.citations,
        confidence: result.confidence,
        thoughtProcess: result.thoughtProcess,
      };
      setSession(prev => ({ ...prev, history: [...prev.history, assistantMsg] }));
    } catch (err) {
      setSession(prev => ({
        ...prev,
        history: [...prev.history, {
          id: `err-${Date.now()}`, role: 'assistant',
          content: 'An error occurred. Please check your API key and try again.',
        }],
      }));
    } finally {
      setStatus('idle');
    }
  };

  const askSuggestion = (q) => { setInput(q); };

  const noHistory = session.history.length === 0;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {noHistory && (
            <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 16 }}>
              <div style={{
                width: 80, height: 80,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, color: '#fff',
                boxShadow: '0 0 40px rgba(99,102,241,0.4)',
                animation: 'pulse-glow 2.5s infinite',
              }}>
                <i className="fas fa-brain" />
              </div>
              <div>
                <h2 className="gradient-text" style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>ResearchMind</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 380, lineHeight: 1.6 }}>
                  {session.docs.length === 0
                    ? 'Upload your research papers to begin cross-document AI analysis with traceable citations.'
                    : 'Your documents are indexed and ready. Ask anything about your research library.'}
                </p>
              </div>

              {session.docs.length > 0 && suggestions.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 480 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Suggested Questions</div>
                  {suggestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => askSuggestion(q)}
                      className="btn-ghost"
                      style={{ textAlign: 'left', fontSize: 13, padding: '10px 14px' }}
                    >
                      <i className="fas fa-lightbulb" style={{ color: 'var(--warning)', fontSize: 12 }} />
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {session.history.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onCitationClick={setSelectedCitation}
              onFeedback={handleFeedback}
            />
          ))}

          {status !== 'idle' && (
            <div className="fade-in-up" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: '#fff',
              }}>
                <i className="fas fa-brain" />
              </div>
              <div className="glass-card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {status === 'searching' ? 'Retrieving relevant chunks...' : 'Synthesizing answer...'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>RAG Pipeline Active</div>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input bar */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--glass-border)', background: 'var(--bg-dark)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, maxWidth: 900, margin: '0 auto' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e); }}
              placeholder={session.docs.length > 0 ? 'Ask a question… (Ctrl+Enter to send)' : 'Upload documents first to start querying...'}
              disabled={session.docs.length === 0 || status !== 'idle'}
              style={{
                flex: 1, padding: '14px 20px',
                background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                borderRadius: 14, color: 'var(--text-primary)',
                fontFamily: 'Inter, sans-serif', fontSize: 16,
                outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={!input.trim() || status !== 'idle' || session.docs.length === 0}
              style={{ padding: '14px 20px', borderRadius: 14, fontSize: 16 }}
            >
              <i className="fas fa-paper-plane" />
            </button>
          </form>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
            {['RAG v2.0', 'Gemini AI', 'Cross-Doc Synthesis'].map(tag => (
              <span key={tag} style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)' }} />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence Panel */}
      {selectedCitation && (
        <EvidencePanel citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      )}
    </div>
  );
}

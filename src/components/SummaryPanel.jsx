import React, { useState } from 'react';
import { generateDocumentSummary, generateCrossDocumentSummary } from '../services/gemini';

const STYLE_OPTIONS = [
  { id: 'CONCISE',  label: 'Concise',      icon: 'fa-align-left',    desc: '3–5 sentence summary' },
  { id: 'DETAILED', label: 'Detailed',     icon: 'fa-align-justify',  desc: 'Full multi-paragraph' },
  { id: 'BULLETS',  label: 'Bullet Points', icon: 'fa-list-ul',       desc: 'Key points listed' },
];

export default function SummaryPanel({ documents }) {
  const [mode, setMode]         = useState('per');       // 'per' | 'cross'
  const [style, setStyle]       = useState('CONCISE');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [result, setResult]     = useState('');
  const [loading, setLoading]   = useState(false);

  const handleGenerate = async () => {
    if (loading) return;
    if (mode === 'per' && !selectedDoc) return;
    if (mode === 'cross' && documents.length < 2) return;

    setLoading(true);
    setResult('');
    try {
      const text = mode === 'per'
        ? await generateDocumentSummary(selectedDoc, style)
        : await generateCrossDocumentSummary(documents, style);
      setResult(text);
    } catch {
      setResult('Failed to generate summary. Please check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result).catch(() => {});
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Summarization</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Generate AI summaries for individual papers or across your entire library</p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[{ id: 'per', label: 'Per Document', icon: 'fa-file-lines' }, { id: 'cross', label: 'Cross-Document', icon: 'fa-code-compare' }].map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setResult(''); }}
            style={{
              padding: '10px 20px', borderRadius: 12,
              background: mode === m.id ? 'rgba(99,102,241,0.2)' : 'var(--bg-card)',
              border: mode === m.id ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
              color: mode === m.id ? 'var(--primary-light)' : 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <i className={`fas ${m.icon}`} />
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        {/* Left controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Doc selector (per-doc mode) */}
          {mode === 'per' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Select Document</div>
              {documents.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No documents uploaded</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {documents.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => { setSelectedDoc(doc); setResult(''); }}
                      style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                        background: selectedDoc?.id === doc.id ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                        border: selectedDoc?.id === doc.id ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                        color: selectedDoc?.id === doc.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{doc.author} · {doc.year}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'cross' && (
            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Documents to Synthesize</div>
              {documents.length < 2 ? (
                <p style={{ fontSize: 12, color: 'var(--warning)', fontStyle: 'italic' }}>Upload at least 2 documents for cross-doc analysis</p>
              ) : (
                documents.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <i className="fas fa-check-circle" style={{ color: 'var(--success)', fontSize: 12 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Style selector */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Summary Style</div>
            {STYLE_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                  background: style === s.id ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                  border: style === s.id ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                  color: style === s.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <i className={`fas ${s.icon}`} style={{ width: 16, textAlign: 'center', fontSize: 13 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading || (mode === 'per' && !selectedDoc) || (mode === 'cross' && documents.length < 2)}
            style={{ width: '100%', justifyContent: 'center', padding: '12px 0' }}
          >
            {loading ? <><i className="fas fa-spinner fa-spin" /> Generating...</> : <><i className="fas fa-wand-magic-sparkles" /> Generate Summary</>}
          </button>
        </div>

        {/* Result panel */}
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {mode === 'per' ? 'Document Summary' : 'Cross-Document Synthesis'}
            </span>
            {result && (
              <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={copyResult}>
                <i className="fas fa-copy" /> Copy
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
              {[100, 85, 70, 90].map((w, i) => (
                <div key={i} className="shimmer" style={{ height: 16, width: `${w}%` }} />
              ))}
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 16 }}>
                <i className="fas fa-brain" style={{ marginRight: 6 }} />
                Generating {style.toLowerCase()} summary...
              </div>
            </div>
          ) : result ? (
            <div style={{ flex: 1, overflowY: 'auto', fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {result}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 10 }}>
              <i className="fas fa-file-lines" style={{ fontSize: 36, opacity: 0.3 }} />
              <p style={{ fontSize: 14 }}>Configure options and click Generate Summary</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

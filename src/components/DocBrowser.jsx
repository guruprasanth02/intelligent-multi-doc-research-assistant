import React, { useState } from 'react';

export default function DocBrowser({ documents, onDeleteDoc }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = documents.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.author?.toLowerCase().includes(search.toLowerCase()) ||
    d.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = (id, e) => {
    e?.stopPropagation();
    if (window.confirm('Remove this document from the research library?')) {
      onDeleteDoc(id);
      if (selected?.id === id) setSelected(null);
    }
  };

  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Document Library</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage your indexed research assets</p>
        </div>
        <span className="badge badge-primary" style={{ fontSize: 12, padding: '6px 14px' }}>{documents.length} docs</span>
      </div>

      {/* Search */}
      {documents.length > 0 && (
        <div style={{ marginBottom: 20, position: 'relative' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, author, keyword..."
            style={{
              width: '100%', padding: '10px 14px 10px 38px',
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              borderRadius: 10, color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16 }}>
          <div style={{ width: 72, height: 72, background: 'var(--bg-card)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
            <i className="fas fa-folder-open" style={{ fontSize: 28, color: 'var(--text-muted)' }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>No documents uploaded yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Use "Upload Papers" in the header to get started</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((doc, idx) => {
            const accent = colors[idx % colors.length];
            return (
              <div
                key={doc.id}
                onClick={() => setSelected(doc)}
                className="glass-card fade-in-up"
                style={{
                  cursor: 'pointer', overflow: 'hidden', position: 'relative',
                  transition: 'all 0.25s', borderTop: `3px solid ${accent}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 30px rgba(0,0,0,0.3), 0 0 0 1px ${accent}40`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ padding: '18px 18px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span className="badge badge-primary">Research Paper</span>
                    <button
                      onClick={e => handleDelete(doc.id, e)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 6, fontSize: 12, transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <i className="fas fa-trash-alt" />
                    </button>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {doc.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    <i className="fas fa-user" style={{ fontSize: 10 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{doc.author || 'Unknown'}</span>
                    <span>•</span>
                    <i className="fas fa-calendar" style={{ fontSize: 10 }} />
                    <span>{doc.year}</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                    {(doc.keywords || []).slice(0, 3).map((kw, i) => (
                      <span key={i} className="badge" style={{ background: 'var(--glass)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', fontSize: 9 }}>{kw}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse-glow 2s infinite' }} />
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Indexed</span>
                    </div>
                    <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{doc.pageCount} pages →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div className="bounce-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 20, width: '100%', maxWidth: 900, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: 10 }}>Technical Dossier</span>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost" style={{ padding: '8px 10px' }}><i className="fas fa-xmark" /></button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0 }}>
              {/* Meta panel */}
              <div style={{ padding: '24px 20px', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Author</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.author || 'Unknown'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Year</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.year}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Pages</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>~{selected.pageCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Keywords</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {(selected.keywords || []).map((kw, i) => (
                      <span key={i} className="badge badge-primary" style={{ alignSelf: 'flex-start' }}>{kw}</span>
                    ))}
                  </div>
                </div>
                <button onClick={e => handleDelete(selected.id, e)} className="btn-ghost" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)', marginTop: 'auto' }}>
                  <i className="fas fa-trash-alt" /> Remove
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Extracted Content</span>
                  <span className="badge badge-success">Verified Integrity</span>
                </div>
                <div style={{ background: '#0d1117', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '20px 22px', flex: 1, overflow: 'auto', maxHeight: '60vh' }}>
                  <pre style={{ fontSize: 13, lineHeight: 1.8, color: '#c9d1d9', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {selected.fullText || 'No extracted text available.'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

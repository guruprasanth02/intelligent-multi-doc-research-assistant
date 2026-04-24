import React, { useState } from 'react';

function formatMarkdown(session) {
  const lines = [`# Research Session Export\n`, `**Date:** ${new Date().toLocaleString()}\n`, `**Documents:** ${session.docs.length}\n\n---\n`];
  if (session.docs.length > 0) {
    lines.push('## Indexed Documents\n');
    session.docs.forEach((d, i) => {
      lines.push(`${i + 1}. **${d.title}** — ${d.author || 'Unknown'} (${d.year || 'N/A'})`);
      if (d.keywords?.length) lines.push(`   *Keywords:* ${d.keywords.join(', ')}`);
    });
    lines.push('\n---\n');
  }
  if (session.history.length > 0) {
    lines.push('## Q&A Session\n');
    session.history.forEach(msg => {
      if (msg.role === 'user') {
        lines.push(`### 🧑 User\n${msg.content}\n`);
      } else {
        if (msg.confidence !== undefined) lines.push(`> **Confidence:** ${Math.round(msg.confidence * 100)}%\n`);
        lines.push(`### 🤖 Assistant\n${msg.content}\n`);
        if (msg.citations?.length) {
          lines.push('**Sources:**');
          msg.citations.forEach(c => lines.push(`- *${c.docTitle}*, Page ${c.page}: "${c.snippet}"`));
          lines.push('');
        }
      }
    });
  }
  return lines.join('\n');
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportPanel({ session }) {
  const [exported, setExported] = useState(false);

  const hasContent = session.history.length > 0 || session.docs.length > 0;
  const msgCount   = session.history.length;
  const qCount     = session.history.filter(m => m.role === 'user').length;

  const handleExportMd = () => {
    downloadText(formatMarkdown(session), `research-session-${Date.now()}.md`);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const handleExportJson = () => {
    downloadText(JSON.stringify(session, null, 2), `research-session-${Date.now()}.json`);
  };

  const statCards = [
    { icon: 'fa-file-lines', label: 'Documents', value: session.docs.length, color: '#6366f1' },
    { icon: 'fa-comments',   label: 'Messages',  value: msgCount,             color: '#8b5cf6' },
    { icon: 'fa-circle-question', label: 'Questions Asked', value: qCount,   color: '#06b6d4' },
    { icon: 'fa-bookmark',   label: 'Citations',  value: session.history.reduce((acc, m) => acc + (m.citations?.length || 0), 0), color: '#10b981' },
  ];

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Export Research Notes</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Download your entire Q&A session with citations and document metadata</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
            <i className={`fas ${s.icon}`} style={{ fontSize: 22, color: s.color, marginBottom: 8, display: 'block' }} />
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Export options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600, marginBottom: 28 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, background: 'rgba(99,102,241,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-markdown" style={{ color: 'var(--primary-light)', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Markdown</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Readable .md file</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Structured document with Q&A, citations, and document list. Compatible with Obsidian, Notion, GitHub.
          </p>
          <button
            className="btn-primary"
            onClick={handleExportMd}
            disabled={!hasContent}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {exported ? <><i className="fas fa-check" /> Exported!</> : <><i className="fas fa-download" /> Export Markdown</>}
          </button>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, background: 'rgba(6,182,212,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-code" style={{ color: '#06b6d4', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>JSON</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Raw data export</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Full session data including all metadata, embeddings context, and confidence scores in JSON format.
          </p>
          <button
            className="btn-ghost"
            onClick={handleExportJson}
            disabled={!hasContent}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <i className="fas fa-download" /> Export JSON
          </button>
        </div>
      </div>

      {/* Preview */}
      {hasContent && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Preview (Markdown)</div>
          <div style={{ background: '#0d1117', border: '1px solid var(--glass-border)', borderRadius: 12, padding: 20, maxHeight: 320, overflow: 'auto' }}>
            <pre className="mono" style={{ fontSize: 12, color: '#8b949e', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {formatMarkdown(session).slice(0, 1500)}{session.history.length > 2 ? '\n...(truncated for preview)' : ''}
            </pre>
          </div>
        </div>
      )}

      {!hasContent && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)', gap: 12 }}>
          <i className="fas fa-file-export" style={{ fontSize: 40, opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Start a research session to enable export</p>
        </div>
      )}
    </div>
  );
}

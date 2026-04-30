import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';

// ── Formatters ────────────────────────────────────────────────────────────────

function formatMarkdown(session) {
  const lines = [
    `# Research Session Export\n`,
    `**Date:** ${new Date().toLocaleString()}\n`,
    `**Documents:** ${session.docs.length}\n\n---\n`,
  ];
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF Export ────────────────────────────────────────────────────────────────

function exportPDF(session) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = margin;

  const addPage = () => { doc.addPage(); y = margin; };
  const checkY = (needed = 10) => { if (y + needed > 280) addPage(); };

  // Header bar
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Research Session Export', margin, 9.5);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString(), pageW - margin, 9.5, { align: 'right' });
  y = 22;

  // Title
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Research Notes', margin, y); y += 10;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 140);
  doc.text(`${session.docs.length} document(s) · ${session.history.filter(m => m.role === 'user').length} question(s)`, margin, y);
  y += 8;

  // Divider
  doc.setDrawColor(200, 200, 220); doc.line(margin, y, pageW - margin, y); y += 8;

  // Documents section
  if (session.docs.length > 0) {
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(99, 102, 241);
    doc.text('Indexed Documents', margin, y); y += 7;
    session.docs.forEach((d, i) => {
      checkY(12);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 60);
      const titleLines = doc.splitTextToSize(`${i + 1}. ${d.title}`, maxW);
      doc.text(titleLines, margin, y); y += titleLines.length * 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 100, 120);
      doc.text(`Author: ${d.author || 'Unknown'}  |  Year: ${d.year || 'N/A'}  |  Pages: ${d.pageCount || '?'}`, margin + 4, y); y += 4.5;
      if (d.keywords?.length) {
        const kw = doc.splitTextToSize(`Keywords: ${d.keywords.join(', ')}`, maxW - 4);
        doc.text(kw, margin + 4, y); y += kw.length * 4.5;
      }
      y += 2;
    });
    doc.setDrawColor(200, 200, 220); doc.line(margin, y, pageW - margin, y); y += 8;
  }

  // Q&A section
  if (session.history.length > 0) {
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(99, 102, 241);
    doc.text('Q&A Session', margin, y); y += 8;

    session.history.forEach(msg => {
      if (msg.role === 'user') {
        checkY(14);
        doc.setFillColor(238, 242, 255);
        const qLines = doc.splitTextToSize(msg.content, maxW - 8);
        const boxH = qLines.length * 5.5 + 10;
        doc.roundedRect(margin, y - 4, maxW, boxH, 3, 3, 'F');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(99, 102, 241);
        doc.text('QUESTION', margin + 4, y + 1); y += 6;
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 20, 50);
        doc.text(qLines, margin + 4, y); y += qLines.length * 5.5 + 6;
      } else {
        checkY(16);
        doc.setFillColor(245, 250, 245);
        const aLines = doc.splitTextToSize(msg.content, maxW - 8);
        const citH = msg.citations?.length ? msg.citations.length * 5 + 8 : 0;
        const confH = msg.confidence !== undefined ? 6 : 0;
        const boxH = aLines.length * 5.5 + 10 + citH + confH;
        doc.roundedRect(margin, y - 4, maxW, boxH, 3, 3, 'F');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129);
        doc.text('ASSISTANT', margin + 4, y + 1);
        if (msg.confidence !== undefined) {
          doc.setTextColor(100, 100, 120); doc.setFont('helvetica', 'normal');
          doc.text(`Confidence: ${Math.round(msg.confidence * 100)}%`, pageW - margin - 4, y + 1, { align: 'right' });
        }
        y += 6;
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 50, 20);
        doc.text(aLines, margin + 4, y); y += aLines.length * 5.5 + 3;
        if (msg.citations?.length) {
          doc.setFontSize(8); doc.setFont('helvetica', 'bolditalic'); doc.setTextColor(99, 102, 241);
          doc.text('Sources:', margin + 4, y); y += 4.5;
          doc.setFont('helvetica', 'italic'); doc.setTextColor(80, 80, 100);
          msg.citations.forEach(c => {
            checkY(6);
            const cLine = doc.splitTextToSize(`• ${c.docTitle}, Page ${c.page}: "${c.snippet}"`, maxW - 12);
            doc.text(cLine, margin + 8, y); y += cLine.length * 4.5;
          });
        }
        y += 6;
      }
    });
  }

  // Footer on last page
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5); doc.setTextColor(160, 160, 180); doc.setFont('helvetica', 'normal');
    doc.text(`Page ${p} of ${totalPages} · Intelligent Multi-Doc Research Assistant`, pageW / 2, 292, { align: 'center' });
  }

  doc.save(`research-session-${Date.now()}.pdf`);
}

// ── Word Export ───────────────────────────────────────────────────────────────

async function exportWord(session) {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: 'Research Session Export',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Date: ${new Date().toLocaleString()}`, color: '6B7280', size: 20 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  // Documents
  if (session.docs.length > 0) {
    children.push(new Paragraph({ text: 'Indexed Documents', heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 } }));
    session.docs.forEach((d, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true }),
            new TextRun({ text: d.title, bold: true, color: '6366F1' }),
          ],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Author: ${d.author || 'Unknown'}  |  Year: ${d.year || 'N/A'}  |  Pages: ${d.pageCount || '?'}`, color: '6B7280', size: 18 })],
          spacing: { after: 60 },
          indent: { left: 360 },
        }),
      );
      if (d.keywords?.length) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Keywords: ${d.keywords.join(', ')}`, italics: true, color: '6B7280', size: 18 })],
          spacing: { after: 160 },
          indent: { left: 360 },
        }));
      }
    });
  }

  // Q&A
  if (session.history.length > 0) {
    children.push(new Paragraph({ text: 'Q&A Session', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
    session.history.forEach(msg => {
      if (msg.role === 'user') {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '🧑 Question', bold: true, color: '6366F1', size: 22 })],
            spacing: { before: 240, after: 80 },
          }),
          new Paragraph({
            children: [new TextRun({ text: msg.content, size: 22 })],
            spacing: { after: 120 },
            indent: { left: 360 },
            border: { left: { style: BorderStyle.THICK, size: 6, color: '6366F1', space: 8 } },
          }),
        );
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '🤖 Assistant', bold: true, color: '10B981', size: 22 }),
              ...(msg.confidence !== undefined ? [new TextRun({ text: `  (Confidence: ${Math.round(msg.confidence * 100)}%)`, color: '6B7280', size: 18 })] : []),
            ],
            spacing: { before: 200, after: 80 },
          }),
          new Paragraph({
            children: [new TextRun({ text: msg.content, size: 22 })],
            spacing: { after: 120 },
            indent: { left: 360 },
            border: { left: { style: BorderStyle.THICK, size: 6, color: '10B981', space: 8 } },
          }),
        );
        if (msg.citations?.length) {
          children.push(new Paragraph({
            children: [new TextRun({ text: 'Sources:', bold: true, italics: true, color: '6366F1', size: 18 })],
            spacing: { after: 60 },
            indent: { left: 360 },
          }));
          msg.citations.forEach(c => {
            children.push(new Paragraph({
              children: [new TextRun({ text: `• ${c.docTitle}, Page ${c.page}: "${c.snippet}"`, italics: true, color: '6B7280', size: 18 })],
              spacing: { after: 60 },
              indent: { left: 720 },
            }));
          });
        }
      }
    });
  }

  const docx = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(docx);
  saveAs(blob, `research-session-${Date.now()}.docx`);
}

// ── Component ─────────────────────────────────────────────────────────────────

const FORMATS = [
  {
    id: 'pdf',
    icon: 'fa-file-pdf',
    label: 'PDF',
    sub: 'Print-ready document',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    desc: 'Beautifully formatted PDF with colour-coded Q&A blocks, citations, and document list. Perfect for sharing or printing.',
    btnClass: 'btn-danger',
  },
  {
    id: 'word',
    icon: 'fa-file-word',
    label: 'Word',
    sub: 'Editable .docx file',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.12)',
    desc: 'Editable Microsoft Word document with structured headings, citations, and full Q&A history.',
    btnClass: 'btn-blue',
  },
  {
    id: 'markdown',
    icon: 'fa-markdown',
    label: 'Markdown',
    sub: 'Readable .md file',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    desc: 'Structured document compatible with Obsidian, Notion, GitHub, and any markdown editor.',
    btnClass: 'btn-primary',
  },
  {
    id: 'json',
    icon: 'fa-code',
    label: 'JSON',
    sub: 'Raw data export',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
    desc: 'Full session data including metadata, confidence scores, and citations in machine-readable JSON.',
    btnClass: 'btn-ghost',
  },
];

export default function ExportPanel({ session }) {
  const [loading, setLoading] = useState(null); // format id being exported
  const [done, setDone]       = useState(null);

  const hasContent = session.history.length > 0 || session.docs.length > 0;
  const stats = [
    { icon: 'fa-file-lines',      label: 'Documents',      value: session.docs.length,                                                         color: '#6366f1' },
    { icon: 'fa-comments',        label: 'Messages',        value: session.history.length,                                                       color: '#8b5cf6' },
    { icon: 'fa-circle-question', label: 'Questions Asked', value: session.history.filter(m => m.role === 'user').length,                        color: '#06b6d4' },
    { icon: 'fa-bookmark',        label: 'Citations',       value: session.history.reduce((a, m) => a + (m.citations?.length || 0), 0),          color: '#10b981' },
  ];

  const handleExport = async (id) => {
    if (!hasContent || loading) return;
    setLoading(id);
    try {
      if (id === 'pdf')      { exportPDF(session); }
      else if (id === 'word') { await exportWord(session); }
      else if (id === 'markdown') {
        const blob = new Blob([formatMarkdown(session)], { type: 'text/plain;charset=utf-8' });
        downloadBlob(blob, `research-session-${Date.now()}.md`);
      } else if (id === 'json') {
        const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `research-session-${Date.now()}.json`);
      }
      setDone(id);
      setTimeout(() => setDone(null), 2500);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          Export Research Notes
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Download your session as PDF, Word, Markdown, or JSON
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
            <i className={`fas ${s.icon}`} style={{ fontSize: 22, color: s.color, marginBottom: 8, display: 'block' }} />
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Format cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 760, marginBottom: 32 }}>
        {FORMATS.map(fmt => (
          <div
            key={fmt.id}
            className="glass-card"
            style={{
              padding: 24,
              border: done === fmt.id ? '1.5px solid #10b981' : '1px solid var(--glass-border)',
              transition: 'border 0.3s, box-shadow 0.3s',
              boxShadow: done === fmt.id ? '0 0 0 3px rgba(16,185,129,0.15)' : undefined,
            }}
          >
            {/* Icon + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, background: fmt.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fas ${fmt.icon}`} style={{ color: fmt.color, fontSize: 20 }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt.sub}</div>
              </div>
              {done === fmt.id && (
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="fas fa-check-circle" /> Saved
                </span>
              )}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.65 }}>{fmt.desc}</p>

            <button
              className={fmt.btnClass || 'btn-ghost'}
              onClick={() => handleExport(fmt.id)}
              disabled={!hasContent || !!loading}
              style={{ width: '100%', justifyContent: 'center', opacity: (!hasContent || (loading && loading !== fmt.id)) ? 0.45 : 1 }}
            >
              {loading === fmt.id ? (
                <><i className="fas fa-spinner fa-spin" /> Exporting…</>
              ) : done === fmt.id ? (
                <><i className="fas fa-check" /> Done!</>
              ) : (
                <><i className="fas fa-download" /> Export {fmt.label}</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Markdown preview */}
      {hasContent && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Preview (Markdown)
          </div>
          <div style={{ background: '#0d1117', border: '1px solid var(--glass-border)', borderRadius: 12, padding: 20, maxHeight: 300, overflow: 'auto' }}>
            <pre className="mono" style={{ fontSize: 12, color: '#8b949e', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {formatMarkdown(session).slice(0, 1500)}
              {session.history.length > 2 ? '\n…(truncated for preview)' : ''}
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

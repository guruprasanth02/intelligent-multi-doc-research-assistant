import React, { useState, useCallback } from 'react';
import { extractTextFromFile, extractDocumentMetadata } from '../services/gemini';
import { useToast } from '../context/ToastContext';

const MAX_FILE_SIZE_MB = 20;
const ALLOWED_TYPES = ['.pdf', '.txt', '.md', '.docx'];
const ALLOWED_MIME  = ['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function validateFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const sizeOk = file.size <= MAX_FILE_SIZE_MB * 1024 * 1024;
  const typeOk = ALLOWED_TYPES.includes(ext) || ALLOWED_MIME.includes(file.type);

  if (!typeOk) return `"${file.name}" is not a supported file type. Use PDF, TXT, MD, or DOCX.`;
  if (!sizeOk) return `"${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB size limit.`;
  return null;
}

export default function UploadZone({ onUploadComplete }) {
  const [step, setStep]         = useState(null);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const toast = useToast();

  const readAsText = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target?.result || '');
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });

  const readAsBase64 = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target?.result || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

  const processFiles = async (files) => {
    if (!files || files.length === 0) return;

    // Validate all files first
    const errors = files.map(f => validateFile(f)).filter(Boolean);
    if (errors.length) {
      errors.forEach(e => toast.error(e));
      return;
    }

    const processed = [];

    for (let i = 0; i < files.length; i++) {
      const file  = files[i];
      const isText = file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md');
      const isPdf  = file.type === 'application/pdf' || file.name.endsWith('.pdf');

      setProgress(5);
      setStep(`Reading: ${file.name}`);

      let content = '';
      try {
        if (isText) {
          content = await readAsText(file);
        } else if (isPdf) {
          setStep(`AI extracting PDF: ${file.name}`);
          const base64 = await readAsBase64(file);
          content = await extractTextFromFile(file.name, base64);
        } else {
          setStep(`AI digitizing: ${file.name}`);
          content = await extractTextFromFile(file.name, null);
        }
        setProgress(45);

        setStep('Extracting metadata...');
        const meta = await extractDocumentMetadata(content, file.name);
        setProgress(75);

        setStep('Indexing chunks...');
        await new Promise((r) => setTimeout(r, 400));
        setProgress(100);

        processed.push({
          id:          `doc-${Date.now()}-${i}`,
          title:       meta.title || file.name.replace(/\.[^/.]+$/, ''),
          filename:    file.name,
          author:      meta.author || 'Unknown Author',
          year:        meta.year   || new Date().getFullYear(),
          keywords:    meta.keywords || ['research'],
          pageCount:   Math.max(1, Math.ceil((content.length || 1000) / 1500)),
          fullText:    content,
          uploadedAt:  new Date().toISOString(),
          fileSize:    file.size,
        });
      } catch (err) {
        toast.error(`Failed to process "${file.name}": ${err?.message || 'Unknown error'}`);
      }
    }

    if (processed.length > 0) onUploadComplete(processed);
    setStep(null);
    setProgress(0);
  };

  const handleChange = (e) => processFiles(Array.from(e.target.files || []));

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files || []));
  }, []);

  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="file"
        id="file-upload"
        multiple
        accept=".pdf,.txt,.md,.docx"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {step ? (
        <div className="glass-card" style={{ padding: '10px 16px', minWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {step}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{progress}%</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <label
          htmlFor="file-upload"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="btn-primary"
          title={`Supported: ${ALLOWED_TYPES.join(', ')} · Max ${MAX_FILE_SIZE_MB} MB`}
          style={{
            cursor: 'pointer',
            fontSize: 13,
            border: dragging ? '1px solid var(--primary-light)' : '1px solid transparent',
            boxShadow: dragging ? '0 0 0 4px rgba(99,102,241,0.2)' : undefined,
          }}
        >
          <i className="fas fa-file-arrow-up" />
          <span>Upload Papers</span>
        </label>
      )}
    </div>
  );
}

import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

const PREFERRED_MODELS = ['gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash'];

async function callGemini(prompt, options = {}) {
  let lastErr;
  for (const model of PREFERRED_MODELS) {
    try {
      const result = await genAI.models.generateContent({
        model,
        contents: prompt,
        ...options,
      });
      return result.text || '';
    } catch (err) {
      lastErr = err;
      console.warn(`Model ${model} failed:`, err?.message || err);
    }
  }
  throw lastErr;
}

async function callGeminiWithFile(filename, base64Data, mimeType = 'application/pdf') {
  const cleanData = base64Data.includes('base64,')
    ? base64Data.split('base64,')[1]
    : base64Data;
  let lastErr;
  for (const model of ['gemini-2.0-flash', 'gemini-2.5-flash']) {
    try {
      const result = await genAI.models.generateContent({
        model,
        contents: [
          `Extract all readable text content from this document: "${filename}". Return plain text only.`,
          { inlineData: { data: cleanData, mimeType } },
        ],
      });
      return result.text || '';
    } catch (err) {
      lastErr = err;
      console.warn(`OCR model ${model} failed:`, err?.message || err);
    }
  }
  throw lastErr;
}

// ── OCR / text extraction ────────────────────────────────────────────────────
export async function extractTextFromFile(filename, base64Data) {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    return 'Error: VITE_GEMINI_API_KEY is missing. Please add it to your .env file.';
  }
  try {
    if (base64Data) {
      return await callGeminiWithFile(filename, base64Data);
    }
    // Text-only fallback
    const prompt = `
You are a document reconstruction AI.
The user uploaded a document named: "${filename}".
Generate a representative academic text for this document.
Use PLAIN TEXT only — no markdown, no asterisks, no hash signs.
Structure: Abstract, Introduction, Methodology, Results, Conclusion.
    `.trim();
    return await callGemini(prompt);
  } catch (err) {
    console.error('Text extraction error:', err);
    return `Failed to extract text from "${filename}". Error: ${err?.message || err}`;
  }
}

// ── Metadata extraction ──────────────────────────────────────────────────────
export async function extractDocumentMetadata(text, filename) {
  const fallback = {
    title: filename.split('.')[0].replace(/[-_]/g, ' '),
    author: 'Unknown Author',
    year: new Date().getFullYear(),
    keywords: ['research', 'document'],
  };

  if (!text || text.startsWith('Failed') || text.startsWith('Error')) return fallback;

  const prompt = `
Analyze the following document and return structured metadata as valid JSON only.
No markdown, no explanation — just the JSON object.

FILENAME: ${filename}
TEXT SAMPLE (first 3000 chars): ${text.slice(0, 3000)}

JSON schema:
{
  "title": "string",
  "author": "string",
  "year": number,
  "keywords": ["string", ...]
}
  `.trim();

  try {
    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return { ...fallback, ...JSON.parse(cleaned) };
  } catch (err) {
    console.warn('Metadata extraction failed:', err);
    return fallback;
  }
}

// ── Per-document summary ─────────────────────────────────────────────────────
export async function generateDocumentSummary(doc, style = 'CONCISE') {
  const styleInstructions = {
    CONCISE: 'Write a concise 3-5 sentence abstract-style summary.',
    DETAILED: 'Write a detailed multi-paragraph summary covering all major sections.',
    BULLETS: 'Write a bullet-point summary with 6-8 key points. Use "• " prefix for each.',
  };
  const prompt = `
You are a research summarization expert.
Document title: "${doc.title}"
Author: ${doc.author || 'Unknown'}
Year: ${doc.year || 'Unknown'}
Content: ${(doc.fullText || '').slice(0, 6000)}

${styleInstructions[style] || styleInstructions.CONCISE}
Use plain text. Be precise and informative.
  `.trim();

  try {
    return await callGemini(prompt);
  } catch (err) {
    return `Failed to generate summary for "${doc.title}".`;
  }
}

// ── Cross-document summary ───────────────────────────────────────────────────
export async function generateCrossDocumentSummary(docs, style = 'CONCISE') {
  const styleInstructions = {
    CONCISE: 'Write a concise comparative summary (5-7 sentences) highlighting agreements and differences.',
    DETAILED: 'Write a detailed thematic analysis comparing methodologies, findings, and conclusions across all documents.',
    BULLETS: 'Write a structured bullet-point comparison. Use "• " prefix for each point.',
  };
  const docSummaries = docs
    .map((d, i) => `[${i + 1}] "${d.title}" by ${d.author || 'Unknown'} (${d.year || 'N/A'}):\n${(d.fullText || '').slice(0, 2000)}`)
    .join('\n\n---\n\n');

  const prompt = `
You are a comparative research synthesis expert.
Analyze these ${docs.length} documents and provide a cross-document synthesis.

DOCUMENTS:
${docSummaries}

${styleInstructions[style] || styleInstructions.CONCISE}
  `.trim();

  try {
    return await callGemini(prompt);
  } catch (err) {
    return 'Failed to generate cross-document summary.';
  }
}

// ── Suggested questions ──────────────────────────────────────────────────────
export async function suggestQuestions(docs) {
  const context = docs
    .map(d => `"${d.title}": ${(d.fullText || '').slice(0, 800)}`)
    .join('\n\n');

  const prompt = `
Based on these research documents, generate exactly 4 specific, interesting questions a researcher might ask.
Return one question per line, no numbering, no bullet points.

DOCUMENTS:
${context}
  `.trim();

  try {
    const raw = await callGemini(prompt);
    return raw.split('\n').map(l => l.trim()).filter(l => l.length > 10 && l.includes('?')).slice(0, 4);
  } catch {
    return ['What are the key findings across these documents?', 'Compare the methodologies used.', 'What conclusions are drawn?', 'What are the limitations mentioned?'];
  }
}

// ── RAG: research answer ─────────────────────────────────────────────────────
export async function generateResearchAnswer(query, contextChunks, docs, history) {
  try {
    const response = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, chunks: contextChunks, docs, history }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn('Backend unavailable, using client-side Gemini:', err?.message);
    return generateResearchAnswerClientSide(query, contextChunks, docs, history);
  }
}

async function generateResearchAnswerClientSide(query, contextChunks, docs, history) {
  const context = contextChunks
    .slice(0, 6)
    .map(c => {
      const docTitle = docs.find(d => d.id === c.docId)?.title || 'Unknown';
      return `[Source: "${docTitle}", Page ${c.page}]\n${c.text}`;
    })
    .join('\n\n---\n\n');

  const historyText = history
    .slice(-4)
    .map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
    .join('\n');

  const prompt = `
You are an expert research assistant performing cross-document analysis.

RELEVANT DOCUMENT EXCERPTS:
${context || 'No documents uploaded yet.'}

CONVERSATION HISTORY:
${historyText}

USER QUERY: ${query}

Provide a comprehensive, well-grounded answer. Then list your citations.
FORMAT:
THOUGHT: [Brief reasoning]
CONFIDENCE: [0.0-1.0]
ANSWER: [Detailed response using plain text]
CITATIONS: [DocTitle, Page N: 'short snippet' — one per line]
  `.trim();

  try {
    const raw = await callGemini(prompt);
    return parseResearchResponse(raw, contextChunks, docs);
  } catch (err) {
    return {
      text: 'I encountered an error. Please check your GEMINI_API_KEY and try again.',
      citations: [],
      confidence: 0,
      thoughtProcess: 'Error occurred.',
    };
  }
}

function parseResearchResponse(raw, chunks, docs) {
  const lines = raw.split('\n');
  let thought = '', confidence = 0.8, answer = '', citations = [];
  let section = null;

  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('THOUGHT:'))      { section = 'thought'; thought = l.replace('THOUGHT:', '').trim(); }
    else if (l.startsWith('CONFIDENCE:')) { try { confidence = parseFloat(l.replace('CONFIDENCE:', '')); } catch {} }
    else if (l.startsWith('ANSWER:'))  { section = 'answer'; answer = l.replace('ANSWER:', '').trim(); }
    else if (l.startsWith('CITATIONS:')) { section = 'citations'; }
    else if (section === 'thought' && l) thought += ' ' + l;
    else if (section === 'answer' && l) answer += '\n' + l;
    else if (section === 'citations' && l && l.includes(',') && l.includes('Page')) {
      try {
        const [docPart, rest] = l.split(/,\s*Page\s*/i);
        const [pageStr, ...snippetParts] = rest.split(':');
        const page = parseInt(pageStr) || 1;
        const snippet = snippetParts.join(':').replace(/['"]/g, '').trim().slice(0, 120);
        const doc = docs.find(d => d.title.toLowerCase().includes(docPart.toLowerCase().trim().slice(0, 10)));
        citations.push({
          chunkId: `c-${citations.length}`,
          docId: doc?.id || 'unknown',
          docTitle: docPart.trim(),
          page,
          snippet,
        });
      } catch {}
    }
  }

  if (!answer) answer = raw;
  if (!citations.length) {
    citations = chunks.slice(0, 3).map(c => ({
      chunkId: c.id,
      docId: c.docId,
      docTitle: docs.find(d => d.id === c.docId)?.title || 'Unknown',
      page: c.page,
      snippet: c.text.slice(0, 100) + '...',
    }));
  }

  return {
    text: answer.trim(),
    citations,
    confidence: Math.min(Math.max(confidence, 0), 1),
    thoughtProcess: thought.trim(),
  };
}

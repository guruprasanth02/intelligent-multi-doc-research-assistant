"""
RAG Pipeline utilities for the Research Assistant backend.
Provides semantic chunking and BM25-style retrieval helpers.
"""
import re
from typing import List, Dict, Any


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 80) -> List[Dict[str, Any]]:
    """Split text into overlapping semantic chunks."""
    # Split by sentence-like boundaries first
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_words = []
    chunk_idx = 0

    for sentence in sentences:
        words = sentence.split()
        current_words.extend(words)

        if len(current_words) >= chunk_size:
            chunk_text_str = ' '.join(current_words[:chunk_size])
            chunks.append({
                'id': f'chunk-{chunk_idx}',
                'text': chunk_text_str,
                'offset': chunk_idx * (chunk_size - overlap),
                'page': (chunk_idx * (chunk_size - overlap)) // 400 + 1,
            })
            # Keep overlap
            current_words = current_words[chunk_size - overlap:]
            chunk_idx += 1

    # Remainder
    if current_words:
        chunks.append({
            'id': f'chunk-{chunk_idx}',
            'text': ' '.join(current_words),
            'offset': chunk_idx * (chunk_size - overlap),
            'page': (chunk_idx * (chunk_size - overlap)) // 400 + 1,
        })

    return chunks


def bm25_score(query_terms: List[str], chunk_text: str, k1: float = 1.5, b: float = 0.75, avg_dl: float = 500) -> float:
    """Simple BM25 scoring for a chunk."""
    words = chunk_text.lower().split()
    dl = len(words)
    score = 0.0
    word_freq = {}
    for w in words:
        word_freq[w] = word_freq.get(w, 0) + 1

    for term in query_terms:
        tf = word_freq.get(term.lower(), 0)
        if tf == 0:
            continue
        numerator = tf * (k1 + 1)
        denominator = tf + k1 * (1 - b + b * dl / avg_dl)
        score += numerator / denominator

    return score


def retrieve_top_chunks(query: str, chunks: List[Dict], top_k: int = 8) -> List[Dict]:
    """Retrieve top-k chunks using BM25 scoring."""
    terms = [t for t in query.lower().split() if len(t) > 2]
    scored = []
    for chunk in chunks:
        score = bm25_score(terms, chunk.get('text', ''))
        if score > 0:
            scored.append({**chunk, 'score': score})
    scored.sort(key=lambda x: x['score'], reverse=True)
    return scored[:top_k]

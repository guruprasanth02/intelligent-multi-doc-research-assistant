import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'researchmind_session';

function sanitizeSession(session) {
  // Strip fullText from docs before saving to avoid localStorage quota issues
  return {
    ...session,
    docs: session.docs.map(d => {
      const { fullText, ...rest } = d;
      return { ...rest, fullText: fullText ? fullText.slice(0, 20000) : '' };
    }),
  };
}

export function useSessionPersistence(initialSession) {
  const [session, setSessionState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate basic shape
        if (parsed && Array.isArray(parsed.docs) && Array.isArray(parsed.history)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to restore session:', e);
    }
    return initialSession;
  });

  // Debounced save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeSession(session)));
      } catch (e) {
        // Quota exceeded — clear and try again with a minimal save
        try {
          localStorage.removeItem(STORAGE_KEY);
          const minimal = { ...session, docs: session.docs.map(d => ({ ...d, fullText: '' })) };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
        } catch {}
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [session]);

  const setSession = useCallback((updater) => {
    setSessionState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSessionState(initialSession);
  }, [initialSession]);

  return { session, setSession, clearSession };
}

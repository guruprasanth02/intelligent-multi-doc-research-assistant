import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
  const { signInWithGoogle, loading, error } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-dark)', position: 'relative', overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute', width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        top: '-200px', left: '-200px', borderRadius: '50%',
        animation: 'orbFloat 8s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        bottom: '-150px', right: '-150px', borderRadius: '50%',
        animation: 'orbFloat 10s ease-in-out infinite reverse',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
        top: '40%', right: '20%', borderRadius: '50%',
        animation: 'orbFloat 12s ease-in-out infinite 2s',
        pointerEvents: 'none',
      }} />

      {/* Theme toggle — top right */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={{ position: 'absolute', top: 24, right: 24 }}
      >
        <span className="theme-toggle-knob">{theme === 'dark' ? '🌙' : '☀️'}</span>
      </button>

      {/* Card */}
      <div className="bounce-in" style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 460,
        padding: 48,
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 28,
        boxShadow: '0 40px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 40px rgba(99,102,241,0.45)',
          animation: 'pulse-glow 2.5s infinite',
        }}>
          <i className="fas fa-brain" style={{ color: '#fff', fontSize: 32 }} />
        </div>

        {/* Title */}
        <h1 className="gradient-text" style={{ fontSize: 30, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.03em' }}>
          ResearchMind
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 36, lineHeight: 1.6 }}>
          Your intelligent multi-document research assistant.<br />
          Upload papers, ask questions, trace every citation.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 36 }}>
          {[
            { icon: 'fa-brain',      label: 'RAG Pipeline' },
            { icon: 'fa-bookmark',   label: 'Smart Citations' },
            { icon: 'fa-file-lines', label: 'Multi-Doc Synthesis' },
          ].map(f => (
            <span key={f.label} className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <i className={`fas ${f.icon}`} style={{ fontSize: 9 }} />
              {f.label}
            </span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 20,
            fontSize: 13, color: '#f87171', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <i className="fas fa-circle-xmark" />
            {error}
          </div>
        )}

        {/* Google sign-in button */}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          id="google-signin-btn"
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '14px 24px',
            background: loading ? 'var(--glass)' : '#fff',
            border: '1px solid #dfe1e5',
            borderRadius: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 600,
            color: '#3c4043',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(0,0,0,0.12)',
            opacity: loading ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 16px rgba(0,0,0,0.12)'; }}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner" style={{ animation: 'spin 1s linear infinite', fontSize: 18 }} />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              {/* Official Google 'G' SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p style={{ marginTop: 24, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          By signing in you agree to our terms. Your documents are processed locally
          and through the Gemini API — we don't store your files.
        </p>
      </div>

      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, -20px) scale(1.05); }
          66%       { transform: translate(-20px, 15px) scale(0.97); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

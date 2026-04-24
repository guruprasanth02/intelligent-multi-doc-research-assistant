import React from 'react';

const navItems = [
  { id: 'chat',    icon: 'fa-comments',       label: 'Research Chat' },
  { id: 'docs',    icon: 'fa-folder-open',    label: 'Document Library' },
  { id: 'summary', icon: 'fa-file-lines',     label: 'Summarize' },
  { id: 'export',  icon: 'fa-file-export',    label: 'Export Notes' },
];

export default function Sidebar({ activeTab, setActiveTab, docCount, sessionStats, user, onClearSession, onLogout }) {
  return (
    <nav style={{
      width: 240,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      gap: 4,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '8px 12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
          }}>
            <i className="fas fa-brain" style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>ResearchMind</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Assistant</div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      {navItems.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: 'none',
              background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: active ? 'var(--primary-light)' : 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14, fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left',
              position: 'relative',
              borderLeft: active ? '2px solid var(--primary)' : '2px solid transparent',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--glass)'; e.currentTarget.style.color = 'var(--text-primary)'; }}}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}}
          >
            <i className={`fas ${item.icon}`} style={{ width: 16, textAlign: 'center' }} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.id === 'docs' && docCount > 0 && (
              <span className="badge badge-primary">{docCount}</span>
            )}
          </button>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Stats */}
      <div className="glass-card" style={{ padding: 14, margin: '0 0 8px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Session Stats
        </div>
        <StatRow label="Documents" value={docCount} />
        <StatRow label="Messages"  value={sessionStats?.messages || 0} />
        <StatRow label="RAG Status" value="Active" color="var(--success)" />
      </div>

      {/* Clear session */}
      {(docCount > 0 || (sessionStats?.messages || 0) > 0) && (
        <button
          onClick={onClearSession}
          className="btn-ghost"
          style={{ width: '100%', justifyContent: 'center', fontSize: 12, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)', marginBottom: 4 }}
        >
          <i className="fas fa-trash-can" />
          Clear Session
        </button>
      )}

      {/* User info + sign out */}
      {user && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          background: 'var(--glass)', borderRadius: 10,
          border: '1px solid var(--glass-border)',
          marginBottom: 4,
        }}>
          {user.photoURL ? (
            <img src={user.photoURL} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName || 'Researcher'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
        Powered by Gemini AI
      </div>
    </nav>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

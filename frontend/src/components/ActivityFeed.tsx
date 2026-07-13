import React from 'react';
import { useApp } from '../context/AppContext';
import { Heart } from 'lucide-react';

export const ActivityFeed: React.FC = () => {
  const { feed, cheerSession } = useApp();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatTimeAgo = (dateStr: string) => {
    const past = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
  };

  const formatDuration = (sec: number) => {
    const mins = Math.round(sec / 60);
    return `${mins} min`;
  };

  if (!feed || feed.length === 0) {
    return (
      <div className="bento-card col-8" style={{ gridColumn: 'span 8', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No recent activity from your Study Circle.</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Add friends to see their study blocks here!</p>
      </div>
    );
  }

  return (
    <div className="bento-card col-8" style={{ gridColumn: 'span 8', maxHeight: '550px', overflowY: 'auto' }}>
      <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>Study Circle Activity</span>
        <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-primary)', padding: '0.2rem 0.5rem', borderRadius: '10px', color: 'var(--text-secondary)' }}>
          {feed.length} sessions
        </span>
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {feed.map((item, idx) => (
          <div key={item.id} style={{ 
            display: 'flex', 
            gap: '1rem', 
            paddingBottom: idx === feed.length - 1 ? '0' : '1.25rem',
            borderBottom: idx === feed.length - 1 ? 'none' : '1px solid var(--border)'
          }}>
            {/* User Avatar */}
            <div 
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: item.avatar_color || 'var(--accent)', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 600,
                fontSize: '0.85rem',
                flexShrink: 0
              }}
            >
              {getInitials(item.display_name || item.username)}
            </div>

            {/* Content Details */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.display_name || item.username}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>@{item.username}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatTimeAgo(item.ended_at)}</span>
              </div>

              <p style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                Completed a <strong style={{ color: 'var(--accent)' }}>{formatDuration(item.duration_seconds)}</strong> study block.
              </p>

              {/* Subject Tag & Notes */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.25rem', 
                    fontSize: '0.75rem', 
                    padding: '0.15rem 0.5rem', 
                    borderRadius: '12px', 
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    fontWeight: 500
                  }}
                >
                  <span>{item.subject_emoji}</span>
                  <span>{item.subject_name}</span>
                </span>
              </div>

              {/* Cheer Action Row */}
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', alignItems: 'center' }}>
                <button 
                  onClick={() => !item.cheered_by_me && cheerSession(item.id)}
                  disabled={item.cheered_by_me}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: item.cheered_by_me ? 'default' : 'pointer', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    color: item.cheered_by_me ? 'var(--success)' : 'var(--text-secondary)',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                >
                  <Heart size={14} fill={item.cheered_by_me ? 'var(--success)' : 'none'} stroke={item.cheered_by_me ? 'var(--success)' : 'currentColor'} />
                  <span>{item.cheer_count} {item.cheered_by_me ? 'Cheered!' : 'Cheer'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

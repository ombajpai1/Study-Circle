import React from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen } from 'lucide-react';

export const FriendsSidebar: React.FC = () => {
  const { onlineFriends, friends } = useApp();

  const getFriendDisplayName = (session: any) => {
    const friendObj = friends.find(f => f.id === session.user_id);
    if (friendObj) return friendObj.display_name || friendObj.username;
    return session.display_name || session.username || 'Anonymous';
  };

  const getFriendInitials = (session: any) => {
    const name = getFriendDisplayName(session);
    return name.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getFriendColor = (session: any) => {
    const friendObj = friends.find(f => f.id === session.user_id);
    return friendObj?.avatar_color || session.avatar_color || 'var(--accent)';
  };

  return (
    <div className="bento-card col-4" style={{ gridColumn: 'span 4', maxHeight: '550px', overflowY: 'auto' }}>
      <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>Active Focus Group</span>
        <span 
          style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: onlineFriends.length > 0 ? 'var(--success)' : 'var(--text-secondary)',
            display: 'inline-block' 
          }} 
          className={onlineFriends.length > 0 ? 'timer-pulse' : ''}
        />
      </h3>

      {onlineFriends.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '180px', textAlign: 'center', padding: '1rem' }}>
          <BookOpen size={32} strokeWidth={1.5} color="var(--text-secondary)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Quiet in the circle right now.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Start a session or invite friends to study together!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {onlineFriends.map((session) => (
            <div 
              key={session.user_id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--border-radius-md)'
              }}
            >
              {/* Pulsing Avatar Container */}
              <div style={{ position: 'relative' }}>
                <div 
                  style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    backgroundColor: getFriendColor(session), 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 600,
                    fontSize: '0.8rem'
                  }}
                >
                  {getFriendInitials(session)}
                </div>
                {/* Active Indicator Badge */}
                <div 
                  style={{ 
                    position: 'absolute', 
                    bottom: '0', 
                    right: '0', 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--success)', 
                    border: '2px solid var(--bg-card)' 
                  }} 
                />
              </div>

              {/* Subject details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getFriendDisplayName(session)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                  <span style={{ fontSize: '0.75rem' }}>{session.subject_emoji}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                    {session.subject_name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

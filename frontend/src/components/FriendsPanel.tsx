import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import type { User } from '../api/client';
import { Search } from 'lucide-react';

interface FriendsPanelProps {
  onNavigateToChat: () => void;
}

export const FriendsPanel: React.FC<FriendsPanelProps> = ({ onNavigateToChat }) => {
  const { friends, addFriend, acceptFriend, setSelectedChatUserId, feed, cheerSession } = useApp();
  const [searchUsername, setSearchUsername] = useState<string>('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Debounced search
  useEffect(() => {
    if (!searchUsername.trim()) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const data = await api.auth.searchUsers(searchUsername.trim());
        setSuggestions(data);
      } catch (e) {
        console.error(e);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchUsername]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    await addFriend(searchUsername.trim());
    setSearchUsername('');
    setShowSuggestions(false);
  };

  const getAvatarColors = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      { bg: '#2d4a2e', text: '#4ade80' },
      { bg: '#2a3a50', text: '#60a5fa' },
      { bg: '#3a2a40', text: '#c084fc' },
      { bg: '#3a2a30', text: '#f9a8d4' },
      { bg: '#4a3e2a', text: '#facc15' }
    ];
    return colors[hash % colors.length];
  };

  const formatTimeAgo = (dateStr: string) => {
    const past = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHrs < 24) return `${diffHrs}h`;
    return `${diffDays}d`;
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const onlineFriends = acceptedFriends.filter(f => f.is_online);
  const incomingRequests = friends.filter(f => f.status === 'pending_incoming');
  const outgoingRequests = friends.filter(f => f.status === 'pending_outgoing');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px', margin: '0 auto' }}>
      
      {/* Search & Invite Bar */}
      <form onSubmit={handleSearchSubmit} className="search-bar" style={{ display: 'flex', position: 'relative' }}>
        <Search size={13} style={{ color: 'rgba(255,255,255,0.2)', marginRight: '4px' }} />
        <input
          type="text"
          placeholder="Search friends…"
          value={searchUsername}
          onChange={(e) => setSearchUsername(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          style={{ border: 'none', background: 'transparent', flex: 1, color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
        />
        <span 
          onClick={handleSearchSubmit}
          style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontWeight: 500 }}
        >
          Add friend
        </span>

        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: 'var(--surface-2)',
            border: '0.5px solid var(--border)',
            borderRadius: '8px',
            marginTop: '4px',
            maxHeight: '180px',
            overflowY: 'auto'
          }}>
            {suggestions.map(user => (
              <div 
                key={user.id}
                onMouseDown={() => {
                  setSearchUsername(user.username);
                  setShowSuggestions(false);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderBottom: '0.5px solid var(--border)'
                }}
              >
                <span style={{ fontWeight: 500 }}>{user.display_name || user.username}</span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>@{user.username}</span>
              </div>
            ))}
          </div>
        )}
      </form>

      {/* Online now section */}
      <div>
        <div className="section-head">Online now · {onlineFriends.length}</div>
        
        {onlineFriends.map(friend => {
          const colors = getAvatarColors(friend.display_name || friend.username);
          return (
            <div 
              key={friend.id} 
              className="friend-row"
              onClick={() => {
                setSelectedChatUserId(friend.id);
                onNavigateToChat();
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="fav" style={{ backgroundColor: colors.bg, color: colors.text }}>
                {getInitials(friend.display_name || friend.username)}
              </div>
              <div className="fonline" />
              <div>
                <div className="fname">{friend.display_name || friend.username}</div>
                <div className="factivity">CS · active studying</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ftime">now</span>
              </div>
            </div>
          );
        })}

        {onlineFriends.length === 0 && (
          <p style={{ fontStyle: 'italic', fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 0' }}>No friends online right now.</p>
        )}
      </div>

      {/* Recent Activity feed section */}
      <div>
        <div className="section-head">Recent</div>
        
        {feed.slice(0, 5).map(item => {
          const colors = getAvatarColors(item.display_name || item.username);
          const isCheered = item.cheered_by_me || item.cheer_count > 0;
          return (
            <div 
              key={item.id}
              className="friend-row"
            >
              <div className="fav" style={{ backgroundColor: colors.bg, color: colors.text }}>
                {getInitials(item.display_name || item.username)}
              </div>
              <div className="foffline" />
              <div>
                <div className="fname">{item.display_name || item.username}</div>
                <div className="factivity">
                  {item.subject_emoji} {item.subject_name} · {Math.round(item.duration_seconds / 60)}m logged
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ftime">{formatTimeAgo(item.ended_at)}</span>
                <span 
                  className="fstar"
                  onClick={() => !item.cheered_by_me && cheerSession(item.id)}
                  style={{ color: isCheered ? '#f5a623' : 'rgba(255,255,255,0.15)' }}
                >
                  ★
                </span>
                {item.cheer_count > 0 && <span style={{ fontSize: '10px', color: '#f5a623' }}>{item.cheer_count}</span>}
              </div>
            </div>
          );
        })}

        {feed.length === 0 && (
          <p style={{ fontStyle: 'italic', fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 0' }}>No recent activities logged.</p>
        )}
      </div>

      {/* Pending invitations */}
      {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '14px', marginTop: '8px' }}>
          <div className="section-head">Pending invitations</div>
          
          {incomingRequests.map(req => (
            <div key={req.id} className="friend-row">
              <div className="fname" style={{ flex: 1 }}>{req.display_name || req.username}</div>
              <button 
                onClick={() => acceptFriend(req.id)}
                className="btn btn-primary"
                style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
              >
                Accept
              </button>
            </div>
          ))}

          {outgoingRequests.map(req => (
            <div key={req.id} className="friend-row">
              <div className="fname" style={{ color: 'var(--text-secondary)' }}>@{req.username}</div>
              <span className="ftime" style={{ marginLeft: 'auto' }}>Sent</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

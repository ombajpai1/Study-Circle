import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import type { User } from '../api/client';
import { UserPlus, UserCheck, Users, Search, Clock, ShieldAlert, MessageSquare } from 'lucide-react';

interface FriendsPanelProps {
  onNavigateToChat: () => void;
}

export const FriendsPanel: React.FC<FriendsPanelProps> = ({ onNavigateToChat }) => {
  const { friends, addFriend, acceptFriend, setSelectedChatUserId } = useApp();
  const [searchUsername, setSearchUsername] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Debounced search for matching user suggestions
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

    setIsSubmitting(true);
    const success = await addFriend(searchUsername.trim());
    setIsSubmitting(false);
    if (success) {
      setSearchUsername('');
      setShowSuggestions(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Filter friends list
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const incomingRequests = friends.filter(f => f.status === 'pending_incoming');
  const outgoingRequests = friends.filter(f => f.status === 'pending_outgoing');

  return (
    <div className="bento-grid" style={{ width: '100%' }}>
      
      {/* Left Pane: Accepted Connections */}
      <div className="bento-card col-6" style={{ gridColumn: 'span 6', minHeight: '450px' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} color="var(--accent)" />
          <span>Study Friends ({acceptedFriends.length})</span>
        </h3>

        {acceptedFriends.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '280px', color: 'var(--text-secondary)' }}>
            <p>Your Study Circle is empty.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Use the directory search on the right to add connections!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '350px' }}>
            {acceptedFriends.map(friend => (
              <div 
                key={friend.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: 'var(--bg-primary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Initials Avatar */}
                  <div 
                    style={{ 
                      width: '38px', 
                      height: '38px', 
                      borderRadius: '50%', 
                      backgroundColor: friend.avatar_color || 'var(--accent)', 
                      color: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    {getInitials(friend.display_name || friend.username)}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{friend.display_name || friend.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{friend.username}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Presence Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: friend.is_online ? 'var(--success)' : 'var(--text-secondary)' 
                      }} 
                      className={friend.is_online ? 'timer-pulse' : ''}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {friend.is_online ? 'online' : 'offline'}
                    </span>
                  </div>

                  {/* Chat Action Button */}
                  <button
                    onClick={() => {
                      setSelectedChatUserId(friend.id);
                      onNavigateToChat();
                    }}
                    className="btn btn-secondary"
                    style={{ 
                      padding: '0.35rem 0.65rem', 
                      borderRadius: 'var(--border-radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem'
                    }}
                    title="Send Message"
                  >
                    <MessageSquare size={12} />
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Pane: Search & Invitations */}
      <div className="bento-card col-6" style={{ gridColumn: 'span 6', minHeight: '450px' }}>
        
        {/* Global User Directory Search */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={20} color="var(--accent)" />
            <span>Find Users Directory</span>
          </h3>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Search username e.g. alex_codes"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setShowSuggestions(false)}
                style={{ 
                  width: '100%', 
                  padding: '0.65rem 0.75rem 0.65rem 2.25rem', 
                  borderRadius: 'var(--border-radius-md)', 
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-primary)',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
              <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />

              {/* Suggestions Dropdown Overlay */}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--border-radius-md)',
                  boxShadow: 'var(--shadow)',
                  marginTop: '0.25rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  padding: '0.5rem'
                }}>
                  {suggestions.map(user => (
                    <div 
                      key={user.id}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevents input from losing focus immediately
                        setSearchUsername(user.username);
                        setShowSuggestions(false);
                      }}
                      onMouseEnter={() => setHoveredId(user.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--border-radius-sm)',
                        cursor: 'pointer',
                        backgroundColor: hoveredId === user.id ? 'var(--bg-primary)' : 'transparent',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: user.avatar_color || 'var(--accent)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {getInitials(user.display_name || user.username)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {user.display_name || user.username}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          @{user.username}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '0.65rem 1.25rem', borderRadius: 'var(--border-radius-md)' }}
              disabled={isSubmitting || !searchUsername.trim()}
            >
              <UserPlus size={16} />
              <span>Invite</span>
            </button>
          </form>
        </div>

        {/* Pending Incoming Invitations */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={14} />
            <span>Pending Requests ({incomingRequests.length})</span>
          </h4>

          {incomingRequests.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No incoming invitations.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {incomingRequests.map(req => (
                <div 
                  key={req.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--border-radius-md)',
                    backgroundColor: 'var(--bg-primary)'
                  }}
                >
                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{req.display_name || req.username}</span>
                    <span style={{ color: 'var(--text-secondary)' }}> (@{req.username})</span>
                  </div>

                  <button 
                    onClick={() => acceptFriend(req.id)}
                    className="btn btn-primary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '4px' }}
                  >
                    <UserCheck size={12} />
                    <span>Accept</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Outgoing Invitations */}
        <div>
          <h4 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldAlert size={14} />
            <span>Sent Invitations ({outgoingRequests.length})</span>
          </h4>

          {outgoingRequests.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No sent invitations pending.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {outgoingRequests.map(req => (
                <span 
                  key={req.id} 
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.6rem', 
                    borderRadius: '20px', 
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    fontWeight: 500
                  }}
                >
                  @{req.username} (pending)
                </span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

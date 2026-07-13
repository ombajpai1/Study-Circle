import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import type { ChatMessage } from '../api/client';
import { Send, MessageSquare } from 'lucide-react';

export const ChatPanel: React.FC = () => {
  const { friends, selectedChatUserId, setSelectedChatUserId } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const activeFriend = friends.find(f => f.id === selectedChatUserId);

  // Load chat history when selected friend changes
  useEffect(() => {
    if (!selectedChatUserId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      try {
        const data = await api.messages.list(selectedChatUserId);
        setMessages(data);
      } catch (e) {
        console.error('Failed to load chat history', e);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedChatUserId]);

  // Listen for real-time WebSocket incoming messages
  useEffect(() => {
    const handleIncomingMessage = (event: Event) => {
      const customEvent = event as CustomEvent<ChatMessage>;
      const newMsg = customEvent.detail;

      if (
        selectedChatUserId &&
        (newMsg.sender_id === selectedChatUserId || newMsg.recipient_id === selectedChatUserId)
      ) {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    window.addEventListener('study_circle_chat_message', handleIncomingMessage);
    return () => {
      window.removeEventListener('study_circle_chat_message', handleIncomingMessage);
    };
  }, [selectedChatUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatUserId || !inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const sentMsg = await api.messages.send(selectedChatUserId, textToSend);
      setMessages(prev => [...prev, sentMsg]);
    } catch (e) {
      console.error('Failed to send message', e);
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bento-grid" style={{ height: 'calc(100vh - 120px)', minHeight: '500px' }}>
      {/* Left Pane: Friends List */}
      <div 
        className="bento-card col-4" 
        style={{ 
          gridColumn: 'span 4', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          padding: '1.25rem 1rem'
        }}
      >
        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} color="var(--accent)" />
          <span>Conversations</span>
        </h3>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {acceptedFriends.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
              No friends in your circle yet.
            </p>
          ) : (
            acceptedFriends.map(friend => (
              <div
                key={friend.id}
                onClick={() => setSelectedChatUserId(friend.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--border-radius-md)',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  backgroundColor: selectedChatUserId === friend.id ? 'var(--bg-primary)' : 'var(--bg-card)',
                  transition: 'background-color 0.2s',
                }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative' }}>
                  <div style={{
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
                  }}>
                    {getInitials(friend.display_name || friend.username)}
                  </div>
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: friend.is_online ? 'var(--success)' : 'var(--text-secondary)',
                    border: '2px solid var(--bg-card)'
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {friend.display_name || friend.username}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {friend.is_online ? (
                      friend.current_subject ? `focusing on ${friend.current_subject}` : 'online'
                    ) : 'offline'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Message Thread */}
      <div 
        className="bento-card col-8" 
        style={{ 
          gridColumn: 'span 8', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          padding: 0
        }}
      >
        {activeFriend ? (
          <>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '1rem 1.25rem', 
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--bg-card)'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: activeFriend.avatar_color || 'var(--accent)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}>
                {getInitials(activeFriend.display_name || activeFriend.username)}
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{activeFriend.display_name || activeFriend.username}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {activeFriend.is_online ? (
                    activeFriend.current_subject ? (
                      <span>Focusing on {activeFriend.current_subject} {activeFriend.current_emoji}</span>
                    ) : 'Online'
                  ) : 'Offline'}
                </p>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '1.25rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              backgroundColor: 'var(--bg-primary)'
            }}>
              {loading && messages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                  Loading chat history...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                  <MessageSquare size={36} color="var(--border)" style={{ marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.85rem' }}>No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id !== activeFriend.id;
                  return (
                    <div 
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        width: '100%'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start'
                      }}>
                        <div style={{
                          padding: '0.65rem 0.9rem',
                          borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          backgroundColor: isMe ? 'var(--accent)' : 'var(--bg-card)',
                          color: isMe ? 'white' : 'var(--text-primary)',
                          border: isMe ? 'none' : '1px solid var(--border)',
                          fontSize: '0.85rem',
                          lineHeight: '1.4',
                          whiteSpace: 'pre-wrap',
                          boxShadow: 'var(--shadow-sm)'
                        }}>
                          {msg.content}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} style={{ 
              padding: '1rem 1.25rem', 
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--bg-card)',
              display: 'flex',
              gap: '0.75rem'
            }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-primary)',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                disabled={isSending}
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.25rem', borderRadius: 'var(--border-radius-md)' }}
                disabled={isSending || !inputText.trim()}
              >
                <Send size={16} />
                <span>Send</span>
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
            <MessageSquare size={48} color="var(--border)" style={{ marginBottom: '1rem' }} />
            <h4 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No conversation selected</h4>
            <p style={{ fontSize: '0.8rem', maxWidth: '320px' }}>Select a friend from the conversations sidebar to begin texting in real-time!</p>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '../context/RoomContext';
import { useApp } from '../context/AppContext';
import { VideoGrid } from './VideoGrid';
import { api } from '../api/client';
import type { StudyRoom, Subject } from '../api/client';

export function RoomPanel() {
  const {
    peers,
    roomInfo,
    timerState,
    chatMessages,
    isMicOn,
    isCameraOn,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera,
    sendChat,
    sendReaction,
    startTimer,
    stopTimer
  } = useRoom();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeRooms, setActiveRooms] = useState<StudyRoom[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Form states
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [maxParticipants, setMaxParticipants] = useState(6);
  
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch directory data when not in a room
  useEffect(() => {
    if (!roomInfo) {
      const loadDirectory = async () => {
        try {
          const [roomsData, subData] = await Promise.all([
            api.rooms.active(),
            api.subjects.list()
          ]);
          setActiveRooms(roomsData);
          setSubjects(subData);
        } catch (err) {
          console.error('Failed to load directory data:', err);
        }
      };
      loadDirectory();
      
      // Auto-refresh directory every 15 seconds
      const interval = setInterval(loadDirectory, 15000);
      return () => clearInterval(interval);
    }
  }, [roomInfo]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Sync Timer Hook Logic
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    let interval: number;

    if (!timerState || timerState.phase === 'idle') {
      setTimeLeft(0);
      return;
    }

    const durationSec = timerState.phase === 'focus'
      ? timerState.focus_minutes * 60
      : timerState.break_minutes * 60;

    const tick = () => {
      const elapsed = (Date.now() - new Date(timerState.started_at).getTime()) / 1000;
      const left = Math.max(0, Math.round(durationSec - elapsed));
      setTimeLeft(left);
    };

    tick();
    interval = window.setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await createRoom(
        roomName,
        roomPassword || undefined,
        selectedSubjectId || null,
        focusMinutes,
        breakMinutes,
        maxParticipants
      );
      setIsCreateModalOpen(false);
      resetCreateForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create study room');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await joinRoom(joinCode.trim().toUpperCase(), joinPassword || undefined);
      setIsJoinModalOpen(false);
      setJoinCode('');
      setJoinPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join room');
    }
  };

  const resetCreateForm = () => {
    setRoomName('');
    setRoomPassword('');
    setSelectedSubjectId('');
    setFocusMinutes(25);
    setBreakMinutes(5);
    setMaxParticipants(6);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChat(chatInput.trim());
    setChatInput('');
  };

  const reactions = ['💖', '👍', '👏', '🔥', '💡', '🎉', '💻', '📚'];

  const { user, addToast } = useApp();
  const isHost = (roomInfo && user) ? roomInfo.host_id === user.id : false;

  console.log('[RoomPanel] isHost evaluation:', {
    roomHostId: roomInfo?.host_id,
    currentUserId: user?.id,
    isHost
  });

  const hasSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!timerState || timerState.phase !== 'focus' || timeLeft > 0) return;
    
    // Check if we have already saved this specific timer session
    const sessionKey = timerState.started_at;
    if (hasSavedRef.current === sessionKey) return;
    
    hasSavedRef.current = sessionKey;

    const saveRoomSession = async () => {
      try {
        await api.sessions.create({
          subject_id: roomInfo?.subject_id || null,
          duration_seconds: timerState.focus_minutes * 60,
          planned_seconds: timerState.focus_minutes * 60,
          phase: 'focus',
          started_at: timerState.started_at,
          note: `Completed collaborative study room focus block in: ${roomInfo?.name || 'Study Room'}`
        });
        addToast('🔥 Incredible! Group study focus block completed & recorded!', 'success');
      } catch (err: any) {
        console.error('Failed to save room focus session:', err);
        addToast('Failed to save focus session record', 'error');
      }
    };
    
    saveRoomSession();
  }, [timeLeft, timerState, roomInfo, addToast]);

  // 1. Directory View (When not currently in a video room)
  if (!roomInfo) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-primary)' }}>
        {/* Header Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #A78BFA, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WebRTC Video Rooms
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Study live with your classmates in real-time group focus sessions.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Enter Code
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              Create Room
            </button>
          </div>
        </div>

        {/* Directory Grid */}
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Active Public Rooms ({activeRooms.length})</h2>
        {activeRooms.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            backgroundColor: 'rgba(30, 41, 59, 0.4)',
            borderRadius: '16px',
            border: '1px dashed rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '16px' }}>
              No public study rooms are currently active.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                backgroundColor: '#8B5CF6',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Start the First Room
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {activeRooms.map(room => (
              <div key={room.id} style={{
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}
              className="room-card"
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '8px' }}>{room.name}</h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(139,92,246,0.15)', color: '#C084FC', padding: '2px 8px', borderRadius: '12px' }}>
                      Pomodoro: {room.focus_minutes}m / {room.break_minutes}m
                    </span>
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(59,130,246,0.15)', color: '#60A5FA', padding: '2px 8px', borderRadius: '12px' }}>
                      Invite Code: {room.code}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Max Capacity: {room.max_participants} peers
                  </span>
                  <button
                    onClick={() => {
                      setJoinCode(room.code);
                      setIsJoinModalOpen(true);
                    }}
                    style={{
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Quick Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE ROOM MODAL */}
        {isCreateModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: '#1E293B', padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', width: '100%', maxWidth: '480px', color: '#FFFFFF' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>Create Video Room</h2>
              {errorMsg && <p style={{ color: '#EF4444', marginBottom: '16px', fontSize: '0.9rem' }}>{errorMsg}</p>}
              <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Room Name</label>
                  <input type="text" required value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="e.g. Live Study Circle" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0F172A', color: '#FFFFFF' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Password (Optional)</label>
                  <input type="password" value={roomPassword} onChange={e => setRoomPassword(e.target.value)} placeholder="Leave blank for public room" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0F172A', color: '#FFFFFF' }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Focus Duration (Min)</label>
                    <input type="number" min={5} max={120} value={focusMinutes} onChange={e => setFocusMinutes(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0F172A', color: '#FFFFFF' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Break Duration (Min)</label>
                    <input type="number" min={1} max={60} value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0F172A', color: '#FFFFFF' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Subject Mapping</label>
                  <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                    <option value="">No subject tied</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button type="button" onClick={() => { setIsCreateModalOpen(false); resetCreateForm(); }} style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ backgroundColor: '#8B5CF6', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* JOIN ROOM MODAL */}
        {isJoinModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: '#1E293B', padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', width: '100%', maxWidth: '400px', color: '#FFFFFF' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>Join Study Room</h2>
              {errorMsg && <p style={{ color: '#EF4444', marginBottom: '16px', fontSize: '0.9rem' }}>{errorMsg}</p>}
              <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Room Code</label>
                  <input type="text" required value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="e.g. ABC12" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0F172A', color: '#FFFFFF', textTransform: 'uppercase' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Room Password</label>
                  <input type="password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} placeholder="Leave blank if room has no password" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0F172A', color: '#FFFFFF' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button type="button" onClick={() => { setIsJoinModalOpen(false); setJoinCode(''); setJoinPassword(''); }} style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ backgroundColor: '#3B82F6', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Join Room</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Active Video Room Dashboard View

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
      height: 'calc(100vh - 64px)', // Deduct nav-bar height
      color: '#FFFFFF',
      backgroundColor: '#0B0F19'
    }}>
      {/* LEFT COLUMN: Main Video Grid & Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px',
        overflowY: 'auto'
      }}>
        {/* Room Header Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{roomInfo.name}</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              <span>Invite Code:</span>
              <strong style={{ color: '#60A5FA', fontSize: '0.9rem' }}>{roomInfo.code}</strong>
              <span style={{ margin: '0 4px' }}>•</span>
              <span>Participants: {Object.keys(peers).length + 1} / {roomInfo.max_participants}</span>
            </div>
          </div>

          <button
            onClick={leaveRoom}
            style={{
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            Leave Room
          </button>
        </div>

        {/* Video Grid component */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <VideoGrid />
        </div>

        {/* Media Controls Bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          marginTop: '20px'
        }}>
          {/* Reaction Bar */}
          <div style={{
            display: 'flex',
            gap: '8px',
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            padding: '6px 12px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            {reactions.map(emoji => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                style={{
                  fontSize: '1.4rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  transition: 'transform 0.15s'
                }}
                className="reaction-btn"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Audio / Video Toggles */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={toggleMic}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: isMicOn ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isMicOn ? '#60A5FA' : '#F87171',
                border: `1px solid ${isMicOn ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                transition: 'all 0.2s'
              }}
              title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
            >
              {isMicOn ? '🎙️' : '🔇'}
            </button>

            <button
              onClick={toggleCamera}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: isCameraOn ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isCameraOn ? '#60A5FA' : '#F87171',
                border: `1px solid ${isCameraOn ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                transition: 'all 0.2s'
              }}
              title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isCameraOn ? '📹' : '🚫'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Synced Timer & Room Chat */}
      <div style={{
        backgroundColor: '#0F172A',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        {/* Synced Room Timer */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Room Timer {timerState && timerState.phase !== 'idle' ? `(${timerState.phase.toUpperCase()})` : ''}
          </h3>

          <div style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            color: timerState?.phase === 'break' ? '#10B981' : '#F59E0B',
            marginBottom: '12px'
          }}>
            {timerState && timerState.phase !== 'idle' ? formatTime(timeLeft) : '00:00'}
          </div>

          {/* Host Timer controls */}
          {isHost ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {timerState && timerState.phase !== 'idle' ? (
                <button
                  onClick={stopTimer}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#F87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Stop Timer
                </button>
              ) : (
                <>
                  <button
                    onClick={() => startTimer('focus')}
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#FBBF24',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Start Focus
                  </button>
                  <button
                    onClick={() => startTimer('break')}
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34D399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Start Break
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {timerState && timerState.phase !== 'idle' ? 'Timer is running' : 'Waiting for host to start timer...'}
            </div>
          )}
        </div>

        {/* Scrollable Text Chat Messages */}
        <div style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {chatMessages.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}>
              No messages in chat yet.
            </div>
          ) : (
            chatMessages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.senderId === user?.id ? 'flex-end' : 'flex-start'
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  {msg.senderName}
                </span>
                <div style={{
                  backgroundColor: msg.senderId === user?.id ? '#3B82F6' : 'rgba(255,255,255,0.06)',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  maxWidth: '85%',
                  wordBreak: 'break-word',
                  border: msg.senderId === user?.id ? 'none' : '1px solid rgba(255,255,255,0.05)'
                }}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input box form */}
        <form onSubmit={handleSendChat} style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: '#0B0F19',
          display: 'flex',
          gap: '8px'
        }}>
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Type message..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              fontSize: '0.85rem'
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

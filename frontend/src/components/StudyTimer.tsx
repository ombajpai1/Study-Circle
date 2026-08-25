import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RoomPanel } from './RoomPanel';
import type { Subject } from '../api/client';
import { RotateCcw } from 'lucide-react';

export const StudyTimer: React.FC = () => {
  const {
    subjects,
    timerState,
    selectedSubjectId,
    setSelectedSubjectId,
    focusDuration,
    setFocusDuration,
    timeLeft,
    currentPhase,
    startTimer,
    pauseTimer,
    resetTimer,
    addSubject
  } = useApp();

  const [timerMode, setTimerMode] = useState<'solo' | 'group'>('solo');
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  // Subject Creation States
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectEmoji, setNewSubjectEmoji] = useState('📚');
  const [newSubjectColor] = useState('#2383E2');

  const handleSaveSubject = async () => {
    if (!newSubjectName.trim()) return;
    const success = await addSubject(newSubjectName.trim(), newSubjectEmoji || '📚', newSubjectColor);
    if (success) {
      setNewSubjectName('');
      setNewSubjectEmoji('📚');
      setIsAddingSubject(false);
    }
  };

  const fetchRecentSessions = () => {
    try {
      const saved = localStorage.getItem('study_circle_local_sessions');
      if (saved) {
        setRecentSessions(JSON.parse(saved).slice(0, 3));
      } else {
        setRecentSessions([]);
      }
    } catch (e) {
      console.error('Failed to load local sessions', e);
    }
  };

  useEffect(() => {
    if (timerMode === 'solo') {
      fetchRecentSessions();
    }
  }, [timerMode, timerState]);

  const getSelectedSubject = (): Subject | null => {
    return subjects.find(s => s.id === selectedSubjectId) || null;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // SVG Progress calculation
  const totalDuration = currentPhase === 'focus' ? focusDuration * 60 : 5 * 60;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - timeLeft / totalDuration);

  if (timerMode === 'group') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Sub-header navigation toggles */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '0.5px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
          <span 
            onClick={() => setTimerMode('solo')}
            style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Solo Focus
          </span>
          <span 
            style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent)', borderBottom: '2px solid var(--accent)', paddingBottom: '12px', cursor: 'pointer', marginBottom: '-14px' }}
          >
            Group Study Rooms
          </span>
        </div>
        <RoomPanel />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', margin: '0 auto', alignItems: 'center', height: '100%', justifyContent: 'center' }}>
      
      {/* Sub-header navigation toggles */}
      <div style={{ display: 'flex', width: '100%', gap: '16px', borderBottom: '0.5px solid var(--border)', paddingBottom: '12px', marginBottom: '8px' }}>
        <span 
          style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent)', borderBottom: '2px solid var(--accent)', paddingBottom: '12px', cursor: 'pointer', marginBottom: '-14px' }}
        >
          Solo Focus
        </span>
        <span 
          onClick={() => setTimerMode('group')}
          style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          Group Study Rooms
        </span>
      </div>

      <div className="timer-screen">
        <div className="timer-tile">
          
          {/* Subjects Pills Row */}
          {timerState === 'IDLE' && (
            <div className="chips" style={{ overflowX: 'auto', width: '100%', paddingBottom: '4px', whiteSpace: 'nowrap', display: 'flex', justifyContent: 'center' }}>
              {subjects.map(s => (
                <span
                  key={s.id}
                  onClick={() => setSelectedSubjectId(s.id)}
                  className={`chip ${selectedSubjectId === s.id ? 'active' : ''}`}
                >
                  <span>{s.emoji}</span>
                  <span>{s.name}</span>
                </span>
              ))}
              <span
                onClick={() => setIsAddingSubject(true)}
                className="chip"
                style={{ borderStyle: 'dashed' }}
              >
                <span>+ add</span>
              </span>
            </div>
          )}

          {/* Inline Add Subject Form */}
          {timerState === 'IDLE' && isAddingSubject && (
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              alignItems: 'center', 
              width: '100%', 
              padding: '6px', 
              backgroundColor: 'var(--bg-primary)', 
              borderRadius: '8px',
              border: '0.5px solid var(--border)',
              marginTop: '-8px'
            }}>
              <input 
                type="text" 
                value={newSubjectEmoji} 
                onChange={(e) => setNewSubjectEmoji(e.target.value)}
                style={{ width: '24px', textAlign: 'center', border: '0.5px solid var(--border)', borderRadius: '4px', padding: '2px' }}
                maxLength={2}
              />
              <input 
                type="text" 
                placeholder="Subject Name" 
                value={newSubjectName} 
                onChange={(e) => setNewSubjectName(e.target.value)}
                style={{ flex: 1, border: '0.5px solid var(--border)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px' }}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleSaveSubject} 
                style={{ fontSize: '10px', padding: '2px 6px', height: '20px' }}
              >
                Save
              </button>
              <button onClick={() => setIsAddingSubject(false)} style={{ fontSize: '11px', cursor: 'pointer', color: 'var(--text-secondary)', background: 'none', border: 'none' }}>✕</button>
            </div>
          )}

          {/* Selected Subject Context when running */}
          {timerState !== 'IDLE' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {currentPhase === 'focus' ? (
                <>
                  <span>{getSelectedSubject()?.emoji || '📚'}</span>
                  <span>{getSelectedSubject()?.name || 'Focusing'}</span>
                </>
              ) : (
                <>
                  <span>☕</span>
                  <span>Break Time</span>
                </>
              )}
            </div>
          )}

          {/* SVG Ring Timer (140px wrap) */}
          <div className="ring-wrap">
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
              <circle 
                cx="70" 
                cy="70" 
                r={radius} 
                fill="none" 
                stroke="rgba(255,255,255,0.06)" 
                strokeWidth="5" 
              />
              {timerState !== 'IDLE' && (
                <circle 
                  cx="70" 
                  cy="70" 
                  r={radius} 
                  fill="none" 
                  stroke="var(--accent)" 
                  strokeWidth="5" 
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
              )}
            </svg>
            <div className="ring-time">
              <div className="ring-digits">{formatTime(timeLeft)}</div>
              <div className="ring-phase">{currentPhase}</div>
            </div>
          </div>

          {/* Control Triggers */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {timerState === 'IDLE' && (
              <button className="start-btn" onClick={startTimer}>
                Start focus
              </button>
            )}

            {timerState === 'RUNNING' && (
              <button className="start-btn" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }} onClick={pauseTimer}>
                Pause
              </button>
            )}

            {timerState === 'PAUSED' && (
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button className="start-btn" style={{ flex: 1 }} onClick={startTimer}>
                  Resume
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ height: '36px', width: '36px', borderRadius: '8px', padding: 0 }} 
                  onClick={resetTimer}
                  title="Reset"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Preset Buttons (Only in IDLE) */}
          {timerState === 'IDLE' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
              {[15, 25, 50].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setFocusDuration(mins)}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: focusDuration === mins ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
                    color: focusDuration === mins ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {mins}m
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '1px 6px', height: '18px' }}>
                <input 
                  type="number" 
                  min="1" 
                  max="180" 
                  value={focusDuration} 
                  onChange={(e) => setFocusDuration(Math.max(1, parseInt(e.target.value) || 25))}
                  style={{ width: '22px', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '11px', padding: 0, color: 'var(--text-primary)' }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>m</span>
              </div>
            </div>
          )}

          {/* Session Logs List */}
          <div className="session-log">
            {recentSessions.map((s, idx) => (
              <div className="log-row" key={s.id || idx}>
                <span>{s.subject?.name || 'Focus block'}</span>
                <span>{formatTime(s.duration_seconds)}</span>
              </div>
            ))}
            {recentSessions.length === 0 && (
              <div style={{ fontSize: '10px', textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.5, padding: '4px 0' }}>
                No sessions completed yet
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};

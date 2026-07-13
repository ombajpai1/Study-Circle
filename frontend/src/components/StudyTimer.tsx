import React from 'react';
import { useApp } from '../context/AppContext';
import type { Subject } from '../api/client';
import { FriendsSidebar } from './FriendsSidebar';
import { Play, Pause, RotateCcw, SkipForward, AlertCircle } from 'lucide-react';

export const StudyTimer: React.FC = () => {
  const {
    subjects,
    timerState,
    selectedSubjectId,
    setSelectedSubjectId,
    focusDuration,
    setFocusDuration,
    customMinutes,
    setCustomMinutes,
    timeLeft,
    currentPhase,
    startTimer,
    pauseTimer,
    resetTimer,
    skipTimer
  } = useApp();

  const getSelectedSubject = (): Subject | null => {
    return subjects.find(s => s.id === selectedSubjectId) || null;
  };

  // UI Formatters
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDurationPill = (mins: number) => {
    if (timerState === 'IDLE') {
      setFocusDuration(mins);
      setCustomMinutes('');
    }
  };

  const handleCustomMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (timerState !== 'IDLE') return;

    setCustomMinutes(val);
    const mins = parseInt(val, 10);
    if (!isNaN(mins) && mins > 0) {
      setFocusDuration(mins);
    }
  };

  const getPhaseBadgeColor = () => {
    if (timerState === 'IDLE') return 'var(--text-secondary)';
    if (timerState === 'PAUSED') return 'var(--text-secondary)';
    if (currentPhase === 'break') return 'var(--warning)';
    return 'var(--accent)';
  };

  return (
    <div className="bento-grid" style={{ width: '100%' }}>
      {/* Left side: Main digital Timer */}
      <div className="bento-card col-8" style={{ gridColumn: 'span 8', minHeight: '480px', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* Status Indicator */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: getPhaseBadgeColor(),
          border: `1px solid ${getPhaseBadgeColor()}`,
          padding: '0.25rem 0.75rem',
          borderRadius: '20px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '1.5rem'
        }}>
          <span style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            backgroundColor: getPhaseBadgeColor() 
          }} className={timerState === 'RUNNING' ? 'timer-pulse' : ''} />
          {timerState === 'IDLE' && `IDLE • Ready to ${currentPhase}`}
          {timerState === 'RUNNING' && `${currentPhase} session running`}
          {timerState === 'PAUSED' && 'session paused'}
          {timerState === 'BREAK' && 'taking a break'}
        </div>

        {/* Digital Clock Display */}
        <div 
          className={timerState === 'RUNNING' ? 'timer-pulse' : ''}
          style={{ 
            fontSize: '6rem', 
            fontWeight: 800, 
            fontFamily: 'monospace', 
            letterSpacing: '-0.02em', 
            lineHeight: 1,
            color: currentPhase === 'break' ? 'var(--warning)' : 'var(--text-primary)',
            textShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          {formatTime(timeLeft)}
        </div>

        {/* Selected subject context */}
        {currentPhase === 'focus' && getSelectedSubject() && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
            <span>{getSelectedSubject()?.emoji}</span>
            <span>Focusing on {getSelectedSubject()?.name}</span>
          </div>
        )}

        {currentPhase === 'break' && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
            <span>☕</span>
            <span>Refuel & Stretch Break</span>
          </div>
        )}

        {/* Subjects & Settings Selector (Only shown in IDLE state) */}
        {timerState === 'IDLE' && currentPhase === 'focus' && (
          <div style={{ width: '100%', maxWidth: '420px', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Subject Select */}
            <div>
              <label className="stat-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Subject Focus</label>
              {subjects.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <AlertCircle size={16} />
                  <span>No subjects created yet. Navigate to Dashboard to add one!</span>
                </div>
              ) : (
                <select 
                  className="form-control" 
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  style={{ padding: '0.65rem', backgroundColor: 'var(--bg-primary)' }}
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Quick Time Pills */}
            <div>
              <label className="stat-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Focus Duration</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[1, 15, 25, 50].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleDurationPill(mins)}
                    className={`btn ${focusDuration === mins && !customMinutes ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '20px' }}
                  >
                    {mins === 1 ? '1 min (Test)' : `${mins} min`}
                  </button>
                ))}
                
                {/* Custom minutes inline input */}
                <input
                  type="number"
                  placeholder="Custom mins"
                  value={customMinutes}
                  onChange={handleCustomMinutesChange}
                  style={{ 
                    width: '110px', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '20px', 
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-primary)',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Controls Layout */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {timerState === 'IDLE' && (
            <button className="btn btn-primary" onClick={startTimer} style={{ minWidth: '130px' }}>
              <Play size={16} fill="white" />
              <span>Start focus</span>
            </button>
          )}

          {timerState === 'RUNNING' && (
            <>
              <button className="btn btn-secondary" onClick={pauseTimer} style={{ minWidth: '110px' }}>
                <Pause size={16} />
                <span>Pause</span>
              </button>
              <button className="btn btn-danger" onClick={resetTimer}>
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
            </>
          )}

          {timerState === 'PAUSED' && (
            <>
              <button className="btn btn-primary" onClick={startTimer} style={{ minWidth: '110px' }}>
                <Play size={16} fill="white" />
                <span>Resume</span>
              </button>
              <button className="btn btn-secondary" onClick={skipTimer}>
                <SkipForward size={16} />
                <span>Skip</span>
              </button>
              <button className="btn btn-danger" onClick={resetTimer}>
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
            </>
          )}

          {timerState === 'BREAK' && (
            <button className="btn btn-secondary" onClick={skipTimer} style={{ minWidth: '130px' }}>
              <SkipForward size={16} />
              <span>Skip break</span>
            </button>
          )}
        </div>
      </div>

      {/* Right side: Realtime Studies Sidebar */}
      <FriendsSidebar />
    </div>
  );
};

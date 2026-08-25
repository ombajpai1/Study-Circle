import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { Edit3 } from 'lucide-react';

export const ProfilePanel: React.FC = () => {
  const { 
    user, 
    themeAccent, 
    setThemeAccent, 
    subjects, 
    addSubject 
  } = useApp();

  const [stats, setStats] = useState<{ today_minutes: number; session_count: number; weekly_total_minutes: number } | null>(null);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectEmoji, setNewSubjectEmoji] = useState('📚');
  const [newSubjectColor, setNewSubjectColor] = useState('#2383E2');

  const fetchStats = async () => {
    try {
      const data = await api.stats.summary();
      setStats(data);
    } catch (e) {
      console.error('Failed to load profile summary stats', e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const handleSaveSubject = async () => {
    if (!newSubjectName.trim()) return;
    const success = await addSubject(newSubjectName.trim(), newSubjectEmoji || '📚', newSubjectColor);
    if (success) {
      setNewSubjectName('');
      setNewSubjectEmoji('📚');
      setIsAddingSubject(false);
    }
  };

  if (!user) return null;

  const initials = (user.display_name || user.username).substring(0, 2).toUpperCase();

  const swatches: { id: 'teal' | 'violet' | 'amber' | 'rose' | 'blue'; hex: string }[] = [
    { id: 'teal', hex: '#4ecdc4' },
    { id: 'violet', hex: '#7f77dd' },
    { id: 'amber', hex: '#ef9f27' },
    { id: 'rose', hex: '#d4537e' },
    { id: 'blue', hex: '#378add' }
  ];

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Profile Top Card */}
      <div className="profile-top">
        <div className="profile-av" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent)' }}>
          {initials}
        </div>
        <div>
          <div className="profile-name">{user.display_name || user.username}</div>
          <div className="profile-sub">@{user.username} · Student</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <Edit3 size={12} />
            <span>Edit profile</span>
          </button>
        </div>
      </div>

      {/* Stats Mini Row */}
      <div className="stat-mini-row">
        <div className="stat-mini">
          <div className="stat-mini-val">{user.current_streak}</div>
          <div className="stat-mini-lbl">day streak</div>
        </div>
        <div className="stat-mini">
          <div className="stat-mini-val">{stats ? stats.session_count : 0}</div>
          <div className="stat-mini-lbl">sessions</div>
        </div>
        <div className="stat-mini">
          <div className="stat-mini-val">{stats ? `${Math.floor(stats.weekly_total_minutes / 60)}h` : '0h'}</div>
          <div className="stat-mini-lbl">this week</div>
        </div>
      </div>

      {/* Theme Selection Swatches */}
      <div className="card-sm">
        <div className="label">Accent Theme</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Personalize your dashboard and focus rings.
        </div>
        <div className="theme-row">
          {swatches.map((sw) => (
            <div 
              key={sw.id}
              onClick={() => setThemeAccent(sw.id)}
              className={`theme-swatch ${themeAccent === sw.id ? 'selected' : ''}`}
              style={{ backgroundColor: sw.hex }}
              title={sw.id}
            />
          ))}
        </div>
      </div>

      {/* Subject Chips Card */}
      <div className="card-sm" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="label">Subjects</div>
        
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {subjects.map((sub) => (
            <span key={sub.id} className="chip active">
              <span>{sub.emoji}</span>
              <span>{sub.name}</span>
            </span>
          ))}
          <span 
            onClick={() => setIsAddingSubject(true)} 
            className="chip"
            style={{ cursor: 'pointer', borderStyle: 'dashed' }}
          >
            <span>+ add subject</span>
          </span>
        </div>

        {/* Inline Add Subject Form */}
        {isAddingSubject && (
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center', 
            width: '100%', 
            padding: '8px', 
            backgroundColor: 'var(--bg-primary)', 
            borderRadius: '8px',
            border: '0.5px solid var(--border)',
            marginTop: '8px'
          }}>
            <input 
              type="text" 
              placeholder="📚" 
              value={newSubjectEmoji} 
              onChange={(e) => setNewSubjectEmoji(e.target.value)}
              style={{ 
                width: '32px', 
                textAlign: 'center', 
                fontSize: '15px', 
                border: '1px solid var(--border)', 
                borderRadius: '6px', 
                padding: '4px',
                backgroundColor: 'transparent',
                outline: 'none',
                color: 'var(--text-primary)'
              }}
              maxLength={2}
            />
            <input 
              type="text" 
              placeholder="Subject Name" 
              value={newSubjectName} 
              onChange={(e) => setNewSubjectName(e.target.value)}
              style={{ 
                flex: 1, 
                fontSize: '13px', 
                border: '1px solid var(--border)', 
                borderRadius: '6px', 
                padding: '4px 8px',
                backgroundColor: 'transparent',
                outline: 'none',
                color: 'var(--text-primary)'
              }}
            />
            {/* Color Selection Palette */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['#787774', '#E16957', '#D9730D', '#DFAB01', '#0F7B6C', '#2383E2', '#6940A5', '#AD1A72'].map((c) => (
                <span 
                  key={c}
                  onClick={() => setNewSubjectColor(c)}
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    backgroundColor: c, 
                    cursor: 'pointer',
                    border: newSubjectColor === c ? '2px solid var(--text-primary)' : 'none',
                    boxSizing: 'border-box'
                  }}
                />
              ))}
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveSubject} 
              style={{ fontSize: '11px', padding: '4px 10px', height: '24px' }}
            >
              Save
            </button>
            <button 
              onClick={() => setIsAddingSubject(false)}
              style={{ 
                fontSize: '13px', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                color: 'var(--text-secondary)',
                padding: '0 4px'
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

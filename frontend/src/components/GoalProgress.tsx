import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { Target, Trophy } from 'lucide-react';

export const GoalProgress: React.FC = () => {
  const { user } = useApp();
  const [todayMins, setTodayMins] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTodayMinutes = async () => {
    try {
      const stats = await api.stats.summary();
      setTodayMins(stats.today_minutes);
      setLoading(false);
    } catch (e) {
      console.error('GoalProgress loading failed', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTodayMinutes();
    const interval = setInterval(fetchTodayMinutes, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const targetMins = user?.daily_goal_minutes || 60;
  const percentage = Math.min(100, Math.round((todayMins / targetMins) * 100));

  return (
    <div className="bento-card col-12" style={{ gridColumn: 'span 12', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={18} color="var(--accent)" />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Daily Focus Target</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600, color: percentage >= 100 ? 'var(--success)' : 'var(--text-secondary)' }}>
          {percentage >= 100 && !loading && <Trophy size={14} className="streak-flame" style={{ color: '#FBBF24' }} />}
          {loading ? (
            <span style={{ opacity: 0.5 }}>... / {targetMins} min</span>
          ) : (
            `${todayMins} / ${targetMins} min (${percentage}%)`
          )}
        </div>
      </div>
      
      {/* Progress Bar Container */}
      <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
        <div 
          style={{ 
            width: loading ? '0%' : `${percentage}%`, 
            height: '100%', 
            backgroundColor: percentage >= 100 ? 'var(--success)' : 'var(--accent)', 
            borderRadius: '5px',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease'
          }} 
        />
      </div>
      
      {loading ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', opacity: 0.5 }}>
          Calculating daily focus progress...
        </p>
      ) : percentage >= 100 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.5rem', fontWeight: 500 }}>
          🎉 Daily target achieved! Fantastic effort today. Keep it up!
        </p>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          You need {targetMins - todayMins} more focus minutes to hit your goal. Let's make it count!
        </p>
      )}
    </div>
  );
};

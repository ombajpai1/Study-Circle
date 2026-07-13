import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import type { StatsSummary } from '../api/client';
import { Flame, Clock, Calendar, CheckSquare } from 'lucide-react';

interface StatsGridProps {
  onNavigateToAnalytics?: () => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ onNavigateToAnalytics }) => {
  const { user } = useApp();
  const [stats, setStats] = useState<StatsSummary>({
    today_minutes: 0,
    current_streak: 0,
    weekly_total_minutes: 0,
    session_count: 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSummaryStats = async () => {
    try {
      const data = await api.stats.summary();
      setStats(data);
      setLoading(false);
    } catch (e) {
      console.error('StatsGrid summary loading failed', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchSummaryStats();
    const interval = setInterval(fetchSummaryStats, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const formatHours = (mins: number) => {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
  };

  return (
    <div className="bento-grid col-12" style={{ gridColumn: 'span 12' }}>
      {/* Today's Focus */}
      <div className="bento-card col-3 interactive">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="stat-label">Today's Focus</span>
          <Clock size={20} color="var(--accent)" />
        </div>
        <div className="stat-value">
          {loading ? <span style={{ opacity: 0.5 }}>...</span> : formatHours(stats.today_minutes)}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Daily target: {user?.daily_goal_minutes || 60}m
        </div>
      </div>

      {/* Current Streak */}
      <div className="bento-card col-3 interactive">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="stat-label">Current Streak</span>
          <Flame size={20} className={stats.current_streak > 0 ? 'streak-flame' : ''} />
        </div>
        <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {loading ? <span style={{ opacity: 0.5 }}>...</span> : stats.current_streak}
          <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>days</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Longest: {user?.longest_streak || 0} days
        </div>
      </div>

      {/* Weekly Total (Click Target -> Analytics) */}
      <div 
        className="bento-card col-3 interactive"
        onClick={() => onNavigateToAnalytics?.()}
        style={{ cursor: 'pointer' }}
        title="View detailed Analytics"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="stat-label">Weekly Total</span>
          <Calendar size={20} color="var(--success)" />
        </div>
        <div className="stat-value">
          {loading ? <span style={{ opacity: 0.5 }}>...</span> : formatHours(stats.weekly_total_minutes)}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '0.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          👉 Click to view progress
        </div>
      </div>

      {/* Total Sessions (Click Target -> Analytics) */}
      <div 
        className="bento-card col-3 interactive"
        onClick={() => onNavigateToAnalytics?.()}
        style={{ cursor: 'pointer' }}
        title="View detailed Analytics"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="stat-label">Total Sessions</span>
          <CheckSquare size={20} color="var(--warning)" />
        </div>
        <div className="stat-value">
          {loading ? <span style={{ opacity: 0.5 }}>...</span> : stats.session_count}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '0.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          👉 Click to view breakdown
        </div>
      </div>
    </div>
  );
};

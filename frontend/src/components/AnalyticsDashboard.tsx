import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import type { DailyStat, SubjectStat } from '../api/client';

export const AnalyticsDashboard: React.FC = () => {
  const { user } = useApp();
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [range, setRange] = useState<'week' | 'month'>('week');

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [daily, subjectsData] = await Promise.all([
        api.stats.daily(),
        api.stats.subjects()
      ]);
      setDailyStats(daily);
      setSubjectStats(subjectsData);
    } catch (e) {
      console.error('Failed to load analytics stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
        <p style={{ fontStyle: 'italic' }}>Loading progress analytics...</p>
      </div>
    );
  }

  const totalFocusedMinutes = subjectStats.reduce((sum, item) => sum + item.minutes, 0);
  const hours = Math.floor(totalFocusedMinutes / 60);
  const mins = Math.round(totalFocusedMinutes % 60);

  // Map dates to weekdays (e.g. Mon, Tue, etc.)
  const getWeekdayName = (dateStr: string, index: number) => {
    if (index === dailyStats.length - 1) return 'Today';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      }
    } catch (err) {}
    return dateStr;
  };

  const maxMins = Math.max(...dailyStats.map(d => d.minutes), 1);
  const maxSubjectMins = Math.max(...subjectStats.map(s => s.minutes), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px', margin: '0 auto' }}>
      
      {/* Week / Month Toggle */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div>
          <div className="hero-num">{hours}h {mins}m</div>
          <div className="hero-sub">{range === 'week' ? 'this week' : 'this month'} · active study sessions</div>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,.05)', borderRadius: '6px', padding: '3px' }}>
          <div 
            onClick={() => setRange('week')}
            style={{ 
              fontSize: '11px', 
              padding: '3px 10px', 
              borderRadius: '4px', 
              background: range === 'week' ? 'rgba(255,255,255,.08)' : 'transparent', 
              color: range === 'week' ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.3)',
              cursor: 'pointer'
            }}
          >
            week
          </div>
          <div 
            onClick={() => setRange('month')}
            style={{ 
              fontSize: '11px', 
              padding: '3px 10px', 
              borderRadius: '4px', 
              background: range === 'month' ? 'rgba(255,255,255,.08)' : 'transparent', 
              color: range === 'month' ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.3)',
              cursor: 'pointer'
            }}
          >
            month
          </div>
        </div>
      </div>

      {/* HTML-based mini-chart */}
      <div className="mini-chart">
        {dailyStats.map((d, index) => {
          const pct = (d.minutes / maxMins) * 100;
          const isToday = index === dailyStats.length - 1;
          const hasStudied = d.minutes > 0;
          
          let barClass = "bar bar-rest";
          if (isToday) {
            barClass = "bar bar-today";
          } else if (hasStudied) {
            barClass = "bar bar-active";
          }
          
          return (
            <div 
              key={d.date} 
              className={barClass} 
              style={{ height: `${Math.max(4, pct)}%` }}
              title={`${d.minutes} mins`}
            />
          );
        })}
      </div>

      {/* Weekday labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,.2)', marginBottom: '8px' }}>
        {dailyStats.map((d, index) => (
          <span key={d.date} style={{ flex: 1, textAlign: 'center' }}>
            {getWeekdayName(d.date, index)}
          </span>
        ))}
      </div>

      {/* Subject breakdowns */}
      <div>
        <div className="section-head">By subject</div>
        {subjectStats.map((subject) => {
          const percentage = (subject.minutes / maxSubjectMins) * 100;
          const subHrs = Math.floor(subject.minutes / 60);
          const subMins = Math.round(subject.minutes % 60);
          
          return (
            <div key={subject.subject_name} className="subj-row">
              <div className="subj-name">{subject.subject_name}</div>
              <div className="subj-bar-wrap">
                <div 
                  className="subj-bar-fill" 
                  style={{ 
                    width: `${percentage}%`, 
                    backgroundColor: 'var(--accent)',
                    opacity: 0.3 + (percentage / 100) * 0.7 
                  }} 
                />
              </div>
              <div className="subj-hrs">
                {subHrs > 0 ? `${subHrs}h` : `${subMins}m`}
              </div>
            </div>
          );
        })}

        {subjectStats.length === 0 && (
          <p style={{ fontStyle: 'italic', fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 0' }}>No focus data categorized by subject.</p>
        )}
      </div>

    </div>
  );
};

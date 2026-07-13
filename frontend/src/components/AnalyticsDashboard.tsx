import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import type { DailyStat, SubjectStat } from '../api/client';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto'; // Automatically registers elements
import { BarChart2, PieChart, TrendingUp } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const { user, darkMode } = useApp();
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [daily, subjects] = await Promise.all([
        api.stats.daily(),
        api.stats.subjects()
      ]);
      setDailyStats(daily);
      setSubjectStats(subjects);
    } catch (e) {
      console.error('Failed to load analytics stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [user]);

  // Styling properties matching theme modes
  const gridlineColor = darkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
  const textColor = darkMode ? '#94A3B8' : '#64748B';

  // 1. Weekly Productivity Bar Chart Options
  const barChartData = {
    labels: dailyStats.map(d => d.date),
    datasets: [
      {
        label: 'Focus Minutes',
        data: dailyStats.map(d => d.minutes),
        backgroundColor: darkMode ? '#6366F1' : '#4F46E5', // Monochromatic Indigo
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 24,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
        titleColor: darkMode ? '#F8FAFC' : '#1E293B',
        bodyColor: darkMode ? '#94A3B8' : '#64748B',
        borderColor: darkMode ? '#334155' : '#E2E8F0',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: (context: any) => ` ${context.raw} minutes focused`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: textColor,
          font: { family: 'Inter', size: 11, weight: 500 as any }
        }
      },
      y: {
        grid: {
          color: gridlineColor,
          drawTicks: false
        },
        border: {
          display: false
        },
        ticks: {
          color: textColor,
          font: { family: 'Inter', size: 11 },
          stepSize: 30
        }
      }
    }
  };

  // 2. Subject Doughnut Chart Options
  const doughnutChartData = {
    labels: subjectStats.map(s => s.subject_name),
    datasets: [
      {
        data: subjectStats.map(s => s.minutes),
        backgroundColor: subjectStats.map(s => s.color_hex || '#4F46E5'),
        borderWidth: darkMode ? 2 : 1,
        borderColor: darkMode ? '#1E293B' : '#FFFFFF',
        hoverOffset: 4
      }
    ]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: darkMode ? '#F8FAFC' : '#1E293B',
          font: { family: 'Inter', size: 12, weight: 500 as any },
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
        titleColor: darkMode ? '#F8FAFC' : '#1E293B',
        bodyColor: darkMode ? '#94A3B8' : '#64748B',
        borderColor: darkMode ? '#334155' : '#E2E8F0',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: any) => ` ${context.label}: ${context.raw} mins (${Math.round((context.raw / subjectStats.reduce((a, b) => a + b.minutes, 0)) * 100)}%)`
        }
      }
    },
    cutout: '72%' // Thin elegant ring
  };

  if (loading) {
    return (
      <div className="bento-card col-12" style={{ gridColumn: 'span 12', minHeight: '400px', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading analytics dashboards...</p>
      </div>
    );
  }

  const totalFocusedMinutes = subjectStats.reduce((sum, item) => sum + item.minutes, 0);

  return (
    <div className="bento-grid" style={{ width: '100%' }}>
      
      {/* Summary insights banner */}
      <div className="bento-card col-12" style={{ gridColumn: 'span 12', flexDirection: 'row', gap: '1rem', alignItems: 'center', backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none' }}>
        <TrendingUp size={24} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>Weekly Study Volume: {Math.round(totalFocusedMinutes / 60)} hours {totalFocusedMinutes % 60} minutes</div>
          <p style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '0.15rem' }}>Your focused study time has increased by 12% compared to last week. System Design remains your top focus area.</p>
        </div>
      </div>

      {/* Bar Chart: Productivity */}
      <div className="bento-card col-8" style={{ gridColumn: 'span 8', minHeight: '380px' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={20} color="var(--accent)" />
          <span>Productivity Trends (Daily Minutes)</span>
        </h3>
        <div style={{ flex: 1, position: 'relative', minHeight: '260px' }}>
          <Bar data={barChartData} options={barChartOptions} />
        </div>
      </div>

      {/* Doughnut Chart: Subject Distribution */}
      <div className="bento-card col-4" style={{ gridColumn: 'span 4', minHeight: '380px' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PieChart size={20} color="var(--success)" />
          <span>Subject Allocation</span>
        </h3>
        {subjectStats.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '240px', color: 'var(--text-secondary)' }}>
            <p>No study logs available.</p>
          </div>
        ) : (
          <div style={{ flex: 1, position: 'relative', minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
          </div>
        )}
      </div>

    </div>
  );
};

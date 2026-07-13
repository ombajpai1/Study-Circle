import React from 'react';
import { useApp } from '../context/AppContext';
import { Moon, Sun, LogOut, BookOpen, Award } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, darkMode, toggleDarkMode, logout } = useApp();

  return (
    <header className="navbar">
      {/* Brand logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
        <BookOpen size={24} color="var(--accent)" strokeWidth={2.5} />
        <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Study Circle
        </span>
      </div>

      {/* Navigation tabs */}
      <nav className="nav-links">
        <div 
          className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </div>
        <div 
          className={`nav-link ${activeTab === 'timer' ? 'active' : ''}`}
          onClick={() => setActiveTab('timer')}
        >
          Focus Timer
        </div>
        <div 
          className={`nav-link ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends Circle
        </div>
        <div 
          className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </div>
        <div 
          className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Messages
        </div>
      </nav>

      {/* Action panel: Profile + Toggle + Logout */}
      <div className="navbar-actions">
        {/* User stats preview */}
        <div className="navbar-stats">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
            <Award size={16} style={{ color: '#FFD700' }} />
            <span>{user?.current_streak || 0}d streak</span>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            @{user?.username}
          </div>
        </div>

        {/* Theme mode toggle */}
        <button 
          onClick={toggleDarkMode}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: 'var(--text-primary)', 
            display: 'flex', 
            alignItems: 'center', 
            outline: 'none' 
          }}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Logout button */}
        <button 
          onClick={logout}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: 'var(--error)', 
            display: 'flex', 
            alignItems: 'center', 
            outline: 'none',
            padding: '0.25rem'
          }}
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

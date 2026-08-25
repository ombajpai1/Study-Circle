import React from 'react';
import { useApp } from '../context/AppContext';
import { Play, Users, MessageSquare, BarChart2, CheckSquare, User, LogOut } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { logout } = useApp();

  return (
    <aside className="sidebar">
      {/* Timer Tab */}
      <div 
        className={`sbi ${activeTab === 'timer' ? 'active' : ''}`}
        onClick={() => setActiveTab('timer')}
        title="Focus Timer"
      >
        <Play size={16} fill={activeTab === 'timer' ? 'currentColor' : 'none'} />
      </div>

      {/* Friends Tab */}
      <div 
        className={`sbi ${activeTab === 'friends' ? 'active' : ''}`}
        onClick={() => setActiveTab('friends')}
        title="Friends Circle"
      >
        <Users size={16} />
      </div>

      {/* Chat Tab */}
      <div 
        className={`sbi ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => setActiveTab('chat')}
        title="Messages"
      >
        <MessageSquare size={16} />
      </div>

      {/* Analytics Tab */}
      <div 
        className={`sbi ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => setActiveTab('analytics')}
        title="Progress"
      >
        <BarChart2 size={16} />
      </div>

      {/* Goals Tab */}
      <div 
        className={`sbi ${activeTab === 'goals' ? 'active' : ''}`}
        onClick={() => setActiveTab('goals')}
        title="Study Goals"
      >
        <CheckSquare size={16} />
      </div>

      {/* Sidebar Bottom section */}
      <div className="sb-bottom">
        {/* Profile Tab */}
        <div 
          className={`sbi ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          title="Profile"
        >
          <User size={16} />
        </div>

        {/* Logout */}
        <div 
          className="sbi"
          onClick={logout}
          title="Sign Out"
          style={{ color: 'var(--danger)' }}
        >
          <LogOut size={16} />
        </div>
      </div>
    </aside>
  );
};

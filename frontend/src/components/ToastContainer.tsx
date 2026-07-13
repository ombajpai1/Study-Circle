import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info, ChevronUp, ChevronDown, Bell } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Auto-expand the drawer when a new toast arrives
  useEffect(() => {
    if (toasts.length > 0) {
      setIsExpanded(true);
    }
  }, [toasts.length]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} color="var(--success)" style={{ flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0 }} />;
      case 'error':
        return <AlertCircle size={16} color="var(--error)" style={{ flexShrink: 0 }} />;
      default:
        return <Info size={16} color="var(--accent)" style={{ flexShrink: 0 }} />;
    }
  };

  // LinkedIn message drawer styles (overrides the generic bottom-right toasts)
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 0,
        right: '2rem',
        width: '320px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        transform: `translateY(${isExpanded ? '0' : 'calc(100% - 46px)'})`,
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden'
      }}
    >
      {/* LinkedIn style header tab */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--accent)',
          color: '#FFFFFF',
          cursor: 'pointer',
          userSelect: 'none',
          fontWeight: 600,
          fontSize: '0.85rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={14} className={toasts.length > 0 && isExpanded ? 'timer-pulse' : ''} />
          <span>Focus Alerts ({toasts.length})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {/* Drawer content (list of notifications) */}
      <div 
        style={{
          maxHeight: '260px',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          padding: '0.5rem 0'
        }}
      >
        {toasts.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
            No active alerts.
          </div>
        ) : (
          toasts.map((t) => (
            <div 
              key={t.id} 
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border)',
                position: 'relative',
                animation: 'slideIn 0.2s ease-out'
              }}
            >
              {getIcon(t.type)}
              <div style={{ flex: 1, fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4, paddingRight: '1rem' }}>
                {t.message}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                  outline: 'none',
                  opacity: 0.7
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

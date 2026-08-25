import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check, Trash2 } from 'lucide-react';

interface GoalItem {
  id: string;
  label: string;
  currentHours: number;
  targetHours: number;
}

export const GoalList: React.FC = () => {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<string>('');
  const [editCurrent, setEditCurrent] = useState<number>(0);
  const [editTarget, setEditTarget] = useState<number>(1);
  const [showCompleted, setShowCompleted] = useState<boolean>(true);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('study_circle_goals');
    if (saved) {
      try {
        setGoals(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default placeholder goals
      const defaults: GoalItem[] = [
        { id: '1', label: 'Study 4 hours today', currentHours: 2.5, targetHours: 4 },
        { id: '2', label: '30-day streak', currentHours: 12, targetHours: 30 },
        { id: '3', label: 'Physics chapter 5', currentHours: 8, targetHours: 10 }
      ];
      setGoals(defaults);
      localStorage.setItem('study_circle_goals', JSON.stringify(defaults));
    }
  }, []);

  // Save to localStorage helper
  const saveGoals = (updated: GoalItem[]) => {
    setGoals(updated);
    localStorage.setItem('study_circle_goals', JSON.stringify(updated));
  };

  const handleStartEdit = (goal: GoalItem) => {
    setEditingId(goal.id);
    setEditLabel(goal.label);
    setEditCurrent(goal.currentHours);
    setEditTarget(goal.targetHours);
  };

  const handleSaveEdit = (id: string) => {
    if (!editLabel.trim()) {
      handleDeleteGoal(id);
      return;
    }
    const updated = goals.map(g => {
      if (g.id === id) {
        return {
          ...g,
          label: editLabel.trim(),
          currentHours: Math.max(0, editCurrent),
          targetHours: Math.max(1, editTarget)
        };
      }
      return g;
    });
    saveGoals(updated);
    setEditingId(null);
  };

  const handleAddGoal = () => {
    const newId = Date.now().toString();
    const newGoal: GoalItem = {
      id: newId,
      label: '',
      currentHours: 0,
      targetHours: 2
    };
    const updated = [...goals, newGoal];
    setGoals(updated);
    setEditingId(newId);
    setEditLabel('');
    setEditCurrent(0);
    setEditTarget(2);
  };

  const handleDeleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    saveGoals(updated);
    setEditingId(null);
  };

  const formatProgressVal = (current: number, target: number) => {
    const hrs = Math.floor(current);
    const mins = Math.round((current - hrs) * 60);
    const timeText = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    return `${timeText} / ${target}h`;
  };

  const activeGoals = goals.filter(g => g.currentHours < g.targetHours);
  const completedGoals = goals.filter(g => g.currentHours >= g.targetHours);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px', margin: '0 auto' }}>
      
      {/* Active Goals Section */}
      <div>
        <div className="section-head">Active Goals ({activeGoals.length})</div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activeGoals.map(goal => {
            const percentage = Math.min(100, (goal.currentHours / goal.targetHours) * 100);
            
            if (editingId === goal.id) {
              return (
                <div 
                  key={goal.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px', 
                    padding: '12px', 
                    backgroundColor: 'var(--surface-2)', 
                    border: '0.5px solid var(--border)', 
                    borderRadius: '8px',
                    margin: '8px 0' 
                  }}
                >
                  <input
                    type="text"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    placeholder="Goal description"
                    autoFocus
                    style={{ 
                      fontSize: '13px', 
                      border: '0.5px solid var(--border)', 
                      borderRadius: '6px', 
                      padding: '4px 8px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Current:</span>
                      <input
                        type="number"
                        value={editCurrent}
                        onChange={e => setEditCurrent(parseFloat(e.target.value) || 0)}
                        style={{ width: '48px', padding: '2px 4px', fontSize: '12px', border: '0.5px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', textAlign: 'center' }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Target:</span>
                      <input
                        type="number"
                        value={editTarget}
                        onChange={e => setEditTarget(parseFloat(e.target.value) || 1)}
                        style={{ width: '48px', padding: '2px 4px', fontSize: '12px', border: '0.5px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', textAlign: 'center' }}
                      />
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="btn btn-danger" style={{ height: '24px', width: '24px', padding: 0 }} title="Delete">
                        <Trash2 size={12} />
                      </button>
                      <button onClick={() => handleSaveEdit(goal.id)} className="btn btn-primary" style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}>
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={goal.id} 
                className="goal-row"
                onClick={() => handleStartEdit(goal)}
                style={{ cursor: 'pointer' }}
              >
                <div className="goal-top">
                  <span className="goal-label">{goal.label || 'Untitled Goal'}</span>
                  <span className="goal-val">{formatProgressVal(goal.currentHours, goal.targetHours)}</span>
                </div>
                <div className="goal-bar-wrap">
                  <div className="goal-bar-fill" style={{ width: `${percentage}%`, backgroundColor: 'var(--accent)' }} />
                </div>
              </div>
            );
          })}

          {activeGoals.length === 0 && editingId === null && (
            <p style={{ fontStyle: 'italic', fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 0' }}>No active goals. Time to set one!</p>
          )}
        </div>

        {/* Add goal inline button */}
        {editingId === null && (
          <button onClick={handleAddGoal} className="add-goal">
            <span>+ Add a goal</span>
          </button>
        )}
      </div>

      {/* Completed Goals Section (Collapsible) */}
      {completedGoals.length > 0 && (
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '14px', marginTop: '8px' }}>
          <div 
            onClick={() => setShowCompleted(!showCompleted)} 
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '8px', userSelect: 'none' }}
          >
            {showCompleted ? <ChevronDown size={12} color="var(--text-secondary)" /> : <ChevronRight size={12} color="var(--text-secondary)" />}
            <span className="section-head" style={{ marginBottom: 0 }}>Completed ({completedGoals.length})</span>
          </div>

          {showCompleted && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {completedGoals.map(goal => (
                <div 
                  key={goal.id} 
                  className="goal-row"
                  onClick={() => handleStartEdit(goal)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', opacity: 0.5 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={12} style={{ color: 'var(--success)' }} />
                    <span className="goal-label" style={{ textDecoration: 'line-through' }}>{goal.label}</span>
                  </div>
                  <span className="goal-val" style={{ fontSize: '10px' }}>{goal.targetHours}h / {goal.targetHours}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api, getAccessToken, setAccessToken } from '../api/client';
import type { User, Subject, FriendSession, Friend } from '../api/client';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type TimerState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'BREAK';


interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  subjects: Subject[];
  fetchSubjects: () => Promise<Subject[]>;
  addSubject: (name: string, emoji: string, color: string) => Promise<boolean>;
  deleteSubject: (subjectId: string) => Promise<boolean>;
  feed: FriendSession[];
  fetchFeed: () => Promise<void>;
  cheerSession: (sessionId: string) => Promise<void>;
  onlineFriends: any[]; // currently studying
  fetchOnlineFriends: () => Promise<void>;
  friends: Friend[];
  fetchFriends: () => Promise<void>;
  addFriend: (username: string) => Promise<boolean>;
  acceptFriend: (friendId: string) => Promise<boolean>;
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  logout: () => void;
  hasConnectionError: boolean;
  retryConnection: () => Promise<void>;

  // Persistent Timer State & Actions
  timerState: TimerState;
  setTimerState: React.Dispatch<React.SetStateAction<TimerState>>;
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  focusDuration: number;
  setFocusDuration: (mins: number) => void;
  customMinutes: string;
  setCustomMinutes: (val: string) => void;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  sessionStartedAt: Date | null;
  setSessionStartedAt: (date: Date | null) => void;
  plannedSeconds: number;
  setPlannedSeconds: (secs: number) => void;
  currentPhase: 'focus' | 'break';
  setCurrentPhase: React.Dispatch<React.SetStateAction<'focus' | 'break'>>;
  startTimer: () => Promise<void>;
  pauseTimer: () => void;
  resetTimer: () => Promise<void>;
  skipTimer: () => void;
  selectedChatUserId: string | null;
  setSelectedChatUserId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('study_circle_theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [feed, setFeed] = useState<FriendSession[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<any[]>([]); // active study sessions
  const [friends, setFriends] = useState<Friend[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persistent Timer States
  const [timerState, setTimerState] = useState<TimerState>('IDLE');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [focusDuration, setFocusDuration] = useState<number>(25); // in minutes
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60); // in seconds
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);
  const [plannedSeconds, setPlannedSeconds] = useState<number>(25 * 60);
  const [currentPhase, setCurrentPhase] = useState<'focus' | 'break'>('focus');
  const [selectedChatUserId, setSelectedChatUserIdState] = useState<string | null>(null);
  const selectedChatUserIdRef = useRef<string | null>(null);
  const friendsRef = useRef<Friend[]>([]);

  const setSelectedChatUserId = (id: string | null) => {
    setSelectedChatUserIdState(id);
    selectedChatUserIdRef.current = id;
  };

  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);

  const timerRef = useRef<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Sync dark mode HTML attributes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('study_circle_theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('study_circle_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Toast System
  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString().substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Set default subject if subjects load
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Sync timeLeft when focusDuration changes (only in IDLE)
  useEffect(() => {
    if (timerState === 'IDLE' && currentPhase === 'focus') {
      setTimeLeft(focusDuration * 60);
    }
  }, [focusDuration, timerState, currentPhase]);

  // Timer Tick Core Logic
  useEffect(() => {
    if (timerState === 'RUNNING') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            window.clearInterval(timerRef.current!);
            handleTimerCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [timerState, plannedSeconds, sessionStartedAt, currentPhase, focusDuration, selectedSubjectId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const getSelectedSubject = (): Subject | null => {
    return subjects.find(s => s.id === selectedSubjectId) || null;
  };

  const startTimer = async () => {
    const activeSub = getSelectedSubject();
    if (!activeSub && currentPhase === 'focus') {
      addToast('Please select a subject to start focusing!', 'warning');
      return;
    }

    const durationSec = timeLeft;
    setPlannedSeconds(durationSec);
    setSessionStartedAt(new Date());

    try {
      if (currentPhase === 'focus' && activeSub) {
        await api.sessions.start({
          subject_name: activeSub.name,
          subject_emoji: activeSub.emoji,
          focus_duration_seconds: durationSec
        });
      } else {
        await api.sessions.start({
          subject_name: 'Short Break',
          subject_emoji: '☕',
          focus_duration_seconds: durationSec
        });
      }
    } catch (e) {
      console.error('Failed to notify backend session started', e);
    }

    setTimerState('RUNNING');
    addToast(currentPhase === 'focus' ? 'Focus timer started! Stay locked in.' : 'Break started! Time to refresh.', 'info');
  };

  const pauseTimer = () => {
    setTimerState('PAUSED');
    addToast('Timer paused', 'info');
  };

  const resetTimer = async () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    
    try {
      await api.sessions.cancelActive();
    } catch (e) {
      console.error(e);
    }

    setTimerState('IDLE');
    setCurrentPhase('focus');
    setTimeLeft(focusDuration * 60);
    setSessionStartedAt(null);
    addToast('Timer reset', 'info');
  };

  const skipTimer = () => {
    if (currentPhase === 'break') {
      addToast('Break skipped. Returning to focus state.', 'info');
      setTimerState('IDLE');
      setCurrentPhase('focus');
      setTimeLeft(focusDuration * 60);
    } else {
      addToast('Skipping focus session. Focus record will not be saved.', 'warning');
      resetTimer();
    }
  };

  const handleTimerCompletion = async () => {
    const activeSub = getSelectedSubject();
    const duration = plannedSeconds;

    try {
      if (currentPhase === 'focus') {
        await api.sessions.create({
          subject_id: activeSub ? activeSub.id : null,
          duration_seconds: duration,
          planned_seconds: duration,
          phase: 'focus',
          started_at: sessionStartedAt ? sessionStartedAt.toISOString() : new Date().toISOString(),
          note: 'Completed focusing blocks!'
        });

        addToast('🔥 Incredible! Focus block completed successfully! +1 Streak Day.', 'success');
        
        fetchFeed();
        fetchOnlineFriends();

        setCurrentPhase('break');
        setTimerState('IDLE');
        setTimeLeft(5 * 60); // 5 min break default
      } else {
        addToast('Break complete! Let\'s start your next focus session.', 'success');
        setCurrentPhase('focus');
        setTimerState('IDLE');
        setTimeLeft(focusDuration * 60);
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to save focus session record', 'error');
    }
  };

  // Fetch all dashboard & social data
  const fetchSubjects = async () => {
    try {
      const data = await api.subjects.list();
      setSubjects(data);
      setHasConnectionError(false);
      return data;
    } catch (e) {
      console.error('Fetch subjects error:', e);
      setHasConnectionError(true);
      return [];
    }
  };

  const addSubject = async (name: string, emoji: string, color: string) => {
    try {
      const newSub = await api.subjects.create({ name, emoji, color_hex: color });
      setSubjects(prev => [...prev, newSub]);
      addToast(`Subject "${name}" created successfully!`, 'success');
      return true;
    } catch (e) {
      addToast('Failed to create subject', 'error');
      return false;
    }
  };

  const deleteSubject = async (subjectId: string) => {
    try {
      await api.subjects.delete(subjectId);
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
      addToast('Subject deleted successfully!', 'success');
      return true;
    } catch (e) {
      addToast('Failed to delete subject', 'error');
      return false;
    }
  };

  const fetchFeed = async () => {
    try {
      const data = await api.friends.feed();
      setFeed(data);
      setHasConnectionError(false);
    } catch (e) {
      console.error('Fetch feed error:', e);
      setHasConnectionError(true);
    }
  };

  const cheerSession = async (sessionId: string) => {
    try {
      await api.cheers.send(sessionId);
      setFeed(prev =>
        prev.map(item =>
          item.id === sessionId
            ? { ...item, cheer_count: item.cheer_count + 1, cheered_by_me: true }
            : item
        )
      );
      addToast('Sent your support cheer!', 'success');
    } catch (e) {
      addToast('Failed to send cheer', 'error');
    }
  };

  const fetchOnlineFriends = async () => {
    try {
      const data = await api.friends.online();
      console.log('[DEBUG] fetchOnlineFriends response:', data);
      setOnlineFriends(data);
      setHasConnectionError(false);
    } catch (e) {
      console.error('Fetch online friends error:', e);
      setHasConnectionError(true);
    }
  };

  const fetchFriends = async () => {
    try {
      const data = await api.friends.list();
      console.log('[DEBUG] fetchFriends list response:', data);
      setFriends(data);
      setHasConnectionError(false);
    } catch (e) {
      console.error('Fetch friends error:', e);
      setHasConnectionError(true);
    }
  };

  const addFriend = async (username: string) => {
    try {
      await api.friends.add(username);
      addToast(`Friend request sent to ${username}`, 'success');
      fetchFriends();
      return true;
    } catch (e: any) {
      addToast(e.message || 'Failed to send friend request. Ensure user exists.', 'error');
      return false;
    }
  };

  const acceptFriend = async (friendId: string) => {
    try {
      await api.friends.accept(friendId);
      addToast('Friend invitation accepted!', 'success');
      fetchFriends();
      fetchOnlineFriends();
      return true;
    } catch (e) {
      addToast('Failed to accept invitation', 'error');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('study_circle_refresh');
    setHasConnectionError(false);
    if (wsRef.current) wsRef.current.close();
    if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
    if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
    addToast('Logged out successfully', 'info');
  };

  // Real-time WebSockets setup
  const initWebSocket = () => {
    if (wsRef.current) wsRef.current.close();
    if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
    if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);

    const token = getAccessToken();
    if (!token) return;

    try {
      const wsUrl = `ws://localhost:8000/api/v1/ws?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[LIVE WS] WebSocket connection established');
        
        // Keepalive Ping every 30 seconds to maintain firewall state
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          // Keepalive response or custom events
          if (event.data === 'pong') return;
          const data = JSON.parse(event.data);
          const { type, payload } = data;
          if (type === 'chat_message') {
            const chatEvent = new CustomEvent('study_circle_chat_message', { detail: payload });
            window.dispatchEvent(chatEvent);

            if (selectedChatUserIdRef.current !== payload.sender_id) {
              const senderFriend = friendsRef.current.find(f => f.id === payload.sender_id);
              const displayName = senderFriend ? (senderFriend.display_name || senderFriend.username) : 'Someone';
              addToast(`💬 @${displayName}: ${payload.content}`, 'info');
            }
          }

          else if (type === 'session_started') {
            setOnlineFriends(prev => {
              if (prev.some(p => p.user_id === payload.user_id)) return prev;
              return [...prev, payload];
            });
            setFriends(prev => prev.map(f => f.id === payload.user_id ? { ...f, is_online: true, current_subject: payload.subject_name, current_emoji: payload.subject_emoji } : f));
            addToast(`${payload.username} started focusing on ${payload.subject_name} ${payload.subject_emoji}`, 'info');
          } 
          
          else if (type === 'session_ended') {
            setOnlineFriends(prev => prev.filter(p => p.user_id !== payload.user_id));
            setFriends(prev => prev.map(f => f.id === payload.user_id ? { ...f, current_subject: undefined, current_emoji: undefined } : f));
            fetchFeed();
          } 
          
          else if (type === 'friend_online') {
            setFriends(prev => prev.map(f => f.id === payload.user_id ? { ...f, is_online: true } : f));
          }
          
          else if (type === 'friend_offline') {
            setFriends(prev => prev.map(f => f.id === payload.user_id ? { ...f, is_online: false, current_subject: undefined, current_emoji: undefined } : f));
            setOnlineFriends(prev => prev.filter(p => p.user_id !== payload.user_id));
          }
          
          else if (type === 'cheer_received') {
            addToast(`💖 @${payload.sender_username} cheered you on!`, 'success');
          } 
          
          else if (type === 'streak_milestone') {
            addToast(`🔥 Streak Milestone Achieved! Keep it up!`, 'success');
          }
        } catch (e) {
          console.error('[LIVE WS] Error parsing message', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('[LIVE WS] WebSocket error encountered. Reconnecting in 5s.', e);
      };

      ws.onclose = () => {
        console.log('[LIVE WS] WebSocket connection closed. Attempting reconnect in 5s.');
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (user) initWebSocket();
        }, 5000);
      };
    } catch (e) {
      console.warn('[LIVE WS] WebSocket connection failed', e);
    }
  };

  const checkActiveSession = async (currentSubjects: Subject[]) => {
    try {
      const data = await api.sessions.getActive();
      if (data && data.active) {
        if (data.subject_name === 'Short Break') {
          setCurrentPhase('break');
        } else {
          setCurrentPhase('focus');
          const matchedSub = currentSubjects.find(s => s.name === data.subject_name);
          if (matchedSub) {
            setSelectedSubjectId(matchedSub.id);
          }
        }
        const timeLeftSec = data.time_left_seconds || 0;
        setTimeLeft(timeLeftSec);
        setPlannedSeconds(timeLeftSec);
        setSessionStartedAt(new Date(Date.now() - 5000));
        setTimerState('RUNNING');
        addToast(`Restored active session: ${data.subject_emoji} ${data.subject_name}`, 'success');
      }
    } catch (e) {
      console.warn('Failed to restore active focus session:', e);
    }
  };

  const loadUser = async () => {
    setIsLoading(true);
    setHasConnectionError(false);
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
    } catch (e) {
      console.error('Failed to authenticate session:', e);
      // If error is a network connection failure (unreachable backend)
      if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
        setHasConnectionError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const retryConnection = async () => {
    await loadUser();
    if (user) {
      // Re-trigger loading dashboard elements
      fetchFeed();
      fetchFriends();
      fetchOnlineFriends();
      initWebSocket();
      fetchSubjects().then((subs) => {
        checkActiveSession(subs);
      });
    }
  };

  // Connect WebSockets and load lists when user authenticated
  useEffect(() => {
    if (user) {
      initWebSocket();
      fetchFeed();
      fetchFriends();
      fetchOnlineFriends();
      fetchSubjects().then((subs) => {
        checkActiveSession(subs);
      });
    } else {
      if (wsRef.current) wsRef.current.close();
      if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
    };
  }, [user]);

  // Reset all user-specific states when logged out / session terminated
  useEffect(() => {
    if (!user) {
      setSubjects([]);
      setSelectedSubjectId('');
      setFriends([]);
      setOnlineFriends([]);
      setFeed([]);
      setSelectedChatUserId(null);
      setTimerState('IDLE');
      setTimeLeft(25 * 60);
      setCurrentPhase('focus');
    }
  }, [user]);

  // Tab close alert for running timers
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerState === 'RUNNING') {
        const msg = 'A study session is in progress. Closing this tab will keep your timer running on the server. Are you sure you want to close?';
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [timerState]);

  // Initial user loading
  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        setIsLoading,
        darkMode,
        toggleDarkMode,
        subjects,
        fetchSubjects,
        addSubject,
        deleteSubject,
        feed,
        fetchFeed,
        cheerSession,
        onlineFriends,
        fetchOnlineFriends,
        friends,
        fetchFriends,
        addFriend,
        acceptFriend,
        toasts,
        addToast,
        removeToast,
        logout,
        hasConnectionError,
        retryConnection,

        // Persistent Timer State & Actions
        timerState,
        setTimerState,
        selectedSubjectId,
        setSelectedSubjectId,
        focusDuration,
        setFocusDuration,
        customMinutes,
        setCustomMinutes,
        timeLeft,
        setTimeLeft,
        sessionStartedAt,
        setSessionStartedAt,
        plannedSeconds,
        setPlannedSeconds,
        currentPhase,
        setCurrentPhase,
        startTimer,
        pauseTimer,
        resetTimer,
        skipTimer,
        selectedChatUserId,
        setSelectedChatUserId
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

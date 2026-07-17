// Study Circle API Client - Production-Ready Backend Connection Only

export interface User {
  id: string;
  username: string;
  display_name: string | null;
  avatar_color: string | null;
  current_streak: number;
  longest_streak: number;
  daily_goal_minutes: number;
  created_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color_hex: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject?: Subject | null;
  duration_seconds: number;
  planned_seconds: number;
  phase: 'focus' | 'break';
  started_at: string;
  ended_at: string;
  note: string | null;
}

export interface FriendSession {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  subject_name: string;
  subject_emoji: string;
  duration_seconds: number;
  ended_at: string;
  cheer_count: number;
  cheered_by_me: boolean;
}

export interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  status: 'accepted' | 'pending_incoming' | 'pending_outgoing';
  is_online: boolean;
  current_subject?: string;
  current_emoji?: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface StudyRoom {
  id: string;
  code: string;
  host_id: string;
  subject_id: string | null;
  name: string;
  max_participants: number;
  focus_minutes: number;
  break_minutes: number;
  timer_state: 'idle' | 'focus' | 'break';
  timer_started_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TurnCredentials {
  username: string;
  credential: string;
  urls: string[];
}

export interface StatsSummary {
  today_minutes: number;
  current_streak: number;
  weekly_total_minutes: number;
  session_count: number;
}

export interface DailyStat {
  date: string;
  minutes: number;
}

export interface SubjectStat {
  subject_name: string;
  color_hex: string;
  minutes: number;
}

const API_BASE_URL = 'http://localhost:8000/api/v1';

// In-Memory Access Token
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const setRefreshToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('study_circle_refresh', token);
  } else {
    localStorage.removeItem('study_circle_refresh');
  }
};

export const getRefreshToken = () => localStorage.getItem('study_circle_refresh');

// Helper to make real API calls
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  headers.set('Content-Type', 'application/json');

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, config);
    
    // Handle token expiration / unauthorized
    if (res.status === 401 && getRefreshToken() && path !== '/auth/login' && path !== '/auth/register') {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${accessToken}`);
        const retryRes = await fetch(`${API_BASE_URL}${path}`, { ...config, headers });
        if (!retryRes.ok) throw new Error(await retryRes.text());
        return await retryRes.json() as T;
      }
    }

    if (res.status === 204) {
      return null as unknown as T;
    }

    if (!res.ok) {
      const errorMsg = await res.text();
      let parsedError = errorMsg;
      try {
        const jsonError = JSON.parse(errorMsg);
        parsedError = jsonError.detail || errorMsg;
      } catch (e) {}
      throw new Error(parsedError || `HTTP error! Status: ${res.status}`);
    }

    return await res.json() as T;
  } catch (error) {
    console.error(`API Request to ${path} failed:`, error);
    // Propagate the network error upwards so it triggers full-screen error state
    throw error;
  }
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh })
    });
    if (res.ok) {
      const data = await res.json();
      accessToken = data.access_token;
      setRefreshToken(data.refresh_token);
      return true;
    }
  } catch (e) {
    console.error('Failed to refresh token', e);
  }
  return false;
}

// Public API mappings connecting to the real FastAPI backend
export const api = {
  auth: {
    register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request<User>('/users/me'),
    updateMe: (body: Partial<User>) => request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
    getSecurityQuestion: (usernameOrEmail: string) => request<{ security_question: string }>('/auth/recovery/question', { method: 'POST', body: JSON.stringify({ username_or_email: usernameOrEmail }) }),
    recoverUsername: (email: string, securityAnswer: string) => request<{ username: string }>('/auth/recovery/username', { method: 'POST', body: JSON.stringify({ email, security_answer: securityAnswer }) }),
    resetPasswordWithQuestion: (body: any) => request<any>('/auth/recovery/reset-password', { method: 'POST', body: JSON.stringify(body) }),
    searchUsers: (q: string) => request<User[]>(`/users/search?q=${encodeURIComponent(q)}`),
  },
  subjects: {
    list: () => request<Subject[]>('/subjects/'),
    create: (body: { name: string; emoji?: string; color_hex: string }) => request<Subject>('/subjects/', { method: 'POST', body: JSON.stringify(body) }),
    delete: (subjectId: string) => request<void>(`/subjects/${subjectId}`, { method: 'DELETE' }),
  },
  sessions: {
    create: (body: { subject_id: string | null; duration_seconds: number; planned_seconds: number; phase: 'focus' | 'break'; started_at: string; note?: string }) => 
      request<StudySession>('/sessions/', { method: 'POST', body: JSON.stringify(body) }),
    start: (body: { subject_name: string; subject_emoji: string; focus_duration_seconds: number }) => 
      request<any>('/sessions/start', { method: 'POST', body: JSON.stringify(body) }),
    cancelActive: () => request<void>('/sessions/active', { method: 'DELETE' }),
    getActive: () => request<{ active: boolean; subject_name?: string; subject_emoji?: string; time_left_seconds?: number }>('/sessions/active'),
  },
  friends: {
    online: () => request<any[]>('/friends/online'),
    feed: () => request<FriendSession[]>('/friends/feed'),
    list: () => request<Friend[]>('/friends/'),
    add: (username: string) => request<Friend>('/friends/', { method: 'POST', body: JSON.stringify({ action: 'add', username }) }),
    accept: (friendId: string) => request<any>('/friends/', { method: 'POST', body: JSON.stringify({ action: 'accept', friend_id: friendId }) }),
  },
  cheers: {
    send: (sessionId: string) => request<any>('/cheers/', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),
  },
  stats: {
    summary: () => request<StatsSummary>('/stats/summary'),
    daily: () => request<DailyStat[]>('/stats/daily'),
    subjects: () => request<SubjectStat[]>('/stats/subjects'),
  },
  messages: {
    send: (recipientId: string, content: string) => request<ChatMessage>('/messages/', { method: 'POST', body: JSON.stringify({ recipient_id: recipientId, content }) }),
    list: (friendId: string) => request<ChatMessage[]>(`/messages/${friendId}`),
  },
  rooms: {
    create: (body: { name: string; password?: string; subject_id?: string | null; focus_minutes?: number; break_minutes?: number; max_participants?: number }) => 
      request<StudyRoom>('/rooms/', { method: 'POST', body: JSON.stringify(body) }),
    join: (body: { code: string; password?: string }) => 
      request<StudyRoom>('/rooms/join', { method: 'POST', body: JSON.stringify(body) }),
    leave: (roomId: string) => 
      request<{ ok: boolean }>(`/rooms/${roomId}/leave`, { method: 'DELETE' }),
    active: () => 
      request<StudyRoom[]>('/rooms/active'),
    getTurnCredentials: () => 
      request<TurnCredentials>('/turn-credentials'),
  }
};

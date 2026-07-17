import React, { useState } from 'react';
import { useApp, AppProvider } from './context/AppContext';
import { api, setAccessToken } from './api/client';
import { Navbar } from './components/Navbar';
import { StatsGrid } from './components/StatsGrid';
import { GoalProgress } from './components/GoalProgress';
import { ActivityFeed } from './components/ActivityFeed';
import { FriendsSidebar } from './components/FriendsSidebar';
import { StudyTimer } from './components/StudyTimer';
import { FriendsPanel } from './components/FriendsPanel';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ChatPanel } from './components/ChatPanel';
import { RoomPanel } from './components/RoomPanel';
import { RoomProvider } from './context/RoomContext';
import { ToastContainer } from './components/ToastContainer';
import { BookOpen, Key, Mail, User as UserIcon, Plus, Eye, EyeOff, Trash2, ShieldAlert, HelpCircle } from 'lucide-react';

const AuthGate: React.FC = () => {
  const { setUser, addToast } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-username' | 'forgot-password'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState('What was the name of your first pet?');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Recovery states
  const [fetchedQuestion, setFetchedQuestion] = useState('');
  const [recoveredUsername, setRecoveredUsername] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const securityQuestionsList = [
    'What was the name of your first pet?',
    'What is your mother\'s maiden name?',
    'What was the name of your elementary school?',
    'In what city were you born?'
  ];

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (authMode === 'register') {
      if (!email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = 'Invalid email address';
      }
      if (!securityQuestion) {
        newErrors.securityQuestion = 'Security question is required';
      }
      if (!securityAnswer) {
        newErrors.securityAnswer = 'Security answer is required';
      } else if (securityAnswer.trim().length < 2) {
        newErrors.securityAnswer = 'Answer must be at least 2 characters';
      }
    }

    if (authMode === 'login' || authMode === 'register') {
      if (!username) {
        newErrors.username = 'Username is required';
      } else if (username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }
    }

    if (authMode === 'login' || authMode === 'register') {
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (authMode !== 'login') {
        if (password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        if (!/[0-9]/.test(password)) {
          newErrors.password = 'Password must contain at least one digit';
        }
        if (!/[A-Z]/.test(password)) {
          newErrors.password = 'Password must contain at least one uppercase letter';
        }
      }
    }

    if (authMode === 'forgot-username') {
      if (!email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = 'Invalid email address';
      }
      if (recoveryStep === 2) {
        if (!securityAnswer) {
          newErrors.securityAnswer = 'Security answer is required';
        }
      }
    }

    if (authMode === 'forgot-password') {
      if (recoveryStep === 1) {
        if (!username) {
          newErrors.username = 'Username or email is required';
        }
      } else {
        if (!securityAnswer) {
          newErrors.securityAnswer = 'Security answer is required';
        }
        if (!password) {
          newErrors.password = 'New password is required';
        } else {
          if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
          }
          if (!/[0-9]/.test(password)) {
            newErrors.password = 'Password must contain at least one digit';
          }
          if (!/[A-Z]/.test(password)) {
            newErrors.password = 'Password must contain at least one uppercase letter';
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        const data = await api.auth.login({ username, password });
        setAccessToken(data.access_token);
        localStorage.setItem('study_circle_refresh', data.refresh_token);
        setUser(data.user);
        addToast(`Welcome back, ${data.user.display_name || data.user.username}!`, 'success');
      } else {
        await api.auth.register({ 
          email, 
          username, 
          password, 
          display_name: displayName || null,
          security_question: securityQuestion,
          security_answer: securityAnswer
        });
        addToast('Registration successful! Please log in.', 'success');
        setAuthMode('login');
        setPassword('');
        setSecurityAnswer('');
      }
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Authentication failed. Please verify credentials.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchQuestionForPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrors({ username: 'Username or email is required' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.auth.getSecurityQuestion(username.trim());
      setFetchedQuestion(res.security_question);
      setRecoveryStep(2);
      setErrors({});
      addToast('Security question retrieved! Answer it to reset password.', 'info');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'No account found with this username or email.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchQuestionForUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Invalid or missing email address' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.auth.getSecurityQuestion(email.trim());
      setFetchedQuestion(res.security_question);
      setRecoveryStep(2);
      setErrors({});
      addToast('Security question retrieved! Answer it to retrieve username.', 'info');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'No account found with this email.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await api.auth.resetPasswordWithQuestion({
        username_or_email: username.trim(),
        security_answer: securityAnswer,
        new_password: password
      });
      addToast('Password reset successfully! Please sign in.', 'success');
      setAuthMode('login');
      setRecoveryStep(1);
      setUsername('');
      setPassword('');
      setSecurityAnswer('');
      setErrors({});
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Verification failed. Incorrect answer.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoverUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await api.auth.recoverUsername(email.trim(), securityAnswer);
      setRecoveredUsername(res.username);
      addToast('Username successfully retrieved!', 'success');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Verification failed. Incorrect answer.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card bento-card">
        {/* Branding header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <BookOpen size={40} color="var(--accent)" style={{ marginBottom: '0.75rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Study Circle
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {authMode === 'login' && 'Access your social focus dashboard'}
            {authMode === 'register' && 'Create your Study Circle profile'}
            {authMode === 'forgot-username' && 'Retrieve your account username'}
            {authMode === 'forgot-password' && 'Reset your account password'}
          </p>
        </div>

        {/* Toggle Mode Tab */}
        {(authMode === 'login' || authMode === 'register') && (
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-primary)', padding: '0.25rem', borderRadius: 'var(--border-radius-md)', marginBottom: '2rem' }}>
            <button 
              className="btn" 
              onClick={() => { setAuthMode('login'); setErrors({}); }}
              style={{ 
                flex: 1, 
                backgroundColor: authMode === 'login' ? 'var(--bg-card)' : 'transparent', 
                color: authMode === 'login' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: authMode === 'login' ? 'var(--shadow)' : 'none',
                padding: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              Sign In
            </button>
            <button 
              className="btn" 
              onClick={() => { setAuthMode('register'); setErrors({}); }}
              style={{ 
                flex: 1, 
                backgroundColor: authMode === 'register' ? 'var(--bg-card)' : 'transparent', 
                color: authMode === 'register' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: authMode === 'register' ? 'var(--shadow)' : 'none',
                padding: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              Register
            </button>
          </div>
        )}

        {(authMode === 'login' || authMode === 'register') && (
          <form onSubmit={handleSubmit}>
            {/* Email field (only for registration) */}
            {authMode === 'register' && (
              <div className="form-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <label className="form-label">Email Address</label>
                <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
            )}

            {/* Username field */}
            <div className="form-group">
              <input
                type="text"
                className="form-control"
                placeholder=" "
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <label className="form-label">Username</label>
              <UserIcon size={16} color="var(--text-secondary)" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              {errors.username && <span className="form-error">{errors.username}</span>}
            </div>

            {/* Display Name field (only for registration) */}
            {authMode === 'register' && (
              <div className="form-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder=" "
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <label className="form-label">Display Name (Optional)</label>
                <UserIcon size={16} color="var(--text-secondary)" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            )}

            {/* Password field */}
            <div className="form-group">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="form-label">Password</label>
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            {/* Security Question dropdown (only for registration) */}
            {authMode === 'register' && (
              <>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="stat-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Security Question</label>
                  <select 
                    className="form-control" 
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    style={{ padding: '0.65rem', backgroundColor: 'var(--bg-primary)', width: '100%', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    {securityQuestionsList.map((q, idx) => (
                      <option key={idx} value={q}>{q}</option>
                    ))}
                  </select>
                </div>

                {/* Security Answer */}
                <div className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder=" "
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                  />
                  <label className="form-label">Security Answer</label>
                  <HelpCircle size={16} color="var(--text-secondary)" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  {errors.securityAnswer && <span className="form-error">{errors.securityAnswer}</span>}
                </div>
              </>
            )}

            {authMode === 'register' && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                ⚠️ Password must be at least 8 characters, contain one digit, and one uppercase letter.
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.85rem' }}
              disabled={isSubmitting}
            >
              <Key size={16} />
              <span>{isSubmitting ? 'Authenticating...' : authMode === 'login' ? 'Sign In' : 'Register'}</span>
            </button>
          </form>
        )}

        {/* Forgot Username View */}
        {authMode === 'forgot-username' && (
          <div>
            {recoveryStep === 1 ? (
              <form onSubmit={handleFetchQuestionForUsername}>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder=" "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label className="form-label">Email Address</label>
                  <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem' }}
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? 'Checking...' : 'Find Security Question'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleRecoverUsernameSubmit}>
                <div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-primary)', padding: '0.85rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Security Question:</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{fetchedQuestion}</div>
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder=" "
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                  />
                  <label className="form-label">Your Answer</label>
                  <HelpCircle size={16} color="var(--text-secondary)" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  {errors.securityAnswer && <span className="form-error">{errors.securityAnswer}</span>}
                </div>

                {recoveredUsername ? (
                  <div style={{ margin: '1.5rem 0', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent)', padding: '1rem', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Your username is:</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>{recoveredUsername}</div>
                  </div>
                ) : (
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem' }}
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? 'Verifying...' : 'Recover Username'}</span>
                  </button>
                )}
              </form>
            )}

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => { setAuthMode('login'); setRecoveryStep(1); setRecoveredUsername(''); setSecurityAnswer(''); setEmail(''); setErrors({}); }}
              style={{ width: '100%', padding: '0.85rem' }}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Forgot Password View */}
        {authMode === 'forgot-password' && (
          <div>
            {recoveryStep === 1 ? (
              <form onSubmit={handleFetchQuestionForPassword}>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder=" "
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <label className="form-label">Username or Email</label>
                  <UserIcon size={16} color="var(--text-secondary)" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  {errors.username && <span className="form-error">{errors.username}</span>}
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem' }}
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? 'Checking...' : 'Find Security Question'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-primary)', padding: '0.85rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Security Question:</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{fetchedQuestion}</div>
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder=" "
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                  />
                  <label className="form-label">Your Answer</label>
                  <HelpCircle size={16} color="var(--text-secondary)" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  {errors.securityAnswer && <span className="form-error">{errors.securityAnswer}</span>}
                </div>

                <div className="form-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <label className="form-label">New Password</label>
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {errors.password && <span className="form-error">{errors.password}</span>}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                  ⚠️ Password must be at least 8 characters, contain one digit, and one uppercase letter.
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem' }}
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? 'Resetting...' : 'Reset Password'}</span>
                </button>
              </form>
            )}

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => { setAuthMode('login'); setRecoveryStep(1); setSecurityAnswer(''); setUsername(''); setPassword(''); setErrors({}); }}
              style={{ width: '100%', padding: '0.85rem' }}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {authMode === 'login' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.8rem' }}>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); setAuthMode('forgot-username'); setErrors({}); }}
              style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
            >
              Forgot Username?
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); setAuthMode('forgot-password'); setErrors({}); }}
              style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
            >
              Forgot Password?
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

interface DashboardViewProps {
  onNavigateToAnalytics: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToAnalytics }) => {
  const { addSubject, deleteSubject, subjects } = useApp();
  const [subName, setSubName] = useState('');
  const [subEmoji, setSubEmoji] = useState('📖');
  const [subColor, setSubColor] = useState('#3B82F6');
  const [isOpen, setIsOpen] = useState(false);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    const success = await addSubject(subName.trim(), subEmoji, subColor);
    if (success) {
      setSubName('');
      setIsOpen(false);
    }
  };

  const emojiOptions = ['📖', '💻', '📐', '🧪', '🎨', '⚙️', '📈', '⚛️', '🧠', '💼'];
  const colorOptions = ['#3B82F6', '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];

  return (
    <div className="bento-grid">
      <StatsGrid onNavigateToAnalytics={onNavigateToAnalytics} />
      <GoalProgress />
      
      {/* Split section */}
      <div className="col-8" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Subject Creator Card widget */}
        <div className="bento-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>My Study Subjects</h3>
            <button 
              className="btn btn-secondary" 
              onClick={() => setIsOpen(!isOpen)}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              <Plus size={14} />
              <span>{isOpen ? 'Close' : 'Add Subject'}</span>
            </button>
          </div>

          {/* Active Subjects Pills with Delete actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {subjects.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No subjects added yet. Create one to categorize your study timers.</span>
            ) : (
              subjects.map(s => (
                <div key={s.id} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  backgroundColor: 'var(--bg-primary)',
                  border: `1px solid ${s.color_hex}`,
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}>
                  <span>{s.emoji}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                  <button
                    onClick={() => deleteSubject(s.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--error)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 0 0 0.25rem',
                      outline: 'none'
                    }}
                    title="Delete Subject"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {isOpen && (
            <form onSubmit={handleCreateSubject} style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border)' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder=" "
                  className="form-control"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  maxLength={50}
                  required
                />
                <label className="form-label">Subject Name</label>
              </div>

              {/* Emoji selector pills */}
              <div style={{ marginBottom: '1rem' }}>
                <span className="stat-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Select Emoji</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {emojiOptions.map(emoji => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setSubEmoji(emoji)}
                      style={{ 
                        fontSize: '1.25rem', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '6px',
                        border: subEmoji === emoji ? '2px solid var(--accent)' : '1px solid var(--border)',
                        backgroundColor: subEmoji === emoji ? 'var(--bg-card)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color selector pills */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span className="stat-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Select Color Accent</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {colorOptions.map(color => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setSubColor(color)}
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: subColor === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow)'
                      }}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Create Subject
              </button>
            </form>
          )}
        </div>

        <ActivityFeed />
      </div>

      <FriendsSidebar />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isLoading, hasConnectionError, retryConnection } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [retrying, setRetrying] = useState<boolean>(false);

  const handleRetry = async () => {
    setRetrying(true);
    await retryConnection();
    setRetrying(false);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        <p style={{ fontWeight: 500 }}>Initializing Study Circle...</p>
      </div>
    );
  }

  // Full-screen connection error page
  if (hasConnectionError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div className="bento-card" style={{ maxWidth: '460px', padding: '2.5rem', alignItems: 'center', boxShadow: 'var(--shadow-lg)' }}>
          <ShieldAlert size={48} color="var(--error)" style={{ marginBottom: '1.25rem' }} className="timer-pulse" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Database Connection Offline
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            Unable to connect to the Study Circle backend. Please check your network connection and ensure the FastAPI server is running locally on port 8000.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={handleRetry}
            disabled={retrying}
            style={{ width: '100%', padding: '0.8rem' }}
          >
            <span>{retrying ? 'Attempting reconnection...' : 'Retry Connection'}</span>
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardView onNavigateToAnalytics={() => setActiveTab('analytics')} />
        )}
        {activeTab === 'timer' && <StudyTimer />}
        {activeTab === 'friends' && <FriendsPanel onNavigateToChat={() => setActiveTab('chat')} />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'rooms' && <RoomPanel />}
      </main>
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <RoomProvider>
        <AppContent />
      </RoomProvider>
    </AppProvider>
  );
}

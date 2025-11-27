/**
 * Auth MFE - Authentication micro-frontend
 * Provides login/logout functionality and user session management
 */

import React, { useState } from 'react';

// Simulated auth state (in a real app, this would be persisted)
let currentUser: User | null = null;
let authToken: string | null = null;

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthToken {
  token: string;
  expiresAt: Date;
}

// ============ Components ============

/**
 * Main container component for the auth MFE
 */
export function FrontContainer() {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Authentication Module</h3>
      {currentUser ? <UserProfile /> : <LoginForm />}
    </div>
  );
}

/**
 * Login form component
 */
export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.login(username, password);
      // Force re-render by updating window
      window.dispatchEvent(new Event('auth-change'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <div style={styles.inputGroup}>
        <label style={styles.label}>Username</label>
        <input
          type="text"
          style={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
        />
      </div>
      <div style={styles.inputGroup}>
        <label style={styles.label}>Password</label>
        <input
          type="password"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
        />
      </div>
      {error && <div style={styles.error}>{error}</div>}
      <button type="submit" style={styles.button} disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

/**
 * User profile component (shown when logged in)
 */
export function UserProfile() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await api.logout();
    window.dispatchEvent(new Event('auth-change'));
    setLoading(false);
  };

  if (!currentUser) {
    return <div style={styles.info}>Not logged in</div>;
  }

  return (
    <div style={styles.profile}>
      <div style={styles.profileInfo}>
        <div style={styles.avatar}>
          {currentUser.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={styles.username}>{currentUser.username}</div>
          <div style={styles.email}>{currentUser.email}</div>
          <div style={styles.role}>Role: {currentUser.role}</div>
        </div>
      </div>
      <button
        style={styles.logoutButton}
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
}

// ============ API ============

export const api = {
  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<AuthToken> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simple validation (in real app, would call auth server)
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Create mock user and token
    currentUser = {
      id: `user-${Date.now()}`,
      username,
      email: `${username}@example.com`,
      role: username === 'admin' ? 'administrator' : 'user',
    };

    authToken = `token-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const result: AuthToken = {
      token: authToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    console.log('[Auth MFE] User logged in:', currentUser.username);
    return result;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const wasLoggedIn = currentUser !== null;
    currentUser = null;
    authToken = null;

    console.log('[Auth MFE] User logged out');
    return wasLoggedIn;
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    return currentUser;
  },

  /**
   * Ensure user is authenticated
   */
  async ensureAuthenticated(): Promise<boolean> {
    if (!currentUser || !authToken) {
      console.log('[Auth MFE] Authentication check failed - not logged in');
      return false;
    }
    console.log('[Auth MFE] Authentication check passed:', currentUser.username);
    return true;
  },

  /**
   * Check if user has a specific role
   */
  async hasRole(role: string): Promise<boolean> {
    return currentUser?.role === role;
  },

  /**
   * Get auth token
   */
  async getToken(): Promise<string | null> {
    return authToken;
  },
};

// ============ Styles ============

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    color: '#e0e0e0',
  },
  title: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    color: '#6366f1',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.75rem',
    color: '#a0a0b0',
  },
  input: {
    padding: '0.5rem',
    background: '#252542',
    border: '1px solid #3a3a5c',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '0.875rem',
  },
  button: {
    padding: '0.6rem 1rem',
    background: '#6366f1',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  error: {
    padding: '0.5rem',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '4px',
    color: '#ef4444',
    fontSize: '0.75rem',
  },
  info: {
    color: '#a0a0b0',
    fontSize: '0.875rem',
  },
  profile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  profileInfo: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  avatar: {
    width: '40px',
    height: '40px',
    background: '#6366f1',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.25rem',
  },
  username: {
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  email: {
    fontSize: '0.75rem',
    color: '#a0a0b0',
  },
  role: {
    fontSize: '0.7rem',
    color: '#22c55e',
    marginTop: '0.25rem',
  },
  logoutButton: {
    padding: '0.5rem 0.75rem',
    background: 'transparent',
    border: '1px solid #3a3a5c',
    borderRadius: '4px',
    color: '#a0a0b0',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};

// ============ Module Manifest ============

export const manifest = {
  name: 'auth',
  version: '1.0.0',
  components: ['FrontContainer', 'LoginForm', 'UserProfile'],
  api: {
    login: { args: ['username', 'password'], returns: 'AuthToken' },
    logout: { args: [], returns: 'boolean' },
    getCurrentUser: { args: [], returns: 'User' },
    ensureAuthenticated: { args: [], returns: 'boolean' },
    hasRole: { args: ['role'], returns: 'boolean' },
    getToken: { args: [], returns: 'string' },
  },
};

// Default export for module loading
export default { FrontContainer, LoginForm, UserProfile, api, manifest };

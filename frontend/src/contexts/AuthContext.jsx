import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const sessionToken = getSessionToken();
      
      if (sessionToken) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'X-Session-Token': sessionToken
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            // Invalid session, clear it
            clearSession();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          clearSession();
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await response.json();

      if (response.ok) {
        saveSession(data.sessionToken, data.expiresAt, rememberMe);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const signup = async ({ email, password, displayName }) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error, details: data.details };
      }
    } catch (error) {
      console.error('Signup failed:', error);
      return { success: false, error: 'Signup failed' };
    }
  };

  const logout = async () => {
    const sessionToken = getSessionToken();
    
    if (sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'X-Session-Token': sessionToken
          }
        });
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }

    clearSession();
    setUser(null);
  };

  const refreshSession = async () => {
    const sessionToken = getSessionToken();
    
    if (!sessionToken) {
      return false;}

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'X-Session-Token': sessionToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        const rememberMe = localStorage.getItem('sessionToken') ? true : false;
        saveSession(data.sessionToken, data.expiresAt, rememberMe);
        return true;
      } else {
        clearSession();
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    refreshSession,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper functions for session management
function saveSession(sessionToken, expiresAt, rememberMe) {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('sessionToken', sessionToken);
  storage.setItem('expiresAt', expiresAt);
}

function getSessionToken() {
  return localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
}

function clearSession() {
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('expiresAt');
  sessionStorage.removeItem('sessionToken');
  sessionStorage.removeItem('expiresAt');
}

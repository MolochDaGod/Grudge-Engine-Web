import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { 
  isPuterAvailable, 
  puterSignIn, 
  puterSignOut, 
  isPuterSignedIn, 
  getPuterUser,
  type PuterUser 
} from '@/lib/puter';

export type UserRole = 'admin' | 'developer' | 'ai_agent' | 'premium' | 'user' | 'guest';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: UserRole;
  isPuterUser: boolean;
  walletAddress?: string;
  createdAt: string;
  lastLogin: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPuterAvailable: boolean;
  signInWithPuter: () => Promise<boolean>;
  signInWithCredentials: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const AUTH_STORAGE_KEY = 'grudge_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [puterAvailable, setPuterAvailable] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      setPuterAvailable(isPuterAvailable());
      
      const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as AuthUser;
          setUser(parsed);
        } catch {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
      
      if (isPuterAvailable() && isPuterSignedIn()) {
        const puterUser = getPuterUser();
        if (puterUser) {
          const authUser = puterUserToAuthUser(puterUser);
          setUser(authUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        }
      }
      
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const puterUserToAuthUser = (puterUser: PuterUser): AuthUser => {
    return {
      id: puterUser.uuid,
      username: puterUser.username,
      displayName: puterUser.username,
      email: puterUser.email,
      role: 'user',
      isPuterUser: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
  };

  const signInWithPuter = useCallback(async (): Promise<boolean> => {
    if (!isPuterAvailable()) {
      console.warn('[Auth] Puter.js not available');
      return false;
    }
    
    try {
      const puterUser = await puterSignIn();
      if (puterUser) {
        const authUser = puterUserToAuthUser(puterUser);
        setUser(authUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        console.log('[Auth] Puter sign-in successful:', authUser.username);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Auth] Puter sign-in error:', error);
      return false;
    }
  }, []);

  const signInWithCredentials = useCallback(async (
    username: string, 
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          username: data.user.username,
          displayName: data.user.displayName || data.user.username,
          role: data.user.role || 'user',
          isPuterUser: false,
          createdAt: data.user.createdAt || new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        setUser(authUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        return { success: true };
      }
      
      return { success: false, error: data.error || 'Login failed' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const register = useCallback(async (
    username: string, 
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          username: data.user.username,
          displayName: data.user.displayName || data.user.username,
          role: 'user',
          isPuterUser: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        setUser(authUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
        return { success: true };
      }
      
      return { success: false, error: data.error || 'Registration failed' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    const guestUser: AuthUser = {
      id: `guest-${Date.now()}`,
      username: 'Guest',
      displayName: 'Guest User',
      role: 'guest',
      isPuterUser: false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    setUser(guestUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestUser));
  }, []);

  const signOut = useCallback(async () => {
    if (user?.isPuterUser) {
      await puterSignOut();
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    console.log('[Auth] Signed out');
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isPuterAvailable: puterAvailable,
    signInWithPuter,
    signInWithCredentials,
    register,
    continueAsGuest,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Decode JWT payload to get user details
          const payload = JSON.parse(atob(token.split('.')[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          if (isExpired) {
            localStorage.removeItem('access_token');
            setUser(null);
          } else {
            setUser({ id: payload.sub, email: payload.email });
          }
        } catch (error) {
          console.error('Failed to parse token:', error);
          localStorage.removeItem('access_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const signUp = async (email: string, password: string) => {
    const data = await api.auth.register(email, password);
    if (data.token) {
      localStorage.setItem('access_token', data.token);
      setUser(data.user);
    }
  };

  const signIn = async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    if (data.token) {
      localStorage.setItem('access_token', data.token);
      setUser(data.user);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

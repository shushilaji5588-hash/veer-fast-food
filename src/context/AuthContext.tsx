import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../db/types';
import { loginUser } from '../services/dataService';
import { getSqliteDb } from '../db/sqlite';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  isEmployee: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'veer_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize SQLite & restore session on startup
  useEffect(() => {
    async function init() {
      try {
        await getSqliteDb();
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          try {
            const user = JSON.parse(stored) as User;
            setCurrentUser(user);
          } catch (e) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Initialization error in AuthProvider:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const user = await loginUser(username, password);
    if (!user) {
      throw new Error('Invalid Username or Password. Please try again.');
    }
    setCurrentUser(user);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const refreshUser = () => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        // ignore
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin: currentUser?.role === 'admin',
        isEmployee: currentUser?.role === 'employee',
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

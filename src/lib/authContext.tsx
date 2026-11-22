import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUserProfile, signInWithEmail, signOutUser, signUpWithEmail, updateProfile } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/types/exam';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<UserProfile>;
  signUp: (email: string, pass: string, name: string, role?: UserRole) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  refreshUser: async () => {},
  signIn: async () => ({ id: '', email: '', name: '', role: 'user', createdAt: 0 }),
  signUp: async () => ({ id: '', email: '', name: '', role: 'user', createdAt: 0 }),
  signOut: async () => {},
  updateAvatar: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const current = await getCurrentUserProfile();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function initUser() {
      try {
        const current = await getCurrentUserProfile();
        if (active) setUser(current);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void initUser();
    return () => {
      active = false;
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    const loggedIn = await signInWithEmail(email, pass);
    setUser(loggedIn);
    return loggedIn;
  };

  const signUp = async (email: string, pass: string, name: string, role: UserRole = 'user') => {
    const created = await signUpWithEmail(email, pass, name, role);
    setUser(created);
    return created;
  };

  const signOut = async () => {
    await signOutUser();
    setUser(null);
  };

  const updateAvatar = async (avatarUrl: string) => {
    const updated = await updateProfile({ avatarUrl });
    setUser(updated);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        refreshUser,
        signIn,
        signUp,
        signOut,
        updateAvatar,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { UserProfile, UserRole } from '@/types/exam';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Local fallback storage keys for offline or pre-Supabase setup
const LOCAL_USER_KEY = '@examprep/current-user-v1';
const LOCAL_USERS_DB_KEY = '@examprep/registered-users-v1';

// Default seeded accounts for instant offline testing
const DEMO_USERS: UserProfile[] = [
  {
    id: 'demo-student-01',
    email: 'student@examprep.com',
    name: 'Rahul Kumar',
    role: 'user',
    avatarUrl: 'avatar-1',
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'demo-admin-01',
    email: 'admin@examprep.com',
    name: 'Admin Faculty',
    role: 'admin',
    avatarUrl: 'avatar-admin',
    createdAt: Date.now() - 86400000 * 30,
  },
];

async function getLocalUsers(): Promise<UserProfile[]> {
  const raw = await AsyncStorage.getItem(LOCAL_USERS_DB_KEY);
  if (!raw) {
    await AsyncStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(DEMO_USERS));
    return DEMO_USERS;
  }
  return JSON.parse(raw);
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Fetch user profile from Supabase profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      return {
        id: profile.id,
        email: profile.email || session.user.email || '',
        name: profile.name || session.user.user_metadata?.name || 'Aspirant',
        role: profile.role || (session.user.user_metadata?.role as UserRole) || 'user',
        avatarUrl: profile.avatar_url || session.user.user_metadata?.avatarUrl || 'avatar-1',
        createdAt: new Date(profile.created_at || session.user.created_at).getTime(),
      };
    }

    return {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.name || 'Aspirant',
      role: (session.user.user_metadata?.role as UserRole) || 'user',
      avatarUrl: session.user.user_metadata?.avatarUrl || 'avatar-1',
      createdAt: new Date(session.user.created_at).getTime(),
    };
  }

  // Local Storage fallback
  const raw = await AsyncStorage.getItem(LOCAL_USER_KEY);
  if (!raw) return DEMO_USERS[0]; // Default logged in as student for seamless first experience
  return JSON.parse(raw);
}

export async function signInWithEmail(email: string, password: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign in failed');

    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error('Could not load user profile');
    return profile;
  }

  // Local fallback auth
  const users = await getLocalUsers();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!existing) {
    throw new Error('No account found with this email. Please sign up first.');
  }

  await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(existing));
  return existing;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  role: UserRole = 'user',
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim() || 'Aspirant';

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          role,
          avatarUrl: role === 'admin' ? 'avatar-admin' : 'avatar-1',
        },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign up failed');

    // Create profile entry
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: cleanEmail,
      name: cleanName,
      role,
      avatar_url: role === 'admin' ? 'avatar-admin' : 'avatar-1',
      updated_at: new Date().toISOString(),
    });

    const profile: UserProfile = {
      id: data.user.id,
      email: cleanEmail,
      name: cleanName,
      role,
      avatarUrl: role === 'admin' ? 'avatar-admin' : 'avatar-1',
      createdAt: Date.now(),
    };
    return profile;
  }

  // Local fallback
  const users = await getLocalUsers();
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const newUser: UserProfile = {
    id: `user-${Date.now()}`,
    email: cleanEmail,
    name: cleanName,
    role,
    avatarUrl: role === 'admin' ? 'avatar-admin' : 'avatar-1',
    createdAt: Date.now(),
  };

  await AsyncStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify([...users, newUser]));
  await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
  return newUser;
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getCurrentUserProfile();
  if (!current) throw new Error('No user is currently signed in');

  const updated: UserProfile = {
    ...current,
    ...updates,
  };

  if (supabase) {
    await supabase.from('profiles').upsert({
      id: updated.id,
      name: updated.name,
      avatar_url: updated.avatarUrl,
      role: updated.role,
      updated_at: new Date().toISOString(),
    });
  }

  // Update in local storage
  await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
  const users = await getLocalUsers();
  const nextUsers = users.map((u) => (u.id === updated.id ? updated : u));
  await AsyncStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(nextUsers));

  return updated;
}

export async function signOutUser(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
  await AsyncStorage.removeItem(LOCAL_USER_KEY);
}

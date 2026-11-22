import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { UserProfile, UserRole } from '@/types/exam';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rkvdjtzzbpkrjrwmbyoo.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_8ADsx-yd4JHngsacbWR7Vg_OmrjnOJG';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const ssrSafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: ssrSafeStorage,
        autoRefreshToken: typeof window !== 'undefined',
        persistSession: typeof window !== 'undefined',
        detectSessionInUrl: false,
      },
    })
  : null;

// Local fallback storage keys
const LOCAL_USER_KEY = '@examprep/current-user-v1';
const LOCAL_USERS_DB_KEY = '@examprep/registered-users-v1';

// Seeded accounts
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
  const raw = await ssrSafeStorage.getItem(LOCAL_USERS_DB_KEY);
  if (!raw) {
    await ssrSafeStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(DEMO_USERS));
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
  const raw = await ssrSafeStorage.getItem(LOCAL_USER_KEY);
  if (!raw) return DEMO_USERS[0];
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

  await ssrSafeStorage.setItem(LOCAL_USER_KEY, JSON.stringify(existing));
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

    // Create profile entry in Supabase
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

  await ssrSafeStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify([...users, newUser]));
  await ssrSafeStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
  return newUser;
}

/**
 * Only an authorized Admin can call this function to create a sub-admin.
 * Uses a separate non-persisting client so the Admin's session is never disrupted.
 */
export async function createSubAdminAccount(
  name: string,
  email: string,
  password: string,
): Promise<UserProfile> {
  const currentAdmin = await getCurrentUserProfile();
  if (!currentAdmin || currentAdmin.role !== 'admin') {
    throw new Error('Unauthorized: Only administrators can create sub-admin accounts.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (supabase) {
    // Isolated client instance with no session persistence to preserve current admin's session
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await tempClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          role: 'admin',
          avatarUrl: 'avatar-admin',
          createdBy: currentAdmin.id,
        },
      },
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Could not create sub-admin account in Supabase');

    // Upsert into profiles table
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: cleanEmail,
      name: cleanName,
      role: 'admin',
      avatar_url: 'avatar-admin',
      updated_at: new Date().toISOString(),
    });

    return {
      id: data.user.id,
      email: cleanEmail,
      name: cleanName,
      role: 'admin',
      avatarUrl: 'avatar-admin',
      createdAt: Date.now(),
    };
  }

  // Local fallback
  const users = await getLocalUsers();
  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const newAdmin: UserProfile = {
    id: `admin-${Date.now()}`,
    email: cleanEmail,
    name: cleanName,
    role: 'admin',
    avatarUrl: 'avatar-admin',
    createdAt: Date.now(),
  };

  await ssrSafeStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify([...users, newAdmin]));
  return newAdmin;
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

  await ssrSafeStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
  const users = await getLocalUsers();
  const nextUsers = users.map((u) => (u.id === updated.id ? updated : u));
  await ssrSafeStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(nextUsers));

  return updated;
}

export async function signOutUser(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
  await ssrSafeStorage.removeItem(LOCAL_USER_KEY);
}

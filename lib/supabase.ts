import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

const STORAGE_PREFIX = 'kidsguard_';

export async function localGet<T>(key: string): Promise<T | null> {
  if (Platform.OS === 'web') {
    const v = localStorage.getItem(STORAGE_PREFIX + key);
    return v ? (JSON.parse(v) as T) : null;
  }
  return null;
}

export async function localSet<T>(key: string, value: T): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  }
}

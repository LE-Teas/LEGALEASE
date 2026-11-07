import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamically detects the local computer's IP address when running in Expo Go / Metro
 * (e.g. 10.167.250.155 or 192.168.1.36) so it never breaks when switching Wi-Fi networks!
 */
export function getHostIp(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname || '127.0.0.1';
  }
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      .manifest2?.extra?.expoClient?.hostUri ||
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  if (hostUri) {
    return hostUri.split(':')[0];
  }
  return '10.167.250.155';
}

export const API_BASE_URL = `http://${getHostIp()}:3000`;
export const SUPABASE_URL = `http://${getHostIp()}:54321`;
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

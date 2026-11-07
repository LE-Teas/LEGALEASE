import type { CapacitorConfig } from '@capacitor/cli';

/**
 * LegalEase Mobile Configuration for Local Testing
 * Pointing to your local machine IP so mobile on local Wi-Fi can connect directly
 * to Next.js and the local Docker Supabase stack.
 */
const config: CapacitorConfig = {
  appId: 'pk.legalease.app',
  appName: 'LegalEase',
  webDir: 'www',
  server: {
    // 192.168.1.36 is your local Wi-Fi IPv4 address
    url: 'http://192.168.1.36:3000',
    cleartext: true,
    androidScheme: 'http'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;

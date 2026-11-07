import type { CapacitorConfig } from '@capacitor/cli';

/**
 * LegalEase Mobile Configuration
 *
 * Supports dynamic server URL:
 * - Can connect to your live domain (https://legalease.pk)
 * - Can connect to local test Wi-Fi (http://192.168.1.36:3000)
 * - Falls back to local www launcher if no server is hardcoded.
 */
const config: CapacitorConfig = {
  appId: 'pk.legalease.app',
  appName: 'LegalEase',
  webDir: 'www',
  server: {
    // Dynamic server URL configured from environment or fallback
    url: process.env.MOBILE_SERVER_URL || 'http://192.168.1.36:3000',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0A2843",
      showSpinner: false
    }
  }
};

export default config;

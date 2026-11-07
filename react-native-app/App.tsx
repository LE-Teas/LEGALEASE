import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';

const DEFAULT_LOCAL_URL = 'http://192.168.1.36:3000';
const DEFAULT_PROD_URL = 'https://legalease.pk';

export default function App() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState(DEFAULT_LOCAL_URL);
  const [isLoading, setIsLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleConnect = (targetUrl: string) => {
    let clean = targetUrl.trim();
    if (!clean) return;
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    setCurrentUrl(clean);
  };

  const handleReset = () => {
    setCurrentUrl(null);
  };

  if (!currentUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A2843" />
        <View style={styles.launcherCard}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>LE</Text>
          </View>
          <Text style={styles.title}>LegalEase Mobile</Text>
          <Text style={styles.subtitle}>
            React Native Cross-Platform Application for Android & iOS
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>SERVER / NETWORK ENDPOINT</Text>
            <TextInput
              style={styles.textInput}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="e.g. http://192.168.1.36:3000"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleConnect(inputUrl)}
          >
            <Text style={styles.primaryButtonText}>Connect Application</Text>
          </TouchableOpacity>

          <View style={styles.presetRow}>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => {
                setInputUrl(DEFAULT_PROD_URL);
                handleConnect(DEFAULT_PROD_URL);
              }}
            >
              <Text style={styles.presetText}>🌐 Production (Live)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => {
                setInputUrl(DEFAULT_LOCAL_URL);
                handleConnect(DEFAULT_LOCAL_URL);
              }}
            >
              <Text style={styles.presetText}>💻 Local Wi-Fi (Docker)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerNote}>
            <Text style={styles.footerText}>
              • Real-time consultations & payments enabled
            </Text>
            <Text style={styles.footerText}>
              • FBR ATL Active Taxpayers search integration
            </Text>
            <Text style={styles.footerText}>
              • Native Supabase & AI Assistant live synchronization
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.webContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.switchButton} onPress={handleReset}>
          <Text style={styles.switchButtonText}>⚙ Server Settings</Text>
        </TouchableOpacity>
        <Text style={styles.urlIndicator} numberOfLines={1}>
          {currentUrl}
        </Text>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color="#0A2843" />
            <Text style={styles.loadingText}>Connecting to LegalEase...</Text>
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        mixedContentMode="always"
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          Alert.alert(
            "Connection Error",
            `Could not reach ${currentUrl}. Please make sure your computer and mobile phone are on the same Wi-Fi network and port 3000 is open.\n\nDetails: ${nativeEvent.description}`,
            [{ text: "Change Server", onPress: handleReset }, { text: "Retry" }]
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A2843',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  launcherCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 24,
    alignItems: 'center',
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  logoText: {
    color: '#0A2843',
    fontSize: 28,
    fontWeight: '900',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#0A2843',
    fontSize: 15,
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 20,
  },
  presetButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  presetText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  footerNote: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 14,
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  switchButton: {
    backgroundColor: '#0A2843',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  switchButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  urlIndicator: {
    fontSize: 11,
    color: '#64748B',
    maxWidth: 220,
  },
  loaderCenter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#0A2843',
    fontWeight: '500',
  },
});

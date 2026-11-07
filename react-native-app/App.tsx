import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { AuthScreen } from './src/screens/AuthScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { LawyersScreen } from './src/screens/LawyersScreen';
import { FilerStatusScreen } from './src/screens/FilerStatusScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';

type TabType = 'chat' | 'lawyers' | 'filer' | 'notifications';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  if (!isAuthenticated) {
    return <AuthScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A2843" />
      <View style={styles.topNav}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>LE</Text>
          </View>
          <Text style={styles.brandTitle}>LegalEase</Text>
        </View>
        <Text style={styles.networkBadge}>🟢 Connected</Text>
      </View>

      <View style={styles.screenContainer}>
        {activeTab === 'chat' && <ChatScreen />}
        {activeTab === 'lawyers' && <LawyersScreen />}
        {activeTab === 'filer' && <FilerStatusScreen />}
        {activeTab === 'notifications' && (
          <NotificationsScreen onLogout={() => setIsAuthenticated(false)} />
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
            🤖 AI Legal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'lawyers' && styles.tabItemActive]}
          onPress={() => setActiveTab('lawyers')}
        >
          <Text style={[styles.tabText, activeTab === 'lawyers' && styles.tabTextActive]}>
            ⚖ Lawyers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'filer' && styles.tabItemActive]}
          onPress={() => setActiveTab('filer')}
        >
          <Text style={[styles.tabText, activeTab === 'filer' && styles.tabTextActive]}>
            🏛 Filer ATL
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'notifications' && styles.tabItemActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
            🔔 Alerts
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A2843' },
  topNav: {
    height: 56,
    backgroundColor: '#0A2843',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { color: '#0A2843', fontWeight: '900', fontSize: 13 },
  brandTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  networkBadge: { color: '#10B981', fontSize: 11, fontWeight: '600' },
  screenContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  tabBar: {
    height: 60,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#10B981',
  },
  tabText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  tabTextActive: { color: '#0A2843', fontWeight: '700' },
});

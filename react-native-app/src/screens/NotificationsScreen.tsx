import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Consultation Confirmed',
    message: 'Adv. Amara Rahman has accepted your consultation scheduled for Monday at 3:00 PM.',
    created_at: 'Just now',
    read_at: null,
  },
  {
    id: '2',
    title: 'FBR ATL Update Available',
    message: 'The latest Active Taxpayer List (ATL) dataset has been synchronized with the portal.',
    created_at: '2 hours ago',
    read_at: 'read',
  },
];

interface NotificationsScreenProps {
  onLogout: () => void;
}

export function NotificationsScreen({ onLogout }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for realtime inserts
    const channel = supabase
      .channel('realtime_mobile_notifs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const item = payload.new as NotificationItem;
          setNotifications((prev) => [item, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.sub}>Real-time alerts and case updates</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.read_at && styles.unreadCard]}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMsg}>{item.message}</Text>
            <Text style={styles.cardTime}>{item.created_at}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0A2843' },
  sub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#10B981' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardMsg: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },
  cardTime: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
});

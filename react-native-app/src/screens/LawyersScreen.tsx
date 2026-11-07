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

interface Lawyer {
  id: string;
  full_name: string;
  professional_title: string;
  city: string;
  rating: number;
  consultation_fee: number;
}

const DEMO_LAWYERS: Lawyer[] = [
  {
    id: '1',
    full_name: 'Adv. Amara Rahman',
    professional_title: 'Senior Partner, Family & Property Law',
    city: 'Karachi (Clifton)',
    rating: 4.9,
    consultation_fee: 5000,
  },
  {
    id: '2',
    full_name: 'Adv. Fatima Naqvi',
    professional_title: 'Founding Partner, IP & Tech Law',
    city: 'Islamabad (F-7)',
    rating: 5.0,
    consultation_fee: 6500,
  },
  {
    id: '3',
    full_name: 'Adv. Danish Siddiqui',
    professional_title: 'Corporate & Taxation Advocate',
    city: 'Lahore (Gulberg)',
    rating: 4.8,
    consultation_fee: 4500,
  },
];

export function LawyersScreen() {
  const [lawyers, setLawyers] = useState<Lawyer[]>(DEMO_LAWYERS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchLawyers() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('lawyer_profiles')
          .select('id, full_name, professional_title, city, rating, consultation_fee')
          .limit(10);
        if (!error && data && data.length > 0) {
          setLawyers(data as Lawyer[]);
        }
      } catch {
        /* fallback to demo */
      } finally {
        setLoading(false);
      }
    }
    fetchLawyers();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Verified Advocates</Text>
        <Text style={styles.sub}>High Court enrolled advocates across Pakistan</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0A2843" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={lawyers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.full_name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <Text style={styles.profession}>{item.professional_title}</Text>
                  <Text style={styles.location}>📍 {item.city}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.rating}>⭐ {Number(item.rating || 5.0).toFixed(1)}</Text>
                <TouchableOpacity style={styles.bookBtn}>
                  <Text style={styles.bookBtnText}>Book Consultation</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0A2843' },
  sub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0A2843',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  profession: { fontSize: 12, color: '#475569', marginTop: 2 },
  location: { fontSize: 12, color: '#64748B', marginTop: 4 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  rating: { fontSize: 13, fontWeight: '700', color: '#0A2843' },
  bookBtn: {
    backgroundColor: '#0A2843',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
});


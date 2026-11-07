import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onSuccess: () => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('citizen.ali@legalease.pk');
  const [password, setPassword] = useState('Password123!');
  const [fullName, setFullName] = useState('Ali Raza Khan');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'citizen',
            },
          },
        });
        if (error) throw error;
        Alert.alert('Account Created', 'Please log in to continue.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>LE</Text>
          </View>
          <Text style={styles.title}>LegalEase</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create your platform account' : 'Sign in to access your portal'}
          </Text>

          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Ali Raza"
                placeholderTextColor="#94A3B8"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@legalease.pk"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#0A2843" />
            ) : (
              <Text style={styles.buttonText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already registered? ' : 'New to LegalEase? '}
              <Text style={styles.toggleTextBold}>
                {isSignUp ? 'Sign In' : 'Create Account'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A2843' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: { color: '#0A2843', fontSize: 24, fontWeight: '900' },
  title: { fontSize: 24, fontWeight: '800', color: '#0A2843', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748B', marginBottom: 20, textAlign: 'center' },
  inputGroup: { width: '100%', marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    width: '100%',
    height: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#10B981',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#0A2843', fontSize: 15, fontWeight: '700' },
  toggleRow: { marginTop: 16, padding: 4 },
  toggleText: { fontSize: 13, color: '#64748B' },
  toggleTextBold: { color: '#0CA275', fontWeight: '700' },
});

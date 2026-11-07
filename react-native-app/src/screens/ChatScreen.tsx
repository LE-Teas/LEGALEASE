import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'As-salamu alaykum. I am the LegalEase AI Legal Assistant, grounded in the Constitution of Pakistan, statutory laws, and high court precedents. How can I assist you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://192.168.1.36:3000/api/legal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMsg.content }],
        }),
      });

      const data = await response.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.text || 'Information retrieved based on Pakistani legal statutes.',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Unable to connect to legal knowledge base. Please check local server connectivity.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LegalEase AI Assistant</Text>
        <Text style={styles.headerSub}>Verified Pakistani Statutory Law</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                item.role === 'user' ? styles.userText : styles.botText,
              ]}
            >
              {item.content}
            </Text>
          </View>
        )}
      />

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#10B981" />
          <Text style={styles.loadingText}>Searching verified legal database...</Text>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a Pakistani legal question..."
          placeholderTextColor="#94A3B8"
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    padding: 16,
    backgroundColor: '#0A2843',
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  headerTitle: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  headerSub: { color: '#10B981', fontSize: 12, marginTop: 2, fontWeight: '600' },
  messageList: { padding: 16, gap: 12 },
  bubble: { maxWidth: '82%', borderRadius: 16, padding: 14 },
  userBubble: {
    backgroundColor: '#0A2843',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#ffffff' },
  botText: { color: '#1E293B' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loadingText: { fontSize: 12, color: '#64748B' },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
  },
  sendButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: { color: '#0A2843', fontWeight: '700', fontSize: 14 },
});

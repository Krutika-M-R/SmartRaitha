import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useLanguage } from '../context/LanguageContext';
import assistantService from '../services/assistantService';
import TopHeader from '../components/TopHeader';

export default function AssistantScreen({ navigation }) {
  const { language, t } = useLanguage();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', content: t('assistantIntro') }]);
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const speechLanguage = { en: 'en-IN', kn: 'kn-IN', hi: 'hi-IN', te: 'te-IN' }[language] || 'en-IN';

  function speakReply(text) {
    Speech.stop();
    Speech.speak(text, { language: speechLanguage, rate: 0.9, pitch: 1.0 });
  }

  useEffect(() => () => Speech.stop(), []);

  async function sendMessage() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmedMessage }];
    setMessages(nextMessages);
    setMessage('');
    setLoading(true);
    try {
      const response = await assistantService.askAssistant(trimmedMessage, language, nextMessages);
      setMessages((current) => [...current, { role: 'assistant', content: response.reply }]);
      if (voiceEnabled) speakReply(response.reply);
    } catch (error) {
      const errorMessage = error.message || t('assistantUnavailable');
      setMessages((current) => [...current, { role: 'assistant', content: errorMessage }]);
      if (voiceEnabled) speakReply(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TopHeader navigation={navigation} />
      <KeyboardAvoidingView style={styles.chat} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>{t('assistant')}</Text>
            <Text style={styles.subtitle}>{t('assistantIntro')}</Text>
          </View>
          <TouchableOpacity style={[styles.voiceButton, voiceEnabled && styles.voiceButtonActive]} onPress={() => setVoiceEnabled((enabled) => !enabled)} accessibilityLabel={voiceEnabled ? t('voiceOff') : t('voiceOn')}>
            <Ionicons name={voiceEnabled ? 'volume-high' : 'volume-mute'} size={20} color={voiceEnabled ? colors.surface : colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {messages.map((item, index) => (
          <View key={`${item.role}-${index}`} style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.bubbleText, item.role === 'user' && styles.userText]}>{item.content}</Text>
            {item.role === 'assistant' && <TouchableOpacity onPress={() => speakReply(item.content)} style={styles.speakButton}>
              <Ionicons name="volume-medium-outline" size={16} color={colors.primary} />
              <Text style={styles.speakText}>{t('speak')}</Text>
            </TouchableOpacity>}
          </View>
        ))}
        {loading && <Text style={styles.loading}>...</Text>}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder={t('assistantPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading}>
          <Text style={styles.sendText}>{t('send')}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chat: { flex: 1 },
  content: { padding: spacing.large, paddingBottom: spacing.large },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.medium },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.medium },
  subtitle: { color: colors.textSecondary, fontSize: 12, maxWidth: 250, lineHeight: 17 },
  voiceButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  voiceButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bubble: { maxWidth: '88%', borderRadius: 14, padding: spacing.medium, marginBottom: spacing.small },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  userText: { color: colors.surface },
  speakButton: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.small, gap: 4 },
  speakText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  loading: { color: colors.textSecondary, marginBottom: spacing.small },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.medium, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, maxHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.medium, paddingVertical: spacing.small, color: colors.text, backgroundColor: colors.background },
  sendButton: { marginLeft: spacing.small, paddingHorizontal: spacing.medium, paddingVertical: spacing.medium, borderRadius: 10, backgroundColor: colors.primary },
  sendText: { color: colors.surface, fontWeight: '700' },
});

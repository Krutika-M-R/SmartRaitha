import React, { useEffect, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useLanguage } from '../context/LanguageContext';
import assistantService from '../services/assistantService';
import TopHeader from '../components/TopHeader';
import { useLocation } from '../hooks/useLocation';

export default function AssistantScreen({ navigation }) {
  const { language, t } = useLanguage();
  const { location } = useLocation();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const glowProgress = React.useRef(new Animated.Value(0)).current;
  const isSpeaking = speakingMessageIndex !== null;

  const speechLanguage = { en: 'en-IN', kn: 'kn-IN', hi: 'hi-IN', te: 'te-IN' }[language] || 'en-IN';

  function speakReply(text, index) {
    if (speakingMessageIndex === index) {
      Speech.stop();
      setSpeakingMessageIndex(null);
      return;
    }
    Speech.stop();
    setSpeakingMessageIndex(index);
    Speech.speak(text, {
      language: speechLanguage,
      rate: 0.9,
      pitch: 1.0,
      onStart: () => setSpeakingMessageIndex(index),
      onDone: () => setSpeakingMessageIndex(null),
      onStopped: () => setSpeakingMessageIndex(null),
      onError: () => setSpeakingMessageIndex(null),
    });
  }

  useEffect(() => {
    if (!isSpeaking) {
      glowProgress.stopAnimation();
      glowProgress.setValue(0);
      return undefined;
    }

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowProgress, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(glowProgress, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
    );
    glowAnimation.start();
    return () => glowAnimation.stop();
  }, [glowProgress, isSpeaking]);

  useEffect(() => () => Speech.stop(), []);

  async function sendMessage() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmedMessage }];
    setMessages(nextMessages);
    setMessage('');
    setLoading(true);
    try {
      const response = await assistantService.askAssistant(trimmedMessage, language, nextMessages, location);
      setMessages((current) => [...current, { role: 'assistant', content: response.reply }]);
    } catch (error) {
      const errorMessage = error.message || t('assistantUnavailable');
      setMessages((current) => [...current, { role: 'assistant', content: errorMessage }]);
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
          <View style={styles.identity}>
            <View style={styles.avatarWrap}>
              {isSpeaking && (
                <Animated.View
                  style={[
                    styles.avatarGlow,
                    {
                      opacity: glowProgress.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
                      transform: [{ scale: glowProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
                    },
                  ]}
                />
              )}
              <Image source={require('../assets/littleleaf-avatar.png')} style={styles.avatar} />
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.title}>LittleLeaf</Text>
              <Text style={styles.greeting}>Hiiii, fren! 💚🍃</Text>
            </View>
          </View>
        </View>
        <Text style={styles.subtitle}>Your tiny corner of comfort. How can I help you today?</Text>
        {messages.map((item, index) => (
          <View key={`${item.role}-${index}`} style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.bubbleText, item.role === 'user' && styles.userText]}>{item.content}</Text>
            {item.role === 'assistant' && (
              <TouchableOpacity
                onPress={() => speakReply(item.content, index)}
                style={styles.speakButton}
                accessibilityRole="button"
                accessibilityLabel={speakingMessageIndex === index ? t('voiceOff') : t('speak')}
              >
                <Ionicons name={speakingMessageIndex === index ? 'volume-mute' : 'volume-high'} size={17} color={colors.primary} />
                <Text style={styles.speakText}>{speakingMessageIndex === index ? t('voiceOff') : t('speak')}</Text>
              </TouchableOpacity>
            )}
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
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.small },
  identity: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.surface },
  avatarGlow: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: '#57E36A' },
  identityCopy: { marginLeft: spacing.medium },
  greeting: { color: colors.success, fontSize: 15, fontWeight: '700', marginTop: 2 },
  subtitle: { color: colors.textSecondary, fontSize: 14, maxWidth: 310, lineHeight: 20, marginBottom: spacing.large },
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

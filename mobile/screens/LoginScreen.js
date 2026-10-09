import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginScreen({ navigation, route }) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route.params?.email) setEmail(route.params.email);
  }, [route.params?.email]);

  async function handleLogin() {
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(normalizedEmail, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>SmartRaitha</Text>
        <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>

        <ErrorMessage message={error} />

        <InputField label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
        <InputField label={t('password')} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

        <Button title={t('logIn')} onPress={handleLogin} loading={loading} />

        <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.linkWrap}>
          <Text style={styles.link}>{t('noAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.large, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: spacing.small / 2 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.large },
  linkWrap: { marginTop: spacing.large, alignItems: 'center' },
  link: { color: colors.primary, fontSize: 14 },
});

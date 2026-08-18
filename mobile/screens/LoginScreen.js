import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>SmartRaitha</Text>
      <Text style={styles.subtitle}>Log in to continue</Text>

      <ErrorMessage message={error} />

      <InputField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
      <InputField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

      <Button title="Log In" onPress={handleLogin} loading={loading} />

      <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.linkWrap}>
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.large, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: spacing.small / 2 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.large },
  linkWrap: { marginTop: spacing.large, alignItems: 'center' },
  link: { color: colors.primary, fontSize: 14 },
});

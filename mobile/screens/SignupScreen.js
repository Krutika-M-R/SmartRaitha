import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { validateName, validateEmail, validatePassword } from '../utils/validation';

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup() {
    setError('');
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    const nameErr = validateName(name);
    if (nameErr) {
      setError(nameErr);
      return;
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password);
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
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join SmartRaitha to compare mandi prices</Text>

      <ErrorMessage message={error} />

      <InputField label="Name" value={name} onChangeText={setName} placeholder="Your name" />
      <InputField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@gmail.com" />
      <InputField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="********" />
      <InputField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="********" />

      <Button title="Sign Up" onPress={handleSignup} loading={loading} />

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.large, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing.small / 2 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.large },
  linkWrap: { marginTop: spacing.large, alignItems: 'center' },
  link: { color: colors.primary, fontSize: 14 },
});

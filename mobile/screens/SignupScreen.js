import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { validateName, validateEmail, validatePassword } from '../utils/validation';
import { useLanguage } from '../context/LanguageContext';

export default function SignupScreen({ navigation }) {
  const { signup, verifyEmailCode } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [code, setCode] = useState('');

  async function handleSignup() {
    setError('');
    setSuccess('');
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    const nameErr = validateName(normalizedName);
    if (nameErr) {
      setError(nameErr);
      return;
    }

    const emailErr = validateEmail(normalizedEmail);
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
      const result = await signup(normalizedName, normalizedEmail, password);
      setVerificationSent(true);
      setCode(result.developmentVerificationCode || '');
      setSuccess(result.developmentVerificationCode
        ? 'Development verification code is ready below. Enter it to activate your account.'
        : 'Verification code sent. Enter it below to activate your account.');
      setPassword('');
      setConfirmPassword('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyEmailCode(email, code);
      navigation.navigate('Login', { email: email.trim().toLowerCase() });
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
        <Text style={styles.title}>{t('createAccount')}</Text>
        <Text style={styles.subtitle}>{t('joinSmartRaitha')}</Text>

        <ErrorMessage message={error} />
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <InputField label={t('name')} value={name} onChangeText={setName} placeholder="Your name" />
        <InputField label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
        <InputField label={t('password')} value={password} onChangeText={setPassword} secureTextEntry placeholder="********" />
        <InputField label={t('confirmPassword')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="********" />

        <Button title={t('signUp')} onPress={handleSignup} loading={loading} />
        {verificationSent && <>
          <InputField label="Email verification code" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="6-digit code" />
          <Button title="Verify email" onPress={handleVerifyCode} loading={loading} />
        </>}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
          <Text style={styles.link}>{t('hasAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.large, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing.small / 2 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.large },
  linkWrap: { marginTop: spacing.large, alignItems: 'center' },
  link: { color: colors.primary, fontSize: 14 },
  success: { color: '#287A45', fontSize: 13, marginBottom: spacing.medium },
});

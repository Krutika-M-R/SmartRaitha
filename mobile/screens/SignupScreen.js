import React, { useState } from 'react';
import { Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { validateName, validateEmail, validatePassword } from '../utils/validation';
import { useLanguage } from '../context/LanguageContext';

export default function SignupScreen({ navigation }) {
  const { signup, verifySignupCode } = useAuth();
  const { t, localize } = useLanguage();
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
      setError(t('fillAllFields'));
      return;
    }

    const nameErr = validateName(normalizedName, t);
    if (nameErr) {
      setError(nameErr);
      return;
    }

    const emailErr = validateEmail(normalizedEmail, t);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    const passErr = validatePassword(password, t);
    if (passErr) {
      setError(passErr);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await signup(normalizedName, normalizedEmail, password);
      setVerificationSent(true);
      setSuccess(t('verificationSent', { email: normalizedEmail }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t('sixDigitVerification'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifySignupCode(email, code);
    } catch (e) {
      setError(e.message);
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
        {success ? <Text style={styles.success}>{localize(success)}</Text> : null}

        <InputField label={t('name')} value={name} onChangeText={setName} placeholder={t('namePlaceholder')} />
        {!verificationSent && (
          <>
            <InputField label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder={t('emailPlaceholder')} />
            <InputField label={t('password')} value={password} onChangeText={setPassword} secureTextEntry placeholder="********" />
            <InputField label={t('confirmPassword')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="********" />
          </>
        )}

        {verificationSent && (
          <>
            <InputField label={t('emailVerificationCode')} value={code} onChangeText={setCode} keyboardType="number-pad" placeholder={t('sixDigitCode')} />
            <Button title={t('verifyContinue')} onPress={handleVerifyCode} loading={loading} />
          </>
        )}
        {!verificationSent && <Button title={t('signUp')} onPress={handleSignup} loading={loading} />}

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

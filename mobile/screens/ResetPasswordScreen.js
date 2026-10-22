import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import InputField from '../components/InputField';
import { useLanguage } from '../context/LanguageContext';
import authService from '../services/authService';
import { validateEmail, validatePassword } from '../utils/validation';

export default function ResetPasswordScreen({ navigation, route }) {
  const { t, localize } = useLanguage();
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function sendCode() {
    const normalizedEmail = email.trim().toLowerCase();
    const emailError = validateEmail(normalizedEmail, t);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await authService.requestPasswordReset(normalizedEmail);
      setEmail(normalizedEmail);
      setCodeSent(true);
      setSuccess(t('resetCodeSent'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t('sixDigitReset'));
      return;
    }
    const passwordError = validatePassword(password, t);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await authService.confirmPasswordReset(email, code, password);
      navigation.navigate('Login', {
        email,
        passwordResetComplete: true,
        resetMessage: result.message,
      });
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('resetPassword')}</Text>
        <Text style={styles.subtitle}>{t('resetPasswordSubtitle')}</Text>
        <ErrorMessage message={error} />
        {success ? <Text style={styles.success}>{localize(success)}</Text> : null}

        <InputField label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder={t('emailPlaceholder')} />
        {!codeSent ? (
          <Button title={t('sendResetCode')} onPress={sendCode} loading={loading} />
        ) : (
          <>
            <InputField label={t('emailVerificationCode')} value={code} onChangeText={setCode} keyboardType="number-pad" placeholder={t('sixDigitCode')} />
            <TouchableOpacity onPress={sendCode} disabled={loading} style={styles.resendWrap}>
              <Text style={styles.link}>{t('resendCode')}</Text>
            </TouchableOpacity>
            <InputField label={t('newPassword')} value={password} onChangeText={setPassword} secureTextEntry placeholder="********" />
            <InputField label={t('confirmPassword')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="********" />
            <Button title={t('changePassword')} onPress={resetPassword} loading={loading} />
          </>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backWrap}>
          <Text style={styles.link}>{t('backToLogin')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.large },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: spacing.small },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: spacing.large },
  success: { color: colors.success, fontSize: 13, lineHeight: 19, marginBottom: spacing.medium },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  resendWrap: { alignSelf: 'flex-end', paddingVertical: spacing.small, marginTop: -spacing.small },
  backWrap: { alignSelf: 'center', padding: spacing.medium, marginTop: spacing.medium },
});
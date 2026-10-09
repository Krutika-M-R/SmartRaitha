import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { languages, useLanguage } from '../context/LanguageContext';
import { TouchableOpacity } from 'react-native';
import InputField from '../components/InputField';
import TopHeader from '../components/TopHeader';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [gender, setGender] = useState(user?.gender || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [place, setPlace] = useState(user?.place || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateProfile({ gender, age, place });
      setMessage(t('profileSaved'));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <TopHeader navigation={navigation} />
      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>{t('name')}</Text>
        <Text style={styles.value}>{user?.name}</Text>

        <Text style={styles.label}>{t('email')}</Text>
        <Text style={styles.value}>{user?.email}</Text>

        <InputField label={t('gender')} value={gender} onChangeText={setGender} placeholder={t('genderPlaceholder')} />
        <InputField label={t('age')} value={age} onChangeText={setAge} keyboardType="numeric" placeholder={t('agePlaceholder')} />
        <InputField label={t('place')} value={place} onChangeText={setPlace} placeholder={t('placePlaceholder')} />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Button title={t('saveProfile')} onPress={handleSave} loading={saving} />

        <Text style={styles.label}>{t('language')}</Text>
        <View style={styles.languageRow}>
          {languages.map((item) => (
            <TouchableOpacity
              key={item.code}
              style={[styles.languageButton, item.code === language && styles.selectedLanguage]}
              onPress={() => setLanguage(item.code)}
            >
              <Text style={[styles.languageText, item.code === language && styles.selectedLanguageText]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Button title={t('assistant')} onPress={() => navigation.navigate('Assistant')} />
      <View style={styles.buttonGap} />
      <Button title={t('logOut')} variant="secondary" onPress={logout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.large, justifyContent: 'space-between' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.large,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.medium },
  value: { fontSize: 16, color: colors.text, fontWeight: '600' },
  languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.small, marginTop: spacing.small },
  languageButton: { paddingHorizontal: spacing.small, paddingVertical: spacing.small, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  selectedLanguage: { backgroundColor: colors.primary, borderColor: colors.primary },
  languageText: { color: colors.text, fontSize: 13 },
  selectedLanguageText: { color: colors.surface, fontWeight: '700' },
  buttonGap: { height: spacing.small },
  error: { color: colors.error, fontSize: 13, marginBottom: spacing.small },
  message: { color: colors.success, fontSize: 13, marginBottom: spacing.small },
});

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';

export default function LoadingIndicator({ message }) {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.text}>{message || t('loading')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { marginTop: 8, color: colors.textSecondary, fontSize: 13 },
});

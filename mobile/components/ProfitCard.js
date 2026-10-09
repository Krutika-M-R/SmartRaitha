import React, { useRef } from 'react';
import { Animated, Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useLanguage } from '../context/LanguageContext';

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>₹{Number(value).toFixed(2)}</Text>
    </View>
  );
}

export default function ProfitCard({ result }) {
  const { t } = useLanguage();
  const pressProgress = useRef(new Animated.Value(0)).current;

  if (!result) return null;
  return (
    <Animated.View style={{ transform: [{ scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
    <Pressable style={styles.card} onPressIn={() => Animated.spring(pressProgress, { toValue: 1, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(pressProgress, { toValue: 0, useNativeDriver: true }).start()}>
      <Row label={t('modalPrice')} value={result.modalPrice} />
      <Row label={t('grossRevenue')} value={result.grossRevenue} />
      <Row label={t('transportationCost')} value={result.transportCost} />
      <Row label={t('otherCosts')} value={result.otherCosts} />
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.netLabel}>{t('estimatedNetProfit')}</Text>
        <Text style={styles.netValue}>₹{Number(result.netProfit).toFixed(2)}</Text>
      </View>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.large,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#173F1A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 6, elevation: 5,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.small },
  rowLabel: { color: colors.textSecondary, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.small },
  netLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  netValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
});

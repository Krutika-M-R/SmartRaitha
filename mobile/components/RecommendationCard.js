import React, { useRef } from 'react';
import { Animated, Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

export default function RecommendationCard({ recommendation }) {
  const { t } = useLanguage();
  const pressProgress = useRef(new Animated.Value(0)).current;

  if (!recommendation || !recommendation.recommended) {
    return (
      <Animated.View style={{ transform: [{ scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
      <Pressable style={styles.emptyCard} onPressIn={() => Animated.spring(pressProgress, { toValue: 1, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(pressProgress, { toValue: 0, useNativeDriver: true }).start()}>
        <Text style={styles.emptyText}>{recommendation?.reason || t('notEnoughData')}</Text>
        </Pressable>
        </Animated.View>
    );
  }

  const { mandi, modalPrice, arrivalDate } = recommendation.recommended;

  return (
    <Animated.View style={{ transform: [{ scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
    <Pressable style={styles.card} onPressIn={() => Animated.spring(pressProgress, { toValue: 1, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(pressProgress, { toValue: 0, useNativeDriver: true }).start()}>
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}><Ionicons name="trophy-outline" size={19} color={colors.accent} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.label}>{t('recommendedMarket')}</Text>
          <Text style={styles.status}>{t('recommendedHint')}</Text>
        </View>
        <View style={styles.bestBadge}><Text style={styles.bestText}>{t('bestMandi')}</Text></View>
      </View>
      <Text style={styles.mandiName}>{mandi.name}</Text>
      {mandi.district ? <Text style={styles.reason}>{mandi.district}, {mandi.state}</Text> : null}
      <Text style={styles.profit}>₹{Number(modalPrice).toFixed(2)}/kg modal price</Text>
      {Number.isFinite(recommendation.estimatedNetProfit) && (
        <Text style={styles.profit}>
          Estimated net for {recommendation.estimateQuantityKg} kg after transport: ₹{Number(recommendation.estimatedNetProfit).toFixed(2)}
        </Text>
      )}
      {Number.isFinite(recommendation.distanceKm) && (
        <Text style={styles.reason}>Approx. {recommendation.distanceKm} km by road · estimated transport ₹{Number(recommendation.transportCost).toFixed(2)}</Text>
      )}
      {recommendation.dataFreshness === 'cached' && (
        <Text style={styles.reason}>Using the latest saved Agmarknet price, reported {recommendation.ageDays} days ago.</Text>
      )}
      {arrivalDate ? <Text style={styles.reason}>Agmarknet report: {arrivalDate}</Text> : null}
      <Text style={styles.reason}>{recommendation.reason}</Text>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: spacing.large,
    shadowColor: '#173F1A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 7, elevation: 6,
  },
  label: { color: '#DDEEDD', fontSize: 13, marginBottom: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.medium },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4A934E' },
  headerCopy: { flex: 1, marginLeft: spacing.small },
  status: { color: '#B9DDBB', fontSize: 10 },
  bestBadge: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: spacing.small, paddingVertical: 5 },
  bestText: { color: '#4F3500', fontSize: 10, fontWeight: '800' },
  mandiName: { color: colors.surface, fontSize: 20, fontWeight: '800' },
  profit: { color: colors.surface, fontSize: 15, marginTop: spacing.small, fontWeight: '600' },
  reason: { color: '#DDEEDD', fontSize: 13, marginTop: spacing.small },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.large,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#173F1A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 5, elevation: 4,
  },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
});

import React, { useRef } from 'react';
import { Animated, Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

function translateRecommendationReason(reason, t) {
  if (typeof reason !== 'string') return '';
  const netReturn = reason.match(/^Highest estimated net return for (\d+) kg from your current location after estimated road transport\.(?: Using the latest saved Agmarknet report from (\d+) days ago\.)?$/);
  if (netReturn) {
    const summary = t('recommendationNetReturn', { quantity: netReturn[1] });
    return netReturn[2] ? `${summary} ${t('recommendationSavedReport', { days: netReturn[2] })}` : summary;
  }

  const districtMatch = reason.match(/^Best available latest Agmarknet price in your district, (.+)\. This comparison does not include transportation costs\.$/);
  if (districtMatch) return t('recommendationBestDistrict', { district: districtMatch[1] });

  const priceMatch = reason.match(/^Highest latest reported Agmarknet modal price for (.+) in (.+)\. This comparison does not include transportation costs\.$/);
  if (priceMatch) return t('recommendationBestPrice', { crop: priceMatch[1], state: priceMatch[2] });

  return reason;
}

export default function RecommendationCard({ recommendation }) {
  const { t } = useLanguage();
  const pressProgress = useRef(new Animated.Value(0)).current;

  if (!recommendation || !recommendation.recommended) {
    return (
      <Animated.View style={{ transform: [{ scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
      <Pressable style={styles.emptyCard} onPressIn={() => Animated.spring(pressProgress, { toValue: 1, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(pressProgress, { toValue: 0, useNativeDriver: true }).start()}>
        <Text style={styles.emptyText}>{t('notEnoughData')}</Text>
        </Pressable>
        </Animated.View>
    );
  }

  const {
    mandi,
    modalPrice,
    arrivalDate,
    distanceKm,
    transportCost,
    otherCosts,
    estimatedNetProfit,
    estimateQuantityKg,
  } = recommendation.recommended;

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
      <Text style={styles.profit}>₹{Number(modalPrice).toFixed(2)}/kg {t('modalPricePerKg')}</Text>
      {Number.isFinite(estimatedNetProfit) && (
        <Text style={styles.profit}>
          {t('estimatedNetForQuantity', {
            quantity: estimateQuantityKg,
            profit: Number(estimatedNetProfit).toFixed(2),
          })}
        </Text>
      )}
      {Number.isFinite(distanceKm) && (
        <Text style={styles.reason}>{t('mandiDistanceSummary', {
          distance: Number(distanceKm).toFixed(1),
          cost: Number(transportCost).toFixed(2),
          otherCosts: Number(otherCosts).toFixed(2),
        })}</Text>
      )}
      {recommendation.dataFreshness === 'cached' && (
        <Text style={styles.reason}>{t('savedAgmarknetAge', { days: recommendation.ageDays })}</Text>
      )}
      {arrivalDate ? <Text style={styles.reason}>{t('agmarknetReport', { date: arrivalDate })}</Text> : null}
      <Text style={styles.reason}>{translateRecommendationReason(recommendation.reason, t)}</Text>
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

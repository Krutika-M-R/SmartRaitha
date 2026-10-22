import React, { useRef } from 'react';
import { Animated, Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useLanguage } from '../context/LanguageContext';

export default function MandiCard({
  mandiName,
  modalPrice,
  distanceKm,
  arrivalDate,
  district,
  state,
  dataFreshness,
  ageDays,
}) {
  const { t } = useLanguage();
  const pressProgress = useRef(new Animated.Value(0)).current;
  const hasLivePrice = Number.isFinite(modalPrice);
  return (
    <Animated.View style={{ transform: [{ scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
    <Pressable
      style={styles.card}
      onPressIn={() => Animated.spring(pressProgress, { toValue: 1, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressProgress, { toValue: 0, useNativeDriver: true }).start()}
    >
      <View style={styles.marketDetails}>
        <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">{mandiName}</Text>
        <Text style={styles.sub} numberOfLines={2} ellipsizeMode="tail">
          {[district, state, arrivalDate].filter(Boolean).join(' · ')}
          {dataFreshness === 'cached' ? ` · ${t('savedPriceAge', { days: ageDays })}` : ''}
          {distanceKm != null ? `${district || state || arrivalDate || dataFreshness ? ' · ' : ''}${t('aboutDistanceAway', { distance: distanceKm.toFixed(1) })}` : ''}
        </Text>
      </View>
      <Text
        style={[styles.price, !hasLivePrice && styles.unavailablePrice]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {hasLivePrice
          ? `₹${modalPrice.toFixed(2)}/kg${dataFreshness === 'cached' ? ` · ${t('saved')}` : ''}`
          : t('noPriceAvailable')}
      </Text>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.medium,
    marginBottom: spacing.small,
    shadowColor: '#173F1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  marketDetails: { flex: 1, minWidth: 0, marginRight: spacing.small },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  price: { maxWidth: '48%', flexShrink: 1, textAlign: 'right', fontSize: 18, fontWeight: '700', color: colors.accent },
  unavailablePrice: { color: colors.textSecondary, fontSize: 12 },
});

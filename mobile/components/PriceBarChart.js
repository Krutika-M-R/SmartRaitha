import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export default function PriceBarChart({ prices }) {
  if (!prices || prices.length === 0) return null;

  const maxPrice = Math.max(...prices.map((item) => Number(item.modalPrice) || 0), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Price comparison</Text>
      {prices.slice(0, 6).map((item) => {
        const width = Math.max(((Number(item.modalPrice) || 0) / maxPrice) * 100, 12);

        return (
          <View key={item.id ?? `${item.mandi?.id ?? 'mandi'}-${item.mandi?.name ?? 'price'}`} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>{item.mandi?.name || 'Market'}</Text>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${width}%` }]} />
            </View>
            <Text style={styles.value}>₹{item.modalPrice}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.medium,
    marginBottom: spacing.large,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.small,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  label: {
    width: 96,
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: spacing.small,
  },
  track: {
    flex: 1,
    height: 10,
    backgroundColor: '#E9EDE6',
    borderRadius: 999,
    overflow: 'hidden',
    marginRight: spacing.small,
  },
  bar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  value: {
    width: 58,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
});

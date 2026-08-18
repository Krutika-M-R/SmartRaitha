import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export default function RecommendationCard({ recommendation }) {
  if (!recommendation || !recommendation.recommended) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>Not enough data to make a recommendation yet.</Text>
      </View>
    );
  }

  const { mandi, netProfit } = recommendation.recommended;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Recommended market</Text>
      <Text style={styles.mandiName}>{mandi.name}</Text>
      <Text style={styles.profit}>Estimated profit: ₹{netProfit}</Text>
      <Text style={styles.reason}>{recommendation.reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: spacing.large,
  },
  label: { color: '#DDEEDD', fontSize: 13, marginBottom: 4 },
  mandiName: { color: colors.surface, fontSize: 20, fontWeight: '800' },
  profit: { color: colors.surface, fontSize: 15, marginTop: spacing.small, fontWeight: '600' },
  reason: { color: '#DDEEDD', fontSize: 13, marginTop: spacing.small },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.large,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export default function MandiCard({ mandiName, modalPrice, distanceKm }) {
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.name}>{mandiName}</Text>
        {distanceKm != null && <Text style={styles.sub}>{distanceKm} km away</Text>}
      </View>
      <Text style={styles.price}>₹{modalPrice}</Text>
    </View>
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
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  price: { fontSize: 18, fontWeight: '700', color: colors.accent },
});

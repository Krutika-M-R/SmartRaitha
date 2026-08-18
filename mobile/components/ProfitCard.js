import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>₹{value}</Text>
    </View>
  );
}

export default function ProfitCard({ result }) {
  if (!result) return null;
  return (
    <View style={styles.card}>
      <Row label="Modal price" value={result.modalPrice} />
      <Row label="Gross revenue" value={result.grossRevenue} />
      <Row label="Transportation cost" value={result.transportCost} />
      <Row label="Other costs" value={result.otherCosts} />
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.netLabel}>Estimated net profit</Text>
        <Text style={styles.netValue}>₹{result.netProfit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.large,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.small },
  rowLabel: { color: colors.textSecondary, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.small },
  netLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  netValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
});

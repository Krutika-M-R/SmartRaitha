import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ProfitCard from '../components/ProfitCard';
import ErrorMessage from '../components/ErrorMessage';
import LoadingIndicator from '../components/LoadingIndicator';
import mandiService from '../services/mandiService';
import profitService from '../services/profitService';

export default function ProfitCalculatorScreen({ route }) {
  const { crop } = route.params;
  const [mandis, setMandis] = useState([]);
  const [selectedMandiId, setSelectedMandiId] = useState(null);
  const [quantity, setQuantity] = useState('100');
  const [result, setResult] = useState(null);
  const [loadingMandis, setLoadingMandis] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMandis();
  }, []);

  async function loadMandis() {
    try {
      const data = await mandiService.getMandis();
      setMandis(data);
      if (data.length > 0) setSelectedMandiId(data[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMandis(false);
    }
  }

  async function handleCalculate() {
    setError('');
    const qty = Number(quantity);
    if (!selectedMandiId || !qty || qty <= 0) {
      setError('Please select a mandi and enter a valid quantity.');
      return;
    }
    setCalculating(true);
    try {
      const data = await profitService.calculateProfit(crop.id, selectedMandiId, qty);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCalculating(false);
    }
  }

  if (loadingMandis) return <LoadingIndicator message="Loading markets..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.large }}>
      <Text style={styles.title}>Profit Calculator — {crop.name}</Text>

      <ErrorMessage message={error} />

      <Text style={styles.label}>Select mandi</Text>
      <View style={styles.mandiRow}>
        {mandis.map((mandi) => (
          <Button
            key={mandi.id}
            title={mandi.name}
            variant={selectedMandiId === mandi.id ? 'primary' : 'secondary'}
            onPress={() => setSelectedMandiId(mandi.id)}
          />
        ))}
      </View>

      <InputField
        label="Quantity (kg)"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        placeholder="e.g. 100"
      />

      <Button title="Calculate Profit" onPress={handleCalculate} loading={calculating} />

      {result && (
        <View style={{ marginTop: spacing.large }}>
          <ProfitCard result={result} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.medium },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.small },
  mandiRow: { marginBottom: spacing.medium, gap: spacing.small },
});

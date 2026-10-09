import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ProfitCard from '../components/ProfitCard';
import ErrorMessage from '../components/ErrorMessage';
import LoadingIndicator from '../components/LoadingIndicator';
import mandiService from '../services/mandiService';
import profitService from '../services/profitService';
import { useLanguage } from '../context/LanguageContext';

export default function ProfitCalculatorScreen({ route }) {
  const { crop } = route.params;
  const { t } = useLanguage();
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

  if (loadingMandis) return <LoadingIndicator message={t('loadingMarkets')} />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t('profitCalculator')} — {crop.name}</Text>

        <ErrorMessage message={error} />

        <Text style={styles.label}>{t('selectMandi')}</Text>
        <View style={styles.mandiRow}>
          {mandis.map((mandi) => (
            <Button
              key={mandi.id}
              title={mandi.name}
              variant={selectedMandiId === mandi.id ? 'primary' : 'secondary'}
              onPress={() => {
                setSelectedMandiId(mandi.id);
                setResult(null);
                setError('');
              }}
            />
          ))}
        </View>

        <InputField
          label={t('quantityKg')}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="e.g. 100"
        />

        <Button title={t('calculateProfit')} onPress={handleCalculate} loading={calculating} />

        {result && (
          <View style={{ marginTop: spacing.large }}>
            <ProfitCard result={result} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.large, paddingBottom: spacing.xlarge * 2 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.medium },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.small },
  mandiRow: { marginBottom: spacing.medium, gap: spacing.small },
});

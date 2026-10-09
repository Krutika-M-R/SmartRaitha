import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import MandiCard from '../components/MandiCard';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import PriceBarChart from '../components/PriceBarChart';
import Button from '../components/Button';
import priceService from '../services/priceService';
import predictionService from '../services/predictionService';
import { useLanguage } from '../context/LanguageContext';

export default function MarketsScreen({ route }) {
  const { crop } = route.params;
  const { t } = useLanguage();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState('');

  useEffect(() => {
    loadPrices();
  }, []);

  async function loadPrices() {
    setLoading(true);
    setError('');
    try {
      const data = await priceService.getPricesForCrop(crop.id);
      // Highest modal price first, matching "compare prices" requirement
      data.sort((a, b) => b.modalPrice - a.modalPrice);
      setPrices(data.slice(0, 5));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function getTargetDate() {
    const target = new Date();
    target.setDate(target.getDate() + 2);
    return target.toISOString().slice(0, 10);
  }

  async function predictTwoDaysAhead() {
    if (prices.length === 0 || predicting) return;
    setPredicting(true);
    setPredictionError('');
    const targetDate = getTargetDate();
    try {
      const results = await Promise.all(
        prices.map(async (item) => {
          const prediction = await predictionService.generatePrediction(crop.id, item.mandiId, targetDate);
          return { ...prediction, mandiName: item.mandi?.name || 'Market' };
        }),
      );
      setPredictions(results);
    } catch (e) {
      setPredictionError(e.message || t('predictionUnavailable'));
    } finally {
      setPredicting(false);
    }
  }

  if (loading) return <LoadingIndicator message={t('fetchingPrices')} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={prices}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={(
        <>
          <Text style={styles.title}>{crop.name} — {t('markets')}</Text>
          <ErrorMessage message={error} />
          {prices.length > 0 && <PriceBarChart prices={prices} />}
          {prices.length > 0 && (
            <View style={styles.predictionPanel}>
              <Text style={styles.predictionTitle}>{t('futurePrice')}</Text>
              <Text style={styles.predictionSubtitle}>{t('twoDayPrediction')} — {crop.name}</Text>
              <Button title={t('predictTwoDays')} onPress={predictTwoDaysAhead} loading={predicting} />
              <ErrorMessage message={predictionError} />
              {predictions.map((prediction) => (
                <View key={`${prediction.mandiId}-${prediction.predictedDate}`} style={styles.predictionRow}>
                  <View style={styles.predictionMandi}>
                    <Text style={styles.predictionMandiName}>{prediction.mandiName}</Text>
                    <Text style={styles.predictionDate}>{t('predictedOn')}: {prediction.predictedDate}</Text>
                  </View>
                  <Text style={styles.predictionPrice}>₹{Number(prediction.predictedPrice).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
      ListEmptyComponent={<Text style={styles.empty}>{t('noPriceData')}</Text>}
      renderItem={({ item }) => (
        <MandiCard mandiName={item.mandi.name} modalPrice={item.modalPrice} distanceKm={null} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.large, paddingBottom: spacing.xlarge * 2 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.medium },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xlarge },
  predictionPanel: { backgroundColor: '#EAF4EA', borderRadius: 16, padding: spacing.medium, marginBottom: spacing.large },
  predictionTitle: { color: colors.primary, fontSize: 17, fontWeight: '800' },
  predictionSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 3, marginBottom: spacing.medium },
  predictionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 10, padding: spacing.small, marginTop: spacing.small },
  predictionMandi: { flex: 1 },
  predictionMandiName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  predictionDate: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  predictionPrice: { color: colors.primary, fontSize: 16, fontWeight: '800' },
});

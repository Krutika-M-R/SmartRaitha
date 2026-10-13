import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
import { getMarketDistanceKm } from '../utils/marketDistance';

export default function MarketsScreen({ route }) {
  const { crop, state, location } = route.params;
  const { t } = useLanguage();
  const [prices, setPrices] = useState([]);
  const [marketScope, setMarketScope] = useState('state');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState('');

  const loadPrices = useCallback(async () => {
    setLoading(true);
    setError('');
    setPredictions([]);
    try {
      if (!state) {
        throw new Error('Could not identify your state. Allow location access and reopen market comparison.');
      }
      const result = await priceService.getLivePricesForCrop(crop.name, state);
      result.records.sort((a, b) => {
        const aDistance = getMarketDistanceKm(location, a.mandi);
        const bDistance = getMarketDistanceKm(location, b.mandi);
        if (aDistance != null && bDistance != null) return aDistance - bDistance;
        return Number(b.hasLivePrice) - Number(a.hasLivePrice)
          || a.mandi.name.localeCompare(b.mandi.name);
      });
      setPrices(result.records);
      setMarketScope(result.marketScope);
    } catch (e) {
      setPrices([]);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [crop.name, location, state]);

  useFocusEffect(
    useCallback(() => {
      void loadPrices();
    }, [loadPrices]),
  );

  function getTargetDate() {
    const target = new Date();
    target.setDate(target.getDate() + 2);
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    return `${target.getFullYear()}-${month}-${day}`;
  }

  async function predictTwoDaysAhead() {
    const forecastablePrices = prices.filter((item) => item.hasPrice);
    if (forecastablePrices.length === 0 || predicting) return;
    setPredicting(true);
    setPredictionError('');
    const targetDate = getTargetDate();
    try {
      const result = await predictionService.generatePrediction(
        crop.name,
        state,
        forecastablePrices.map((item) => item.mandi.name),
        targetDate,
      );
      setPredictions(result.predictions);
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
          {prices.some((price) => price.hasPrice) && (
            <PriceBarChart prices={prices.filter((price) => price.hasPrice)} />
          )}
          {prices.some((price) => price.hasPrice) && marketScope === 'state' && (
            <View style={styles.predictionPanel}>
              <Text style={styles.predictionTitle}>{t('futurePrice')}</Text>
              <Text style={styles.predictionSubtitle}>{t('twoDayPrediction')} — {crop.name}</Text>
              <Button title={t('predictTwoDays')} onPress={predictTwoDaysAhead} loading={predicting} />
              <ErrorMessage message={predictionError} />
              {predictions.map((prediction) => (
                <View key={`${prediction.mandiName}-${prediction.predictedDate}`} style={styles.predictionRow}>
                  <View style={styles.predictionMandi}>
                    <Text style={styles.predictionMandiName}>{prediction.mandiName}</Text>
                    <Text style={styles.predictionDate}>{t('predictedOn')}: {prediction.predictedDate}</Text>
                    <Text style={styles.predictionDate}>{prediction.modelVersion}</Text>
                  </View>
                  <Text style={styles.predictionPrice}>₹{Number(prediction.predictedPrice).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
          {prices.length > 0 && !prices.some((price) => price.hasPrice) && (
            <Text style={styles.empty}>
              No Agmarknet report was found in the latest data or saved snapshot for {crop.name} in the listed mandis.
            </Text>
          )}
        </>
      )}
      ListEmptyComponent={(
        <Text style={styles.empty}>
          {marketScope === 'state' ? `${t('noPriceDataForState')} (${state}).` : t('noPriceData')}
        </Text>
      )}
      renderItem={({ item }) => (
        <MandiCard
          mandiName={item.mandi.name}
          modalPrice={item.modalPrice}
          arrivalDate={item.arrivalDate}
          district={item.mandi.district}
          state={item.mandi.state}
          distanceKm={getMarketDistanceKm(location, item.mandi)}
          dataFreshness={item.dataFreshness}
          ageDays={item.ageDays}
        />
      )}
      ListFooterComponent={prices.some((price) => !price.hasLivePrice) ? (
        <Text style={styles.directoryNote}>
          Saved prices are shown when a newer live report is unavailable. Markets without any saved or live report cannot be compared for {crop.name}.
        </Text>
      ) : null}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.large, paddingBottom: spacing.xlarge * 2 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.medium },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xlarge },
  directoryNote: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: spacing.medium },
  predictionPanel: { backgroundColor: '#EAF4EA', borderRadius: 16, padding: spacing.medium, marginBottom: spacing.large },
  predictionTitle: { color: colors.primary, fontSize: 17, fontWeight: '800' },
  predictionSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 3, marginBottom: spacing.medium },
  predictionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 10, padding: spacing.small, marginTop: spacing.small },
  predictionMandi: { flex: 1 },
  predictionMandiName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  predictionDate: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  predictionPrice: { color: colors.primary, fontSize: 16, fontWeight: '800' },
});

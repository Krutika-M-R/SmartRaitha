import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import InputField from '../components/InputField';
import Button from '../components/Button';
import ProfitCard from '../components/ProfitCard';
import ErrorMessage from '../components/ErrorMessage';
import LoadingIndicator from '../components/LoadingIndicator';
import priceService from '../services/priceService';
import profitService from '../services/profitService';
import recommendationService from '../services/recommendationService';
import { getMarketDistanceKm } from '../utils/marketDistance';
import { useLanguage } from '../context/LanguageContext';

export default function ProfitCalculatorScreen({ route }) {
  const { crop, state, location, recommendedMandiId } = route.params;
  const { t } = useLanguage();
  const [mandis, setMandis] = useState([]);
  const [selectedMarketId, setSelectedMarketId] = useState(null);
  const [quantity, setQuantity] = useState('100');
  const [result, setResult] = useState(null);
  const [loadingMandis, setLoadingMandis] = useState(true);
  const [findingBest, setFindingBest] = useState(false);
  const [bestEstimate, setBestEstimate] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMandis();
  }, []);

  async function loadMandis() {
    try {
      if (!state) throw new Error('Could not identify your state. Allow location access and reopen the profit calculator.');
      const result = await priceService.getLivePricesForCrop(crop.name, state);
      const distanceSortedMandis = result.records.slice().sort((a, b) => {
        const aDistance = getMarketDistanceKm(location, a.mandi);
        const bDistance = getMarketDistanceKm(location, b.mandi);
        if (aDistance != null && bDistance != null) return aDistance - bDistance;
        return Number(b.hasLivePrice) - Number(a.hasLivePrice)
          || a.mandi.name.localeCompare(b.mandi.name);
      });
      setMandis(distanceSortedMandis);
      const recommendedMarket = result.records.find((market) => market.id === recommendedMandiId);
      const bestAvailableMarket = result.records.reduce((best, market) => (
        market.hasPrice && (!best || market.modalPrice > best.modalPrice) ? market : best
      ), null);
      if (recommendedMarket || bestAvailableMarket) {
        setSelectedMarketId((recommendedMarket || bestAvailableMarket).id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMandis(false);
    }
  }

  async function findBestProfitMarket() {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a valid quantity before comparing mandi profits.');
      return;
    }
    if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
      setError('Allow location access to compare net profit after transport.');
      return;
    }

    setFindingBest(true);
    setError('');
    try {
      const recommendation = await recommendationService.getRecommendation(
        crop.name,
        state,
        location,
        qty,
      );
      const best = recommendation.recommended;
      if (!best) {
        setBestEstimate(null);
        throw new Error(recommendation.reason || 'No Agmarknet price is available in the latest data or saved snapshot to compare profit.');
      }

      setBestEstimate(best);
      setSelectedMarketId(best.mandi.id);
      setResult(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setFindingBest(false);
    }
  }

  async function handleCalculate() {
    setError('');
    const qty = Number(quantity);
    const selectedMarket = mandis.find((market) => market.id === selectedMarketId);
    if (!selectedMarket || !qty || qty <= 0) {
      setError('Please select a mandi and enter a valid quantity.');
      return;
    }
    if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
      setError('Allow location access to estimate the route and transportation cost.');
      return;
    }
    setCalculating(true);
    setResult(null);
    try {
      const data = await profitService.calculateProfit(
        crop.name,
        selectedMarket.mandi.state || state,
        selectedMarket.mandi.name,
        qty,
        location,
      );
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

        {mandis.length === 0 ? (
          <Text style={styles.emptyMessage}>{t('noLiveMandiPrices')} ({state}).</Text>
        ) : (
          <>
            <Button
              title="Find best mandi by net profit"
              onPress={findBestProfitMarket}
              loading={findingBest}
            />
            {bestEstimate && (
              <Text style={styles.estimateMessage}>
                Best for {quantity} kg: {bestEstimate.mandi.name} — estimated net ₹{Number(bestEstimate.estimatedNetProfit).toFixed(2)}
                {' '}after about {bestEstimate.distanceKm} km road transport.
              </Text>
            )}
            <Text style={styles.label}>{t('selectMandi')}</Text>
            <View style={styles.mandiRow}>
              {mandis.map((mandi) => (
                <Button
                  key={mandi.id}
                  title={[
                    mandi.mandi.name,
                    mandi.mandi.district,
                    mandi.hasPrice
                      ? `₹${Number(mandi.modalPrice).toFixed(2)}/kg${mandi.dataFreshness === 'cached' ? ` · saved ${mandi.ageDays}d ago` : ''}`
                      : 'No price available',
                  ].filter(Boolean).join(' · ')}
                  variant={selectedMarketId === mandi.id ? 'primary' : 'secondary'}
                  disabled={!mandi.hasPrice}
                  onPress={() => {
                    setSelectedMarketId(mandi.id);
                    setResult(null);
                    setError('');
                    setBestEstimate(null);
                  }}
                />
              ))}
            </View>
            <Text style={styles.directoryNote}>
              Only live or saved prices reported for the selected mandi are used for comparison and profit.
            </Text>

            <InputField
              label={t('quantityKg')}
              value={quantity}
              onChangeText={(value) => {
                setQuantity(value);
                setBestEstimate(null);
              }}
              keyboardType="numeric"
              placeholder="e.g. 100"
            />

            <Button title={t('calculateProfit')} onPress={handleCalculate} loading={calculating} />
          </>
        )}

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
  emptyMessage: { color: colors.textSecondary, fontSize: 14, marginVertical: spacing.medium },
  estimateMessage: { color: colors.primary, fontSize: 14, fontWeight: '700', marginVertical: spacing.medium },
  directoryNote: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.medium },
});

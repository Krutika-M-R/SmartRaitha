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
  const {
    crop,
    state,
    location,
    transportMode,
    fuelType,
    transportDetails,
  } = route.params;
  const { t } = useLanguage();
  const [mandis, setMandis] = useState([]);
  const [searchRadiusKm, setSearchRadiusKm] = useState(80);
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
      if (!state) throw new Error(t('noStateForProfit'));
      if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
        throw new Error(t('locationNeededForProfit'));
      }
      const result = await priceService.getLivePricesForCrop(crop.name, state);
      const pricedMandis = result.records.filter((market) => (
        market.hasPrice
        && Number.isFinite(Number(market.modalPrice))
        && Number(market.modalPrice) > 0
      )).map((market) => ({
        ...market,
        searchDistanceKm: getMarketDistanceKm(location, market.mandi),
      })).map((market) => ({
        ...market,
        distanceKm: market.searchDistanceKm == null
          ? null
          : Number(market.searchDistanceKm.toFixed(1)),
      })).filter((market) => market.distanceKm != null);
      const withinDefaultRadius = pricedMandis.filter((market) => market.searchDistanceKm <= 80);
      const radius = withinDefaultRadius.length ? 80 : 100;
      const inRangeMandis = withinDefaultRadius.length
        ? withinDefaultRadius
        : pricedMandis.filter((market) => market.searchDistanceKm <= 100);
      const distanceSortedMandis = inRangeMandis.sort((a, b) => {
        const aDistance = a.searchDistanceKm;
        const bDistance = b.searchDistanceKm;
        return Number(b.hasLivePrice) - Number(a.hasLivePrice)
          || aDistance - bDistance
          || a.mandi.name.localeCompare(b.mandi.name);
      });
      setSearchRadiusKm(radius);
      setMandis(distanceSortedMandis);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMandis(false);
    }
  }

  function getTransportDetails() {
    const hasTransportCost = Number.isFinite(transportDetails?.transportCostPerKm)
      || Number.isFinite(transportDetails?.fixedTransportCost);
    if (!transportMode || (transportMode === 'private' && !fuelType)
      || !hasTransportCost
      || !Number.isFinite(transportDetails?.otherCosts)
      || transportDetails.transportCostPerKm < 0
      || transportDetails.fixedTransportCost < 0
      || transportDetails.otherCosts < 0
      || (transportDetails.transportCostPerKm !== undefined
        && transportDetails.fixedTransportCost !== undefined)) {
      setError(t('completeTransportDetails'));
      return null;
    }
    return transportDetails;
  }

  async function findBestProfitMarket() {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError(t('validQuantityBeforeCompare'));
      return;
    }
    const transportDetails = getTransportDetails();
    if (!transportDetails) return;
    if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
      setError(t('locationNeededForProfit'));
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
        transportDetails,
      );
      const best = recommendation.recommended;
      if (!best) {
        setBestEstimate(null);
        throw new Error(recommendation.reason || t('noComparisonPrices'));
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
      setError(t('selectMandiQuantity'));
      return;
    }
    const transportDetails = getTransportDetails();
    if (!transportDetails) return;
    if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) {
      setError(t('locationNeededForRoute'));
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
        transportDetails,
      );
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCalculating(false);
    }
  }

  const isLocationAvailable = Number.isFinite(location?.latitude)
    && Number.isFinite(location?.longitude);
  const transportDetailsReady = Boolean(
    transportMode
    && (transportMode !== 'private' || fuelType)
    && transportDetails
    && Number.isFinite(transportDetails.otherCosts)
    && transportDetails.otherCosts >= 0
    && ((Number.isFinite(transportDetails.transportCostPerKm)
      && transportDetails.transportCostPerKm >= 0
      && transportDetails.fixedTransportCost === undefined)
      || (Number.isFinite(transportDetails.fixedTransportCost)
        && transportDetails.fixedTransportCost >= 0
        && transportDetails.transportCostPerKm === undefined)),
  );

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
          <Text style={styles.emptyMessage}>
            {t('noMandiWithinRadius', { radius: 100 })} ({state}).
          </Text>
        ) : (
          <>
            <Text style={styles.directoryNote}>
              {t('mandiSearchRadius', { radius: searchRadiusKm })}
            </Text>
            {transportDetailsReady ? (
              <Text style={styles.directoryNote}>
                {t('selectedTransportSummary', {
                  mode: transportMode === 'private'
                    ? t('privateVehicle')
                    : transportMode === 'public'
                    ? t('publicTransport')
                    : t('rentVehicle'),
                  fuel: transportMode === 'private'
                    ? ` (${t(fuelType)})`
                    : transportMode === 'public'
                    ? ` (${t('train')})`
                    : '',
                })}
              </Text>
            ) : (
              <Text style={styles.directoryNote}>{t('selectTransportForRecommendation')}</Text>
            )}
            <Button
              title={t('findBestMandiProfit')}
              onPress={findBestProfitMarket}
              loading={findingBest}
              disabled={!transportDetailsReady || !quantity.trim()
                || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0
                || !isLocationAvailable}
            />
            {bestEstimate && (
              <Text style={styles.estimateMessage}>
                {t('bestForQuantity', {
                  quantity,
                  mandi: bestEstimate.mandi.name,
                  profit: Number(bestEstimate.estimatedNetProfit).toFixed(2),
                  distance: bestEstimate.distanceKm,
                  price: Number(bestEstimate.modalPrice).toFixed(2),
                })}
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
                    t('aboutDistanceAway', { distance: mandi.distanceKm }),
                    mandi.hasPrice
                      ? `₹${Number(mandi.modalPrice).toFixed(2)}/kg${mandi.dataFreshness === 'cached' ? ` · ${t('savedDaysAgo', { days: mandi.ageDays })}` : ''}`
                      : t('noPriceAvailable'),
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
              {t('marketComparisonDisclaimer')}
            </Text>

            <InputField
              label={t('quantityKg')}
              value={quantity}
              onChangeText={(value) => {
                setQuantity(value);
                setBestEstimate(null);
              }}
              keyboardType="numeric"
              placeholder={t('exampleQuantity')}
            />

            <Button
              title={t('calculateProfit')}
              onPress={handleCalculate}
              loading={calculating}
              disabled={!transportDetailsReady || !quantity.trim()
                || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0
                || !selectedMarketId || !isLocationAvailable}
            />
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

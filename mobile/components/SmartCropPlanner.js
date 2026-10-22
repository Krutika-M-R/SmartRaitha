import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import cropPlannerService from '../services/cropPlannerService';
import { useLanguage } from '../context/LanguageContext';

const SOILS = [
  { id: 'red', label: 'Red' },
  { id: 'black', label: 'Black' },
  { id: 'clay', label: 'Clay' },
  { id: 'sandy', label: 'Sandy' },
  { id: 'loamy', label: 'Loamy' },
  { id: 'alluvial', label: 'Alluvial' },
];

const IRRIGATION = [
  { id: 'rainfed', label: 'Rain-fed' },
  { id: 'borewell', label: 'Borewell' },
  { id: 'canal', label: 'Canal' },
  { id: 'drip', label: 'Drip' },
];

function getNextSixMonthPeriods(language, t) {
  const now = new Date();
  const locale = language === 'kn' ? 'kn-IN' : 'en-IN';
  return Array.from({ length: 2 }, (_, index) => {
    const startDate = new Date(now.getFullYear(), now.getMonth() + index * 3 + 1, 1);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 2, 1);
    const yearLabel = startDate.getFullYear() === endDate.getFullYear()
      ? String(startDate.getFullYear())
      : `${startDate.getFullYear()}–${String(endDate.getFullYear()).slice(-2)}`;
    return {
      month: startDate.getMonth() + 1,
      year: startDate.getFullYear(),
      startDate,
      endDate,
      label: `${startDate.toLocaleDateString(locale, { month: 'short' })}–${endDate.toLocaleDateString(locale, { month: 'short' })}`,
      yearLabel,
      accessibilityLabel: `${startDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })} ${t('to')} ${endDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`,
    };
  });
}

function formatMoney(value) {
  return `${value < 0 ? '-₹' : '₹'}${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function localizePlannerReason(reason, t) {
  const rainfallWithinRange = reason.match(/^Historical rainfall for this month averages (\d+) mm/);
  if (rainfallWithinRange) return t('reasonRainfallFits', { rainfall: rainfallWithinRange[1] });

  const rainfallNeedsAttention = reason.match(/^Historical rainfall averages (\d+) mm/);
  if (rainfallNeedsAttention) return t('reasonCheckWater', { rainfall: rainfallNeedsAttention[1] });

  const temperatureInRange = reason.match(/^The historical monthly mean temperature \(([\d.]+)°C\)/);
  if (temperatureInRange) return t('reasonTemperatureFits', { temperature: temperatureInRange[1] });

  const reasonKeys = {
    'The selected month matches a common sowing window for this crop.': 'reasonSowingWindow',
    'This month is outside the crop’s main sowing window.': 'reasonOutsideSowingWindow',
    'Irrigation can help offset the lower historical rainfall.': 'reasonIrrigationOffsetsRain',
    'Historical monthly temperature is outside the crop’s preferred planning range.': 'reasonTemperatureOutside',
    'Soil match is not included until you select a soil type.': 'reasonSoilNotSelected',
    'The selected soil type is suitable for this crop.': 'reasonSoilSuitable',
    'The selected soil type is less suitable; consider a local soil test and expert advice.': 'reasonSoilLessSuitable',
    'This crop needs reliable water; rain-fed cultivation may be risky.': 'reasonReliableWater',
    'Your irrigation selection supports this crop’s water needs.': 'reasonIrrigationSupports',
    'This crop matches your selected preferences.': 'reasonPreferenceMatch',
  };
  return t(reasonKeys[reason] || 'generalCropSuitability');
}

function formatDate(value, language) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString(language === 'kn' ? 'kn-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function SelectionChip({ label, selected, onPress, accessibilityLabel }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel || label}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PriceTrend({ trend, t, language }) {
  if (!trend?.length) {
    return <Text style={styles.muted}>{t('noNearbyPriceHistory')}</Text>;
  }
  const highest = Math.max(...trend.map((item) => item.modalPricePerKg), 1);

  return (
    <View style={styles.trendWrap}>
      {trend.map((item) => {
        const date = new Date(`${item.month}-01T12:00:00Z`);
        const label = date.toLocaleDateString(language === 'kn' ? 'kn-IN' : 'en-IN', { month: 'short', timeZone: 'UTC' });
        return (
          <View key={item.month} style={styles.trendColumn}>
            <Text style={styles.trendPrice}>₹{item.modalPricePerKg.toFixed(0)}</Text>
            <View style={styles.trendBarTrack}>
              <View style={[styles.trendBar, { height: `${Math.max(8, (item.modalPricePerKg / highest) * 100)}%` }]} />
            </View>
            <Text style={styles.trendMonth}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function CropPlanCard({ item, index, farmSizeAcres, t, language }) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const duration = t('dayRange', { start: item.durationDays[0], end: item.durationDays[1] });
  const finance = item.market?.finance;
  const profitRange = finance?.potentialProfitInr;
  const bestCrop = index === 0;

  return (
    <View style={[styles.cropCard, bestCrop && styles.bestCropCard]}>
      <View style={styles.cropTopRow}>
        <View style={styles.cropIdentity}>
          <View style={[styles.cropImage, bestCrop && styles.bestCropImage]}>
            <Text style={styles.cropEmoji}>{item.image}</Text>
          </View>
          <View style={styles.cropTitleGroup}>
            <View style={styles.cropTitleRow}>
              <Text style={styles.cropName}>{item.crop}</Text>
              {bestCrop && <Text style={styles.bestBadge}>{t('bestMatch')}</Text>}
            </View>
            <Text style={styles.score}>{item.score}<Text style={styles.scoreOutOf}>{t('fitScore')}</Text></Text>
          </View>
        </View>
        <Ionicons name="leaf" size={20} color={bestCrop ? colors.primary : '#86A98A'} />
      </View>

      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${item.score}%` }]} />
      </View>
      <View style={styles.cropFacts}>
        <View style={styles.fact}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text style={styles.factText}>{t('growTime')}{"\n"}{duration}</Text>
        </View>
        <View style={styles.fact}>
          <Ionicons name="water-outline" size={16} color={colors.primary} />
          <Text style={styles.factText}>{t('water')}{"\n"}{t({
            Low: 'waterLow',
            Medium: 'waterMedium',
            High: 'waterHigh',
            'Low to medium': 'waterLowMedium',
          }[item.waterNeeds] || 'waterMedium')}</Text>
        </View>
        <View style={styles.fact}>
          <Ionicons name="scale-outline" size={16} color={colors.primary} />
          <Text style={styles.factText}>{t('yieldPerAcre')}{"\n"}{item.yieldKgPerAcre[0].toLocaleString(language === 'kn' ? 'kn-IN' : 'en-IN')}–{item.yieldKgPerAcre[1].toLocaleString(language === 'kn' ? 'kn-IN' : 'en-IN')} kg</Text>
        </View>
      </View>

      <View style={styles.timeline}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>{t('sowingToHarvest')}</Text>
          <Text style={styles.timelineDuration}>{duration}</Text>
        </View>
        <View style={styles.timelineTrack}>
          <View style={styles.timelineProgress} />
          <View style={styles.timelineStart}><View style={styles.timelineDot} /></View>
          <View style={styles.timelineEnd}><View style={[styles.timelineDot, styles.harvestDot]} /></View>
        </View>
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineLabel}>{t('sow')} {formatDate(item.sowingDate, language)}</Text>
          <Text style={styles.timelineLabel}>{t('harvest', { date: formatDate(item.harvestDate, language) })}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.detailsToggle}
        onPress={() => setDetailsVisible((visible) => !visible)}
        accessibilityRole="button"
        accessibilityState={{ expanded: detailsVisible }}
      >
        <Text style={styles.detailsToggleText}>{detailsVisible ? t('hideCropDetails') : t('viewCropDetails')}</Text>
        <Ionicons name={detailsVisible ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
      </TouchableOpacity>
      {detailsVisible && (
        <View style={styles.expandedDetails}>
          <Text style={styles.detailTitle}>{t('suitableSoil')}</Text>
          <Text style={styles.financeNote}>{(item.soilTypes || []).map((soil) => t(`soil${soil[0].toUpperCase()}${soil.slice(1)}`)).join(', ') || t('checkLocalAgricultureExpert')}</Text>
          <Text style={[styles.detailTitle, styles.expandedTitle]}>{t('suitableIrrigation')}</Text>
          <Text style={styles.financeNote}>{(item.irrigationTypes || []).map((type) => ({
            rainfed: t('irrigationRainfed'),
            borewell: t('irrigationBorewell'),
            canal: t('irrigationCanal'),
            drip: t('irrigationDrip'),
          }[type] || type)).join(', ') || t('chooseWaterAvailability')}</Text>
          <Text style={[styles.detailTitle, styles.expandedTitle]}>{t('whyCropMatches')}</Text>
          <Text style={styles.financeNote}>{item.reasons.slice(0, 3).map((reason) => localizePlannerReason(reason, t)).join(' ')}</Text>

          <View style={styles.marketSection}>
            <View style={styles.marketTitleRow}>
              <Text style={styles.detailTitle}>{t('nearbyMandiTrend')}</Text>
              {item.market?.latestPricePerKg != null && (
                <Text style={styles.latestPrice}>₹{item.market.latestPricePerKg.toFixed(2)}/kg</Text>
              )}
            </View>
            {item.market?.mandi && (
              <Text style={styles.marketSubtext}>{t('latestAt', { mandi: item.market.mandi, date: item.market.latestPriceDate })}</Text>
            )}
            <PriceTrend trend={item.market?.trend} t={t} language={language} />
          </View>

          <View style={styles.financeCard}>
            <View style={styles.financeHeading}>
              <Ionicons name="calculator-outline" size={17} color={colors.primary} />
              <Text style={styles.detailTitle}>{t('planningEstimate', {
                size: farmSizeAcres,
                plural: farmSizeAcres === 1 ? '' : 's',
              })}</Text>
            </View>
            <Text style={styles.financeRow}>
              {t('cultivationCost')}: {formatMoney(item.cultivationCostInrPerAcre[0] * farmSizeAcres)}–{formatMoney(item.cultivationCostInrPerAcre[1] * farmSizeAcres)}
            </Text>
            {finance ? (
              <>
                <Text style={styles.financeRow}>
                  {t('potentialProfit')}: {formatMoney(profitRange[0])}–{formatMoney(profitRange[1])}
                </Text>
                <Text style={styles.financeNote}>
                  {t('plannerFinanceDisclaimer')}
                </Text>
              </>
            ) : (
              <Text style={styles.financeNote}>
                {t('plannerProfitDataMissing')}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function SmartCropPlanner({ location, locationError, crops = [] }) {
  const { language, t, localize } = useLanguage();
  const periods = useMemo(() => getNextSixMonthPeriods(language, t), [language]);
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]);
  const [soilType, setSoilType] = useState('unknown');
  const [irrigation, setIrrigation] = useState('rainfed');
  const [farmSize, setFarmSize] = useState(1);
  const [farmSizeInput, setFarmSizeInput] = useState('1');
  const [preferredCropIds, setPreferredCropIds] = useState([]);
  const [plannerLocation, setPlannerLocation] = useState(location || null);
  const [locationInput, setLocationInput] = useState(location?.placeName || '');
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationEditError, setLocationEditError] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const introProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (location && !plannerLocation) {
      setPlannerLocation(location);
      setLocationInput(location.placeName || '');
    }
  }, [location, plannerLocation]);

  useEffect(() => {
    const animation = Animated.spring(introProgress, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 5,
    });
    animation.start();
    return () => animation.stop();
  }, [introProgress]);

  useEffect(() => {
    if (!plannerLocation) {
      setPlan(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError('');
    cropPlannerService.getPlan({
      location: plannerLocation,
      month: selectedPeriod.month,
      year: selectedPeriod.year,
      soilType,
      irrigation,
      farmSizeAcres: farmSize,
      preferredCropIds,
    })
      .then((data) => {
        if (active) setPlan(data);
      })
      .catch((requestError) => {
        if (active) {
          setPlan(null);
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [farmSize, irrigation, plannerLocation, preferredCropIds, selectedPeriod, soilType]);

  function togglePreferredCrop(cropId) {
    setPreferredCropIds((current) => current.includes(cropId)
      ? current.filter((id) => id !== cropId)
      : [...current, cropId]);
  }

  async function updatePlannerLocation() {
    const query = locationInput.trim();
    if (!query) {
      setLocationEditError(t('enterTown'));
      return;
    }
    setLocationBusy(true);
    setLocationEditError('');
    try {
      const matches = await Location.geocodeAsync(query);
      if (!matches.length) {
        setLocationEditError(t('placeNotFound'));
        return;
      }
      const match = matches[0];
      setPlannerLocation({ latitude: match.latitude, longitude: match.longitude, placeName: query });
    } catch (geocodeError) {
      setLocationEditError(geocodeError.message || t('placeNotFound'));
    } finally {
      setLocationBusy(false);
    }
  }

  function commitFarmSize() {
    const value = Number(farmSizeInput);
    if (Number.isFinite(value) && value > 0 && value <= 10000) {
      setFarmSize(value);
      setFarmSizeInput(String(value));
    } else {
      setFarmSizeInput(String(farmSize));
    }
  }

  const bestScore = plan?.recommendations?.[0]?.score;
  const introStyle = {
    opacity: introProgress,
    transform: [{ translateY: introProgress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <Animated.View style={[styles.container, introStyle]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="leaf" size={22} color={colors.primary} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{t('plannerEyebrow')}</Text>
          <Text style={styles.title}>{t('cropPlannerTitle')}</Text>
          <Text style={styles.subtitle}>{t('plannerSubtitle')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('choosePlanningPeriod')}</Text>
          <Text style={styles.sectionHint}>{t('planStartsFirstMonth')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthRow}>
          {periods.map((period, index) => {
            const selected = period.month === selectedPeriod.month && period.year === selectedPeriod.year;
            return (
              <TouchableOpacity
                key={`${period.year}-${period.month}`}
                onPress={() => setSelectedPeriod(period)}
                style={[styles.monthCard, selected && styles.monthCardSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={period.accessibilityLabel}
              >
                <Text style={[styles.monthNumber, selected && styles.monthTextSelected]}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={[styles.monthLabel, selected && styles.monthTextSelected]}>{period.label}</Text>
                <Text style={[styles.monthYear, selected && styles.monthTextSelected]}>{period.yearLabel}</Text>
                {selected && <View style={styles.monthSelectedDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('farmDetails')}</Text>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.fieldLabel}>{t('location')}</Text>
        <View style={styles.locationRow}>
          <TextInput
            style={styles.locationInput}
            value={locationInput}
            onChangeText={setLocationInput}
            placeholder={plannerLocation?.placeName || t('locationPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={updatePlannerLocation}
          />
          <TouchableOpacity style={styles.locationButton} onPress={updatePlannerLocation} disabled={locationBusy}>
            {locationBusy
              ? <ActivityIndicator color={colors.surface} size="small" />
              : <Ionicons name="search" size={18} color={colors.surface} />}
          </TouchableOpacity>
        </View>
        {locationEditError ? <Text style={styles.errorText}>{locationEditError}</Text> : null}
        {plannerLocation?.placeName ? <Text style={styles.locationCaption}>{t('planningFor', { place: plannerLocation.placeName })}</Text> : null}

        <View style={styles.farmSizeRow}>
          <Text style={styles.fieldLabel}>{t('farmSize')}</Text>
          <View style={styles.acreInputWrap}>
            <TextInput
              style={styles.acreInput}
              value={farmSizeInput}
              onChangeText={setFarmSizeInput}
              keyboardType="decimal-pad"
              onEndEditing={commitFarmSize}
              accessibilityLabel={t('farmSizeAccessibility')}
            />
            <Text style={styles.acreUnit}>{t('acres')}</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>{t('soilType')}</Text>
        <View style={styles.chipRow}>
          <SelectionChip label={t('notSure')} selected={soilType === 'unknown'} onPress={() => setSoilType('unknown')} />
          {SOILS.map((soil) => (
            <SelectionChip key={soil.id} label={t(`soil${soil.id[0].toUpperCase()}${soil.id.slice(1)}`)} selected={soilType === soil.id} onPress={() => setSoilType(soil.id)} />
          ))}
        </View>

        <Text style={styles.fieldLabel}>{t('irrigation')}</Text>
        <View style={styles.chipRow}>
          {IRRIGATION.map((option) => (
            <SelectionChip key={option.id} label={t(`irrigation${option.id[0].toUpperCase()}${option.id.slice(1)}`)} selected={irrigation === option.id} onPress={() => setIrrigation(option.id)} />
          ))}
        </View>

        <Text style={styles.fieldLabel}>{t('cropPreferences')} <Text style={styles.optional}>{t('optional')}</Text></Text>
        <View style={styles.chipRow}>
          {crops.map((crop) => (
            <SelectionChip
              key={crop.id}
              label={crop.name}
              selected={preferredCropIds.includes(crop.id)}
              onPress={() => togglePreferredCrop(crop.id)}
            />
          ))}
        </View>
      </View>

      {plan?.climate && (
        <View style={styles.climateStrip}>
          <View style={styles.climateIcon}><Ionicons name="partly-sunny-outline" size={20} color={colors.primary} /></View>
          <View style={styles.climateCopy}>
            <Text style={styles.climateTitle}>
              {t('climate', {
                region: plan.region,
                date: selectedPeriod.startDate.toLocaleDateString(language === 'kn' ? 'kn-IN' : 'en-IN', { month: 'short', year: 'numeric' }),
              })}
            </Text>
            <Text style={styles.climateDetail}>
              {t('climateDetail', {
                rain: Math.round(plan.climate.rainfallMm),
                temperature: plan.climate.temperatureC.toFixed(1),
                years: plan.climate.years,
              })}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t('topCrops', { period: selectedPeriod.label })}</Text>
          <Text style={styles.sectionHint}>{t('rankedBy')}</Text>
        </View>
        {bestScore != null && <Text style={styles.bestFit}>{t('bestFit', { score: bestScore })}</Text>}
      </View>

      {!plannerLocation ? (
        <Text style={styles.errorPanel}>{locationError ? t(locationError) : t('allowLocationOrSearch')}</Text>
      ) : loading ? (
        <View style={styles.loadingPanel}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{t('checkingClimate')}</Text>
        </View>
      ) : error ? (
        <Text style={styles.errorPanel}>{localize(error)}</Text>
      ) : plan?.recommendations?.length ? (
        <>
          {plan.recommendations.map((item, index) => (
            <CropPlanCard
              key={item.cropId}
              item={item}
              index={index}
              farmSizeAcres={farmSize}
              t={t}
              language={language}
            />
          ))}
          <Text style={styles.disclaimer}>{plan.estimatesNote}</Text>
        </>
      ) : (
        <Text style={styles.errorPanel}>{t('noCropProfiles')}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#DDEBDD',
    borderRadius: 22,
    padding: spacing.medium,
    marginBottom: spacing.large,
    shadowColor: '#1F5C2B',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.large },
  headerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E7F3E8', alignItems: 'center', justifyContent: 'center', marginRight: spacing.small },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 3 },
  subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 4 },
  section: { marginBottom: spacing.medium },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  sectionHint: { color: colors.textSecondary, fontSize: 11 },
  monthRow: { gap: spacing.small, paddingVertical: spacing.medium, paddingRight: spacing.small },
  monthCard: { width: 116, minHeight: 90, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F5F8F3', borderWidth: 1, borderColor: '#E4EAE2', padding: spacing.small },
  monthCardSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthNumber: { color: '#9AA79A', fontSize: 10, fontWeight: '900' },
  monthLabel: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 3 },
  monthYear: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  monthTextSelected: { color: colors.surface },
  monthSelectedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#B7E3B9', position: 'absolute', right: 9, top: 9 },
  settingsCard: { backgroundColor: '#F7FAF6', borderRadius: 16, borderWidth: 1, borderColor: '#E4EBE2', padding: spacing.medium, marginBottom: spacing.medium },
  fieldLabel: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: spacing.medium, marginBottom: spacing.small },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationInput: { flex: 1, minHeight: 42, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.medium, color: colors.text, fontSize: 13 },
  locationButton: { width: 42, height: 42, marginLeft: spacing.small, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  locationCaption: { color: colors.primary, fontSize: 11, marginTop: 5, fontWeight: '600' },
  errorText: { color: colors.error, fontSize: 11, marginTop: 5 },
  farmSizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  acreInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  acreInput: { minWidth: 54, paddingHorizontal: 10, paddingVertical: 7, textAlign: 'right', color: colors.text, fontWeight: '700' },
  acreUnit: { color: colors.textSecondary, fontSize: 11, paddingRight: spacing.small },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: '#DBE5D9', borderRadius: 18, backgroundColor: colors.surface, paddingHorizontal: 11, paddingVertical: 7 },
  chipSelected: { backgroundColor: '#E5F2E5', borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  chipTextSelected: { color: colors.primary },
  optional: { color: colors.textSecondary, fontWeight: '400' },
  climateStrip: { flexDirection: 'row', alignItems: 'center', padding: spacing.medium, borderRadius: 14, backgroundColor: '#EBF5EA', marginBottom: spacing.large },
  climateIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.small },
  climateCopy: { flex: 1 },
  climateTitle: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  climateDetail: { color: colors.textSecondary, fontSize: 11, lineHeight: 15, marginTop: 3 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.medium },
  bestFit: { color: colors.primary, backgroundColor: '#E7F3E8', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6, fontSize: 10, fontWeight: '900' },
  loadingPanel: { alignItems: 'center', paddingVertical: spacing.large },
  loadingText: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.small },
  errorPanel: { color: colors.error, backgroundColor: '#FFF2F0', borderRadius: 12, padding: spacing.medium, fontSize: 12, lineHeight: 18 },
  cropCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.medium, marginBottom: spacing.medium },
  bestCropCard: { borderColor: '#8DC591', backgroundColor: '#FCFFFB' },
  cropTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cropIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cropImage: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#F1F5E9', alignItems: 'center', justifyContent: 'center', marginRight: spacing.small },
  bestCropImage: { backgroundColor: '#E3F2E1' },
  cropEmoji: { fontSize: 27 },
  cropTitleGroup: { flex: 1 },
  cropTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  cropName: { color: colors.text, fontSize: 17, fontWeight: '900' },
  bestBadge: { color: colors.primary, backgroundColor: '#E3F2E1', borderRadius: 8, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, fontSize: 8, fontWeight: '900' },
  score: { color: colors.primary, fontSize: 13, fontWeight: '900', marginTop: 3 },
  scoreOutOf: { color: colors.textSecondary, fontSize: 10, fontWeight: '600' },
  scoreTrack: { height: 6, backgroundColor: '#E8EEE6', borderRadius: 4, marginTop: spacing.medium, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  explanation: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: spacing.small },
  detailsToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.medium, paddingVertical: spacing.small, borderTopWidth: 1, borderTopColor: '#E8EEE6' },
  detailsToggleText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  expandedDetails: { paddingTop: spacing.small },
  expandedTitle: { marginTop: spacing.medium },
  cropFacts: { flexDirection: 'row', justifyContent: 'space-between', gap: 5, backgroundColor: '#F7FAF6', borderRadius: 12, padding: spacing.small, marginTop: spacing.medium },
  fact: { flex: 1, alignItems: 'center' },
  factText: { color: colors.text, textAlign: 'center', fontSize: 9, lineHeight: 13, marginTop: 4 },
  timeline: { marginTop: spacing.medium, paddingHorizontal: 2 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  timelineDuration: { color: colors.textSecondary, fontSize: 10 },
  timelineTrack: { height: 24, justifyContent: 'center', marginTop: 3 },
  timelineProgress: { height: 5, backgroundColor: '#D9E8D8', borderRadius: 3 },
  timelineStart: { position: 'absolute', left: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: '#E5F2E5', alignItems: 'center', justifyContent: 'center' },
  timelineEnd: { position: 'absolute', right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF1D9', alignItems: 'center', justifyContent: 'center' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  harvestDot: { backgroundColor: colors.accent },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineLabel: { color: colors.textSecondary, fontSize: 9 },
  marketSection: { marginTop: spacing.medium, paddingTop: spacing.medium, borderTopWidth: 1, borderTopColor: '#E9EEE7' },
  marketTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  latestPrice: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  marketSubtext: { color: colors.textSecondary, fontSize: 9, marginTop: 3 },
  trendWrap: { height: 82, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: 8, paddingHorizontal: 3 },
  trendColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  trendPrice: { color: colors.textSecondary, fontSize: 8, marginBottom: 3 },
  trendBarTrack: { height: 45, width: 13, justifyContent: 'flex-end', borderRadius: 6, backgroundColor: '#F1F5EF', overflow: 'hidden' },
  trendBar: { width: '100%', borderRadius: 6, backgroundColor: '#67A96D' },
  trendMonth: { color: colors.textSecondary, fontSize: 8, marginTop: 4 },
  muted: { color: colors.textSecondary, fontSize: 10, marginTop: spacing.small },
  financeCard: { backgroundColor: '#F6F9F4', borderRadius: 12, padding: spacing.small, marginTop: spacing.medium },
  financeHeading: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  financeRow: { color: colors.text, fontSize: 10, lineHeight: 15, marginTop: 5 },
  financeNote: { color: colors.textSecondary, fontSize: 9, lineHeight: 14, marginTop: 5 },
  disclaimer: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, marginBottom: spacing.medium, fontStyle: 'italic' },
});

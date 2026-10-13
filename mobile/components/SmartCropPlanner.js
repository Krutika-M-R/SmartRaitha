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

function getNextSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index + 1, 1);
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      date,
      label: date.toLocaleDateString(undefined, { month: 'short' }),
      yearLabel: date.getFullYear(),
    };
  });
}

function formatMoney(value) {
  return `${value < 0 ? '-₹' : '₹'}${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatDate(value) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString(undefined, {
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

function PriceTrend({ trend }) {
  if (!trend?.length) {
    return <Text style={styles.muted}>No nearby verified ₹/kg market history yet.</Text>;
  }
  const highest = Math.max(...trend.map((item) => item.modalPricePerKg), 1);

  return (
    <View style={styles.trendWrap}>
      {trend.map((item) => {
        const date = new Date(`${item.month}-01T12:00:00Z`);
        const label = date.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
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

function CropPlanCard({ item, index, farmSizeAcres }) {
  const duration = `${item.durationDays[0]}–${item.durationDays[1]} days`;
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
              {bestCrop && <Text style={styles.bestBadge}>BEST MATCH</Text>}
            </View>
            <Text style={styles.score}>{item.score}<Text style={styles.scoreOutOf}> / 100 fit</Text></Text>
          </View>
        </View>
        <Ionicons name="leaf" size={20} color={bestCrop ? colors.primary : '#86A98A'} />
      </View>

      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${item.score}%` }]} />
      </View>
      <Text style={styles.explanation}>{item.reasons.slice(0, 3).join(' ')}</Text>

      <View style={styles.cropFacts}>
        <View style={styles.fact}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text style={styles.factText}>Grow time{"\n"}{duration}</Text>
        </View>
        <View style={styles.fact}>
          <Ionicons name="water-outline" size={16} color={colors.primary} />
          <Text style={styles.factText}>Water{"\n"}{item.waterNeeds}</Text>
        </View>
        <View style={styles.fact}>
          <Ionicons name="scale-outline" size={16} color={colors.primary} />
          <Text style={styles.factText}>Yield / acre{"\n"}{item.yieldKgPerAcre[0].toLocaleString('en-IN')}–{item.yieldKgPerAcre[1].toLocaleString('en-IN')} kg</Text>
        </View>
      </View>

      <View style={styles.timeline}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>Sowing to harvest</Text>
          <Text style={styles.timelineDuration}>{duration}</Text>
        </View>
        <View style={styles.timelineTrack}>
          <View style={styles.timelineProgress} />
          <View style={styles.timelineStart}><View style={styles.timelineDot} /></View>
          <View style={styles.timelineEnd}><View style={[styles.timelineDot, styles.harvestDot]} /></View>
        </View>
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineLabel}>Sow {formatDate(item.sowingDate)}</Text>
          <Text style={styles.timelineLabel}>Harvest ~{formatDate(item.harvestDate)}</Text>
        </View>
      </View>

      <View style={styles.marketSection}>
        <View style={styles.marketTitleRow}>
          <Text style={styles.detailTitle}>Nearby mandi trend</Text>
          {item.market?.latestPricePerKg != null && (
            <Text style={styles.latestPrice}>₹{item.market.latestPricePerKg.toFixed(2)}/kg</Text>
          )}
        </View>
        {item.market?.mandi && (
          <Text style={styles.marketSubtext}>Latest at {item.market.mandi} · {item.market.latestPriceDate}</Text>
        )}
        <PriceTrend trend={item.market?.trend} />
      </View>

      <View style={styles.financeCard}>
        <View style={styles.financeHeading}>
          <Ionicons name="calculator-outline" size={17} color={colors.primary} />
          <Text style={styles.detailTitle}>Planning estimate · {farmSizeAcres} acre{farmSizeAcres === 1 ? '' : 's'}</Text>
        </View>
        <Text style={styles.financeRow}>
          Cultivation cost: {formatMoney(item.cultivationCostInrPerAcre[0] * farmSizeAcres)}–{formatMoney(item.cultivationCostInrPerAcre[1] * farmSizeAcres)}
        </Text>
        {finance ? (
          <>
            <Text style={styles.financeRow}>
              Potential profit: {formatMoney(profitRange[0])}–{formatMoney(profitRange[1])}
            </Text>
            <Text style={styles.financeNote}>
              Uses a nearby recorded mandi price and the planner’s indicative yield/cost ranges. Actual results vary.
            </Text>
          </>
        ) : (
          <Text style={styles.financeNote}>
            Profit needs a nearby mandi record with a verified ₹/kg unit. Import current market data to calculate it.
          </Text>
        )}
      </View>
    </View>
  );
}

export default function SmartCropPlanner({ location, locationError, crops = [] }) {
  const months = useMemo(() => getNextSixMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState(months[0]);
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
      month: selectedMonth.month,
      year: selectedMonth.year,
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
  }, [farmSize, irrigation, plannerLocation, preferredCropIds, selectedMonth, soilType]);

  function togglePreferredCrop(cropId) {
    setPreferredCropIds((current) => current.includes(cropId)
      ? current.filter((id) => id !== cropId)
      : [...current, cropId]);
  }

  async function updatePlannerLocation() {
    const query = locationInput.trim();
    if (!query) {
      setLocationEditError('Enter a town, village, or district.');
      return;
    }
    setLocationBusy(true);
    setLocationEditError('');
    try {
      const matches = await Location.geocodeAsync(query);
      if (!matches.length) {
        setLocationEditError('Could not find that place. Try a nearby town or district.');
        return;
      }
      const match = matches[0];
      setPlannerLocation({ latitude: match.latitude, longitude: match.longitude, placeName: query });
    } catch (geocodeError) {
      setLocationEditError(geocodeError.message || 'Could not find that place.');
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
          <Text style={styles.eyebrow}>PLAN WITH CONFIDENCE</Text>
          <Text style={styles.title}>Smart 6-Month Crop Planner</Text>
          <Text style={styles.subtitle}>Seasonal fit, local climate and nearby mandi records in one place.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Choose a sowing month</Text>
          <Text style={styles.sectionHint}>Next 6 months</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthRow}>
          {months.map((month, index) => {
            const selected = month.month === selectedMonth.month && month.year === selectedMonth.year;
            return (
              <TouchableOpacity
                key={`${month.year}-${month.month}`}
                onPress={() => setSelectedMonth(month)}
                style={[styles.monthCard, selected && styles.monthCardSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${month.label} ${month.yearLabel}`}
              >
                <Text style={[styles.monthNumber, selected && styles.monthTextSelected]}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={[styles.monthLabel, selected && styles.monthTextSelected]}>{month.label}</Text>
                <Text style={[styles.monthYear, selected && styles.monthTextSelected]}>{month.yearLabel}</Text>
                {selected && <View style={styles.monthSelectedDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Your farm details</Text>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.fieldLabel}>Location</Text>
        <View style={styles.locationRow}>
          <TextInput
            style={styles.locationInput}
            value={locationInput}
            onChangeText={setLocationInput}
            placeholder={plannerLocation?.placeName || 'Town, village, or district'}
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
        {plannerLocation?.placeName ? <Text style={styles.locationCaption}>Planning for {plannerLocation.placeName}</Text> : null}

        <View style={styles.farmSizeRow}>
          <Text style={styles.fieldLabel}>Farm size</Text>
          <View style={styles.acreInputWrap}>
            <TextInput
              style={styles.acreInput}
              value={farmSizeInput}
              onChangeText={setFarmSizeInput}
              keyboardType="decimal-pad"
              onEndEditing={commitFarmSize}
              accessibilityLabel="Farm size in acres"
            />
            <Text style={styles.acreUnit}>acres</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Soil type</Text>
        <View style={styles.chipRow}>
          <SelectionChip label="Not sure" selected={soilType === 'unknown'} onPress={() => setSoilType('unknown')} />
          {SOILS.map((soil) => (
            <SelectionChip key={soil.id} label={soil.label} selected={soilType === soil.id} onPress={() => setSoilType(soil.id)} />
          ))}
        </View>

        <Text style={styles.fieldLabel}>Irrigation</Text>
        <View style={styles.chipRow}>
          {IRRIGATION.map((option) => (
            <SelectionChip key={option.id} label={option.label} selected={irrigation === option.id} onPress={() => setIrrigation(option.id)} />
          ))}
        </View>

        <Text style={styles.fieldLabel}>Crop preferences <Text style={styles.optional}>(optional)</Text></Text>
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
            <Text style={styles.climateTitle}>{plan.region} · {selectedMonth.label} climate</Text>
            <Text style={styles.climateDetail}>
              {Math.round(plan.climate.rainfallMm)} mm average rain · {plan.climate.temperatureC.toFixed(1)}°C mean · {plan.climate.years}-year history
            </Text>
          </View>
        </View>
      )}

      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.sectionTitle}>Top 3 crops for {selectedMonth.label}</Text>
          <Text style={styles.sectionHint}>Ranked against your farm details</Text>
        </View>
        {bestScore != null && <Text style={styles.bestFit}>{bestScore}% best fit</Text>}
      </View>

      {!plannerLocation ? (
        <Text style={styles.errorPanel}>{locationError || 'Allow location access or search for your town to build a plan.'}</Text>
      ) : loading ? (
        <View style={styles.loadingPanel}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Checking seasonal climate and nearby mandi data…</Text>
        </View>
      ) : error ? (
        <Text style={styles.errorPanel}>{error}</Text>
      ) : plan?.recommendations?.length ? (
        <>
          {plan.recommendations.map((item, index) => (
            <CropPlanCard
              key={item.cropId}
              item={item}
              index={index}
              farmSizeAcres={farmSize}
            />
          ))}
          <Text style={styles.disclaimer}>{plan.estimatesNote}</Text>
        </>
      ) : (
        <Text style={styles.errorPanel}>No crop profiles are available for this location yet.</Text>
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
  monthCard: { width: 74, minHeight: 90, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F5F8F3', borderWidth: 1, borderColor: '#E4EAE2', padding: spacing.small },
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

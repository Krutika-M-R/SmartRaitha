import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import CropSelector from '../components/CropSelector';
import InputField from '../components/InputField';
import Button from '../components/Button';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import RecommendationCard from '../components/RecommendationCard';
import PriceBarChart from '../components/PriceBarChart';
import FeatureTile from '../components/FeatureTile';
import cropService from '../services/cropService';
import recommendationService from '../services/recommendationService';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { useLanguage } from '../context/LanguageContext';
import weatherService from '../services/weatherService';

function getGreeting(t) {
  const hour = new Date().getHours();

  if (hour < 5) return t('goodNight');
  if (hour < 12) return t('goodMorning');
  if (hour < 17) return t('goodAfternoon');
  if (hour < 21) return t('goodEvening');
  return t('goodNight');
}

function getWeatherDescription(code, t) {
  if (code === 0) return t('clearSky');
  if ([1, 2, 3].includes(code)) return t('partlyCloudy');
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return t('rainy');
  if ([71, 73, 75, 77, 85, 86].includes(code)) return t('snowy');
  if ([95, 96, 99].includes(code)) return t('thunderstorm');
  return t('mixedWeather');
}

function getPersonalizedGreeting(name, t) {
  const greeting = getGreeting(t);
  const normalizedName = name?.trim();
  return normalizedName ? t('personalizedGreeting', { greeting, name: normalizedName }) : greeting;
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { location, error: locationError, loading: locationLoading } = useLocation();
  const [crops, setCrops] = useState([]);
  const [cropSearch, setCropSearch] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [recommendationError, setRecommendationError] = useState('');
  const [transportMode, setTransportMode] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transportRate, setTransportRate] = useState('');
  const [trainFare, setTrainFare] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const heroProgress = useRef(new Animated.Value(0)).current;
  const weatherProgress = useRef(new Animated.Value(0)).current;
  const cropRequestId = useRef(0);
  const recommendationRequestId = useRef(0);

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.sequence([
        Animated.delay(80),
        Animated.spring(heroProgress, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
      ]),
      Animated.sequence([
        Animated.delay(220),
        Animated.spring(weatherProgress, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [heroProgress, weatherProgress]);

  function popStyle(progress) {
    return {
      opacity: progress,
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
      ],
    };
  }

  useEffect(() => {
    if (!locationLoading) loadCrops(location?.state);
  }, [locationLoading, location?.state]);

  async function loadCrops(state) {
    const requestId = ++cropRequestId.current;
    setLoading(true);
    setError('');
    try {
      const [marketCropResult, stateCropResult] = await Promise.allSettled([
        cropService.getCrops(),
        state ? cropService.getCrops(state) : Promise.resolve([]),
      ]);
      if (requestId !== cropRequestId.current) return;
      if (marketCropResult.status === 'rejected') throw marketCropResult.reason;

      const stateCrops = stateCropResult.status === 'fulfilled'
        ? stateCropResult.value
        : [];
      const availableCropNames = new Set(stateCrops.map((crop) => crop.name.toLocaleLowerCase()));
      const cropOptions = state && stateCrops.length > 0
        ? stateCrops
        : marketCropResult.value;
      const marketCrops = cropOptions
        .map((crop) => ({
          ...crop,
          hasLocalPrices: availableCropNames.has(crop.name.toLocaleLowerCase()),
        }));
      setCrops(marketCrops);
      setSelectedCrop(null);
    } catch (e) {
      if (requestId === cropRequestId.current) {
        setCrops([]);
        setSelectedCrop(null);
        setError(e.message);
      }
    } finally {
      if (requestId === cropRequestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (location) loadWeather();
  }, [location]);

  async function loadWeather() {
    try {
      const data = await weatherService.getCurrentWeather(location.latitude, location.longitude);
      setWeather(data);
    } catch (e) {
      console.warn('Could not load current weather:', e.message);
      setWeatherError('weatherUnavailable');
    }
  }

  function handleSelectCrop(crop) {
    setSelectedCrop(crop);
    clearRecommendation();
  }

  const matchingCrops = cropSearch.trim()
    ? crops.filter((crop) => crop.name.toLocaleLowerCase().includes(cropSearch.trim().toLocaleLowerCase()))
    : [];
  const enteredTransportCost = transportMode === 'public' ? trainFare : transportRate;
  const transportDetailsReady = Boolean(
    transportMode
    && (transportMode !== 'private' || fuelType)
    && enteredTransportCost.trim()
    && Number.isFinite(Number(enteredTransportCost))
    && Number(enteredTransportCost) >= 0
    && otherCosts.trim()
    && Number.isFinite(Number(otherCosts))
    && Number(otherCosts) >= 0,
  );

  function clearRecommendation() {
    recommendationRequestId.current++;
    setRecommendation(null);
    setRecommendationError('');
    setRecommendationLoading(false);
  }

  async function findBestMandi() {
    if (!selectedCrop) return;
    if (!location?.state) {
      setRecommendationError(t('noStateForProfit'));
      return;
    }
    if (!transportDetailsReady) {
      setRecommendationError(t('completeTransportDetails'));
      return;
    }
    clearRecommendation();
    setRecommendationLoading(true);
    const requestId = recommendationRequestId.current;
    const transportDetails = {
      ...(transportMode === 'public'
        ? { fixedTransportCost: Number(trainFare) }
        : { transportCostPerKm: Number(transportRate) }),
      otherCosts: Number(otherCosts),
    };
    try {
      const data = await recommendationService.getRecommendation(
        selectedCrop.name,
        location.state,
        location,
        100,
        transportDetails,
      );
      if (requestId === recommendationRequestId.current) setRecommendation(data);
    } catch (e) {
      if (requestId === recommendationRequestId.current) setRecommendationError(e.message);
    } finally {
      if (requestId === recommendationRequestId.current) setRecommendationLoading(false);
    }
  }

  if (loading || locationLoading) return <LoadingIndicator message={t('loadingMarkets')} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={[styles.hero, popStyle(heroProgress)]}>
        <View style={styles.heroCopy}>
          <Text style={styles.brand}>{t('assistant')}</Text>
          <Text style={styles.greeting}>{getPersonalizedGreeting(user?.name, t)}</Text>
        </View>
        <TouchableOpacity
          style={styles.farmerBadge}
          onPress={() => navigation.navigate('LittleLeaf')}
          accessibilityRole="button"
          accessibilityLabel={t('openAssistant')}
        >
          <View style={styles.farmerImageBadge}>
            <Image source={require('../assets/littleleaf-avatar.png')} style={styles.farmerImage} resizeMode="contain" />
          </View>
          <Svg width={108} height={38} viewBox="0 0 108 38" style={styles.heroHelpArc}>
            <Defs>
              <Path id="homeHelpArc" d="M 5 2 Q 54 38 103 2" />
            </Defs>
            <SvgText fill="#F3F7EF" fontFamily="serif" fontSize={13} fontWeight="700" textAnchor="middle">
              <TextPath href="#homeHelpArc" startOffset="50%">{t('anyHelp')}</TextPath>
            </SvgText>
          </Svg>
        </TouchableOpacity>
      </Animated.View>

      <ErrorMessage message={error || (locationError ? t(locationError) : '')} />

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t('help')}</Text>
        </View>
        <Ionicons name="partly-sunny-outline" size={25} color={colors.accent} />
      </View>
      <Animated.View style={[styles.weatherCard, popStyle(weatherProgress)]}>
        <Text style={styles.cardTitle}>{t('weather')}</Text>
        {location ? (
          <Text style={styles.locationName}>
            {t('location')}: {location.placeName || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`}
          </Text>
        ) : null}
        {weather?.current ? (
          <>
            <View style={styles.weatherTop}>
              <Text style={styles.temperature}>{Math.round(weather.current.temperature_2m)}°C</Text>
              <View>
                <Text style={styles.weatherDescription}>{getWeatherDescription(weather.current.weather_code, t)}</Text>
                <Text style={styles.weatherMeta}>{t('humidity')}: {weather.current.relative_humidity_2m}%</Text>
              </View>
            </View>
            <View style={styles.weatherStats}>
              <Text style={styles.stat}>{t('rain')}: {Number(weather.current.precipitation || 0).toFixed(1)} mm</Text>
              <Text style={styles.stat}>{t('wind')}: {Math.round(weather.current.wind_speed_10m)} km/h</Text>
            </View>
          </>
        ) : (
          <Text style={styles.weatherUnavailable}>{weatherError ? t(weatherError) : t('weatherUnavailable')}</Text>
        )}
      </Animated.View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t('whatSelling')}</Text>
        </View>
        <Ionicons name="leaf-outline" size={24} color={colors.primary} />
      </View>
      <View style={styles.cropPanel}>
        <View style={styles.cropSearchRow}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.cropSearchInput}
            value={cropSearch}
            onChangeText={(value) => {
              setCropSearch(value);
              setSelectedCrop(null);
              clearRecommendation();
            }}
            placeholder={t('searchCrops')}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            accessibilityLabel={t('searchCropsAccessibility')}
          />
          {cropSearch ? (
            <TouchableOpacity onPress={() => setCropSearch('')} accessibilityRole="button" accessibilityLabel={t('clearCropSearch')}>
              <Ionicons name="close-circle" size={19} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        {cropSearch.trim() ? (
          matchingCrops.length ? (
            <View style={[styles.chipRow, styles.cropSearchResults]}>
              {matchingCrops.map((crop) => (
                <CropSelector key={crop.id} crop={crop} selected={selectedCrop?.id === crop.id} onPress={handleSelectCrop} />
              ))}
            </View>
          ) : (
            <Text style={styles.cropFallbackNote}>{t('noSearchResults', { query: cropSearch.trim() })}</Text>
          )
        ) : null}
        {!crops.length && !error && (
          <Text style={styles.cropFallbackNote}>{t('noCropOptions')}</Text>
        )}
      </View>

      <View style={styles.recommendedHeader}>
        <Text style={styles.recommendedTitle}>{t('recommendedMarket')}</Text>
      </View>
      {selectedCrop ? (
        <>
          <Text style={styles.transportLabel}>{t('transportModeLabel')}</Text>
          <View style={styles.optionGrid}>
            <View style={styles.optionGridRow}>
              <Pressable
                style={[styles.optionButton, transportMode === 'private' && styles.optionButtonSelected]}
                onPress={() => {
                  setTransportMode('private');
                  clearRecommendation();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: transportMode === 'private' }}
              >
                <Ionicons
                  name="car-sport-outline"
                  size={16}
                  color={transportMode === 'private' ? colors.surface : colors.primary}
                />
                <Text style={[styles.optionButtonText, transportMode === 'private' && styles.optionButtonTextSelected]}>
                  {t('privateVehicle')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.optionButton, transportMode === 'public' && styles.optionButtonSelected]}
                onPress={() => {
                  setTransportMode('public');
                  setFuelType('');
                  clearRecommendation();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: transportMode === 'public' }}
              >
                <Ionicons
                  name="train-outline"
                  size={16}
                  color={transportMode === 'public' ? colors.surface : colors.primary}
                />
                <Text style={[styles.optionButtonText, transportMode === 'public' && styles.optionButtonTextSelected]}>
                  {t('publicTransport')}
                </Text>
              </Pressable>
            </View>
            <View style={styles.optionGridRowCentered}>
              <Pressable
                style={[styles.optionButton, styles.optionButtonThird, transportMode === 'rental' && styles.optionButtonSelected]}
                onPress={() => {
                  setTransportMode('rental');
                  setFuelType('');
                  clearRecommendation();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: transportMode === 'rental' }}
              >
                <Ionicons
                  name="car-outline"
                  size={16}
                  color={transportMode === 'rental' ? colors.surface : colors.primary}
                />
                <Text style={[styles.optionButtonText, transportMode === 'rental' && styles.optionButtonTextSelected]}>
                  {t('rentVehicle')}
                </Text>
              </Pressable>
            </View>
          </View>
          {transportMode === 'private' && (
            <>
              <Text style={styles.transportLabel}>{t('fuelType')}</Text>
              <View style={styles.optionGrid}>
                <View style={styles.optionGridRow}>
                  {[
                    ['diesel', t('diesel')],
                    ['petrol', t('petrol')],
                  ].map(([value, label]) => (
                    <Pressable
                      key={value}
                      style={[styles.optionButton, fuelType === value && styles.optionButtonSelected]}
                      onPress={() => {
                        setFuelType(value);
                        clearRecommendation();
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: fuelType === value }}
                    >
                      <Text style={[styles.optionButtonText, fuelType === value && styles.optionButtonTextSelected]}>
                          {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.optionGridRowCentered}>
                  <Pressable
                    style={[styles.optionButton, styles.optionButtonThird, fuelType === 'electric' && styles.optionButtonSelected]}
                    onPress={() => {
                      setFuelType('electric');
                      clearRecommendation();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: fuelType === 'electric' }}
                  >
                    <Text style={[styles.optionButtonText, fuelType === 'electric' && styles.optionButtonTextSelected]}>
                      {t('electric')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
          {transportMode === 'public' && (
            <>
              <Text style={styles.transportLabel}>{t('publicTransportType')}</Text>
              <Text style={styles.cropFallbackNote}>{t('train')}</Text>
            </>
          )}
          {transportMode && (
            <InputField
              compact
              label={transportMode === 'public' ? t('trainFare') : t('transportCostPerKm')}
              value={transportMode === 'public' ? trainFare : transportRate}
              onChangeText={(value) => {
                if (transportMode === 'public') setTrainFare(value);
                else setTransportRate(value);
                clearRecommendation();
              }}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          )}
          <InputField
            compact
            label={t('otherCharges')}
            value={otherCosts}
            onChangeText={(value) => {
              setOtherCosts(value);
              clearRecommendation();
            }}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {!transportDetailsReady ? (
            <Text style={styles.cropFallbackNote}>{t('selectTransportForRecommendation')}</Text>
          ) : null}
          <Button
            compact
            title={t('findBestMandiProfit')}
            onPress={findBestMandi}
            loading={recommendationLoading}
            disabled={!transportDetailsReady
              || !location?.state
              || !Number.isFinite(location?.latitude)
              || !Number.isFinite(location?.longitude)}
          />
          <ErrorMessage message={recommendationError} />
          {recommendation ? <RecommendationCard recommendation={recommendation} /> : null}

          {recommendation?.allOptions && recommendation.allOptions.length > 0 && (
            <View style={{ marginTop: spacing.large }}>
              <PriceBarChart
                title={t('bestMandiGraph')}
                recommendedMandiId={recommendation.recommended?.mandi?.id}
                prices={recommendation.allOptions.map((item) => ({
                  id: item.mandi.id,
                  mandi: { id: item.mandi.id, name: item.mandi.name },
                  modalPrice: item.modalPrice,
                }))}
              />
            </View>
          )}
        </>
      ) : (
        <Text style={styles.cropFallbackNote}>{t('selectCropForRecommendation')}</Text>
      )}

      {!selectedCrop ? (
        <Text style={styles.cropFallbackNote}>{t('selectCropForMarketActions')}</Text>
      ) : null}
      <View style={styles.actions}>
        <FeatureTile
          icon="analytics-outline"
          title={t('compareMarkets')}
          description={t('marketHint')}
          color="#1565C0"
          onPress={() => {
            if (!selectedCrop) {
              Alert.alert(t('selectCropAlertTitle'), t('selectCropBeforeCompare'));
              return;
            }
            navigation.navigate('Markets', {
              crop: selectedCrop,
              state: location?.state,
              location,
            });
          }}
        />
        <View style={{ height: spacing.small }} />
        <FeatureTile
          icon="calculator-outline"
          title={t('calculateProfit')}
          description={t('profitHint')}
          color={colors.accent}
          onPress={() => {
            if (!selectedCrop) {
              Alert.alert(t('selectCropAlertTitle'), t('selectCropBeforeProfit'));
              return;
            }
            if (!transportDetailsReady) {
              Alert.alert(t('transportModeLabel'), t('completeTransportDetails'));
              return;
            }
            navigation.navigate('ProfitCalculator', {
              crop: selectedCrop,
              state: location?.state,
              location,
              transportMode,
              fuelType,
              transportDetails: transportMode === 'public'
                ? { fixedTransportCost: Number(trainFare), otherCosts: Number(otherCosts) }
                : { transportCostPerKm: Number(transportRate), otherCosts: Number(otherCosts) },
            });
          }}
        />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t('seasonalPlanning')}</Text>
        </View>
        <Ionicons name="calendar-outline" size={24} color={colors.primary} />
      </View>
      <FeatureTile
        icon="leaf-outline"
        title={t('cropPlannerTitle')}
        description={t('cropPlannerDescription')}
        onPress={() => navigation.navigate('CropPlanner', { location, locationError })}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.large, paddingBottom: spacing.xlarge * 2 },
  hero: {
    minHeight: 164,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: spacing.large,
    marginBottom: spacing.large,
    overflow: 'hidden',
  },
  heroCopy: { flex: 1, paddingTop: spacing.medium },
  brand: { color: '#CDE8CF', fontSize: 18, fontWeight: '800', marginBottom: spacing.small },
  greeting: { fontSize: 25, fontWeight: '800', color: colors.surface, lineHeight: 31 },
  heroSubtitle: { color: '#E5F2E5', fontSize: 14, marginTop: spacing.small, maxWidth: 190 },
  farmerBadge: { width: 108, minHeight: 116, alignItems: 'center', justifyContent: 'center' },
  farmerImageBadge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, overflow: 'hidden' },
  farmerImage: { width: '100%', height: '100%' },
  heroHelpArc: { marginTop: -1, overflow: 'visible' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.small },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: spacing.small },
  recommendedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  recommendedTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.small },
  transportLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 5, marginTop: 3 },
  optionGrid: { gap: 5, marginBottom: 7 },
  optionGridRow: { flexDirection: 'row', gap: 6 },
  optionGridRowCentered: { flexDirection: 'row', justifyContent: 'center' },
  optionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#B9D8BD',
    backgroundColor: '#F8FCF8',
  },
  optionButtonThird: { flex: 0, width: '48%' },
  optionButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionButtonText: {
    flexShrink: 1,
    minWidth: 0,
    color: colors.primary,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  optionButtonTextSelected: { color: colors.surface },
  cropPanel: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.medium, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.large },
  cropSearchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: spacing.medium },
  cropSearchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: spacing.small, marginLeft: spacing.small },
  cropSearchResults: { marginTop: spacing.medium },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.small },
  cropFallbackNote: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.small },
  weatherCard: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.large, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.medium },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: spacing.medium },
  locationName: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: -spacing.small, marginBottom: spacing.medium },
  weatherTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.medium },
  temperature: { color: colors.primary, fontSize: 40, fontWeight: '800' },
  weatherDescription: { color: colors.text, fontSize: 16, fontWeight: '700' },
  weatherMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  weatherStats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.medium, paddingTop: spacing.medium },
  stat: { color: colors.textSecondary, fontSize: 12 },
  weatherUnavailable: { color: colors.textSecondary, fontSize: 13 },
  actions: { marginTop: spacing.large },
});

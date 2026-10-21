import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import CropSelector from '../components/CropSelector';
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

function getWeatherDescription(code) {
  if (code === 0) return 'Clear sky';
  if ([1, 2, 3].includes(code)) return 'Partly cloudy';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'Rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snowy';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Mixed weather';
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { location, error: locationError, loading: locationLoading } = useLocation();
  const [crops, setCrops] = useState([]);
  const [cropSearch, setCropSearch] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
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

  async function loadRecommendation(cropName) {
    const requestId = ++recommendationRequestId.current;
    setRecommendationLoading(true);
    setRecommendationError('');
    setRecommendation(null);

    if (!location) {
      setRecommendationLoading(false);
      return;
    }

    try {
      const data = await recommendationService.getRecommendation(
        cropName,
        location.state,
        location,
      );
      if (requestId === recommendationRequestId.current) {
        setRecommendation(data);
      }
    } catch (e) {
      if (requestId === recommendationRequestId.current) {
        setRecommendation(null);
        setRecommendationError(e.message || 'Could not fetch market recommendations.');
      }
    } finally {
      if (requestId === recommendationRequestId.current) {
        setRecommendationLoading(false);
      }
    }
  }

  useEffect(() => {
    if (selectedCrop && location) {
      loadRecommendation(selectedCrop.name);
    }
  }, [selectedCrop, location]);

  useEffect(() => {
    if (location) loadWeather();
  }, [location]);

  async function loadWeather() {
    try {
      const data = await weatherService.getCurrentWeather(location.latitude, location.longitude);
      setWeather(data);
    } catch (e) {
      setWeatherError(e.message);
    }
  }

  function handleSelectCrop(crop) {
    setSelectedCrop(crop);
  }

  const matchingCrops = cropSearch.trim()
    ? crops.filter((crop) => crop.name.toLocaleLowerCase().includes(cropSearch.trim().toLocaleLowerCase()))
    : [];

  if (loading || locationLoading) return <LoadingIndicator message={t('loadingMarkets')} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={[styles.hero, popStyle(heroProgress)]}>
        <View style={styles.heroCopy}>
          <Text style={styles.brand}>LittleLeaf</Text>
          <Text style={styles.greeting}>{getGreeting(t)}{user?.name ? `, ${user.name}` : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.farmerBadge}
          onPress={() => navigation.navigate('LittleLeaf')}
          accessibilityRole="button"
          accessibilityLabel="Open LittleLeaf chatbot"
        >
          <View style={styles.farmerImageBadge}>
            <Image source={require('../assets/littleleaf-avatar.png')} style={styles.farmerImage} resizeMode="contain" />
          </View>
          <Svg width={108} height={38} viewBox="0 0 108 38" style={styles.heroHelpArc}>
            <Defs>
              <Path id="homeHelpArc" d="M 5 2 Q 54 38 103 2" />
            </Defs>
            <SvgText fill="#F3F7EF" fontFamily="serif" fontSize={13} fontWeight="700" textAnchor="middle">
              <TextPath href="#homeHelpArc" startOffset="50%">Any Help? 🌱</TextPath>
            </SvgText>
          </Svg>
        </TouchableOpacity>
      </Animated.View>

      <ErrorMessage message={error || locationError} />

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
                <Text style={styles.weatherDescription}>{getWeatherDescription(weather.current.weather_code)}</Text>
                <Text style={styles.weatherMeta}>{t('humidity')}: {weather.current.relative_humidity_2m}%</Text>
              </View>
            </View>
            <View style={styles.weatherStats}>
              <Text style={styles.stat}>{t('rain')}: {Number(weather.current.precipitation || 0).toFixed(1)} mm</Text>
              <Text style={styles.stat}>{t('wind')}: {Math.round(weather.current.wind_speed_10m)} km/h</Text>
            </View>
          </>
        ) : (
          <Text style={styles.weatherUnavailable}>{weatherError || t('weatherUnavailable')}</Text>
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
              recommendationRequestId.current++;
              setRecommendationLoading(false);
              setSelectedCrop(null);
              setRecommendation(null);
            }}
            placeholder="Search available crops"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            accessibilityLabel="Search crops available to sell"
          />
          {cropSearch ? (
            <TouchableOpacity
              onPress={() => {
                setCropSearch('');
                recommendationRequestId.current++;
                setRecommendationLoading(false);
                setSelectedCrop(null);
                setRecommendation(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear crop search"
            >
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
            <Text style={styles.cropFallbackNote}>No available crops match “{cropSearch.trim()}”.</Text>
          )
        ) : null}
        {!crops.length && !error && (
          <Text style={styles.cropFallbackNote}>{t('noCropOptions')}</Text>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('recommendedMarket')}</Text>
        <Ionicons name="sparkles-outline" size={24} color={colors.accent} />
      </View>
      {selectedCrop ? (
        <>
          {recommendationLoading ? (
            <View style={styles.recommendationLoadingCard}>
              <ActivityIndicator size="small" color={colors.primary} style={styles.recommendationSpinner} />
              <Text style={styles.recommendationLoadingText}>
                Fetching the latest Agmarknet market prices...
              </Text>
            </View>
          ) : recommendationError ? (
            <View style={styles.recommendationErrorCard}>
              <Ionicons name="alert-circle-outline" size={22} color="#D32F2F" />
              <Text style={styles.recommendationErrorText}>{recommendationError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadRecommendation(selectedCrop.name)}
                accessibilityRole="button"
                accessibilityLabel="Retry fetching recommendation"
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <RecommendationCard recommendation={recommendation} />

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
          )}
        </>
      ) : (
        <Text style={styles.cropFallbackNote}>Select the crop for recommended market.</Text>
      )}

      {!selectedCrop ? (
        <Text style={styles.cropFallbackNote}>Search for and select a crop above to compare markets or calculate profit.</Text>
      ) : null}
      <View style={styles.actions}>
        <FeatureTile
          icon="analytics-outline"
          title={t('compareMarkets')}
          description={t('marketHint')}
          color="#1565C0"
          onPress={() => {
            if (!selectedCrop) {
              Alert.alert('Select a crop', 'Search for and select a crop above before comparing markets.');
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
              Alert.alert('Select a crop', 'Search for and select a crop above before calculating profit.');
              return;
            }
            navigation.navigate('ProfitCalculator', { crop: selectedCrop, state: location?.state, location, recommendedMandiId: recommendation?.recommended?.mandi?.id });
          }}
        />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Seasonal planning</Text>
        </View>
        <Ionicons name="calendar-outline" size={24} color={colors.primary} />
      </View>
      <FeatureTile
        icon="leaf-outline"
        title="Smart 6-Month Crop Planner"
        description="Explore suitable crops for your soil, irrigation, and sowing month."
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
  recommendationLoadingCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.large,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationSpinner: {
    marginBottom: spacing.small,
  },
  recommendationLoadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  recommendationErrorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    padding: spacing.large,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationErrorText: {
    color: '#C62828',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: spacing.small,
  },
  retryButton: {
    paddingHorizontal: spacing.medium,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
});

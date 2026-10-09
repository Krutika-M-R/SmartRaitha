import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const heroProgress = useRef(new Animated.Value(0)).current;
  const weatherProgress = useRef(new Animated.Value(0)).current;
  const guideProgress = useRef(new Animated.Value(0)).current;

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
      Animated.sequence([
        Animated.delay(360),
        Animated.spring(guideProgress, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [guideProgress, heroProgress, weatherProgress]);

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
    loadCrops();
  }, []);

  async function loadCrops() {
    setLoading(true);
    setError('');
    try {
      const data = await cropService.getCrops();
      setCrops(data);
      if (data.length > 0) {
        setSelectedCrop(data[0]);
        loadRecommendation(data[0].id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendation(cropId) {
    if (!location) {
      setRecommendation(null);
      return;
    }

    try {
      const data = await recommendationService.getRecommendation(
        cropId,
        100,
        location.latitude,
        location.longitude,
      );
      setRecommendation(data);
    } catch (e) {
      // recommendation is optional on the home screen - fail quietly
      setRecommendation(null);
    }
  }

  useEffect(() => {
    if (selectedCrop && location) {
      loadRecommendation(selectedCrop.id);
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

  if (loading || locationLoading) return <LoadingIndicator message={t('loadingMarkets')} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={[styles.hero, popStyle(heroProgress)]}>
        <View style={styles.heroCopy}>
          <Text style={styles.brand}>SmartRaitha</Text>
          <Text style={styles.greeting}>{getGreeting(t)}{user?.name ? `, ${user.name}` : ''}</Text>
          <Text style={styles.heroSubtitle}>{t('whatSelling')}</Text>
        </View>
        <View style={styles.farmerBadge}>
          <Text style={styles.farmer}>👨‍🌾</Text>
        </View>
      </Animated.View>

      <ErrorMessage message={error || locationError} />

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>01</Text>
          <Text style={styles.sectionTitle}>{t('whatSelling')}</Text>
        </View>
        <Ionicons name="leaf-outline" size={24} color={colors.primary} />
      </View>
      <View style={styles.cropPanel}>
        <View style={styles.chipRow}>
          {crops.map((crop) => (
            <CropSelector key={crop.id} crop={crop} selected={selectedCrop?.id === crop.id} onPress={handleSelectCrop} />
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>02</Text>
          <Text style={styles.sectionTitle}>{t('help')}</Text>
        </View>
        <Ionicons name="partly-sunny-outline" size={25} color={colors.accent} />
      </View>
      <Animated.View style={[styles.weatherCard, popStyle(weatherProgress)]}>
        <Text style={styles.cardTitle}>{t('weather')}</Text>
        {location?.placeName ? <Text style={styles.locationName}>{t('location')}: {location.placeName}</Text> : null}
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
            <View style={styles.recommendationStrip}>
              <Ionicons name="bulb-outline" size={20} color={colors.accent} />
              <View style={styles.recommendationCopy}>
                <Text style={styles.recommendationLabel}>{t('recommendedCrop')}</Text>
                <Text style={styles.recommendationCrop}>{weather.seasonalAdvice.crop}</Text>
                <Text style={styles.recommendationReason}>{weather.seasonalAdvice.reason}</Text>
              </View>
            </View>
            <Text style={styles.forecastTitle}>{t('futureForecast')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastRow}>
              {weather.daily.time.map((date, index) => (
                <View key={date} style={styles.forecastCard}>
                  <Text style={styles.forecastDay}>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</Text>
                  <Text style={styles.forecastIcon}>{getWeatherDescription(weather.daily.weather_code[index]) === 'Rainy' ? '🌧️' : '☀️'}</Text>
                  <Text style={styles.forecastTemp}>{Math.round(weather.daily.temperature_2m_max[index])}° / {Math.round(weather.daily.temperature_2m_min[index])}°</Text>
                  <Text style={styles.forecastRain}>{weather.daily.precipitation_probability_max[index]}% rain</Text>
                </View>
              ))}
            </ScrollView>
            {weather.futureAdvice && (
              <View style={styles.futureAdvice}>
                <Text style={styles.futureAdviceTitle}>Plan ahead: {weather.futureAdvice.crop}</Text>
                <Text style={styles.recommendationReason}>{weather.futureAdvice.note}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.weatherUnavailable}>{weatherError || t('weatherUnavailable')}</Text>
        )}
      </Animated.View>

      <Animated.View style={[styles.guideCard, popStyle(guideProgress)]}>
        <View style={styles.guideHeader}>
          <Text style={styles.cardTitle}>{t('seasonalGuide')}</Text>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </View>
        {weather?.seasonalAdvice ? (
          <>
            <Text style={styles.guideCrop}>{weather.seasonalAdvice.crop}</Text>
            <Text style={styles.guideWindow}>{t('cropTiming')}: {weather.seasonalAdvice.window}</Text>
            <Text style={styles.guideText}>{weather.seasonalAdvice.reason}</Text>
          </>
        ) : (
          <Text style={styles.guideText}>{t('helpText')}</Text>
        )}
      </Animated.View>

      {selectedCrop && (
        <>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.eyebrow}>03</Text>
              <Text style={styles.sectionTitle}>{t('recommendedMarket')}</Text>
            </View>
            <Ionicons name="sparkles-outline" size={24} color={colors.accent} />
          </View>
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

          <View style={styles.actions}>
            <Text style={styles.actionHint}>{t('actionHint')}</Text>
            <FeatureTile icon="analytics-outline" title={t('compareMarkets')} description={t('marketHint')} color="#1565C0" onPress={() => navigation.navigate('Markets', { crop: selectedCrop })} />
            <View style={{ height: spacing.small }} />
            <FeatureTile icon="calculator-outline" title={t('calculateProfit')} description={t('profitHint')} color={colors.accent} onPress={() => navigation.navigate('ProfitCalculator', { crop: selectedCrop })} />
          </View>
        </>
      )}
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
  brand: { color: '#CDE8CF', fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.small },
  greeting: { fontSize: 25, fontWeight: '800', color: colors.surface, lineHeight: 31 },
  heroSubtitle: { color: '#E5F2E5', fontSize: 14, marginTop: spacing.small, maxWidth: 190 },
  farmerBadge: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4A934E' },
  farmer: { fontSize: 54 },
  heroHelp: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.medium, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, shadowColor: '#173F1A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 4, elevation: 3 },
  heroHelpText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.small },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', marginBottom: 2 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: spacing.small },
  cropPanel: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.medium, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.large },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.small },
  weatherCard: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.large, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.medium },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: spacing.medium },
  locationName: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: -spacing.small, marginBottom: spacing.medium },
  weatherTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.medium },
  temperature: { color: colors.primary, fontSize: 40, fontWeight: '800' },
  weatherDescription: { color: colors.text, fontSize: 16, fontWeight: '700' },
  weatherMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  weatherStats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.medium, paddingTop: spacing.medium },
  stat: { color: colors.textSecondary, fontSize: 12 },
  recommendationStrip: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF7E8', borderRadius: 12, padding: spacing.medium, marginTop: spacing.medium },
  recommendationCopy: { flex: 1, marginLeft: spacing.small },
  recommendationLabel: { color: colors.textSecondary, fontSize: 12 },
  recommendationCrop: { color: colors.primary, fontSize: 20, fontWeight: '800', marginTop: 2 },
  recommendationReason: { color: colors.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 17 },
  weatherUnavailable: { color: colors.textSecondary, fontSize: 13 },
  forecastTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: spacing.large, marginBottom: spacing.small },
  forecastRow: { gap: spacing.small },
  forecastCard: { width: 94, backgroundColor: colors.background, borderRadius: 12, padding: spacing.small, alignItems: 'center' },
  forecastDay: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  forecastIcon: { fontSize: 24, marginVertical: 4 },
  forecastTemp: { color: colors.text, fontSize: 11, fontWeight: '700' },
  forecastRain: { color: colors.primary, fontSize: 10, marginTop: 4 },
  futureAdvice: { borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: spacing.small, marginTop: spacing.medium },
  futureAdviceTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  guideCard: { backgroundColor: '#EAF4EA', borderRadius: 18, padding: spacing.large, marginBottom: spacing.large },
  guideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guideCrop: { color: colors.primary, fontSize: 24, fontWeight: '800', marginTop: spacing.small },
  guideWindow: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 4 },
  guideText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: spacing.medium },
  actions: { marginTop: spacing.large },
  actionHint: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.small },
});

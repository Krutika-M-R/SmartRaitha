import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useLanguage } from '../context/LanguageContext';

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>₹{Number(value).toFixed(2)}</Text>
    </View>
  );
}

export default function ProfitCard({ result }) {
  const { t } = useLanguage();
  const pressProgress = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const routeCoordinates = useMemo(() => result?.routeCoordinates || [], [result?.routeCoordinates]);

  const fitRoute = useCallback(() => {
    if (routeCoordinates.length > 1) {
      mapRef.current?.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 36, right: 36, bottom: 36, left: 36 },
        animated: false,
      });
    }
  }, [routeCoordinates]);

  useEffect(() => {
    fitRoute();
  }, [fitRoute]);

  if (!result) return null;
  return (
    <Animated.View style={{ transform: [{ scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
      <View style={styles.card}>
        <Pressable
          style={styles.details}
          onPressIn={() => Animated.spring(pressProgress, { toValue: 1, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(pressProgress, { toValue: 0, useNativeDriver: true }).start()}
        >
          <Row label={t('modalPrice')} value={result.modalPrice} />
          {result.dataFreshness === 'cached' && (
            <Text style={styles.transportCalculation}>
              Latest saved Agmarknet report: {result.priceDate} ({result.ageDays} days old)
            </Text>
          )}
          <Row label={t('grossRevenue')} value={result.grossRevenue} />
          <Row label={t('transportationCost')} value={result.transportCost} />
          {Number.isFinite(Number(result.distanceKm)) && Number.isFinite(Number(result.ratePerKm)) && (
            <Text style={styles.transportCalculation}>
              {Number(result.distanceKm).toFixed(1)} km × ₹{Number(result.ratePerKm).toFixed(2)}/km
            </Text>
          )}
          <Row label={t('otherCosts')} value={result.otherCosts} />
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.netLabel}>{t('estimatedNetProfit')}</Text>
            <Text style={styles.netValue}>₹{Number(result.netProfit).toFixed(2)}</Text>
          </View>
        </Pressable>
        {routeCoordinates.length > 1 && (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                ...routeCoordinates[0],
                latitudeDelta: 0.15,
                longitudeDelta: 0.15,
              }}
              onMapReady={fitRoute}
              accessibilityLabel="Driving route to the selected mandi"
            >
              <Polyline coordinates={routeCoordinates} strokeColor={colors.primary} strokeWidth={5} />
              {result.originCoordinates && (
                <Marker coordinate={result.originCoordinates} title="Your location" pinColor="#1565C0" />
              )}
              {result.destinationCoordinates && (
                <Marker coordinate={result.destinationCoordinates} title="Selected mandi" />
              )}
            </MapView>
            <View pointerEvents="none" style={styles.mapAttribution}>
              <Text style={styles.mapAttributionText}>Route © OpenStreetMap contributors</Text>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.large,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#173F1A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 6, elevation: 5,
  },
  details: { padding: spacing.large },
  mapContainer: { height: 220, width: '100%' },
  map: { ...StyleSheet.absoluteFillObject },
  mapAttribution: { position: 'absolute', right: 6, bottom: 6, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  mapAttributionText: { color: colors.textSecondary, fontSize: 9 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.small },
  rowLabel: { color: colors.textSecondary, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '500' },
  transportCalculation: { color: colors.textSecondary, fontSize: 12, marginTop: -spacing.small, marginBottom: spacing.small },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.small },
  netLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  netValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
});

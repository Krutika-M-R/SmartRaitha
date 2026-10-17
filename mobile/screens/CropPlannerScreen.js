import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import SmartCropPlanner from '../components/SmartCropPlanner';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import cropService from '../services/cropService';

export default function CropPlannerScreen({ route, location: providedLocation, locationError: providedLocationError }) {
  const { location: routeLocation, locationError: routeLocationError } = route?.params || {};
  const location = providedLocation || routeLocation;
  const locationError = providedLocationError || routeLocationError;
  const [crops, setCrops] = useState([]);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    let active = true;
    cropService.getCropCatalog()
      .then((catalog) => {
        if (active) setCrops(catalog);
      })
      .catch((error) => {
        if (active) setCatalogError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {catalogError ? <Text style={styles.error}>{catalogError}</Text> : null}
      <SmartCropPlanner location={location} locationError={locationError} crops={crops} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.medium, paddingBottom: spacing.xlarge },
  error: { color: colors.error, backgroundColor: '#FFF2F0', borderRadius: 12, padding: spacing.medium, marginBottom: spacing.medium, fontSize: 12 },
});

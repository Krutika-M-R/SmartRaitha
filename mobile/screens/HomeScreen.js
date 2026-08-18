import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import CropSelector from '../components/CropSelector';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import RecommendationCard from '../components/RecommendationCard';
import PriceBarChart from '../components/PriceBarChart';
import Button from '../components/Button';
import cropService from '../services/cropService';
import recommendationService from '../services/recommendationService';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../hooks/useLocation';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { location, error: locationError, loading: locationLoading } = useLocation();
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  function handleSelectCrop(crop) {
    setSelectedCrop(crop);
  }

  if (loading || locationLoading) return <LoadingIndicator message="Loading your dashboard..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.large }}>
      <Text style={styles.greeting}>Good morning{user?.name ? `, ${user.name}` : ''}</Text>
      <Text style={styles.question}>What are you selling?</Text>

      <ErrorMessage message={error || locationError} />

      <View style={styles.chipRow}>
        {crops.map((crop) => (
          <CropSelector key={crop.id} crop={crop} selected={selectedCrop?.id === crop.id} onPress={handleSelectCrop} />
        ))}
      </View>

      {selectedCrop && (
        <>
          <Text style={styles.sectionTitle}>Recommended market</Text>
          <RecommendationCard recommendation={recommendation} />

          {recommendation?.allOptions && recommendation.allOptions.length > 0 && (
            <View style={{ marginTop: spacing.large }}>
              <PriceBarChart prices={recommendation.allOptions.map((item) => ({
                id: item.mandi.id,
                mandi: { id: item.mandi.id, name: item.mandi.name },
                modalPrice: item.modalPrice,
              }))} />
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title="Compare Markets"
              variant="secondary"
              onPress={() => navigation.navigate('Markets', { crop: selectedCrop })}
            />
            <View style={{ height: spacing.small }} />
            <Button
              title="Calculate Profit"
              onPress={() => navigation.navigate('ProfitCalculator', { crop: selectedCrop })}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text },
  question: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.medium },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.large },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.small },
  actions: { marginTop: spacing.large },
});

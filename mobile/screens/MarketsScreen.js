import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import MandiCard from '../components/MandiCard';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import PriceBarChart from '../components/PriceBarChart';
import priceService from '../services/priceService';

export default function MarketsScreen({ route }) {
  const { crop } = route.params;
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPrices();
  }, []);

  async function loadPrices() {
    setLoading(true);
    setError('');
    try {
      const data = await priceService.getPricesForCrop(crop.id);
      // Highest modal price first, matching "compare prices" requirement
      data.sort((a, b) => b.modalPrice - a.modalPrice);
      setPrices(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingIndicator message="Fetching mandi prices..." />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{crop.name} — Market Prices</Text>
      <ErrorMessage message={error} />
      {prices.length === 0 ? (
        <Text style={styles.empty}>No price data available for this crop.</Text>
      ) : (
        <>
          <PriceBarChart prices={prices} />
          <FlatList
            data={prices}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <MandiCard mandiName={item.mandi.name} modalPrice={item.modalPrice} distanceKm={null} />
            )}
            scrollEnabled={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.large },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.medium },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xlarge },
});

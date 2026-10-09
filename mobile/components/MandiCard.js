import React, { useRef } from 'react';
import { Animated, Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export default function MandiCard({ mandiName, modalPrice, distanceKm }) {
  const pressProgress = useRef(new Animated.Value(0)).current;
  return (
    <Animated.View style={{ transform: [{ scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
    <Pressable
      style={styles.card}
      onPressIn={() => Animated.spring(pressProgress, { toValue: 1, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressProgress, { toValue: 0, useNativeDriver: true }).start()}
    >
      <View>
        <Text style={styles.name}>{mandiName}</Text>
        {distanceKm != null && <Text style={styles.sub}>{distanceKm} km away</Text>}
      </View>
      <Text style={styles.price}>₹{modalPrice}</Text>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.medium,
    marginBottom: spacing.small,
    shadowColor: '#173F1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  price: { fontSize: 18, fontWeight: '700', color: colors.accent },
});

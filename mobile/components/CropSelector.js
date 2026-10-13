import React, { useRef } from 'react';
import { Animated, Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export default function CropSelector({ crop, selected, onPress }) {
  const pressProgress = useRef(new Animated.Value(0)).current;
  return (
    <Animated.View style={{ transform: [{ scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) }] }}>
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={() => onPress(crop)}
      onPressIn={() => Animated.spring(pressProgress, { toValue: 1, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressProgress, { toValue: 0, useNativeDriver: true }).start()}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{crop.name}</Text>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#173F1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    marginRight: spacing.small,
    marginBottom: spacing.small,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.text, fontSize: 14 },
  textSelected: { color: colors.surface, fontWeight: '600' },
});

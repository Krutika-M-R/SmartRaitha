import React, { useRef } from 'react';
import { Animated, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export default function Button({ title, onPress, loading, variant = 'primary', disabled }) {
  const isSecondary = variant === 'secondary';
  const pressProgress = useRef(new Animated.Value(0)).current;

  function animatePress(toValue) {
    Animated.spring(pressProgress, { toValue, useNativeDriver: true, speed: 24, bounciness: 5 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale: pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) }] }}>
    <Pressable
      style={[
        styles.button,
        isSecondary ? styles.secondary : styles.primary,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => animatePress(1)}
      onPressOut={() => animatePress(0)}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.primary : colors.surface} />
      ) : (
        <Text style={[styles.text, isSecondary && { color: colors.primary }]}>{title}</Text>
      )}
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.medium,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#173F1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  disabled: { opacity: 0.5 },
  text: { color: colors.surface, fontSize: 16, fontWeight: '600' },
});

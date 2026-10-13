import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export default function FeatureTile({ icon, title, description, color = colors.primary, onPress }) {
  const pressProgress = useRef(new Animated.Value(0)).current;
  const scale = pressProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={styles.tile}
        onPress={onPress}
        onPressIn={() => Animated.spring(pressProgress, { toValue: 1, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(pressProgress, { toValue: 0, useNativeDriver: true }).start()}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: spacing.medium, borderWidth: 1, borderColor: colors.border, shadowColor: '#173F1A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 6, elevation: 5 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginHorizontal: spacing.medium },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  description: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
});

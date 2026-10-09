import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

const icons = {
  Home: ['home-outline', 'home'],
  Profile: ['person-outline', 'person'],
  Assistant: ['sparkles-outline', 'sparkles'],
};

export default function MainMenu({ state, descriptors, navigation }) {
  return (
    <View style={styles.shell}>
      <View style={styles.menu}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options || {};
          const [inactiveIcon, activeIcon] = icons[route.name] || ['ellipse-outline', 'ellipse'];
          const label = options.title || route.name;

          function onPress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          }

          return (
            <Pressable key={route.key} style={[styles.item, focused && styles.activeItem]} onPress={onPress}>
              <Ionicons name={focused ? activeIcon : inactiveIcon} size={21} color={focused ? colors.surface : colors.textSecondary} />
              <Text style={[styles.label, focused && styles.activeLabel]} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { paddingHorizontal: spacing.medium, paddingBottom: spacing.medium, backgroundColor: colors.background },
  menu: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: spacing.small, shadowColor: '#173F1A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 7 },
  item: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingHorizontal: 4 },
  activeItem: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 3 },
  activeLabel: { color: colors.surface },
});

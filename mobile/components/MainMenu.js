import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

const icons = {
  Home: ['home-outline', 'home'],
  LittleLeaf: ['chatbubble-ellipses-outline', 'chatbubble-ellipses'],
  Profile: ['person-outline', 'person'],
};

export default function MainMenu({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, spacing.small) }]}>
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
            <Pressable
              key={route.key}
              style={styles.item}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <View style={[styles.tabContent, focused && styles.activeTab]}>
                <Ionicons
                  name={focused ? activeIcon : inactiveIcon}
                  size={21}
                  color={focused ? colors.surface : colors.textSecondary}
                />
                <Text style={[styles.label, focused && styles.activeLabel]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: spacing.medium,
    paddingTop: spacing.small,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  menu: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabContent: {
    width: '100%',
    maxWidth: 78,
    height: 52,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 3,
  },
  activeTab: { backgroundColor: colors.primary },
  label: { color: colors.textSecondary, fontSize: 9, fontWeight: '700', marginTop: 2 },
  activeLabel: { color: colors.surface, fontSize: 9 },
});

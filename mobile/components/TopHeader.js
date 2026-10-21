import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import HamburgerMenu from './HamburgerMenu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TopHeader({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.small }]}>
      <Text style={styles.brand}>SmartRaitha</Text>
      <HamburgerMenu navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.large, paddingBottom: spacing.small, backgroundColor: colors.background },
  brand: { color: colors.primary, fontSize: 18, fontWeight: '800' },
});

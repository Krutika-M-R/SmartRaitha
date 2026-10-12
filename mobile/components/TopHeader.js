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
      <HamburgerMenu navigation={navigation} />
      <Text style={styles.brand}>SmartRaitha</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.large, paddingBottom: spacing.small, backgroundColor: colors.background },
  brand: { marginLeft: spacing.medium, color: colors.primary, fontSize: 18, fontWeight: '800' },
});

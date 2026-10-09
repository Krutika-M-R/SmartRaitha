import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import HamburgerMenu from './HamburgerMenu';

export default function TopHeader({ navigation }) {
  return (
    <View style={styles.header}>
      <HamburgerMenu navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.large, paddingTop: spacing.medium, paddingBottom: spacing.small, backgroundColor: colors.background },
});

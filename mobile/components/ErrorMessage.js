import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export default function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FBEAEA',
    borderRadius: 10,
    padding: spacing.medium,
    marginBottom: spacing.medium,
  },
  text: { color: colors.error, fontSize: 13 },
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export default function InputField({ label, value, onChangeText, secureTextEntry, keyboardType, placeholder, compact = false }) {
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {label ? <Text style={[styles.label, compact && styles.compactLabel]}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          style={[
            styles.input,
            compact && styles.compactInput,
            secureTextEntry && { paddingRight: 40 },
          ]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry ? hidden : false}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setHidden(!hidden)}
          >
            <Ionicons name={hidden ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.medium },
  compactContainer: { marginBottom: 10 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.small / 2 },
  compactLabel: { marginBottom: 3 },
  inputWrap: { justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small + 4,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  compactInput: { paddingVertical: 8, fontSize: 14 },
  eyeIcon: {
    position: 'absolute',
    right: 12,
  },
});

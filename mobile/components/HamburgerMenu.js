import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export default function HamburgerMenu({ navigation }) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  function openSettings() {
    setVisible(false);
    navigation.navigate('Profile');
  }

  function openLittleLeaf() {
    setVisible(false);
    navigation.navigate('LittleLeaf');
  }

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="More options"
      >
        <Ionicons name="ellipsis-vertical" size={22} color={colors.primary} />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={[styles.menu, { top: insets.top + 48 }]}>
            <Pressable style={styles.menuItem} onPress={openSettings} accessibilityRole="button">
              <Ionicons name="settings-outline" size={20} color={colors.primary} />
              <Text style={styles.menuLabel}>Settings</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={openLittleLeaf} accessibilityRole="button">
              <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
              <Text style={styles.menuLabel}>LittleLeaf</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(10, 35, 14, 0.12)' },
  menu: {
    position: 'absolute',
    right: spacing.medium,
    minWidth: 184,
    paddingVertical: spacing.small,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#173F1A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.medium, paddingVertical: spacing.small },
  menuLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginLeft: spacing.medium },
});

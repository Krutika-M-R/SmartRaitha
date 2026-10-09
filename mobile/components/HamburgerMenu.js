import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useLanguage } from '../context/LanguageContext';

const menuItems = [
  { route: 'Home', icon: 'home-outline', label: 'home' },
  { route: 'Profile', icon: 'person-outline', label: 'profile' },
  { route: 'Assistant', icon: 'sparkles-outline', label: 'assistant' },
];

export default function HamburgerMenu({ navigation }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  function openRoute(route) {
    setVisible(false);
    navigation.navigate(route);
  }

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setVisible(true)} accessibilityLabel="Open menu">
        <View style={styles.line} />
        <View style={styles.line} />
        <View style={styles.line} />
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.panel} onPress={(event) => event.stopPropagation()}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.brand}>SmartRaitha</Text>
                <Text style={styles.menuTitle}>Menu</Text>
              </View>
              <Pressable onPress={() => setVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            {menuItems.map((item) => (
              <Pressable key={item.route} style={styles.menuItem} onPress={() => openRoute(item.route)}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={21} color={colors.primary} />
                </View>
                <Text style={styles.menuLabel}>{t(item.label)}</Text>
                <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4A934E' },
  line: { width: 19, height: 2, borderRadius: 2, backgroundColor: colors.surface, marginVertical: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(10, 35, 14, 0.38)' },
  panel: { width: '82%', marginTop: 58, marginLeft: spacing.medium, backgroundColor: colors.surface, borderRadius: 22, padding: spacing.medium, shadowColor: '#173F1A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 10 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.small, marginBottom: spacing.small },
  brand: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  menuTitle: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 3 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.small, borderRadius: 14, marginBottom: 5 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF4EA' },
  menuLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700', marginLeft: spacing.medium },
});

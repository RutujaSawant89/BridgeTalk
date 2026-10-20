import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius, space } from '../theme';

// Small pill button used for Listen / Save / Share style actions.
export default function ActionButton({ icon, label, onPress, accessibilityLabel, active = false, disabled = false, style }) {
  return (
    <TouchableOpacity
      style={[styles.button, active && styles.active, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected: active }}
      hitSlop={6}
    >
      <Text style={styles.text}>
        {icon} {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingVertical: space.md - 2,
    paddingHorizontal: space.sm,
    alignItems: 'center',
  },
  active: { backgroundColor: colors.accent },
  disabled: { opacity: 0.4 },
  text: { color: colors.text, fontSize: 14, fontWeight: '600' },
});

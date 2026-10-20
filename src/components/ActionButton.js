import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, icon as iconSize, radius, space, touch } from '../theme';

// Secondary action (Listen / Save / Share): Feather icon plus an optional label.
export default function ActionButton({ icon, label, onPress, accessibilityLabel, active = false, disabled = false, style }) {
  const tint = active ? colors.onAccent : colors.text;
  return (
    <TouchableOpacity
      style={[styles.button, !label && styles.iconOnly, active && styles.active, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected: active }}
    >
      {icon ? <Feather name={icon} size={iconSize.sm + 2} color={tint} /> : null}
      {label ? (
        <Text style={[styles.text, { color: tint }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: touch,
    flexDirection: 'row',
    gap: space.xs + 2,
    backgroundColor: colors.raised,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnly: { flex: 0, width: touch },
  active: { backgroundColor: colors.accent },
  disabled: { opacity: 0.4 },
  text: { fontSize: 14, fontFamily: fonts.semibold },
});

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, icon as iconSize, touch } from '../theme';

// Round 44px icon button for headers and toolbars.
export default function IconButton({ name, onPress, accessibilityLabel, color = colors.text, background = colors.surface, size = iconSize.md, style, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: background }, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <Feather name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { width: touch, height: touch, borderRadius: touch / 2, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});

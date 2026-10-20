import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, gradient, icon as iconSize, radius, space } from '../theme';

// Primary call to action. Optional Feather `icon` sits before the title.
export default function GradientButton({ title, onPress, loading = false, disabled = false, style, accessibilityLabel, icon }) {
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
      style={[styles.wrap, inactive && styles.inactive, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <View style={styles.row}>
            {icon ? <Feather name={icon} size={iconSize.md} color={colors.onAccent} /> : null}
            <Text style={styles.text}>{title}</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, overflow: 'hidden' },
  inactive: { opacity: 0.5 },
  gradient: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  text: { color: colors.onAccent, fontSize: 16, fontFamily: fonts.semibold },
});

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { VIBES } from '../languages';
import { colors, radius } from '../theme';

export default function VibeChips({ value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {VIBES.map((vibe) => {
        const active = vibe.id === value;
        return (
          <TouchableOpacity
            key={vibe.id}
            onPress={() => onChange(vibe.id)}
            style={[
              styles.chip,
              { borderColor: vibe.color },
              active && { backgroundColor: vibe.color },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${vibe.label} vibe`}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {vibe.emoji} {vibe.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  labelActive: { color: '#fff' },
});

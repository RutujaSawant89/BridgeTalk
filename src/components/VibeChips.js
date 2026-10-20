import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VIBES } from '../languages';
import { colors, fonts, icon, radius, space, touch } from '../theme';

// layout "grid": four equal columns (Translate). layout "row": compact horizontal strip (Talk).
export default function VibeChips({ value, onChange, layout = 'row' }) {
  const chips = VIBES.map((vibe) => {
    const active = vibe.id === value;
    const tint = active ? colors.onVibe : vibe.color;
    return (
      <TouchableOpacity
        key={vibe.id}
        onPress={() => onChange(vibe.id)}
        style={[
          layout === 'grid' ? styles.cell : styles.chip,
          { borderColor: active ? vibe.color : colors.border },
          active && { backgroundColor: vibe.color },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${vibe.label} vibe`}
        accessibilityState={{ selected: active }}
      >
        <Feather name={vibe.icon} size={layout === 'grid' ? icon.md : icon.sm} color={tint} />
        <Text style={[styles.label, layout === 'grid' && styles.labelGrid, { color: active ? colors.onVibe : colors.text }]} numberOfLines={1}>
          {vibe.label}
        </Text>
      </TouchableOpacity>
    );
  });

  if (layout === 'grid') return <View style={styles.grid}>{chips}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: space.sm },
  cell: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1.5,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.xs,
  },
  row: { gap: space.sm, paddingVertical: space.xs },
  chip: {
    minHeight: touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: space.md + 2,
    backgroundColor: colors.surface,
  },
  label: { fontSize: 14, fontFamily: fonts.semibold },
  labelGrid: { fontSize: 12 },
});

import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LANGUAGES, getLanguage } from '../languages';
import { colors, fonts, icon, radius, scriptFont, space, touch } from '../theme';

// value / onChange use the language name (e.g. 'Hindi').
// rotated: turns the sheet 180deg for someone sitting on the opposite side of the phone.
export default function LanguagePicker({ value, onChange, label, rotated = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const selected = getLanguage(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter((l) => l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q));
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const pick = (lang) => {
    onChange(lang.name);
    close();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.pill}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Language'}: ${selected?.name ?? 'not set'}`}
        accessibilityHint="Opens the language list"
      >
        <Text style={styles.pillText} numberOfLines={1}>
          {selected ? `${selected.flag}  ${selected.name}` : 'Select'}
        </Text>
        <Feather name="chevron-down" size={icon.sm + 2} color={colors.muted} />
      </TouchableOpacity>

      {/* A rotated sheet sits at the top of the screen, so it fades in rather than sliding up from the bottom */}
      <Modal visible={open} transparent animationType={rotated ? 'fade' : 'slide'} onRequestClose={close}>
        <View style={[styles.modalRoot, rotated && styles.rotated]}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel="Close language list" />
          <View style={[styles.sheet, { paddingBottom: (rotated ? insets.top : insets.bottom) + space.md }]}>
            <View style={styles.handle} />
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <View style={styles.searchBox}>
              <Feather name="search" size={icon.sm + 2} color={colors.muted} />
              <TextInput
                style={styles.search}
                placeholder="Search languages"
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                accessibilityLabel="Search languages"
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.name === value;
                return (
                  <TouchableOpacity
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => pick(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}, ${item.native}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={[styles.native, scriptFont(item.native)]}>{item.native}</Text>
                    {active ? <Feather name="check" size={icon.md} color={colors.accent} style={styles.check} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>No languages found</Text>}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: { color: colors.text, fontSize: 15, fontFamily: fonts.semibold, flexShrink: 1 },
  modalRoot: { flex: 1 },
  rotated: { transform: [{ rotate: '180deg' }] },
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: space.md },
  sheetTitle: { color: colors.text, fontSize: 22, fontFamily: fonts.display, marginBottom: space.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: space.md + 2,
    marginBottom: space.sm,
  },
  search: { flex: 1, color: colors.text, fontSize: 15, fontFamily: fonts.regular, paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: space.sm, borderRadius: radius.sm },
  rowActive: { backgroundColor: colors.raised },
  flag: { fontSize: 22, marginRight: space.md },
  name: { color: colors.text, fontSize: 16, fontFamily: fonts.medium, flex: 1 },
  native: { color: colors.muted, fontSize: 15 },
  check: { marginLeft: space.sm },
  empty: { color: colors.muted, fontFamily: fonts.regular, textAlign: 'center', paddingVertical: space.xl },
});

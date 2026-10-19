import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGUAGES, getLanguage } from '../languages';
import { colors, radius } from '../theme';

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
      <TouchableOpacity style={styles.pill} onPress={() => setOpen(true)} accessibilityLabel={label}>
        <Text style={styles.pillText} numberOfLines={1}>
          {selected ? `${selected.flag} ${selected.name}` : 'Select'}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      {/* A rotated sheet sits at the top of the screen, so it fades in rather than sliding up from the bottom */}
      <Modal visible={open} transparent animationType={rotated ? 'fade' : 'slide'} onRequestClose={close}>
        <View style={[styles.modalRoot, rotated && styles.rotated]}>
          <Pressable style={styles.backdrop} onPress={close} />
          <View style={[styles.sheet, { paddingBottom: (rotated ? insets.top : insets.bottom) + 12 }]}>
            <View style={styles.handle} />
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <TextInput
              style={styles.search}
              placeholder="Search languages"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.name === value;
                return (
                  <TouchableOpacity style={[styles.row, active && styles.rowActive]} onPress={() => pick(item)}>
                    <Text style={styles.flag}>{item.flag}</Text>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.native}>{item.native}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  caret: { color: colors.textMuted, marginLeft: 6 },
  modalRoot: { flex: 1 },
  rotated: { transform: [{ rotate: '180deg' }] },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  search: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: radius.sm },
  rowActive: { backgroundColor: colors.cardAlt },
  flag: { fontSize: 22, marginRight: 12 },
  name: { color: colors.text, fontSize: 16, flex: 1 },
  native: { color: colors.textMuted, fontSize: 16 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
});

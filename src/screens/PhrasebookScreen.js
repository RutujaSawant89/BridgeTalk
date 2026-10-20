import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import ShowToLocalModal from '../components/ShowToLocalModal';
import EmptyState from '../components/EmptyState';
import ActionButton from '../components/ActionButton';
import IconButton from '../components/IconButton';
import { CATEGORIES, PHRASEBOOK_LANGUAGES, hasPhrasebook, phrasesFor } from '../phrasebook';
import { getLanguage } from '../languages';
import { usePrefs } from '../prefs';
import { colors, fonts, icon, radius, scriptFont, sos, space, touch } from '../theme';

const ALL = 'all';

function Chip({ label, iconName, active, onPress, accessibilityLabel }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
    >
      {iconName ? <Feather name={iconName} size={icon.sm} color={active ? colors.onAccent : colors.muted} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function PhrasebookScreen({ navigation }) {
  const { prefs } = usePrefs();
  const defaultLanguage = hasPhrasebook(prefs.travelLanguage) ? prefs.travelLanguage : PHRASEBOOK_LANGUAGES[0];
  const [language, setLanguage] = useState(defaultLanguage);
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(null);

  useEffect(() => setLanguage(defaultLanguage), [defaultLanguage]);
  useEffect(() => () => Speech.stop(), []);

  const phrases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return phrasesFor(language).filter(
      (p) =>
        (category === ALL || p.category === category) &&
        (!q || p.en.toLowerCase().includes(q) || p.translation.toLowerCase().includes(q))
    );
  }, [language, category, query]);

  const listen = (p) => {
    Speech.stop();
    Speech.speak(p.translation, { language: getLanguage(language)?.tts });
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            Phrasebook
          </Text>
          <View style={styles.offlineRow}>
            <Feather name="check-circle" size={icon.sm - 2} color={colors.success} />
            <Text style={styles.offline}>Works offline</Text>
          </View>
        </View>
        <IconButton name="bookmark" onPress={() => navigation.navigate('Saved')} accessibilityLabel="Saved translations and history" />
        <TouchableOpacity style={styles.sosBtn} onPress={() => navigation.navigate('SOS')} accessibilityRole="button" accessibilityLabel="Open emergency SOS card">
          <Feather name="alert-triangle" size={icon.sm + 2} color={sos.text} />
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {!hasPhrasebook(prefs.travelLanguage) ? (
        <View style={styles.note}>
          <Feather name="info" size={icon.sm + 2} color={colors.marigold} />
          <Text style={styles.noteText}>
            {prefs.travelLanguage} isn't in the offline phrasebook yet. Pick one of these {PHRASEBOOK_LANGUAGES.length}, or use Translate when you're online.
          </Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {PHRASEBOOK_LANGUAGES.map((name) => (
          <Chip
            key={name}
            label={`${getLanguage(name)?.flag} ${name}`}
            active={name === language}
            onPress={() => setLanguage(name)}
            accessibilityLabel={`Phrases in ${name}`}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[{ id: ALL, label: 'All', icon: 'book-open' }, ...CATEGORIES].map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            iconName={c.icon}
            active={c.id === category}
            onPress={() => setCategory(c.id)}
            accessibilityLabel={`${c.label} phrases`}
          />
        ))}
      </ScrollView>

      <View style={styles.searchBox}>
        <Feather name="search" size={icon.sm + 2} color={colors.muted} />
        <TextInput
          style={styles.search}
          placeholder="Search phrases"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          accessibilityLabel="Search phrases"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={phrases}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState icon="search" title="No phrases found" message="Try a different word or category." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.en}>{item.en}</Text>
            <Text style={[styles.translation, scriptFont(item.translation, 'bold')]}>{item.translation}</Text>
            <Text style={styles.pron}>{item.pronunciation}</Text>
            <View style={styles.actions}>
              <ActionButton icon="volume-2" label="Listen" onPress={() => listen(item)} accessibilityLabel={`Listen to ${item.en} in ${language}`} />
              <ActionButton icon="maximize-2" label="Show to local" onPress={() => setShown({ ...item, language })} accessibilityLabel={`Show ${item.en} in big text`} />
            </View>
          </View>
        )}
      />
      <ShowToLocalModal phrase={shown} onClose={() => setShown(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.xl, paddingBottom: space.xxl, gap: space.md },
  header: { gap: space.md, marginBottom: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titleBlock: { flex: 1 },
  title: { color: colors.text, fontSize: 30, fontFamily: fonts.display, letterSpacing: -0.5 },
  offlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  offline: { color: colors.success, fontSize: 13, fontFamily: fonts.semibold },
  sosBtn: {
    minHeight: touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    backgroundColor: sos.bg,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  sosText: { color: sos.text, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1 },
  note: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.tipBg, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.tipBorder },
  noteText: { flex: 1, color: colors.tipText, fontSize: 14, fontFamily: fonts.regular, lineHeight: 20 },
  chips: { gap: space.sm },
  chip: {
    minHeight: touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontSize: 14, fontFamily: fonts.semibold },
  chipTextActive: { color: colors.onAccent },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: { flex: 1, color: colors.text, fontSize: 15, fontFamily: fonts.regular, paddingVertical: space.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.xl, gap: space.xs + 2, borderWidth: 1, borderColor: colors.border },
  en: { color: colors.muted, fontSize: 14, fontFamily: fonts.medium },
  translation: { color: colors.text, fontSize: 22, lineHeight: 32 },
  pron: { color: colors.muted, fontSize: 14, fontFamily: fonts.regular },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});

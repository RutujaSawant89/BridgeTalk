import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import ShowToLocalModal from '../components/ShowToLocalModal';
import EmptyState from '../components/EmptyState';
import ActionButton from '../components/ActionButton';
import { CATEGORIES, PHRASEBOOK_LANGUAGES, hasPhrasebook, phrasesFor } from '../phrasebook';
import { getLanguage } from '../languages';
import { usePrefs } from '../prefs';
import { colors, radius, space, sos } from '../theme';

const ALL = 'all';

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
        <View>
          <Text style={styles.title}>Phrasebook</Text>
          <Text style={styles.offline}>✅ Works offline</Text>
        </View>
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={() => navigation.navigate('SOS')}
          accessibilityRole="button"
          accessibilityLabel="Open emergency SOS card"
        >
          <Text style={styles.sosText}>🆘 SOS</Text>
        </TouchableOpacity>
      </View>

      {!hasPhrasebook(prefs.travelLanguage) ? (
        <Text style={styles.note}>
          {prefs.travelLanguage} isn't in the offline phrasebook yet. Pick one of these {PHRASEBOOK_LANGUAGES.length}, or use Translate when you're online.
        </Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {PHRASEBOOK_LANGUAGES.map((name) => {
          const active = name === language;
          return (
            <TouchableOpacity
              key={name}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setLanguage(name)}
              accessibilityRole="button"
              accessibilityLabel={`Phrases in ${name}`}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {getLanguage(name)?.flag} {name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[{ id: ALL, label: 'All', emoji: '📚' }, ...CATEGORIES].map((c) => {
          const active = c.id === category;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setCategory(c.id)}
              accessibilityRole="button"
              accessibilityLabel={`${c.label} phrases`}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {c.emoji} {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TextInput
        style={styles.search}
        placeholder="Search phrases"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        accessibilityLabel="Search phrases"
      />
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
        ListEmptyComponent={<EmptyState emoji="🔍" title="No phrases found" message="Try a different word or category." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.en}>{item.en}</Text>
            <Text style={styles.translation}>{item.translation}</Text>
            <Text style={styles.pron}>🗣 {item.pronunciation}</Text>
            <View style={styles.actions}>
              <ActionButton icon="🔊" label="Listen" onPress={() => listen(item)} accessibilityLabel={`Listen to ${item.en} in ${language}`} />
              <ActionButton
                icon="📢"
                label="Show to local"
                onPress={() => setShown({ ...item, language })}
                accessibilityLabel={`Show ${item.en} in big text`}
              />
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
  list: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { gap: space.md, marginBottom: space.xs },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 26, fontWeight: 'bold' },
  offline: { color: '#4cd18a', fontSize: 13, fontWeight: '600', marginTop: 2 },
  sosBtn: { backgroundColor: sos.bg, borderRadius: radius.pill, paddingVertical: space.sm + 2, paddingHorizontal: space.lg },
  sosText: { color: sos.text, fontSize: 16, fontWeight: '800' },
  note: { color: colors.tipText, backgroundColor: colors.tipBg, borderRadius: radius.sm, padding: space.md, fontSize: 14 },
  chips: { gap: space.sm },
  chip: { backgroundColor: colors.card, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.md + 2, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  search: { backgroundColor: colors.card, color: colors.text, borderRadius: radius.sm, paddingHorizontal: space.lg, paddingVertical: space.md, fontSize: 15 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: space.xs + 2 },
  en: { color: colors.textMuted, fontSize: 14 },
  translation: { color: colors.text, fontSize: 22, fontWeight: '700' },
  pron: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});

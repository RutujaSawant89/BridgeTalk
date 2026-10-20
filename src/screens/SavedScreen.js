import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import EmptyState from '../components/EmptyState';
import ActionButton from '../components/ActionButton';
import ShareCardModal from '../components/ShareCardModal';
import { SkeletonCard } from '../components/Skeleton';
import { useHistory, searchHistory, MAX_HISTORY } from '../history';
import { getLanguage, VIBES } from '../languages';
import { colors, radius, space } from '../theme';

const TABS = [
  { id: 'saved', label: '⭐ Saved' },
  { id: 'history', label: '🕘 History' },
];

function timeAgo(at) {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(at).toLocaleDateString();
}

export default function SavedScreen({ navigation }) {
  const { items, loaded, toggleStar, remove, clearUnstarred } = useHistory();
  const [tab, setTab] = useState('saved');
  const [query, setQuery] = useState('');
  const [sharing, setSharing] = useState(null);

  const visible = useMemo(() => {
    const base = tab === 'saved' ? items.filter((i) => i.starred) : items;
    return searchHistory(base, query);
  }, [items, tab, query]);

  const listen = (item) => {
    Speech.stop();
    Speech.speak(item.translation, { language: getLanguage(item.to)?.tts });
  };

  const confirmClear = () =>
    Alert.alert('Clear history?', 'Saved (starred) translations are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearUnstarred },
    ]);

  const empty = query.trim() ? (
    <EmptyState emoji="🔍" title="No matches" message={`Nothing in ${tab === 'saved' ? 'Saved' : 'History'} matches “${query.trim()}”.`} />
  ) : tab === 'saved' ? (
    <EmptyState emoji="⭐" title="No saved translations yet" message="Tap ☆ Save on any translation to keep it here, even offline." />
  ) : (
    <EmptyState emoji="🕘" title="No history yet" message="Your translations and conversations will show up here." />
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Saved & History</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Open settings" hitSlop={8}>
          <Text style={styles.icon}>⚙️</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.id)}
              accessibilityRole="tab"
              accessibilityLabel={t.label.replace(/^\S+ /, '')}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        style={styles.search}
        placeholder={tab === 'saved' ? 'Search saved' : 'Search history'}
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        accessibilityLabel={tab === 'saved' ? 'Search saved translations' : 'Search history'}
      />
      {tab === 'history' && items.length ? (
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {items.length} of {MAX_HISTORY} kept
          </Text>
          <TouchableOpacity onPress={confirmClear} accessibilityRole="button" accessibilityLabel="Clear history" hitSlop={8}>
            <Text style={styles.clear}>Clear</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {!loaded ? (
        <View style={styles.list}>
          {header}
          <SkeletonCard lines={2} label="Loading saved translations" />
          <SkeletonCard lines={2} label="Loading saved translations" />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const vibe = VIBES.find((v) => v.id === item.vibeId);
            return (
              <View style={styles.card}>
                <Text style={styles.meta}>
                  {getLanguage(item.from)?.flag} {item.from} → {getLanguage(item.to)?.flag} {item.to}
                  {vibe ? ` · ${vibe.emoji}` : ''}
                  {item.kind === 'talk' ? ' · 🎙️ Talk' : ''} · {timeAgo(item.at)}
                </Text>
                <Text style={styles.original} numberOfLines={2}>
                  {item.original}
                </Text>
                <Text style={styles.translation} selectable>
                  {item.translation}
                </Text>
                {item.pronunciation ? <Text style={styles.pron}>🗣 {item.pronunciation}</Text> : null}
                <View style={styles.actions}>
                  <ActionButton icon="🔊" label="Listen" onPress={() => listen(item)} accessibilityLabel={`Listen to ${item.translation}`} />
                  <ActionButton
                    icon={item.starred ? '⭐' : '☆'}
                    label={item.starred ? 'Saved' : 'Save'}
                    active={item.starred}
                    onPress={() => toggleStar(item.id)}
                    accessibilityLabel={item.starred ? 'Remove from saved' : 'Save translation'}
                  />
                  <ActionButton icon="🖼️" label="Share" onPress={() => setSharing(item)} accessibilityLabel="Share as image" />
                  <ActionButton icon="🗑️" label="" onPress={() => remove(item.id)} accessibilityLabel="Delete" style={styles.deleteBtn} />
                </View>
              </View>
            );
          }}
        />
      )}
      <ShareCardModal item={sharing} onClose={() => setSharing(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { gap: space.md, marginBottom: space.xs },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 26, fontWeight: 'bold' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.pill, padding: space.xs },
  tab: { flex: 1, paddingVertical: space.sm + 2, borderRadius: radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  search: { backgroundColor: colors.card, color: colors.text, borderRadius: radius.sm, paddingHorizontal: space.lg, paddingVertical: space.md, fontSize: 15 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.textMuted, fontSize: 12 },
  clear: { color: colors.error, fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: space.xs + 2 },
  original: { color: colors.textMuted, fontSize: 14 },
  translation: { color: colors.text, fontSize: 20, fontWeight: '700' },
  pron: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  deleteBtn: { flex: 0, paddingHorizontal: space.md },
});

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import EmptyState from '../components/EmptyState';
import ActionButton from '../components/ActionButton';
import IconButton from '../components/IconButton';
import ShareCardModal from '../components/ShareCardModal';
import { SkeletonCard } from '../components/Skeleton';
import { useHistory, searchHistory, MAX_HISTORY } from '../history';
import { getLanguage, VIBES } from '../languages';
import { colors, fonts, icon, radius, scriptFont, space, touch } from '../theme';

const TABS = [
  { id: 'saved', label: 'Saved', icon: 'star' },
  { id: 'history', label: 'History', icon: 'clock' },
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
    <EmptyState icon="search" title="No matches" message={`Nothing in ${tab === 'saved' ? 'Saved' : 'History'} matches “${query.trim()}”.`} />
  ) : tab === 'saved' ? (
    <EmptyState icon="star" title="No saved translations yet" message="Tap Save on any translation to keep it here, even offline." />
  ) : (
    <EmptyState icon="clock" title="No history yet" message="Your translations and conversations will show up here." />
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <IconButton name="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Text style={styles.title} accessibilityRole="header">
          Saved
        </Text>
        <IconButton name="settings" onPress={() => navigation.navigate('Profile')} accessibilityLabel="Open settings" />
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
              accessibilityLabel={t.label}
              accessibilityState={{ selected: active }}
            >
              <Feather name={t.icon} size={icon.sm} color={active ? colors.onAccent : colors.muted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.searchBox}>
        <Feather name="search" size={icon.sm + 2} color={colors.muted} />
        <TextInput
          style={styles.search}
          placeholder={tab === 'saved' ? 'Search saved' : 'Search history'}
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          accessibilityLabel={tab === 'saved' ? 'Search saved translations' : 'Search history'}
        />
      </View>
      {tab === 'history' && items.length ? (
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {items.length} of {MAX_HISTORY} kept
          </Text>
          <TouchableOpacity style={styles.textBtn} onPress={confirmClear} accessibilityRole="button" accessibilityLabel="Clear history">
            <Text style={styles.clear}>Clear</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
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
                <View style={styles.cardMeta}>
                  <Text style={styles.meta} numberOfLines={1}>
                    {getLanguage(item.from)?.flag} {item.from} → {getLanguage(item.to)?.flag} {item.to} · {timeAgo(item.at)}
                  </Text>
                  {item.kind === 'talk' ? <Feather name="mic" size={icon.sm - 2} color={colors.muted} /> : null}
                  {vibe ? <View style={[styles.vibeDot, { backgroundColor: vibe.color }]} accessibilityLabel={`${vibe.label} vibe`} /> : null}
                </View>
                <Text style={[styles.original, scriptFont(item.original)]} numberOfLines={2}>
                  {item.original}
                </Text>
                <Text style={[styles.translation, scriptFont(item.translation, 'semibold')]} selectable>
                  {item.translation}
                </Text>
                {item.pronunciation ? <Text style={styles.pron}>{item.pronunciation}</Text> : null}
                <View style={styles.actions}>
                  <ActionButton icon="volume-2" label="Listen" onPress={() => listen(item)} accessibilityLabel={`Listen to ${item.translation}`} />
                  <ActionButton
                    icon="star"
                    label={item.starred ? 'Saved' : 'Save'}
                    active={item.starred}
                    onPress={() => toggleStar(item.id)}
                    accessibilityLabel={item.starred ? 'Remove from saved' : 'Save translation'}
                  />
                  <ActionButton icon="share-2" label="Share" onPress={() => setSharing(item)} accessibilityLabel="Share as image" />
                  <ActionButton icon="trash-2" onPress={() => remove(item.id)} accessibilityLabel="Delete" />
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
  list: { padding: space.xl, paddingTop: space.md, paddingBottom: space.xxl, gap: space.md },
  header: { gap: space.md, marginBottom: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { flex: 1, color: colors.text, fontSize: 30, fontFamily: fonts.display, letterSpacing: -0.5 },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: space.xs, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, minHeight: touch, flexDirection: 'row', gap: space.xs + 2, borderRadius: radius.md - 4, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.muted, fontSize: 15, fontFamily: fonts.semibold },
  tabTextActive: { color: colors.onAccent },
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
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textBtn: { minHeight: touch, minWidth: touch, alignItems: 'flex-end', justifyContent: 'center' },
  meta: { color: colors.muted, fontSize: 12, fontFamily: fonts.medium, flexShrink: 1 },
  clear: { color: colors.error, fontSize: 14, fontFamily: fonts.semibold },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.xl, gap: space.xs + 2, borderWidth: 1, borderColor: colors.border },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  vibeDot: { width: 10, height: 10, borderRadius: 5 },
  original: { color: colors.muted, fontSize: 14 },
  translation: { color: colors.text, fontSize: 20, lineHeight: 28 },
  pron: { color: colors.muted, fontSize: 13, fontFamily: fonts.regular },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});

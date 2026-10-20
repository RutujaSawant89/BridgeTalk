import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Keyboard, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import LanguagePicker from '../components/LanguagePicker';
import VibeChips from '../components/VibeChips';
import GradientButton from '../components/GradientButton';
import ActionButton from '../components/ActionButton';
import IconButton from '../components/IconButton';
import PhraseOfTheDay from '../components/PhraseOfTheDay';
import ShareCardModal from '../components/ShareCardModal';
import { SkeletonCard } from '../components/Skeleton';
import { VIBES, getLanguage } from '../languages';
import { translateAllVibes } from '../translate';
import { friendlyMessage } from '../errors';
import { usePrefs } from '../prefs';
import { useHistory } from '../history';
import * as haptics from '../haptics';
import { colors, fonts, icon, radius, scriptFont, space } from '../theme';

export default function TranslateScreen({ navigation }) {
  const { prefs, recordVisit } = usePrefs();
  const history = useHistory();
  const [from, setFrom] = useState(prefs.myLanguage);
  const [to, setTo] = useState(prefs.travelLanguage);
  const [text, setText] = useState('');
  const [vibeId, setVibeId] = useState('casual');
  // { data, from, to, original, historyId }: remembers what the result is, for Listen, Save and Share
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(null);
  const inFlight = useRef(false); // blocks a second tap before the loading state renders

  // Follow the saved languages when they change in onboarding or settings
  useEffect(() => setFrom(prefs.myLanguage), [prefs.myLanguage]);
  useEffect(() => setTo(prefs.travelLanguage), [prefs.travelLanguage]);
  useEffect(() => recordVisit(), [recordVisit]);
  useEffect(() => () => Speech.stop(), []);

  const vibe = VIBES.find((v) => v.id === vibeId);
  const current = result?.data[vibeId];
  const historyItem = result ? history.items.find((i) => i.id === result.historyId) : null;
  const starred = Boolean(historyItem?.starred);

  // Keep the history entry in step with the vibe being looked at
  useEffect(() => {
    if (result?.historyId && current?.translation) {
      history.patch(result.historyId, { vibeId, translation: current.translation, pronunciation: current.pronunciation });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vibeId]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const translate = async (overrideText) => {
    if (inFlight.current) return;
    const input = (overrideText ?? text).trim();
    if (!input) {
      setError(friendlyMessage({ kind: 'empty_input' }, 'translate'));
      return;
    }
    inFlight.current = true;
    Keyboard.dismiss();
    Speech.stop();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await translateAllVibes(input, from, to);
      const shown = data[vibeId];
      const historyId = history.add({
        kind: 'translate',
        original: input,
        from,
        to,
        vibeId,
        translation: shown.translation,
        pronunciation: shown.pronunciation,
      });
      setResult({ data, from, to, original: input, historyId });
      haptics.success();
    } catch (e) {
      setError(friendlyMessage(e, 'translate'));
      haptics.failure();
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const tryPhrase = (phrase) => {
    setText(phrase);
    translate(phrase);
  };

  const listen = () => {
    if (!current?.translation) return;
    Speech.stop();
    Speech.speak(current.translation, { language: getLanguage(result.to)?.tts });
  };

  const toggleSave = () => {
    if (!result?.historyId) return;
    history.toggleStar(result.historyId, { vibeId, translation: current.translation, pronunciation: current.pronunciation });
    haptics.tap();
  };

  const openShare = () =>
    setSharing({
      original: result.original,
      translation: current.translation,
      pronunciation: current.pronunciation,
      from: result.from,
      to: result.to,
      vibeId,
    });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            BridgeTalk<Text style={styles.dot}>.</Text>
          </Text>
          <IconButton name="bookmark" onPress={() => navigation.navigate('Saved')} accessibilityLabel="Saved translations and history" />
        </View>

        <View style={styles.pickers}>
          <LanguagePicker label="Translate from" value={from} onChange={setFrom} />
          <IconButton name="repeat" onPress={swap} accessibilityLabel="Swap languages" background={colors.accent} color={colors.onAccent} />
          <LanguagePicker label="Translate to" value={to} onChange={setTo} />
        </View>

        <TextInput
          style={[styles.input, scriptFont(text)]}
          placeholder="Type something to translate"
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          accessibilityLabel={`Text to translate from ${from}`}
        />

        <VibeChips layout="grid" value={vibeId} onChange={setVibeId} />

        <GradientButton title="Translate" icon="arrow-right" onPress={() => translate()} loading={loading} disabled={!text.trim()} />

        {error ? (
          <View style={styles.errorRow} accessibilityLiveRegion="polite">
            <Feather name="alert-circle" size={icon.sm + 2} color={colors.error} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        {loading ? <SkeletonCard label="Translating" /> : null}

        {current?.translation ? (
          <View style={[styles.resultCard, { borderColor: vibe.color }]}>
            <View style={[styles.vibeTag, { backgroundColor: vibe.color }]}>
              <Feather name={vibe.icon} size={12} color={colors.onVibe} />
              <Text style={styles.vibeTagText}>{vibe.label}</Text>
            </View>
            <Text style={[styles.translation, scriptFont(current.translation, 'semibold')]} selectable>
              {current.translation}
            </Text>
            {current.pronunciation ? (
              <View style={styles.pronRow}>
                <Text style={styles.pronLabel}>SAY IT</Text>
                <Text style={styles.pronunciation} selectable>
                  {current.pronunciation}
                </Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <ActionButton icon="volume-2" label="Listen" onPress={listen} accessibilityLabel="Listen to the translation" />
              <ActionButton
                icon="star"
                label={starred ? 'Saved' : 'Save'}
                active={starred}
                onPress={toggleSave}
                accessibilityLabel={starred ? 'Remove from saved' : 'Save translation'}
              />
              <ActionButton icon="share-2" label="Share" onPress={openShare} accessibilityLabel="Share as an image card" />
            </View>
          </View>
        ) : null}

        {result?.data.culture_tip ? (
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Feather name="compass" size={icon.sm + 2} color={colors.marigold} />
              <Text style={styles.tipTitle}>Culture bite</Text>
            </View>
            <Text style={styles.tipText}>{result.data.culture_tip}</Text>
          </View>
        ) : null}

        {!result && !loading ? <PhraseOfTheDay language={to} streak={prefs.streak?.count ?? 0} onUse={tryPhrase} /> : null}
      </ScrollView>
      <ShareCardModal item={sharing} onClose={() => setSharing(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingBottom: space.xxl + space.sm, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 30, fontFamily: fonts.display, letterSpacing: -0.5 },
  dot: { color: colors.accent },
  pickers: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    minHeight: 140,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    padding: space.lg,
    fontSize: 17,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  error: { color: colors.error, fontSize: 15, fontFamily: fonts.medium, flexShrink: 1 },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    padding: space.xl,
    gap: space.md,
  },
  vibeTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 5,
  },
  vibeTagText: { color: colors.onVibe, fontSize: 12, fontFamily: fonts.bold, letterSpacing: 0.3 },
  translation: { color: colors.text, fontSize: 26, lineHeight: 36 },
  pronRow: { gap: 2 },
  pronLabel: { color: colors.muted, fontSize: 11, fontFamily: fonts.semibold, letterSpacing: 1 },
  pronunciation: { color: colors.muted, fontSize: 16, fontFamily: fonts.regular },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  tipCard: {
    backgroundColor: colors.tipBg,
    borderColor: colors.tipBorder,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.lg + 2,
    gap: space.sm,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tipTitle: { color: colors.marigold, fontSize: 15, fontFamily: fonts.semibold },
  tipText: { color: colors.tipText, fontSize: 15, fontFamily: fonts.regular, lineHeight: 22 },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Keyboard, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import LanguagePicker from '../components/LanguagePicker';
import VibeChips from '../components/VibeChips';
import GradientButton from '../components/GradientButton';
import ActionButton from '../components/ActionButton';
import PhraseOfTheDay from '../components/PhraseOfTheDay';
import ShareCardModal from '../components/ShareCardModal';
import { SkeletonCard } from '../components/Skeleton';
import { VIBES, getLanguage } from '../languages';
import { translateAllVibes } from '../translate';
import { friendlyMessage } from '../errors';
import { usePrefs } from '../prefs';
import { useHistory } from '../history';
import * as haptics from '../haptics';
import { colors, radius, space } from '../theme';

export default function TranslateScreen() {
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
        <Text style={styles.title} accessibilityRole="header">
          BridgeTalk<Text style={{ color: colors.accent }}>.</Text>
        </Text>

        <View style={styles.pickers}>
          <LanguagePicker label="Translate from" value={from} onChange={setFrom} />
          <TouchableOpacity style={styles.swap} onPress={swap} accessibilityRole="button" accessibilityLabel="Swap languages">
            <Text style={styles.swapText}>⇄</Text>
          </TouchableOpacity>
          <LanguagePicker label="Translate to" value={to} onChange={setTo} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Type something to translate"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          accessibilityLabel={`Text to translate from ${from}`}
        />

        <VibeChips value={vibeId} onChange={setVibeId} />

        <GradientButton title="Translate" onPress={() => translate()} loading={loading} disabled={!text.trim()} />

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        {loading ? <SkeletonCard label="Translating" /> : null}

        {current?.translation ? (
          <View style={[styles.resultCard, { borderColor: vibe.color }]}>
            <Text style={[styles.vibeTag, { color: vibe.color }]}>
              {vibe.emoji} {vibe.label}
            </Text>
            <Text style={styles.translation} selectable>
              {current.translation}
            </Text>
            {current.pronunciation ? (
              <Text style={styles.pronunciation} selectable>
                🗣 {current.pronunciation}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <ActionButton icon="🔊" label="Listen" onPress={listen} accessibilityLabel="Listen to the translation" />
              <ActionButton
                icon={starred ? '⭐' : '☆'}
                label={starred ? 'Saved' : 'Save'}
                active={starred}
                onPress={toggleSave}
                accessibilityLabel={starred ? 'Remove from saved' : 'Save translation'}
              />
              <ActionButton icon="🖼️" label="Share" onPress={openShare} accessibilityLabel="Share as an image card" />
            </View>
          </View>
        ) : null}

        {result?.data.culture_tip ? (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Culture bite</Text>
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
  title: { color: colors.text, fontSize: 28, fontWeight: 'bold', fontFamily: 'monospace' },
  pickers: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  swap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  input: {
    minHeight: 140,
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: radius.md,
    padding: space.lg,
    fontSize: 17,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.error, fontSize: 15, textAlign: 'center' },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    padding: space.lg + 2,
    gap: space.sm + 2,
  },
  vibeTag: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  translation: { color: colors.text, fontSize: 26, fontWeight: '600', lineHeight: 36 },
  pronunciation: { color: colors.textMuted, fontSize: 16, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs + 2 },
  tipCard: {
    backgroundColor: colors.tipBg,
    borderColor: colors.tipBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.xs + 2,
  },
  tipTitle: { color: colors.tipBorder, fontSize: 15, fontWeight: '700' },
  tipText: { color: colors.tipText, fontSize: 15, lineHeight: 21 },
});

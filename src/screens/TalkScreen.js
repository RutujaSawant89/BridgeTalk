import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Animated,
  Easing,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import LanguagePicker from '../components/LanguagePicker';
import VibeChips from '../components/VibeChips';
import IconButton from '../components/IconButton';
import EmptyState from '../components/EmptyState';
import ReportButton from '../components/ReportButton';
import { getLanguage } from '../languages';
import { transcribe } from '../api';
import { translateOne } from '../translate';
import { friendlyMessage } from '../errors';
import { usePrefs } from '../prefs';
import { useHistory } from '../history';
import * as haptics from '../haptics';
import { useOnLeave, permissionAlert } from '../hooks';
import { isMeaningful } from '../text';
import { colors, fonts, icon, radius, scriptFont, sos, space, touch } from '../theme';
import { devWarn } from '../log';

const RECORDING = sos.bg;
const MIN_RECORDING_MS = 500; // shorter taps are almost always accidental
const MAX_RECORDING_MS = 60000; // a forgotten recording stops itself after a minute

function speak(text, languageName) {
  if (!text) return;
  Speech.stop();
  Speech.speak(text, { language: getLanguage(languageName)?.tts });
}

function MicButton({ recording, disabled, onPress }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!recording) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [recording, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });

  return (
    <View style={styles.micWrap}>
      {recording ? (
        <Animated.View style={[styles.micRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      ) : null}
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={[styles.mic, recording && styles.micRecording, disabled && styles.micDisabled]}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
        >
          <Feather name={recording ? 'square' : 'mic'} size={icon.xl} color={colors.onAccent} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function Half({ side, language, onLanguageChange, heard, said, recording, micDisabled, busy, onMic }) {
  return (
    <View style={[styles.half, side === 'top' && styles.rotated]}>
      <View style={styles.halfHeader}>
        <LanguagePicker
          label={side === 'top' ? 'Their language' : 'Your language'}
          value={language}
          onChange={onLanguageChange}
          rotated={side === 'top'}
        />
      </View>

      <View style={styles.messageArea}>
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.busyText}>Translating…</Text>
          </View>
        ) : heard ? (
          <ScrollView style={styles.heardScroll} contentContainerStyle={styles.heardScrollContent}>
          <TouchableOpacity
            style={styles.replay}
            onPress={() => speak(heard, language)}
            accessibilityRole="button"
            accessibilityLabel={`Replay: ${heard}`}
            accessibilityHint="Plays the translation again"
          >
            <Text style={[styles.heard, scriptFont(heard, 'bold', 28)]}>{heard}</Text>
            <View style={styles.replayRow}>
              <Feather name="volume-2" size={icon.sm - 2} color={colors.muted} />
              <Text style={styles.replayHint}>Tap to replay</Text>
            </View>
          </TouchableOpacity>
          </ScrollView>
        ) : (
          <Text style={styles.placeholder}>
            {recording ? 'Listening… tap again when done' : 'Tap the mic and speak'}
          </Text>
        )}
        {said && !busy ? (
          <Text style={[styles.said, scriptFont(said)]} numberOfLines={2}>
            You said: {said}
          </Text>
        ) : null}
      </View>

      <MicButton recording={recording} disabled={micDisabled} onPress={onMic} />
    </View>
  );
}

export default function TalkScreen() {
  const { prefs } = usePrefs();
  const savedHistory = useHistory();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // The person opposite speaks the travel language; the phone's owner sits at the bottom
  const [languages, setLanguages] = useState({ top: prefs.travelLanguage, bottom: prefs.myLanguage });
  useEffect(() => setLanguages({ top: prefs.travelLanguage, bottom: prefs.myLanguage }), [prefs.travelLanguage, prefs.myLanguage]);
  const [vibeId, setVibeId] = useState('casual');
  const [recordingSide, setRecordingSide] = useState(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const working = useRef(false); // guards against double taps while async work is in flight
  const recordingRef = useRef(null); // { side, startedAt } while the mic is on
  const autoStopTimer = useRef(null);
  const onMicRef = useRef(null);

  useEffect(
    () => () => {
      Speech.stop();
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    },
    []
  );

  const clearAutoStop = () => {
    if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
    autoStopTimer.current = null;
  };

  // Stops the mic without translating (leaving the screen, app in background, errors).
  const cancelRecording = async () => {
    clearAutoStop();
    const wasRecording = Boolean(recordingRef.current);
    recordingRef.current = null;
    setRecordingSide(null);
    if (wasRecording) {
      try {
        await recorder.stop();
      } catch {}
    }
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  };

  useOnLeave(() => {
    Speech.stop();
    if (recordingRef.current) cancelRecording();
  });

  useEffect(() => () => clearAutoStop(), []);

  const other = (side) => (side === 'top' ? 'bottom' : 'top');
  const latestFrom = (side) => history.find((m) => m.speaker === side);

  const startRecording = async (side) => {
    const { granted, canAskAgain } = await requestRecordingPermissionsAsync();
    if (!granted) {
      permissionAlert('Microphone needed', 'Please allow microphone access so BridgeTalk can hear you.', canAskAgain);
      return;
    }
    Speech.stop();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    haptics.tap();
    recordingRef.current = { side, startedAt: Date.now() };
    setRecordingSide(side);
    autoStopTimer.current = setTimeout(() => onMicRef.current?.(side), MAX_RECORDING_MS);
  };

  const stopAndTranslate = async (side) => {
    const fromLang = languages[side];
    const toLang = languages[other(side)];

    clearAutoStop();
    const startedAt = recordingRef.current?.startedAt ?? Date.now();
    recordingRef.current = null;
    await recorder.stop();
    haptics.tap();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setRecordingSide(null);
    if (Date.now() - startedAt < MIN_RECORDING_MS) {
      Alert.alert('Hold on a moment', 'Tap the mic, say your sentence, then tap again when you are done.');
      return;
    }
    const uri = recorder.uri;
    if (!uri) {
      Alert.alert("Didn't catch that", 'Try again and speak a little louder.');
      return;
    }

    setBusy(true);
    try {
      const text = await transcribe(uri, getLanguage(fromLang)?.whisper);
      if (!isMeaningful(text)) {
        Alert.alert("Didn't catch that", 'Try speaking louder and closer to the phone.');
        return;
      }
      const { translation, pronunciation } = await translateOne(text, fromLang, toLang, vibeId);
      if (!translation) {
        Alert.alert('Hmm, that didn’t work', 'Could not translate that. Please try again.');
        return;
      }
      const message = {
        id: `${Date.now()}`,
        speaker: side,
        original: text,
        translation,
        pronunciation,
        fromLang,
        toLang,
        vibeId,
      };
      setHistory((h) => [message, ...h]);
      savedHistory.add({ kind: 'talk', original: text, translation, pronunciation, from: fromLang, to: toLang, vibeId });
      haptics.success();
      speak(translation, toLang);
    } catch (e) {
      haptics.failure();
      Alert.alert('Oops', friendlyMessage(e, 'talk'));
    } finally {
      setBusy(false);
    }
  };

  const onMic = async (side) => {
    if (working.current) return;
    working.current = true;
    try {
      if (recordingSide === side) await stopAndTranslate(side);
      else if (!recordingSide && !busy) await startRecording(side);
    } catch (e) {
      await cancelRecording();
      devWarn('[BridgeTalk:talk] microphone error', e);
      Alert.alert('Microphone problem', 'Could not use the microphone. Please try again.');
    } finally {
      working.current = false;
    }
  };

  onMicRef.current = onMic;

  const halfProps = (side) => ({
    side,
    language: languages[side],
    onLanguageChange: (name) => setLanguages((l) => ({ ...l, [side]: name })),
    heard: latestFrom(other(side))?.translation,
    said: latestFrom(side)?.original,
    recording: recordingSide === side,
    micDisabled: busy || (recordingSide !== null && recordingSide !== side),
    busy,
    onMic: () => onMic(side),
  });

  const clearHistory = () => {
    Speech.stop();
    setHistory([]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Half {...halfProps('top')} />

      <View style={styles.middle}>
        <View style={styles.chips}>
          <VibeChips value={vibeId} onChange={setVibeId} />
        </View>
        <View>
          <IconButton name="message-circle" onPress={() => setHistoryOpen(true)} accessibilityLabel="Open conversation history" background={colors.raised} />
          {history.length ? (
            <Text style={styles.badge} pointerEvents="none">
              {history.length}
            </Text>
          ) : null}
        </View>
      </View>

      <Half {...halfProps('bottom')} />

      <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <SafeAreaView style={styles.historySafe}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Conversation</Text>
            <View style={styles.historyActions}>
              <TouchableOpacity style={styles.textBtn} onPress={clearHistory} disabled={!history.length} accessibilityRole="button" accessibilityLabel="Clear conversation">
                <Text style={[styles.clear, !history.length && styles.disabledText]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.textBtn} onPress={() => setHistoryOpen(false)} accessibilityRole="button" accessibilityLabel="Close conversation">
                <Text style={styles.done}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={history}
            inverted={history.length > 0}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.historyList}
            ListEmptyComponent={<EmptyState icon="message-circle" title="No messages yet" message="Tap a mic to start talking." />}
            renderItem={({ item }) => {
              const mine = item.speaker === 'bottom';
              return (
                <TouchableOpacity
                  onPress={() => speak(item.translation, item.toLang)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.original}. Translation: ${item.translation}`}
                  accessibilityHint="Plays the translation"
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                >
                  <Text style={styles.bubbleMeta}>
                    {getLanguage(item.fromLang)?.flag} {item.fromLang} → {getLanguage(item.toLang)?.flag} {item.toLang}
                  </Text>
                  <Text style={[styles.bubbleOriginal, scriptFont(item.original)]}>{item.original}</Text>
                  <Text style={[styles.bubbleTranslation, scriptFont(item.translation, 'semibold', 18)]}>{item.translation}</Text>
                  {item.pronunciation ? <Text style={styles.bubblePron}>{item.pronunciation}</Text> : null}
                  <View style={styles.bubbleFooter}>
                    <View style={styles.replayRow}>
                      <Feather name="volume-2" size={icon.sm - 2} color={colors.onAccentSoft} />
                      <Text style={[styles.replayHint, styles.bubbleReplay]}>Tap to replay</Text>
                    </View>
                    <ReportButton
                      compact
                      tint={colors.onAccentSoft}
                      item={{ feature: 'talk', result: item.translation, from: item.fromLang, to: item.toLang, vibe: item.vibeId }}
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  half: { flex: 1, padding: space.lg, justifyContent: 'space-between', alignItems: 'center' },
  rotated: { transform: [{ rotate: '180deg' }] },
  halfHeader: { flexDirection: 'row', width: '72%' },
  messageArea: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', paddingVertical: space.sm, gap: space.sm },
  replay: { minHeight: touch, justifyContent: 'center' },
  heardScroll: { flexGrow: 0, width: '100%' },
  heardScrollContent: { flexGrow: 1, justifyContent: 'center' },
  heard: { color: colors.text, fontSize: 28, textAlign: 'center', lineHeight: 38 },
  replayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: space.xs },
  replayHint: { color: colors.muted, fontSize: 12, fontFamily: fonts.medium, textAlign: 'center' },
  placeholder: { color: colors.muted, fontSize: 17, fontFamily: fonts.regular, textAlign: 'center' },
  said: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  busy: { alignItems: 'center', gap: space.sm },
  busyText: { color: colors.muted, fontSize: 16, fontFamily: fonts.medium },
  micWrap: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: 88, height: 88, borderRadius: 44, backgroundColor: RECORDING },
  mic: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRecording: { backgroundColor: RECORDING },
  micDisabled: { opacity: 0.35 },
  middle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  chips: { flex: 1 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.marigold,
    color: colors.onVibe,
    fontSize: 11,
    fontFamily: fonts.bold,
    textAlign: 'center',
    overflow: 'hidden',
  },
  historySafe: { flex: 1, backgroundColor: colors.bg },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  historyTitle: { color: colors.text, fontSize: 24, fontFamily: fonts.display },
  historyActions: { flexDirection: 'row', gap: space.sm },
  textBtn: { minHeight: touch, minWidth: touch, paddingHorizontal: space.sm, alignItems: 'center', justifyContent: 'center' },
  clear: { color: colors.error, fontSize: 16, fontFamily: fonts.semibold },
  disabledText: { opacity: 0.4 },
  done: { color: colors.accent, fontSize: 16, fontFamily: fonts.bold },
  historyList: { padding: space.lg, gap: space.md, flexGrow: 1 },
  bubble: { maxWidth: '85%', borderRadius: radius.card, padding: space.md + 2, gap: 4 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: 6 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.raised, borderBottomLeftRadius: 6 },
  bubbleMeta: { color: colors.onAccentSoft, fontSize: 11, fontFamily: fonts.medium },
  bubbleOriginal: { color: colors.onAccentSoft, fontSize: 14 },
  bubbleTranslation: { color: colors.onAccent, fontSize: 18 },
  bubblePron: { color: colors.onAccentSoft, fontSize: 13, fontFamily: fonts.regular },
  bubbleReplay: { color: colors.onAccentSoft },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
});

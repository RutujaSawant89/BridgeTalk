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
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import LanguagePicker from '../components/LanguagePicker';
import VibeChips from '../components/VibeChips';
import { getLanguage } from '../languages';
import { transcribe } from '../api';
import { translateOne } from '../translate';
import { friendlyMessage } from '../errors';
import { colors, radius } from '../theme';

const RED = '#ff3b5c';

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
          <Text style={styles.micIcon}>{recording ? '⏹' : '🎙️'}</Text>
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
          <TouchableOpacity onPress={() => speak(heard, language)} accessibilityHint="Plays it again">
            <Text style={styles.heard}>{heard}</Text>
            <Text style={styles.replayHint}>🔊 Tap to replay</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.placeholder}>
            {recording ? 'Listening… tap again when done' : 'Tap the mic and speak'}
          </Text>
        )}
        {said && !busy ? (
          <Text style={styles.said} numberOfLines={2}>
            You said: {said}
          </Text>
        ) : null}
      </View>

      <MicButton recording={recording} disabled={micDisabled} onPress={onMic} />
    </View>
  );
}

export default function TalkScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [languages, setLanguages] = useState({ top: 'Hindi', bottom: 'English' });
  const [vibeId, setVibeId] = useState('casual');
  const [recordingSide, setRecordingSide] = useState(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const working = useRef(false); // guards against double taps while async work is in flight

  useEffect(
    () => () => {
      Speech.stop();
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    },
    []
  );

  const other = (side) => (side === 'top' ? 'bottom' : 'top');
  const latestFrom = (side) => history.find((m) => m.speaker === side);

  const startRecording = async (side) => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      Alert.alert('Microphone needed', 'Please allow microphone access in Settings so BridgeTalk can hear you.');
      return;
    }
    Speech.stop();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecordingSide(side);
  };

  const stopAndTranslate = async (side) => {
    const fromLang = languages[side];
    const toLang = languages[other(side)];

    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setRecordingSide(null);
    const uri = recorder.uri;
    if (!uri) {
      Alert.alert("Didn't catch that", 'Try again and speak a little louder.');
      return;
    }

    setBusy(true);
    try {
      const text = await transcribe(uri, getLanguage(fromLang)?.whisper);
      if (!text || text.replace(/[\s.,!?…]/g, '').length < 2) {
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
      speak(translation, toLang);
    } catch (e) {
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
      setRecordingSide(null);
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      console.warn('[BridgeTalk:talk] microphone error', e);
      Alert.alert('Microphone problem', 'Could not use the microphone. Please try again.');
    } finally {
      working.current = false;
    }
  };

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
        <TouchableOpacity style={styles.historyBtn} onPress={() => setHistoryOpen(true)} accessibilityLabel="Open history">
          <Text style={styles.historyIcon}>💬</Text>
          {history.length ? <Text style={styles.badge}>{history.length}</Text> : null}
        </TouchableOpacity>
      </View>

      <Half {...halfProps('bottom')} />

      <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <SafeAreaView style={styles.historySafe}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Conversation</Text>
            <View style={styles.historyActions}>
              <TouchableOpacity onPress={clearHistory} disabled={!history.length}>
                <Text style={[styles.clear, !history.length && styles.disabledText]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setHistoryOpen(false)}>
                <Text style={styles.done}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={history}
            inverted={history.length > 0}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.historyList}
            ListEmptyComponent={<Text style={styles.empty}>No messages yet. Tap a mic to start talking.</Text>}
            renderItem={({ item }) => {
              const mine = item.speaker === 'bottom';
              return (
                <TouchableOpacity
                  onPress={() => speak(item.translation, item.toLang)}
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                >
                  <Text style={styles.bubbleMeta}>
                    {getLanguage(item.fromLang)?.flag} {item.fromLang} → {getLanguage(item.toLang)?.flag} {item.toLang}
                  </Text>
                  <Text style={styles.bubbleOriginal}>{item.original}</Text>
                  <Text style={styles.bubbleTranslation}>{item.translation}</Text>
                  {item.pronunciation ? <Text style={styles.bubblePron}>🗣 {item.pronunciation}</Text> : null}
                  <Text style={styles.replayHint}>🔊 Tap to replay</Text>
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
  half: { flex: 1, padding: 16, justifyContent: 'space-between', alignItems: 'center' },
  rotated: { transform: [{ rotate: '180deg' }] },
  halfHeader: { flexDirection: 'row', width: '70%' },
  messageArea: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, gap: 8 },
  heard: { color: colors.text, fontSize: 28, fontWeight: '700', textAlign: 'center', lineHeight: 38 },
  replayHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 },
  placeholder: { color: colors.textMuted, fontSize: 17, textAlign: 'center' },
  said: { color: colors.textMuted, fontSize: 14, textAlign: 'center', fontStyle: 'italic' },
  busy: { alignItems: 'center', gap: 8 },
  busyText: { color: colors.textMuted, fontSize: 16 },
  micWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: 84, height: 84, borderRadius: 42, backgroundColor: RED },
  mic: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRecording: { backgroundColor: RED },
  micDisabled: { opacity: 0.35 },
  micIcon: { fontSize: 34, color: '#fff' },
  middle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  chips: { flex: 1 },
  historyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIcon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.accent,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    overflow: 'hidden',
  },
  historySafe: { flex: 1, backgroundColor: colors.bg },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  historyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  historyActions: { flexDirection: 'row', gap: 20 },
  clear: { color: colors.error, fontSize: 16, fontWeight: '600' },
  disabledText: { opacity: 0.4 },
  done: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  historyList: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 15 },
  bubble: { maxWidth: '85%', borderRadius: radius.md, padding: 12, gap: 4 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.cardAlt, borderBottomLeftRadius: 4 },
  bubbleMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  bubbleOriginal: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  bubbleTranslation: { color: '#fff', fontSize: 18, fontWeight: '600' },
  bubblePron: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontStyle: 'italic' },
});

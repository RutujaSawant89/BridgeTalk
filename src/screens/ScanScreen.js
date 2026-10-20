import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Speech from 'expo-speech';
import LanguagePicker from '../components/LanguagePicker';
import { getLanguage } from '../languages';
import { SCAN_MODES, explainImage } from '../scan';
import { friendlyMessage } from '../errors';
import { SkeletonCard } from '../components/Skeleton';
import { usePrefs } from '../prefs';
import * as haptics from '../haptics';
import { colors, fonts, icon as iconSize, radius, scriptFont, space, touch } from '../theme';

const MAX_SIDE = 1400;

// Shrinks the longest side to MAX_SIDE and returns a JPEG { uri, base64 }.
async function prepareImage(asset) {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width || 0, asset.height || 0) > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  return { uri: saved.uri, base64: saved.base64 };
}

function Section({ icon, title, items, color = colors.text, iconColor = colors.accent }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Feather name={icon} size={iconSize.sm + 2} color={iconColor} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={[styles.bulletDot, { backgroundColor: iconColor }]} />
          <Text style={[styles.bullet, scriptFont(item), { color }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ScanScreen() {
  const { prefs } = usePrefs();
  const [modeId, setModeId] = useState('medicine');
  const [language, setLanguage] = useState(prefs.myLanguage);
  useEffect(() => setLanguage(prefs.myLanguage), [prefs.myLanguage]);
  const [photo, setPhoto] = useState(null);
  // { data, language } — the language the explanation was written in, for the voice
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const inFlight = useRef(false); // blocks double taps while the picker or a request is open

  useEffect(() => () => Speech.stop(), []);

  const stopSpeaking = () => {
    Speech.stop();
    setSpeaking(false);
  };

  const pick = async (source) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError('');
    try {
      let picked;
      if (source === 'camera') {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          setError('Camera permission is needed to take a photo. You can allow it in Settings.');
          return;
        }
        picked = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      } else {
        picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      }
      if (picked.canceled || !picked.assets?.length) return;

      stopSpeaking();
      setResult(null);
      setLoading(true);
      const image = await prepareImage(picked.assets[0]);
      setPhoto(image.uri);
      const data = await explainImage(image.base64, modeId, language);
      setResult({ data, language, modeId });
      if (data.readable) haptics.success();
    } catch (e) {
      setError(friendlyMessage(e, 'scan'));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const toggleSpeak = (on) => {
    if (!on || !result?.data.read_aloud) {
      stopSpeaking();
      return;
    }
    setSpeaking(true);
    Speech.stop();
    Speech.speak(result.data.read_aloud, {
      language: getLanguage(result.language)?.tts,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const data = result?.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Scan & explain
        </Text>

        <View style={styles.modes}>
          {SCAN_MODES.map((mode) => {
            const active = mode.id === modeId;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeCard, active && styles.modeCardActive]}
                onPress={() => setModeId(mode.id)}
                accessibilityLabel={`${mode.label} mode: ${mode.hint}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.modeIcon, active && styles.modeIconActive]}>
                  <Feather name={mode.icon} size={iconSize.md} color={active ? colors.onAccent : colors.accent} />
                </View>
                <Text style={styles.modeLabel}>{mode.label}</Text>
                <Text style={styles.modeHint}>{mode.hint}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.langRow}>
          <Text style={styles.langLabel}>Explain in</Text>
          <LanguagePicker label="Explain in" value={language} onChange={setLanguage} />
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.sourceBtn, styles.cameraBtn]} onPress={() => pick('camera')} disabled={loading} accessibilityRole="button" accessibilityLabel="Take a photo with the camera" accessibilityState={{ disabled: loading }}>
            <Feather name="camera" size={iconSize.md} color={colors.onAccent} />
            <Text style={styles.sourceText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sourceBtn} onPress={() => pick('gallery')} disabled={loading} accessibilityRole="button" accessibilityLabel="Choose a photo from the gallery" accessibilityState={{ disabled: loading }}>
            <Feather name="image" size={iconSize.md} color={colors.text} />
            <Text style={styles.sourceText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {photo ? <Image source={{ uri: photo }} style={styles.preview} resizeMode="cover" accessibilityLabel="The photo you picked" /> : null}

        {loading ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Reading your photo…</Text>
            <SkeletonCard lines={4} label="Reading your photo" />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorRow} accessibilityLiveRegion="polite">
            <Feather name="alert-circle" size={iconSize.sm + 2} color={colors.error} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        {data ? (
          <View style={styles.resultCard}>
            {!data.readable ? (
              <View style={styles.unreadableRow}>
                <Feather name="camera-off" size={iconSize.md} color={colors.marigold} />
                <Text style={styles.unreadable}>This photo is hard to read. Try again with these tips:</Text>
              </View>
            ) : null}

            {data.title ? <Text style={[styles.resultTitle, scriptFont(data.title, 'bold')]}>{data.title}</Text> : null}
            {data.summary ? <Text style={[styles.summary, scriptFont(data.summary)]}>{data.summary}</Text> : null}

            {data.read_aloud ? (
              <View style={styles.speakRow}>
                <View style={styles.speakLabelRow}>
                  <Feather name="volume-2" size={iconSize.md} color={colors.text} />
                  <Text style={styles.speakLabel}>Read it to me</Text>
                </View>
                <Switch
                  value={speaking}
                  onValueChange={toggleSpeak}
                  accessibilityLabel="Read it to me"
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor={colors.onAccent}
                />
              </View>
            ) : null}

            <Section icon="list" title="Key points" items={data.key_points} />
            <Section icon="check-circle" title={data.readable ? 'What to do' : 'Tips for a better photo'} items={data.what_to_do} iconColor={colors.success} />
            <Section icon="alert-triangle" title="Warnings" items={data.warnings} color={colors.tipText} iconColor={colors.marigold} />

            {result.modeId === 'medicine' ? (
              <View style={styles.medNote}>
                <Feather name="heart" size={iconSize.md} color={colors.marigold} />
                <Text style={styles.medNoteText}>Always confirm the medicine and dose with a doctor or pharmacist before taking it.</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {data ? (
          <View style={styles.disclaimerRow}>
            <Feather name="cpu" size={iconSize.sm} color={colors.muted} />
            <Text style={styles.disclaimer}>This explanation is made by AI and can be wrong. Check important details yourself or with an expert.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingBottom: space.xxl + space.sm, gap: space.lg },
  title: { color: colors.text, fontSize: 30, fontFamily: fonts.display, letterSpacing: -0.5 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  modeCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.xs,
  },
  modeCardActive: { borderColor: colors.accent, backgroundColor: colors.raised },
  modeIcon: { width: touch, height: touch, borderRadius: radius.md, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  modeIconActive: { backgroundColor: colors.accent },
  modeLabel: { color: colors.text, fontSize: 16, fontFamily: fonts.semibold },
  modeHint: { color: colors.muted, fontSize: 12, fontFamily: fonts.regular },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  langLabel: { color: colors.muted, fontSize: 15, fontFamily: fonts.medium },
  buttons: { flexDirection: 'row', gap: space.md },
  sourceBtn: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cameraBtn: { backgroundColor: colors.accent, borderColor: colors.accent },
  sourceText: { color: colors.text, fontSize: 16, fontFamily: fonts.semibold },
  preview: { width: '100%', height: 200, borderRadius: radius.card, backgroundColor: colors.surface },
  loading: { gap: space.sm, paddingVertical: space.xs },
  loadingText: { color: colors.muted, fontSize: 15, fontFamily: fonts.medium, textAlign: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  error: { color: colors.error, fontSize: 15, fontFamily: fonts.medium, flexShrink: 1 },
  resultCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.xl, gap: space.lg, borderWidth: 1, borderColor: colors.border },
  unreadableRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  unreadable: { color: colors.tipText, fontSize: 15, fontFamily: fonts.semibold, flexShrink: 1 },
  resultTitle: { color: colors.text, fontSize: 22 },
  summary: { color: colors.text, fontSize: 17, lineHeight: 25 },
  speakRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.raised,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  speakLabelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  speakLabel: { color: colors.text, fontSize: 16, fontFamily: fonts.semibold },
  section: { gap: space.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.semibold },
  bulletRow: { flexDirection: 'row', gap: space.sm + 2, paddingLeft: space.xs },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  bullet: { flex: 1, fontSize: 16, lineHeight: 23 },
  medNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.tipBg,
    borderColor: colors.tipBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md + 2,
  },
  medNoteText: { flex: 1, color: colors.tipText, fontSize: 15, fontFamily: fonts.semibold, lineHeight: 21 },
  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.md },
  disclaimer: { flexShrink: 1, color: colors.muted, fontSize: 13, fontFamily: fonts.regular, textAlign: 'center', lineHeight: 19 },
});

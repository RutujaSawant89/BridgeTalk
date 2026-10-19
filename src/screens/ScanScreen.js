import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Speech from 'expo-speech';
import LanguagePicker from '../components/LanguagePicker';
import { getLanguage } from '../languages';
import { SCAN_MODES, explainImage } from '../scan';
import { colors, radius } from '../theme';

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

function Section({ icon, title, items, color = colors.text }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {icon} {title}
      </Text>
      {items.map((item, i) => (
        <Text key={i} style={[styles.bullet, { color }]}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export default function ScanScreen() {
  const [modeId, setModeId] = useState('medicine');
  const [language, setLanguage] = useState('Hindi');
  const [photo, setPhoto] = useState(null);
  // { data, language } — the language the explanation was written in, for the voice
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => Speech.stop(), []);

  const stopSpeaking = () => {
    Speech.stop();
    setSpeaking(false);
  };

  const pick = async (source) => {
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
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
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
        <Text style={styles.title}>Scan & explain</Text>

        <View style={styles.modes}>
          {SCAN_MODES.map((mode) => {
            const active = mode.id === modeId;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeCard, active && styles.modeCardActive]}
                onPress={() => setModeId(mode.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={styles.modeEmoji}>{mode.emoji}</Text>
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
          <TouchableOpacity style={[styles.sourceBtn, styles.cameraBtn]} onPress={() => pick('camera')} disabled={loading}>
            <Text style={styles.sourceText}>📸 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sourceBtn} onPress={() => pick('gallery')} disabled={loading}>
            <Text style={styles.sourceText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>

        {photo ? <Image source={{ uri: photo }} style={styles.preview} resizeMode="cover" /> : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>Reading your photo…</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {data ? (
          <View style={styles.resultCard}>
            {!data.readable ? (
              <Text style={styles.unreadable}>📷 This photo is hard to read. Try again with these tips:</Text>
            ) : null}

            {data.title ? <Text style={styles.resultTitle}>{data.title}</Text> : null}
            {data.summary ? <Text style={styles.summary}>{data.summary}</Text> : null}

            {data.read_aloud ? (
              <View style={styles.speakRow}>
                <Text style={styles.speakLabel}>🔊 Read it to me</Text>
                <Switch
                  value={speaking}
                  onValueChange={toggleSpeak}
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor="#fff"
                />
              </View>
            ) : null}

            <Section icon="📌" title="Key points" items={data.key_points} />
            <Section icon="✅" title={data.readable ? 'What to do' : 'Tips for a better photo'} items={data.what_to_do} />
            <Section icon="⚠️" title="Warnings" items={data.warnings} color={colors.tipText} />

            {result.modeId === 'medicine' ? (
              <Text style={styles.medNote}>
                ⚕️ Always confirm the medicine and dose with a doctor or pharmacist before taking it.
              </Text>
            ) : null}
          </View>
        ) : null}

        {data ? (
          <Text style={styles.disclaimer}>
            🤖 This explanation is made by AI and can be wrong. Check important details yourself or with an expert.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: 'bold' },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.card,
    padding: 14,
    gap: 4,
  },
  modeCardActive: { borderColor: colors.accent, backgroundColor: colors.cardAlt },
  modeEmoji: { fontSize: 28 },
  modeLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  modeHint: { color: colors.textMuted, fontSize: 12 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langLabel: { color: colors.textMuted, fontSize: 15 },
  buttons: { flexDirection: 'row', gap: 10 },
  sourceBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cameraBtn: { backgroundColor: colors.accent, borderColor: colors.accent },
  sourceText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  preview: { width: '100%', height: 200, borderRadius: radius.md, backgroundColor: colors.card },
  loading: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  loadingText: { color: colors.textMuted, fontSize: 15 },
  error: { color: colors.error, fontSize: 15, textAlign: 'center' },
  resultCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 18, gap: 14 },
  unreadable: { color: colors.tipText, fontSize: 15, fontWeight: '600' },
  resultTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  summary: { color: colors.text, fontSize: 17, lineHeight: 25 },
  speakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  speakLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
  section: { gap: 6 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  bullet: { fontSize: 16, lineHeight: 23 },
  medNote: {
    color: colors.tipText,
    backgroundColor: colors.tipBg,
    borderColor: colors.tipBorder,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  disclaimer: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});

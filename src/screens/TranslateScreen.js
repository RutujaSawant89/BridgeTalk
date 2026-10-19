import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Share, Keyboard, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import LanguagePicker from '../components/LanguagePicker';
import VibeChips from '../components/VibeChips';
import GradientButton from '../components/GradientButton';
import { VIBES, getLanguage } from '../languages';
import { translateAllVibes } from '../translate';
import { colors, radius } from '../theme';

export default function TranslateScreen() {
  const [from, setFrom] = useState('English');
  const [to, setTo] = useState('Hindi');
  const [text, setText] = useState('');
  const [vibeId, setVibeId] = useState('casual');
  // { data, to } — remembers which language the result is in, so Listen uses the right voice
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const vibe = VIBES.find((v) => v.id === vibeId);
  const current = result?.data[vibeId];

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const translate = async () => {
    const input = text.trim();
    if (!input) {
      setError('Type something to translate.');
      return;
    }
    Keyboard.dismiss();
    Speech.stop();
    setLoading(true);
    setError('');
    try {
      const data = await translateAllVibes(input, from, to);
      setResult({ data, to });
    } catch (e) {
      setError(e.message || 'Translation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const listen = () => {
    if (!current?.translation) return;
    Speech.stop();
    Speech.speak(current.translation, { language: getLanguage(result.to)?.tts });
  };

  const share = () => {
    if (!current?.translation) return;
    const message = current.pronunciation
      ? `${current.translation}\n(${current.pronunciation})`
      : current.translation;
    Share.share({ message }).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>
          BridgeTalk<Text style={{ color: colors.accent }}>.</Text>
        </Text>

        <View style={styles.pickers}>
          <LanguagePicker label="Translate from" value={from} onChange={setFrom} />
          <TouchableOpacity style={styles.swap} onPress={swap} accessibilityLabel="Swap languages">
            <Text style={styles.swapText}>⇄</Text>
          </TouchableOpacity>
          <LanguagePicker label="Translate to" value={to} onChange={setTo} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Enter text to translate"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
        />

        <VibeChips value={vibeId} onChange={setVibeId} />

        <GradientButton title="Translate" onPress={translate} loading={loading} style={styles.button} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

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
              <TouchableOpacity style={styles.actionBtn} onPress={listen}>
                <Text style={styles.actionText}>🔊 Listen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={share}>
                <Text style={styles.actionText}>📤 Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {result?.data.culture_tip ? (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Culture bite</Text>
            <Text style={styles.tipText}>{result.data.culture_tip}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: 'bold', fontFamily: 'monospace' },
  pickers: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    padding: 16,
    fontSize: 17,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: { marginTop: 4 },
  error: { color: colors.error, fontSize: 15, textAlign: 'center' },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    padding: 18,
    gap: 10,
  },
  vibeTag: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  translation: { color: colors.text, fontSize: 26, fontWeight: '600', lineHeight: 36 },
  pronunciation: { color: colors.textMuted, fontSize: 16, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  tipCard: {
    backgroundColor: colors.tipBg,
    borderColor: colors.tipBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
    gap: 6,
  },
  tipTitle: { color: colors.tipBorder, fontSize: 15, fontWeight: '700' },
  tipText: { color: colors.tipText, fontSize: 15, lineHeight: 21 },
});

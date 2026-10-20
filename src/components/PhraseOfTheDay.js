import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { phraseOfTheDay } from '../phrasebook';
import { getLanguage } from '../languages';
import { colors, radius, space } from '../theme';

// Daily phrase in the travel language (when it's in the phrasebook) plus the streak counter.
export default function PhraseOfTheDay({ language, streak, onUse }) {
  const phrase = useMemo(() => phraseOfTheDay(language), [language]);
  const flag = getLanguage(language)?.flag ?? '';

  const listen = () => {
    if (!phrase.translation) return;
    Speech.stop();
    Speech.speak(phrase.translation, { language: getLanguage(language)?.tts });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>🗓️ Phrase of the day</Text>
        {streak > 0 ? (
          <Text style={styles.streak} accessibilityLabel={`${streak} day streak`}>
            🔥 {streak}-day streak
          </Text>
        ) : null}
      </View>
      <Text style={styles.en}>{phrase.en}</Text>
      {phrase.translation ? (
        <>
          <Text style={styles.translation}>
            {flag} {phrase.translation}
          </Text>
          <Text style={styles.pron}>🗣 {phrase.pronunciation}</Text>
        </>
      ) : null}
      <View style={styles.actions}>
        {phrase.translation ? (
          <TouchableOpacity style={styles.btn} onPress={listen} accessibilityRole="button" accessibilityLabel={`Listen to ${phrase.en} in ${language}`}>
            <Text style={styles.btnText}>🔊 Listen</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.btn} onPress={() => onUse(phrase.en)} accessibilityRole="button" accessibilityLabel={`Translate ${phrase.en}`}>
          <Text style={styles.btnText}>✨ Try all vibes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  streak: { color: '#ffb547', fontSize: 13, fontWeight: '800' },
  en: { color: colors.text, fontSize: 17, fontWeight: '600' },
  translation: { color: colors.text, fontSize: 22, fontWeight: '700' },
  pron: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  btn: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingVertical: space.sm + 2, alignItems: 'center' },
  btnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
});

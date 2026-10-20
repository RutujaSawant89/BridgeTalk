import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import ActionButton from './ActionButton';
import { phraseOfTheDay } from '../phrasebook';
import { getLanguage } from '../languages';
import { colors, fonts, icon, radius, scriptFont, space } from '../theme';

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
        <View style={styles.labelRow}>
          <Feather name="calendar" size={icon.sm} color={colors.muted} />
          <Text style={styles.label}>Phrase of the day</Text>
        </View>
        {streak > 0 ? (
          <View style={styles.streak} accessible accessibilityLabel={`${streak} day streak`}>
            <Feather name="zap" size={icon.sm - 2} color={colors.onVibe} />
            <Text style={styles.streakText}>{streak}-day streak</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.en}>{phrase.en}</Text>
      {phrase.translation ? (
        <>
          <Text style={[styles.translation, scriptFont(phrase.translation, 'bold', 22)]}>
            {flag} {phrase.translation}
          </Text>
          <Text style={styles.pron}>{phrase.pronunciation}</Text>
        </>
      ) : null}
      <View style={styles.actions}>
        {phrase.translation ? (
          <ActionButton icon="volume-2" label="Listen" onPress={listen} accessibilityLabel={`Listen to ${phrase.en} in ${language}`} />
        ) : null}
        <ActionButton icon="layers" label="Try all vibes" onPress={() => onUse(phrase.en)} accessibilityLabel={`Translate ${phrase.en}`} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: space.xl, gap: space.sm, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  label: { color: colors.muted, fontSize: 12, fontFamily: fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.marigold, borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 4 },
  streakText: { color: colors.onVibe, fontSize: 12, fontFamily: fonts.bold },
  en: { color: colors.text, fontSize: 17, fontFamily: fonts.semibold },
  translation: { color: colors.text, fontSize: 22 },
  pron: { color: colors.muted, fontSize: 14, fontFamily: fonts.regular },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
});

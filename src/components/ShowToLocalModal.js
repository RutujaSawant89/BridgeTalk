import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { getLanguage } from '../languages';
import { colors, fonts, icon, paper, radius, scriptFont, space } from '../theme';

const PAPER = paper.bg;
const INK = paper.ink;

// Full-screen, high-contrast text to hold up to someone. phrase: { translation, pronunciation, en, language }
export default function ShowToLocalModal({ phrase, onClose }) {
  if (!phrase) return null;
  const listen = () => {
    Speech.stop();
    Speech.speak(phrase.translation, { language: getLanguage(phrase.language)?.tts });
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.body} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close big text" accessibilityHint="Tap anywhere to close">
          <Text style={[styles.big, scriptFont(phrase.translation, 'bold')]} adjustsFontSizeToFit numberOfLines={6} minimumFontScale={0.4}>
            {phrase.translation}
          </Text>
          {phrase.pronunciation ? <Text style={styles.pron}>{phrase.pronunciation}</Text> : null}
          {phrase.en ? <Text style={styles.en}>{phrase.en}</Text> : null}
        </Pressable>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btn} onPress={listen} accessibilityRole="button" accessibilityLabel="Read it aloud">
            <Feather name="volume-2" size={icon.md} color={colors.onAccent} />
            <Text style={styles.btnText}>Listen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.closeBtn]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Feather name="x" size={icon.md} color={INK} />
            <Text style={[styles.btnText, styles.closeText]}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAPER },
  body: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.lg },
  big: { color: INK, fontSize: 64, textAlign: 'center', lineHeight: 84 },
  pron: { color: paper.inkSoft, fontSize: 22, fontFamily: fonts.medium, textAlign: 'center' },
  en: { color: paper.inkFaint, fontSize: 18, fontFamily: fonts.regular, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: space.md, padding: space.lg },
  btn: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: { backgroundColor: paper.button },
  btnText: { color: colors.onAccent, fontSize: 17, fontFamily: fonts.semibold },
  closeText: { color: INK },
});

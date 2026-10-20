import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { getLanguage } from '../languages';
import { colors, radius, space } from '../theme';

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
          <Text style={styles.big} adjustsFontSizeToFit numberOfLines={6} minimumFontScale={0.4}>
            {phrase.translation}
          </Text>
          {phrase.pronunciation ? <Text style={styles.pron}>{phrase.pronunciation}</Text> : null}
          {phrase.en ? <Text style={styles.en}>{phrase.en}</Text> : null}
        </Pressable>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btn} onPress={listen} accessibilityRole="button" accessibilityLabel="Read it aloud">
            <Text style={styles.btnText}>🔊 Listen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.closeBtn]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={[styles.btnText, styles.closeText]}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  body: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.lg },
  big: { color: '#111114', fontSize: 64, fontWeight: '800', textAlign: 'center', lineHeight: 80 },
  pron: { color: '#444', fontSize: 22, textAlign: 'center' },
  en: { color: '#888', fontSize: 18, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: space.md, padding: space.lg },
  btn: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: space.lg, alignItems: 'center' },
  closeBtn: { backgroundColor: '#e8e8ee' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  closeText: { color: '#111114' },
});

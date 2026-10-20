import React, { useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Share, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { getLanguage, VIBES } from '../languages';
import { colors, gradient, radius, space } from '../theme';

// item: { original, translation, pronunciation, from, to, vibeId }
export default function ShareCardModal({ item, onClose }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!item) return null;
  const from = getLanguage(item.from);
  const to = getLanguage(item.to);
  const vibe = VIBES.find((v) => v.id === item.vibeId);
  const asText = `${item.translation}${item.pronunciation ? `\n(${item.pronunciation})` : ''}\n\n"${item.original}"\n— Translated with BridgeTalk`;

  const shareImage = async () => {
    setBusy(true);
    setError('');
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share translation' });
      } else {
        await Share.share({ message: asText });
      }
    } catch (e) {
      console.warn('[BridgeTalk] share image failed', e);
      setError("Couldn't create the image. You can share it as text instead.");
    } finally {
      setBusy(false);
    }
  };

  const shareText = () => Share.share({ message: asText }).catch(() => {});

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* This view is what gets captured as the image */}
        <View ref={cardRef} collapsable={false} style={styles.cardWrap}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <Text style={styles.langs}>
              {from?.flag} {item.from} → {to?.flag} {item.to}
              {vibe ? `   ${vibe.emoji} ${vibe.label}` : ''}
            </Text>
            <Text style={styles.original}>“{item.original}”</Text>
            <Text style={styles.translation}>{item.translation}</Text>
            {item.pronunciation ? <Text style={styles.pron}>🗣 {item.pronunciation}</Text> : null}
            <View style={styles.footer}>
              <Text style={styles.brand}>
                Translated with BridgeTalk<Text style={styles.dot}>.</Text>
              </Text>
            </View>
          </LinearGradient>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.primary]} onPress={shareImage} disabled={busy} accessibilityRole="button" accessibilityLabel="Share as image">
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>🖼️ Share image</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={shareText} accessibilityRole="button" accessibilityLabel="Share as text">
            <Text style={styles.btnText}>📝 Text</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: space.xl, gap: space.lg },
  cardWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  card: { padding: space.xl + 4, gap: space.md },
  langs: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  original: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontStyle: 'italic' },
  translation: { color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 40 },
  pron: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
  footer: { marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)' },
  brand: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' },
  dot: { color: '#c9b8ff' },
  error: { color: colors.error, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: space.md },
  btn: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingVertical: space.md + 2, alignItems: 'center' },
  primary: { backgroundColor: colors.accent, flex: 2 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  close: { alignSelf: 'center', padding: space.sm },
  closeText: { color: colors.textMuted, fontSize: 15 },
});

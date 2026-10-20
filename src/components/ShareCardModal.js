import React, { useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Share, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { getLanguage, VIBES } from '../languages';
import { colors, fonts, gradient, icon, radius, scriptFont, space, touch } from '../theme';

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
            <View style={styles.metaRow}>
              <Text style={styles.langs}>
                {from?.flag} {item.from} → {to?.flag} {item.to}
              </Text>
              {vibe ? (
                <View style={[styles.vibeTag, { backgroundColor: vibe.color }]}>
                  <Feather name={vibe.icon} size={12} color={colors.onVibe} />
                  <Text style={styles.vibeText}>{vibe.label}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.original, scriptFont(item.original)]}>“{item.original}”</Text>
            <Text style={[styles.translation, scriptFont(item.translation, 'bold')]}>{item.translation}</Text>
            {item.pronunciation ? <Text style={styles.pron}>{item.pronunciation}</Text> : null}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Translated with</Text>
              <Text style={styles.brand}>
                BridgeTalk<Text style={styles.dot}>.</Text>
              </Text>
            </View>
          </LinearGradient>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.primary]} onPress={shareImage} disabled={busy} accessibilityRole="button" accessibilityLabel="Share as image">
            {busy ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <>
                <Feather name="image" size={icon.md} color={colors.onAccent} />
                <Text style={styles.btnText}>Share image</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={shareText} accessibilityRole="button" accessibilityLabel="Share as text">
            <Feather name="type" size={icon.md} color={colors.text} />
            <Text style={styles.btnText}>Text</Text>
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
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', padding: space.xl, gap: space.lg },
  cardWrap: { borderRadius: radius.card, overflow: 'hidden' },
  card: { padding: space.xl + 4, gap: space.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  langs: { color: colors.onAccentSoft, fontSize: 13, fontFamily: fonts.semibold, flexShrink: 1 },
  vibeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 4 },
  vibeText: { color: colors.onVibe, fontSize: 12, fontFamily: fonts.bold },
  original: { color: colors.onAccentSoft, fontSize: 16 },
  translation: { color: colors.onAccent, fontSize: 30, lineHeight: 42 },
  pron: { color: colors.onAccentSoft, fontSize: 16, fontFamily: fonts.regular },
  footer: { marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.onAccentFaint, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 6 },
  footerText: { color: colors.onAccentSoft, fontSize: 13, fontFamily: fonts.medium },
  brand: { color: colors.onAccent, fontSize: 18, fontFamily: fonts.display },
  dot: { color: colors.marigold },
  error: { color: colors.error, textAlign: 'center', fontFamily: fonts.regular },
  actions: { flexDirection: 'row', gap: space.md },
  btn: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.raised,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent, flex: 2 },
  btnText: { color: colors.onAccent, fontSize: 16, fontFamily: fonts.semibold },
  close: { alignSelf: 'center', minHeight: touch, minWidth: touch * 2, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.muted, fontSize: 15, fontFamily: fonts.medium },
});

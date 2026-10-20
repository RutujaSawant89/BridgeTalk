import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Pressable, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import GradientButton from './GradientButton';
import { sendReport } from '../api';
import { friendlyMessage } from '../errors';
import { colors, fonts, icon, radius, space, touch } from '../theme';

const REASONS = [
  { id: 'offensive', label: 'Offensive', icon: 'alert-octagon' },
  { id: 'wrong_translation', label: 'Wrong translation', icon: 'x-circle' },
  { id: 'other', label: 'Other', icon: 'more-horizontal' },
];

const THANKS_MS = 1600;

// Small flag button for an AI result; opens a sheet to report it.
// item: { feature: 'translate' | 'talk' | 'scan', result, from, to, vibe }
export default function ReportButton({ item, compact = false, tint = colors.muted, style }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const closeTimer = useRef(null);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const reset = () => {
    setReason(null);
    setNote('');
    setSent(false);
    setError('');
  };
  const close = () => {
    clearTimeout(closeTimer.current);
    setOpen(false);
    reset();
  };

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError('');
    try {
      await sendReport({ ...item, reason, note: note.trim() });
      setSent(true);
      closeTimer.current = setTimeout(close, THANKS_MS);
    } catch (e) {
      setError(friendlyMessage(e, 'report'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[compact ? styles.compact : styles.button, style]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Report this result"
        accessibilityHint="Opens options to report an offensive or wrong result"
        hitSlop={compact ? 8 : 0}
      >
        <Feather name="flag" size={compact ? icon.sm - 2 : icon.sm + 2} color={tint} />
        {compact ? <Text style={[styles.compactText, { color: tint }]}>Report</Text> : null}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView style={styles.root} behavior="padding">
          <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel="Close report" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={styles.handle} />
            {sent ? (
              <View style={styles.thanks} accessibilityLiveRegion="polite">
                <Feather name="check-circle" size={icon.xl} color={colors.success} />
                <Text style={styles.thanksText}>Thanks, we'll review it</Text>
              </View>
            ) : (
              <>
                <Text style={styles.title}>Report this result</Text>
                <Text style={styles.subtitle}>Only the AI result is sent, not what you typed or said.</Text>
                <View style={styles.reasons}>
                  {REASONS.map((r) => {
                    const active = r.id === reason;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[styles.reason, active && styles.reasonActive]}
                        onPress={() => setReason(r.id)}
                        accessibilityRole="radio"
                        accessibilityLabel={r.label}
                        accessibilityState={{ checked: active }}
                      >
                        <Feather name={r.icon} size={icon.md} color={active ? colors.onAccent : colors.muted} />
                        <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{r.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.note}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a note (optional). Please don't include personal details."
                  placeholderTextColor={colors.muted}
                  multiline
                  maxLength={300}
                  textAlignVertical="top"
                  accessibilityLabel="Optional note"
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <GradientButton title="Send report" icon="send" onPress={submit} loading={sending} disabled={!reason} />
                <TouchableOpacity style={styles.cancel} onPress={close} accessibilityRole="button" accessibilityLabel="Cancel">
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: touch, minHeight: touch, borderRadius: radius.md, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center' },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: touch, paddingHorizontal: space.xs },
  compactText: { fontSize: 12, fontFamily: fonts.medium },
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: space.xl, paddingTop: space.sm, gap: space.md },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: space.sm },
  title: { color: colors.text, fontSize: 22, fontFamily: fonts.display },
  subtitle: { color: colors.muted, fontSize: 14, fontFamily: fonts.regular, marginTop: -space.xs },
  reasons: { gap: space.sm },
  reason: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: colors.raised, borderWidth: 1.5, borderColor: colors.border },
  reasonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  reasonText: { color: colors.text, fontSize: 16, fontFamily: fonts.semibold },
  reasonTextActive: { color: colors.onAccent },
  note: { minHeight: 80, backgroundColor: colors.bg, color: colors.text, borderRadius: radius.md, padding: space.md, fontSize: 15, fontFamily: fonts.regular, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.error, fontSize: 14, fontFamily: fonts.medium, textAlign: 'center' },
  cancel: { minHeight: touch, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontSize: 15, fontFamily: fonts.medium },
  thanks: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  thanksText: { color: colors.text, fontSize: 18, fontFamily: fonts.semibold },
});

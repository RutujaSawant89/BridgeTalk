import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguagePicker from '../components/LanguagePicker';
import GradientButton from '../components/GradientButton';
import { usePrefs } from '../prefs';
import { useHistory } from '../history';
import { colors, radius, space } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { prefs, update } = usePrefs();
  const { clearUnstarred } = useHistory();
  const [allergies, setAllergies] = useState(prefs.allergies);
  const [address, setAddress] = useState(prefs.address);
  const dirty = allergies.trim() !== prefs.allergies || address.trim() !== prefs.address;

  const save = () => {
    update({ allergies: allergies.trim(), address: address.trim() });
    navigation.goBack();
  };

  const replayIntro = () => {
    update({ onboarded: false });
    navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
  };

  const confirmClear = () =>
    Alert.alert('Clear history?', 'Saved (starred) translations are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearUnstarred },
    ]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.back} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>Languages</Text>
          <View style={styles.field}>
            <Text style={styles.label}>I speak</Text>
            <View style={styles.row}>
              <LanguagePicker label="I speak" value={prefs.myLanguage} onChange={(myLanguage) => update({ myLanguage })} />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>I'm travelling to</Text>
            <View style={styles.row}>
              <LanguagePicker label="I'm travelling to" value={prefs.travelLanguage} onChange={(travelLanguage) => update({ travelLanguage })} />
            </View>
          </View>

          <Text style={styles.section}>🆘 SOS card</Text>
          <Text style={styles.help}>Shown on your SOS card in the local language. Stored only on this phone.</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Allergies</Text>
            <TextInput
              style={styles.input}
              value={allergies}
              onChangeText={setAllergies}
              placeholder="e.g. peanuts, penicillin"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Allergies"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Hotel address</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={address}
              onChangeText={setAddress}
              placeholder="Hotel name and full address (paste it in the local script if you can)"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Hotel address"
            />
          </View>
          <GradientButton title={dirty ? 'Save' : 'Done'} onPress={save} />

          <Text style={styles.section}>More</Text>
          <TouchableOpacity style={styles.link} onPress={replayIntro} accessibilityRole="button" accessibilityLabel="Show the intro again">
            <Text style={styles.linkText}>👋 Show the intro again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.link} onPress={confirmClear} accessibilityRole="button" accessibilityLabel="Clear history">
            <Text style={[styles.linkText, { color: colors.error }]}>🗑️ Clear history</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.md },
  back: { width: 70 },
  backText: { color: colors.accent, fontSize: 17, fontWeight: '600' },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.lg },
  section: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: space.sm },
  help: { color: colors.textMuted, fontSize: 14, marginTop: -space.sm },
  field: { gap: space.sm },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row' },
  input: { backgroundColor: colors.card, color: colors.text, borderRadius: radius.sm, paddingHorizontal: space.lg, paddingVertical: space.md, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  multiline: { minHeight: 90 },
  link: { backgroundColor: colors.card, borderRadius: radius.sm, padding: space.lg },
  linkText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});

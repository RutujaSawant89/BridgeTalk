import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import LanguagePicker from '../components/LanguagePicker';
import GradientButton from '../components/GradientButton';
import IconButton from '../components/IconButton';
import { usePrefs } from '../prefs';
import { useHistory } from '../history';
import { colors, fonts, icon, radius, space } from '../theme';

function LinkRow({ iconName, label, onPress, danger, accessibilityLabel }) {
  const tint = danger ? colors.error : colors.text;
  return (
    <TouchableOpacity style={styles.link} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}>
      <Feather name={iconName} size={icon.md} color={tint} />
      <Text style={[styles.linkText, { color: tint }]}>{label}</Text>
      <Feather name="chevron-right" size={icon.md} color={colors.muted} />
    </TouchableOpacity>
  );
}

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
        <IconButton name="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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

          <View style={styles.sectionRow}>
            <Feather name="alert-triangle" size={icon.md} color={colors.error} />
            <Text style={styles.section}>SOS card</Text>
          </View>
          <Text style={styles.help}>Shown on your SOS card in the local language. Stored only on this phone.</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Allergies</Text>
            <TextInput
              style={styles.input}
              value={allergies}
              onChangeText={setAllergies}
              placeholder="e.g. peanuts, penicillin"
              maxLength={200}
              placeholderTextColor={colors.muted}
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
              maxLength={400}
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Hotel address"
            />
          </View>
          <GradientButton title={dirty ? 'Save' : 'Done'} icon={dirty ? 'check' : undefined} onPress={save} />

          <Text style={styles.section}>More</Text>
          <View style={styles.links}>
            <LinkRow iconName="play-circle" label="Show the intro again" onPress={replayIntro} />
            <LinkRow iconName="trash-2" label="Clear history" onPress={confirmClear} danger />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.md },
  title: { color: colors.text, fontSize: 30, fontFamily: fonts.display, letterSpacing: -0.5 },
  content: { padding: space.xl, paddingTop: space.sm, paddingBottom: space.xxl, gap: space.lg },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  section: { color: colors.text, fontSize: 18, fontFamily: fonts.semibold, marginTop: space.sm },
  help: { color: colors.muted, fontSize: 14, fontFamily: fonts.regular, marginTop: -space.sm },
  field: { gap: space.sm },
  label: { color: colors.muted, fontSize: 14, fontFamily: fonts.medium },
  row: { flexDirection: 'row' },
  input: {
    minHeight: 48,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: { minHeight: 96 },
  links: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  link: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  linkText: { flex: 1, fontSize: 16, fontFamily: fonts.medium },
});


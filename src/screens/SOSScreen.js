import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import LanguagePicker from '../components/LanguagePicker';
import IconButton from '../components/IconButton';
import { chatJSON } from '../api';
import { sosText } from '../phrasebook';
import { getLanguage } from '../languages';
import { loadJSON, saveJSON } from '../storage';
import { usePrefs } from '../prefs';
import { fonts, icon, radius, scriptFont, space, sos, touch } from '../theme';

const ENGLISH = sosText('English');
const cacheKey = (language) => `bridgetalk:sos:${language}`;

// One request for whatever is missing: the four fixed lines (non-phrasebook languages) and the allergy list.
async function translateSos(language, allergies, needLines) {
  const wanted = { ...(needLines ? ENGLISH : {}), ...(allergies ? { allergies } : {}) };
  const data = await chatJSON(
    [
      {
        role: 'system',
        content: `Translate each value of the user's JSON object from English into ${language}, in its native script. This is an emergency card shown to a local, so keep it short, clear and polite. Keep medical terms accurate. Return a JSON object with exactly the same keys.`,
      },
      { role: 'user', content: JSON.stringify(wanted) },
    ],
    { temperature: 0, maxTokens: 800 }
  );
  return data;
}

export default function SOSScreen({ navigation }) {
  const { prefs } = usePrefs();
  const [language, setLanguage] = useState(prefs.travelLanguage);
  const [lines, setLines] = useState(sosText(prefs.travelLanguage));
  const [allergiesText, setAllergiesText] = useState(prefs.allergies);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    const offline = sosText(language);
    setLines(offline);
    setAllergiesText(prefs.allergies);
    setNotice('');

    (async () => {
      const cached = await loadJSON(cacheKey(language), null);
      if (cancelled) return;
      if (!offline && cached?.lines) setLines(cached.lines);
      const allergyCached = cached?.allergiesSource === prefs.allergies ? cached.allergies : null;
      if (allergyCached) setAllergiesText(allergyCached);

      const needLines = !offline && !cached?.lines;
      const needAllergies = Boolean(prefs.allergies) && !allergyCached && language !== 'English';
      if (!needLines && !needAllergies) return;

      setLoading(true);
      try {
        const data = await translateSos(language, needAllergies ? prefs.allergies : '', needLines);
        if (cancelled) return;
        const next = { ...(cached ?? {}) };
        if (needLines && ['help', 'ambulance', 'allergic', 'address'].every((k) => data[k])) {
          next.lines = { help: data.help, ambulance: data.ambulance, allergic: data.allergic, address: data.address };
          setLines(next.lines);
        }
        if (needAllergies && data.allergies) {
          next.allergies = data.allergies;
          next.allergiesSource = prefs.allergies;
          setAllergiesText(data.allergies);
        }
        saveJSON(cacheKey(language), next);
      } catch (e) {
        console.warn('[BridgeTalk:sos] translation failed', e?.kind, e?.message);
        if (!cancelled) setNotice(`Couldn't translate right now${needLines ? ', showing English' : ''}. Connect to the internet once and it will be saved for offline use.`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [language, prefs.allergies]);

  useEffect(() => () => Speech.stop(), []);

  const shown = lines ?? ENGLISH;
  const tts = getLanguage(lines ? language : 'English')?.tts;

  const readAloud = () => {
    Speech.stop();
    const parts = [shown.help, shown.ambulance];
    if (prefs.allergies) parts.push(`${shown.allergic} ${allergiesText}`);
    Speech.speak(parts.join(' '), { language: tts });
  };

  const missingDetails = !prefs.allergies || !prefs.address;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View style={styles.pickerWrap}>
          <LanguagePicker label="SOS language" value={language} onChange={setLanguage} />
        </View>
        <IconButton name="x" onPress={() => navigation.goBack()} accessibilityLabel="Close SOS card" background={sos.bgDark} color={sos.text} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badgeRow}>
          <Feather name="alert-triangle" size={icon.md} color={sos.soft} />
          <Text style={styles.badge}>EMERGENCY</Text>
          {loading ? <ActivityIndicator color={sos.text} accessibilityLabel="Translating" /> : null}
        </View>

        <Line text={shown.help} english={ENGLISH.help} big />
        <Line text={shown.ambulance} english={ENGLISH.ambulance} big />

        {prefs.allergies ? (
          <Line text={`${shown.allergic} ${allergiesText}`} english={`${ENGLISH.allergic} ${prefs.allergies}`} />
        ) : null}

        {prefs.address ? (
          <View style={styles.block}>
            <Text style={[styles.line, scriptFont(shown.address, 'bold')]}>{shown.address}</Text>
            <Text style={[styles.address, scriptFont(prefs.address, 'bold')]} selectable>
              {prefs.address}
            </Text>
            <Text style={styles.english}>{ENGLISH.address}</Text>
          </View>
        ) : null}

        {notice ? (
          <View style={styles.notice}>
            <Feather name="wifi-off" size={icon.sm + 2} color={sos.text} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {missingDetails ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Add your allergies and hotel address">
            <Feather name="plus-circle" size={icon.md} color={sos.text} />
            <Text style={styles.addText}>Add {!prefs.allergies && !prefs.address ? 'your allergies and hotel address' : !prefs.allergies ? 'your allergies' : 'your hotel address'}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.bigBtn} onPress={readAloud} accessibilityRole="button" accessibilityLabel="Read the SOS card aloud">
          <Feather name="volume-2" size={icon.lg} color={sos.bg} />
          <Text style={styles.bigBtnText}>Read aloud</Text>
        </TouchableOpacity>
        {!missingDetails ? (
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Edit allergies and address">
            <Feather name="edit-2" size={icon.md} color={sos.text} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Line({ text, english, big }) {
  return (
    <View style={styles.block}>
      <Text style={[styles.line, big && styles.lineBig, scriptFont(text, 'bold')]}>{text}</Text>
      {english && english !== text ? <Text style={styles.english}>{english}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sos.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  pickerWrap: { flex: 1, flexDirection: 'row' },
  content: { padding: space.xl, gap: space.xl },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: { color: sos.soft, fontSize: 15, fontFamily: fonts.bold, letterSpacing: 2 },
  block: { gap: space.xs },
  line: { color: sos.text, fontSize: 26, lineHeight: 36 },
  lineBig: { fontSize: 34, lineHeight: 46 },
  address: { color: sos.text, fontSize: 24, backgroundColor: sos.bgDark, borderRadius: radius.md, padding: space.lg, marginTop: space.xs, overflow: 'hidden' },
  english: { color: sos.soft, fontSize: 15, fontFamily: fonts.regular },
  notice: { flexDirection: 'row', gap: space.sm, backgroundColor: sos.bgDark, borderRadius: radius.md, padding: space.md },
  noticeText: { flex: 1, color: sos.text, fontSize: 14, fontFamily: fonts.regular, lineHeight: 20 },
  addBtn: {
    minHeight: 56,
    flexDirection: 'row',
    gap: space.sm,
    borderWidth: 2,
    borderColor: sos.text,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    padding: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: sos.text, fontSize: 16, fontFamily: fonts.semibold, flexShrink: 1 },
  bottom: { flexDirection: 'row', gap: space.md, padding: space.lg },
  bigBtn: { flex: 1, minHeight: 56, flexDirection: 'row', gap: space.sm, backgroundColor: sos.text, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bigBtnText: { color: sos.bg, fontSize: 18, fontFamily: fonts.bold },
  editBtn: { minHeight: 56, minWidth: touch * 2, flexDirection: 'row', gap: space.sm, backgroundColor: sos.bgDark, borderRadius: radius.md, paddingHorizontal: space.xl, alignItems: 'center', justifyContent: 'center' },
  editText: { color: sos.text, fontSize: 16, fontFamily: fonts.semibold },
});

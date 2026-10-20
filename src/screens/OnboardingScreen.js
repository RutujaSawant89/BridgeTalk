import React, { useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguagePicker from '../components/LanguagePicker';
import GradientButton from '../components/GradientButton';
import { usePrefs } from '../prefs';
import { colors, radius, space } from '../theme';

const SLIDES = [
  {
    key: 'translate',
    emoji: '🌐',
    title: 'Translate with a vibe',
    body: 'Type anything and get it formal, casual, like a local or straight out of a movie, with pronunciation to say it right.',
  },
  {
    key: 'talk',
    emoji: '🎙️',
    title: 'Talk face to face',
    body: 'Put the phone between you and a local. Each of you taps your mic, and BridgeTalk speaks the translation out loud.',
  },
  {
    key: 'scan',
    emoji: '📷',
    title: 'Scan menus, signs & bills',
    body: 'Point your camera at a menu, sign, bill or medicine and get it explained in your own language, in simple words.',
  },
  { key: 'setup' },
];

export default function OnboardingScreen({ navigation }) {
  const { prefs, update } = usePrefs();
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [myLanguage, setMyLanguage] = useState(prefs.myLanguage);
  const [travelLanguage, setTravelLanguage] = useState(prefs.travelLanguage);
  const last = SLIDES.length - 1;

  // Set the step directly: iOS doesn't fire onMomentumScrollEnd for programmatic scrolls
  const goTo = (i) => {
    setIndex(i);
    listRef.current?.scrollToIndex({ index: i, animated: true });
  };

  const finish = () => {
    update({ onboarded: true, myLanguage, travelLanguage });
    navigation.replace('Home');
  };

  const renderSlide = ({ item }) => {
    if (item.key === 'setup') {
      return (
        <View style={[styles.slide, { width }]}>
          <Text style={styles.emoji}>✈️</Text>
          <Text style={styles.title}>Where are you headed?</Text>
          <Text style={styles.body}>We'll use these everywhere in the app. You can change them any time in Settings.</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>I speak</Text>
            <View style={styles.pickerRow}>
              <LanguagePicker label="I speak" value={myLanguage} onChange={setMyLanguage} />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>I'm travelling to a place that speaks</Text>
            <View style={styles.pickerRow}>
              <LanguagePicker label="I'm travelling to" value={travelLanguage} onChange={setTravelLanguage} />
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.slide, { width }]}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>
          BridgeTalk<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        {index < last ? (
          <TouchableOpacity onPress={() => goTo(last)} accessibilityRole="button" accessibilityLabel="Skip intro" hitSlop={10}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      />

      <View style={styles.bottom}>
        <View style={styles.dots} accessible accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        {index < last ? (
          <GradientButton title="Next" onPress={() => goTo(index + 1)} />
        ) : (
          <GradientButton title="Let's go 🚀" onPress={finish} accessibilityLabel="Finish setup and start using BridgeTalk" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.md },
  brand: { color: colors.text, fontSize: 22, fontWeight: 'bold', fontFamily: 'monospace' },
  skip: { color: colors.textMuted, fontSize: 16 },
  slide: { flex: 1, paddingHorizontal: space.xxl, justifyContent: 'center', gap: space.lg },
  emoji: { fontSize: 72, textAlign: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 17, lineHeight: 25, textAlign: 'center' },
  field: { gap: space.sm },
  fieldLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  pickerRow: { flexDirection: 'row' },
  bottom: { padding: space.xl, gap: space.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.accent },
});

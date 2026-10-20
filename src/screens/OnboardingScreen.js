import React, { useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import LanguagePicker from '../components/LanguagePicker';
import GradientButton from '../components/GradientButton';
import { usePrefs } from '../prefs';
import { colors, fonts, icon, radius, space, touch } from '../theme';

const SLIDES = [
  {
    key: 'translate',
    icon: 'globe',
    title: 'Translate with a vibe',
    body: 'Type anything and get it formal, casual, like a local or straight out of a movie, with pronunciation to say it right.',
  },
  {
    key: 'talk',
    icon: 'mic',
    title: 'Talk face to face',
    body: 'Put the phone between you and a local. Each of you taps your mic, and BridgeTalk speaks the translation out loud.',
  },
  {
    key: 'scan',
    icon: 'camera',
    title: 'Scan menus, signs & bills',
    body: 'Point your camera at a menu, sign, bill or medicine and get it explained in your own language, in simple words.',
  },
  { key: 'setup', icon: 'send', title: 'Where are you headed?' },
];

function Hero({ name }) {
  return (
    <View style={styles.hero}>
      <Feather name={name} size={icon.hero} color={colors.accent} />
    </View>
  );
}

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

  const finishing = useRef(false);
  const finish = () => {
    if (finishing.current) return; // a double tap would replace the screen twice
    finishing.current = true;
    update({ onboarded: true, myLanguage, travelLanguage });
    navigation.replace('Home');
  };

  const renderSlide = ({ item }) => {
    if (item.key === 'setup') {
      return (
        <View style={[styles.slide, { width }]}>
          <Hero name={item.icon} />
          <Text style={styles.title}>{item.title}</Text>
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
        <Hero name={item.icon} />
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
          <TouchableOpacity style={styles.skip} onPress={() => goTo(last)} accessibilityRole="button" accessibilityLabel="Skip intro">
            <Text style={styles.skipText}>Skip</Text>
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
          <GradientButton title="Next" icon="arrow-right" onPress={() => goTo(index + 1)} />
        ) : (
          <GradientButton title="Let's go" icon="check" onPress={finish} accessibilityLabel="Finish setup and start using BridgeTalk" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.sm },
  brand: { color: colors.text, fontSize: 24, fontFamily: fonts.display, letterSpacing: -0.5 },
  skip: { minHeight: touch, minWidth: touch, alignItems: 'flex-end', justifyContent: 'center' },
  skipText: { color: colors.muted, fontSize: 16, fontFamily: fonts.medium },
  slide: { flex: 1, paddingHorizontal: space.xxl, justifyContent: 'center', gap: space.lg },
  hero: { alignSelf: 'center', width: 112, height: 112, borderRadius: 56, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  title: { color: colors.text, fontSize: 32, fontFamily: fonts.display, textAlign: 'center', letterSpacing: -0.5, lineHeight: 38 },
  body: { color: colors.muted, fontSize: 17, fontFamily: fonts.regular, lineHeight: 25, textAlign: 'center' },
  field: { gap: space.sm },
  fieldLabel: { color: colors.muted, fontSize: 14, fontFamily: fonts.medium },
  pickerRow: { flexDirection: 'row' },
  bottom: { padding: space.xl, gap: space.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.accent },
});

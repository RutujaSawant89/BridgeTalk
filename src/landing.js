import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import GradientButton from './components/GradientButton';
import { colors, fonts, space } from './theme';

export default function Landing() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      <View style={styles.body}>
        <LottieView source={require('../assets/landing.json')} autoPlay loop style={styles.animation} />
        <Text style={styles.logo} accessibilityRole="header">
          BridgeTalk<Text style={styles.dot}>.</Text>
        </Text>
        <Text style={styles.msg}>No matter the language, your message matters. BridgeTalk makes sure you're always understood.</Text>
      </View>
      <GradientButton title="Get Started" icon="arrow-right" onPress={() => navigation.replace('Home')} accessibilityLabel="Get started" style={styles.button} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: space.xl },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  animation: { width: 300, height: 190 },
  logo: { color: colors.text, fontSize: 44, fontFamily: fonts.display, letterSpacing: -1 },
  dot: { color: colors.accent },
  msg: { color: colors.muted, fontSize: 17, fontFamily: fonts.regular, lineHeight: 25, textAlign: 'center', paddingHorizontal: space.md },
  button: { marginBottom: space.lg },
});

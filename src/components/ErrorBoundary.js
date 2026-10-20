import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import GradientButton from './GradientButton';
import { colors, fonts, icon, space } from '../theme';

// Catches render crashes anywhere below it and offers a restart instead of a blank screen.
export default class ErrorBoundary extends React.Component {
  state = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[BridgeTalk] crash caught by ErrorBoundary', error, info?.componentStack);
  }

  restart = () => this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <View style={styles.badge}>
            <Feather name="alert-octagon" size={icon.xl} color={colors.marigold} />
          </View>
          <Text style={styles.title}>Oops, something broke</Text>
          <Text style={styles.body}>Sorry about that. Tap restart to get back to translating.</Text>
          <GradientButton title="Restart" icon="refresh-cw" onPress={this.restart} style={styles.button} />
        </View>
      );
    }
    // A new key remounts the whole tree, so the app starts fresh after a restart.
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

// Fonts may not be loaded yet if the crash happens early, so the system font is an acceptable fallback here.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  badge: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 24, fontFamily: fonts.display, textAlign: 'center' },
  body: { color: colors.muted, fontSize: 16, fontFamily: fonts.regular, textAlign: 'center', lineHeight: 22 },
  button: { alignSelf: 'stretch', marginTop: space.md },
});

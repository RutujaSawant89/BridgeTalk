import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GradientButton from './GradientButton';
import { colors } from '../theme';

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
          <Text style={styles.emoji}>😵‍💫</Text>
          <Text style={styles.title}>Oops, something broke</Text>
          <Text style={styles.body}>Sorry about that. Tap restart to get back to translating.</Text>
          <GradientButton title="Restart" onPress={this.restart} style={styles.button} />
        </View>
      );
    }
    // A new key remounts the whole tree, so the app starts fresh after a restart.
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emoji: { fontSize: 56 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  button: { alignSelf: 'stretch', marginTop: 12 },
});

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useServerWaking } from '../serverStatus';
import { colors, fonts, space } from '../theme';

// Shown while the first request of the session is slow: the free server is waking up.
export default function ServerWakingBanner() {
  const waking = useServerWaking();
  const { isConnected } = useNetInfo();
  const insets = useSafeAreaInsets();
  if (!waking || isConnected === false) return null; // the offline banner takes priority

  return (
    <View style={[styles.banner, { paddingTop: insets.top + space.xs + 2 }]} pointerEvents="none" accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={colors.onAccent} />
      <Text style={styles.text}>Waking up the server… this can take up to a minute the first time.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    paddingBottom: space.sm,
    paddingHorizontal: space.lg,
  },
  text: { color: colors.onAccent, fontSize: 13, fontFamily: fonts.semibold, textAlign: 'center', flexShrink: 1 },
});

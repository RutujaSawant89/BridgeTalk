import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, icon, space } from '../theme';

// Floats over the top of every screen while the phone has no internet.
export default function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const insets = useSafeAreaInsets();
  // Both are null while NetInfo is still checking; only show the banner on a definite "no".
  const offline = isConnected === false || isInternetReachable === false;
  if (!offline) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + space.xs + 2 }]} pointerEvents="none" accessibilityLiveRegion="polite">
      <Feather name="wifi-off" size={icon.sm} color={colors.onVibe} />
      <Text style={styles.text}>You're offline. The phrasebook and SOS card still work.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.marigold,
    paddingBottom: space.sm,
    paddingHorizontal: space.lg,
  },
  text: { color: colors.onVibe, fontSize: 13, fontFamily: fonts.semibold, textAlign: 'center', flexShrink: 1 },
});

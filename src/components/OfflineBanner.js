import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

// Floats over the top of every screen while the phone has no internet.
export default function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const insets = useSafeAreaInsets();
  // Both are null while NetInfo is still checking; only show the banner on a definite "no".
  const offline = isConnected === false || isInternetReachable === false;
  if (!offline) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 6 }]} pointerEvents="none" accessibilityLiveRegion="polite">
      <Text style={styles.text}>📡 You're offline. Translations need internet.</Text>
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
    backgroundColor: colors.error,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  text: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});

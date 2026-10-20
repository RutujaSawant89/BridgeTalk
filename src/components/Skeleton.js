import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { colors, radius, space } from '../theme';

// A grey bar that gently pulses while content loads.
export function SkeletonBar({ width = '100%', height = 14, style }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[styles.bar, { width, height, opacity: pulse }, style]} />;
}

// Placeholder shaped like a result card.
export function SkeletonCard({ lines = 3, label = 'Loading' }) {
  return (
    <View style={styles.card} accessible accessibilityLabel={label} accessibilityRole="progressbar">
      <SkeletonBar width="35%" height={12} />
      <SkeletonBar width="90%" height={26} />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBar key={i} width={`${80 - i * 15}%`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.cardAlt, borderRadius: radius.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: space.md },
});

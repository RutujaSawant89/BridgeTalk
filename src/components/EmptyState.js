import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, space } from '../theme';

export default function EmptyState({ emoji, title, message, children }) {
  return (
    <View style={styles.container} accessible accessibilityLabel={`${title}. ${message ?? ''}`}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.xl, gap: space.sm },
  emoji: { fontSize: 44 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  message: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
});

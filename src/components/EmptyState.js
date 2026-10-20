import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, icon as iconSize, space } from '../theme';

// icon: Feather icon name
export default function EmptyState({ icon, title, message, children }) {
  return (
    <View style={styles.container} accessible accessibilityLabel={`${title}. ${message ?? ''}`}>
      <View style={styles.badge}>
        <Feather name={icon} size={iconSize.xl} color={colors.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.xl, gap: space.sm },
  badge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  title: { color: colors.text, fontSize: 18, fontFamily: fonts.semibold, textAlign: 'center' },
  message: { color: colors.muted, fontSize: 15, fontFamily: fonts.regular, textAlign: 'center', lineHeight: 21 },
});

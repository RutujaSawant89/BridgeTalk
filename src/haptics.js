import * as Haptics from 'expo-haptics';

// Haptics are a nice-to-have: some devices have no vibration motor, so failures are ignored.
export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const failure = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

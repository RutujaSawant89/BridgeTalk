import { useCallback, useEffect, useRef } from 'react';
import { AppState, Linking, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Runs `callback` when the screen stops being visible: another tab or screen is opened, or the
// app goes to the background. Bottom tabs keep screens mounted, so unmount alone is not enough.
export function useOnLeave(callback) {
  const latest = useRef(callback);
  latest.current = callback;

  useFocusEffect(useCallback(() => () => latest.current(), []));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') latest.current();
    });
    return () => sub.remove();
  }, []);
}

// Explains why a permission is needed; when Android won't ask again, offers to open Settings.
export function permissionAlert(title, message, canAskAgain) {
  const buttons = canAskAgain === false
    ? [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
      ]
    : [{ text: 'OK' }];
  Alert.alert(title, message, buttons);
}

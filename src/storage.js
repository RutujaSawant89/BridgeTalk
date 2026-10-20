import AsyncStorage from '@react-native-async-storage/async-storage';
import { devWarn } from './log';

// JSON helpers over AsyncStorage that never throw: a storage failure must not break the app.
export async function loadJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (e) {
    devWarn(`[BridgeTalk] could not read ${key}`, e);
    return fallback;
  }
}

export async function saveJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    devWarn(`[BridgeTalk] could not save ${key}`, e);
  }
}

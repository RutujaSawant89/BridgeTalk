jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock'));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///card.png') }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('expo-audio', () => ({
  useAudioRecorder: () => ({ prepareToRecordAsync: jest.fn(), record: jest.fn(), stop: jest.fn(), uri: null }),
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => {}),
}));
jest.mock('lottie-react-native', () => 'LottieView');
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../config', () => ({ API_URL: 'https://proxy.test', GROQ_API_KEY: '', MODELS: { text: 'openai/gpt-oss-120b', speech: 'w', vision: 'v' } }));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrefsProvider } from '../prefs';
import { HistoryProvider } from '../history';
import App from '../../App';
import OnboardingScreen from '../screens/OnboardingScreen';
import PhrasebookScreen from '../screens/PhrasebookScreen';
import SOSScreen from '../screens/SOSScreen';
import SavedScreen from '../screens/SavedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TranslateScreen from '../screens/TranslateScreen';
import TalkScreen from '../screens/TalkScreen';
import ScanScreen from '../screens/ScanScreen';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), reset: jest.fn() };

const flush = () => act(async () => {
  await new Promise((r) => setTimeout(r, 0));
});

async function render(element, prefs) {
  if (prefs) await AsyncStorage.setItem('bridgetalk:prefs', JSON.stringify(prefs));
  let tree;
  await act(async () => {
    tree = create(
      <SafeAreaProvider initialMetrics={metrics}>
        <PrefsProvider>
          <HistoryProvider>{element}</HistoryProvider>
        </PrefsProvider>
      </SafeAreaProvider>
    );
  });
  await flush();
  return tree;
}

// All visible text in the tree, joined, for simple "does it show X" checks.
const textOf = (tree) =>
  tree.root
    .findAll((n) => typeof n.type === 'string' && n.type === 'Text')
    .map((n) => [].concat(n.props.children).filter((c) => typeof c === 'string' || typeof c === 'number').join(''))
    .join(' | ');

beforeEach(async () => {
  await AsyncStorage.clear();
  global.fetch = jest.fn();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('first launch of the whole app opens onboarding', async () => {
  let tree;
  await act(async () => {
    tree = create(<App />);
  });
  await flush();
  await flush();
  expect(textOf(tree)).toContain('Translate with a vibe');
});

it('returning users skip onboarding', async () => {
  await AsyncStorage.setItem('bridgetalk:prefs', JSON.stringify({ onboarded: true }));
  let tree;
  await act(async () => {
    tree = create(<App />);
  });
  await flush();
  await flush();
  expect(textOf(tree)).not.toContain('Translate with a vibe');
  expect(textOf(tree)).toContain('Get Started');
});

it('onboarding saves the chosen languages', async () => {
  const tree = await render(<OnboardingScreen navigation={navigation} />);
  for (let i = 0; i < 3; i++) {
    const next = tree.root.find((n) => n.props.accessibilityLabel === 'Next' && n.props.onPress);
    await act(async () => next.props.onPress());
  }
  const finish = tree.root.find((n) => n.props.accessibilityLabel === 'Finish setup and start using BridgeTalk' && n.props.onPress);
  await act(async () => finish.props.onPress());
  await flush();
  expect(navigation.replace).toHaveBeenCalledWith('Home');
  expect(JSON.parse(await AsyncStorage.getItem('bridgetalk:prefs'))).toMatchObject({ onboarded: true });
});

it('phrasebook shows the travel language offline and switches languages', async () => {
  const tree = await render(<PhrasebookScreen navigation={navigation} />, { onboarded: true, travelLanguage: 'Japanese' });
  expect(textOf(tree)).toContain('ありがとうございます');
  const korean = tree.root.find((n) => n.props.accessibilityLabel === 'Phrases in Korean' && n.props.onPress);
  await act(async () => korean.props.onPress());
  expect(textOf(tree)).toContain('감사합니다');
  expect(fetch).not.toHaveBeenCalled();
});

it('SOS card shows offline text plus the saved address without any network call', async () => {
  const tree = await render(<SOSScreen navigation={navigation} />, {
    onboarded: true,
    travelLanguage: 'Spanish',
    address: 'Hotel Sol, Calle Mayor 5, Madrid',
  });
  const text = textOf(tree);
  expect(text).toContain('Necesito ayuda.');
  expect(text).toContain('Por favor, llame a una ambulancia.');
  expect(text).toContain('Hotel Sol, Calle Mayor 5, Madrid');
  expect(fetch).not.toHaveBeenCalled();
});

it('saved tab shows an empty state', async () => {
  const tree = await render(<SavedScreen navigation={navigation} />, { onboarded: true });
  expect(textOf(tree)).toContain('No saved translations yet');
});

it('translate tab shows the phrase of the day and a streak', async () => {
  const tree = await render(<TranslateScreen />, { onboarded: true, travelLanguage: 'French' });
  const text = textOf(tree);
  expect(text).toContain('Phrase of the day');
  expect(text).toContain('1-day streak');
});

it.each([
  ['Talk', TalkScreen],
  ['Scan', ScanScreen],
  ['Profile', ProfileScreen],
])('%s screen renders', async (_name, Screen) => {
  const tree = await render(<Screen navigation={navigation} />, { onboarded: true });
  expect(tree.toJSON()).toBeTruthy();
});

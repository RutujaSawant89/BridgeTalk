jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///card.png') }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
const mockRecorder = { prepareToRecordAsync: jest.fn(async () => {}), record: jest.fn(), stop: jest.fn(async () => {}), uri: 'file:///rec.m4a' };
jest.mock('expo-audio', () => ({
  useAudioRecorder: () => mockRecorder,
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  setAudioModeAsync: jest.fn(async () => {}),
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///photo.jpg', width: 4000, height: 3000 }] })),
}));
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: jest.fn(),
      renderAsync: async () => ({ saveAsync: async () => ({ uri: 'file:///small.jpg', base64: 'aGVsbG8=' }) }),
    }),
  },
}));
jest.mock('lottie-react-native', () => 'LottieView');
jest.mock('../config', () => ({ API_URL: 'https://proxy.test', GROQ_API_KEY: '', MODELS: { text: 'openai/gpt-oss-120b', speech: 'w', vision: 'v' } }));

import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

const Stack = createNativeStackNavigator();
const navRef = createNavigationContainerRef();
const Elsewhere = () => <Text>Elsewhere</Text>;

// Renders one screen inside the real providers and a navigator (screens use focus events),
// plus a second route so tests can navigate away from it.
async function renderScreen(Screen, prefs = { onboarded: true }) {
  await AsyncStorage.setItem('bridgetalk:prefs', JSON.stringify(prefs));
  const utils = render(
    <PrefsProvider>
      <HistoryProvider>
        <NavigationContainer ref={navRef}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Screen" component={Screen} />
            <Stack.Screen name="Elsewhere" component={Elsewhere} />
            <Stack.Screen name="Saved" component={Elsewhere} />
            <Stack.Screen name="Profile" component={Elsewhere} />
            <Stack.Screen name="SOS" component={Elsewhere} />
            <Stack.Screen name="Home" component={Elsewhere} />
          </Stack.Navigator>
        </NavigationContainer>
      </HistoryProvider>
    </PrefsProvider>
  );
  await waitFor(() => expect(navRef.isReady()).toBe(true));
  return utils;
}

const pending = () => new Promise(() => {}); // a request that never answers
const reply = (content) => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content } }] }) });
const isDisabled = (el) => Boolean(el.props.accessibilityState?.disabled);

beforeEach(async () => {
  await AsyncStorage.clear();
  global.fetch = jest.fn(pending);
  jest.clearAllMocks();
});

describe('app', () => {
  it('first launch opens onboarding', async () => {
    render(<App />);
    // first render of the whole app also loads every font, so allow longer than the 1 s default
    expect(await screen.findByText('Translate with a vibe', {}, { timeout: 10000 })).toBeTruthy();
  });

  it('returning users skip onboarding', async () => {
    await AsyncStorage.setItem('bridgetalk:prefs', JSON.stringify({ onboarded: true }));
    render(<App />);
    expect(await screen.findByText('Get Started')).toBeTruthy();
    expect(screen.queryByText('Translate with a vibe')).toBeNull();
  });

  it('survives corrupt saved data', async () => {
    await AsyncStorage.setItem('bridgetalk:prefs', '"not an object"');
    await AsyncStorage.setItem('bridgetalk:history', '{"broken": true}');
    render(<App />);
    expect(await screen.findByText('Translate with a vibe')).toBeTruthy();
  });

  it('the tab bar has exactly Translate, Talk, Scan and Phrases', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
    expect([...src.matchAll(/<Tab\.Screen name="(\w+)"/g)].map((m) => m[1])).toEqual(['Translate', 'Talk', 'Scan', 'Phrases']);
  });
});

describe('Onboarding', () => {
  it('walks through the slides and saves the chosen languages', async () => {
    await renderScreen(OnboardingScreen, {});
    for (let i = 0; i < 3; i++) fireEvent.press(screen.getByLabelText('Next'));
    fireEvent.press(screen.getByLabelText('Finish setup and start using BridgeTalk'));
    await waitFor(async () => expect(JSON.parse(await AsyncStorage.getItem('bridgetalk:prefs'))).toMatchObject({ onboarded: true }));
    expect(await screen.findByText('Elsewhere')).toBeTruthy(); // replaced with Home
  });
});

describe('Translate', () => {
  it('renders the 4-vibe grid, phrase of the day and streak', async () => {
    await renderScreen(TranslateScreen, { onboarded: true, travelLanguage: 'French' });
    for (const label of ['Formal vibe', 'Casual vibe', 'Like a local vibe', 'Filmy vibe']) expect(screen.getByLabelText(label)).toBeTruthy();
    expect(await screen.findByText('Phrase of the day')).toBeTruthy();
    expect(await screen.findByText('1-day streak')).toBeTruthy();
  });

  it('disables Translate while a request runs, and a double tap sends one request', async () => {
    await renderScreen(TranslateScreen);
    const button = () => screen.getByLabelText('Translate');
    expect(isDisabled(button())).toBe(true); // nothing typed yet
    fireEvent.changeText(screen.getByLabelText('Text to translate from English'), 'Where is the station?');
    expect(isDisabled(button())).toBe(false);
    fireEvent.press(button());
    fireEvent.press(button());
    await waitFor(() => expect(isDisabled(button())).toBe(true));
    expect(button().props.accessibilityState.busy).toBe(true);
    expect(screen.getByLabelText('Translating')).toBeTruthy(); // skeleton
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shows the translation and re-enables the button when the request finishes', async () => {
    fetch.mockResolvedValueOnce(
      reply(JSON.stringify({
        formal: { translation: 'Où est la gare ?', pronunciation: 'oo eh la gar' },
        casual: { translation: 'Elle est où la gare ?', pronunciation: 'el eh oo la gar' },
        local: { translation: 'La gare, c’est où ?', pronunciation: 'la gar say oo' },
        filmy: { translation: 'Dites-moi, où est cette gare ?!', pronunciation: 'deet mwa' },
        culture_tip: 'Paris has six big train stations.',
      }))
    );
    await renderScreen(TranslateScreen);
    // different text from the test above: identical requests within 2 s share one (still pending) call
    fireEvent.changeText(screen.getByLabelText('Text to translate from English'), 'Where is the train station, please?');
    fireEvent.press(screen.getByLabelText('Translate'));
    expect(await screen.findByText('Elle est où la gare ?', {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText('Paris has six big train stations.')).toBeTruthy();
    expect(isDisabled(screen.getByLabelText('Translate'))).toBe(false);
    fireEvent.press(screen.getByLabelText('Formal vibe'));
    expect(screen.getByText('Où est la gare ?')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1); // switching vibes doesn't call the API
  });

  it('caps input at 2,000 characters', async () => {
    await renderScreen(TranslateScreen);
    expect(screen.getByLabelText('Text to translate from English').props.maxLength).toBe(2000);
  });
});

describe('Talk', () => {
  it('disables the other mic while one person records, and ignores taps under 0.5 s', async () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);
    await renderScreen(TalkScreen);
    const [topMic, bottomMic] = screen.getAllByLabelText('Start recording');
    await act(async () => fireEvent.press(bottomMic));
    expect(mockRecorder.record).toHaveBeenCalledTimes(1);
    expect(isDisabled(topMic)).toBe(true);
    now.mockReturnValue(1_000_200); // 0.2 s later
    await act(async () => fireEvent.press(screen.getByLabelText('Stop recording')));
    expect(mockRecorder.stop).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled(); // too short: nothing sent to Whisper
    now.mockRestore();
  });

  it('stops the mic and speech when you leave the screen', async () => {
    const { setAudioModeAsync } = require('expo-audio');
    const Speech = require('expo-speech');
    await renderScreen(TalkScreen);
    await act(async () => fireEvent.press(screen.getAllByLabelText('Start recording')[1]));
    expect(mockRecorder.record).toHaveBeenCalled();
    expect(mockRecorder.stop).not.toHaveBeenCalled();
    await act(async () => navRef.navigate('Elsewhere'));
    await waitFor(() => expect(mockRecorder.stop).toHaveBeenCalled());
    expect(Speech.stop).toHaveBeenCalled();
    expect(setAudioModeAsync).toHaveBeenLastCalledWith(expect.objectContaining({ allowsRecording: false }));
    expect(fetch).not.toHaveBeenCalled(); // a cancelled recording is never sent
  });
});

describe('Scan', () => {
  it('disables Camera and Gallery while a photo is being read', async () => {
    await renderScreen(ScanScreen);
    fireEvent.press(screen.getByLabelText('Choose a photo from the gallery'));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(isDisabled(screen.getByLabelText('Take a photo with the camera'))).toBe(true);
    expect(isDisabled(screen.getByLabelText('Choose a photo from the gallery'))).toBe(true);
    expect(screen.getByText('Reading your photo…')).toBeTruthy();
  });

  it('shows "better photo" tips when the photo cannot be prepared', async () => {
    const manipulator = require('expo-image-manipulator').ImageManipulator;
    const original = manipulator.manipulate;
    manipulator.manipulate = () => {
      throw new Error('unsupported format');
    };
    await renderScreen(ScanScreen);
    fireEvent.press(screen.getByLabelText('Choose a photo from the gallery'));
    expect(await screen.findByText(/couldn't read that photo/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    manipulator.manipulate = original;
  });
});

describe('other screens render', () => {
  it('Phrasebook shows the travel language offline and switches languages', async () => {
    await renderScreen(PhrasebookScreen, { onboarded: true, travelLanguage: 'Japanese' });
    expect(await screen.findByText('ありがとうございます')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Phrases in Korean'));
    expect(screen.getByText('감사합니다')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('SOS shows offline text and the saved address with no network call', async () => {
    await renderScreen(SOSScreen, { onboarded: true, travelLanguage: 'Spanish', address: 'Hotel Sol, Calle Mayor 5' });
    expect(await screen.findByText('Necesito ayuda.')).toBeTruthy();
    expect(screen.getByText('Hotel Sol, Calle Mayor 5')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Saved shows an empty state', async () => {
    await renderScreen(SavedScreen);
    expect(await screen.findByText('No saved translations yet')).toBeTruthy();
  });

  it('Settings limits the SOS fields', async () => {
    await renderScreen(ProfileScreen);
    expect(screen.getByLabelText('Allergies').props.maxLength).toBe(200);
    expect(screen.getByLabelText('Hotel address').props.maxLength).toBe(400);
  });
});

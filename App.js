import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import Home from './src/index';
import Landing from './src/landing';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SOSScreen from './src/screens/SOSScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SavedScreen from './src/screens/SavedScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import ServerWakingBanner from './src/components/ServerWakingBanner';
import { warmUp } from './src/serverStatus';
import { PrefsProvider, usePrefs } from './src/prefs';
import { HistoryProvider } from './src/history';
import { useAppFonts } from './src/fonts';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { loaded, prefs } = usePrefs();
  const fontsReady = useAppFonts();

  // Wait for saved preferences (so first launch goes to onboarding without a flash) and fonts
  if (!loaded || !fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading BridgeTalk" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={prefs.onboarded ? 'Landing' : 'Onboarding'}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Landing" component={Landing} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="SOS" component={SOSScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="Saved" component={SavedScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  // Wake the free server as soon as the app opens, so it's ready by the first translation
  useEffect(() => {
    warmUp();
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="light" />
      <ErrorBoundary>
        <PrefsProvider>
          <HistoryProvider>
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
              <RootNavigator />
              <ServerWakingBanner />
              <OfflineBanner />
            </View>
          </HistoryProvider>
        </PrefsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

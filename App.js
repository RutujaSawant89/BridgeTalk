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
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import { PrefsProvider, usePrefs } from './src/prefs';
import { HistoryProvider } from './src/history';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { loaded, prefs } = usePrefs();

  // Wait for saved preferences so first launch goes to onboarding and later launches don't flash it
  if (!loaded) {
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
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="light" />
      <ErrorBoundary>
        <PrefsProvider>
          <HistoryProvider>
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
              <RootNavigator />
              <OfflineBanner />
            </View>
          </HistoryProvider>
        </PrefsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import TranslateScreen from './screens/TranslateScreen';
import TalkScreen from './screens/TalkScreen';
import ScanScreen from './screens/ScanScreen';
import PhrasebookScreen from './screens/PhrasebookScreen';
import SavedScreen from './screens/SavedScreen';
import { colors } from './theme';

const Tab = createBottomTabNavigator();

const ICONS = { Translate: 'language', Talk: 'mic', Scan: 'camera', Phrases: 'book', Saved: 'star' };

export default function Home() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Translate" component={TranslateScreen} />
      <Tab.Screen name="Talk" component={TalkScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Phrases" component={PhrasebookScreen} options={{ tabBarAccessibilityLabel: 'Phrasebook, works offline' }} />
      <Tab.Screen name="Saved" component={SavedScreen} options={{ tabBarAccessibilityLabel: 'Saved translations and history' }} />
    </Tab.Navigator>
  );
}

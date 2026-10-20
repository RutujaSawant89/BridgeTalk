import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import TranslateScreen from './screens/TranslateScreen';
import TalkScreen from './screens/TalkScreen';
import ScanScreen from './screens/ScanScreen';
import PhrasebookScreen from './screens/PhrasebookScreen';
import { colors, fonts } from './theme';

const Tab = createBottomTabNavigator();

const ICONS = { Translate: 'globe', Talk: 'mic', Scan: 'camera', Phrases: 'book-open' };

export default function Home() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: 60 },
        tabBarItemStyle: { minHeight: 44, paddingTop: 4 },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => <Feather name={ICONS[route.name]} color={color} size={size - 2} />,
      })}
    >
      <Tab.Screen name="Translate" component={TranslateScreen} />
      <Tab.Screen name="Talk" component={TalkScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Phrases" component={PhrasebookScreen} options={{ tabBarAccessibilityLabel: 'Phrasebook, works offline' }} />
    </Tab.Navigator>
  );
}

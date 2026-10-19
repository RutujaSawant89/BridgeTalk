import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import TranslateScreen from './screens/TranslateScreen';
import ComingSoonScreen from './screens/ComingSoonScreen';
import { colors } from './theme';

const Tab = createBottomTabNavigator();

const ICONS = { Translate: 'language', Talk: 'mic', Scan: 'camera' };

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
      <Tab.Screen name="Talk" component={ComingSoonScreen} initialParams={{ emoji: '🎙️', title: 'Talk' }} />
      <Tab.Screen name="Scan" component={ComingSoonScreen} initialParams={{ emoji: '📷', title: 'Scan' }} />
    </Tab.Navigator>
  );
}

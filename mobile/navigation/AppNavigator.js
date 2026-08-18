import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import MarketsScreen from '../screens/MarketsScreen';
import ProfitCalculatorScreen from '../screens/ProfitCalculatorScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../constants/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Home tab includes Home -> Markets -> ProfitCalculator as a stack
// so the crop selected on Home is passed forward via route.params.
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'SmartRaitha' }} />
      <Stack.Screen name="Markets" component={MarketsScreen} options={{ title: 'Markets' }} />
      <Stack.Screen name="ProfitCalculator" component={ProfitCalculatorScreen} options={{ title: 'Profit Calculator' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

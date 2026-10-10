import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import MarketsScreen from '../screens/MarketsScreen';
import ProfitCalculatorScreen from '../screens/ProfitCalculatorScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AssistantScreen from '../screens/AssistantScreen';
import HamburgerMenu from '../components/HamburgerMenu';
import { colors } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Home tab includes Home -> Markets -> ProfitCalculator as a stack
// so the crop selected on Home is passed forward via route.params.
function HomeStack() {
  const { t } = useLanguage();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerTintColor: colors.primary,
        headerTitleStyle: { fontSize: 20, fontWeight: '800' },
        headerLeft: () => <HamburgerMenu navigation={navigation} />,
      })}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'SmartRaitha' }} />
      <Stack.Screen name="Markets" component={MarketsScreen} options={{ title: t('markets') }} />
      <Stack.Screen name="ProfitCalculator" component={ProfitCalculatorScreen} options={{ title: t('profitCalculator') }} />
      <Stack.Screen name="Assistant" component={AssistantScreen} options={{ title: t('assistant'), headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
      tabBar={() => null}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: t('home') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile') }} />
      <Tab.Screen name="Assistant" component={AssistantScreen} options={{ title: t('assistant') }} />
    </Tab.Navigator>
  );
}

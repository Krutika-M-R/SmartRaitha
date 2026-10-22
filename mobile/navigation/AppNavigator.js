import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import MarketsScreen from '../screens/MarketsScreen';
import ProfitCalculatorScreen from '../screens/ProfitCalculatorScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AssistantScreen from '../screens/AssistantScreen';
import CropPlannerScreen from '../screens/CropPlannerScreen';
import MainMenu from '../components/MainMenu';
import HamburgerMenu from '../components/HamburgerMenu';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  const { t } = useLanguage();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerTintColor: colors.primary,
        headerTitleStyle: { fontSize: 20, fontWeight: '800' },
        headerRight: () => <HamburgerMenu navigation={navigation} />,
      })}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'SmartRaitha' }} />
      <Stack.Screen
        name="CropPlanner"
        component={CropPlannerScreen}
        options={({ navigation }) => ({
          title: t('cropPlannerTitle'),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel={t('goBack')}
              style={{ paddingRight: 18, paddingVertical: 8 }}
            >
              <Ionicons name="arrow-back" size={23} color={colors.primary} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="Markets" component={MarketsScreen} options={{ title: t('markets') }} />
      <Stack.Screen name="ProfitCalculator" component={ProfitCalculatorScreen} options={{ title: t('profitCalculator') }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      tabBar={(props) => <MainMenu {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: t('home') }} />
      <Tab.Screen name="LittleLeaf" component={AssistantScreen} options={{ title: t('assistant') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile') }} />
    </Tab.Navigator>
  );
}

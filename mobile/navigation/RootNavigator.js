import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import LoadingIndicator from '../components/LoadingIndicator';
import WelcomeScreen from '../screens/WelcomeScreen';

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (showWelcome) return <WelcomeScreen />;

  if (loading) return <LoadingIndicator message="Starting SmartRaitha..." />;

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

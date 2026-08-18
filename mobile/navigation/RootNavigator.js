import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import LoadingIndicator from '../components/LoadingIndicator';

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingIndicator message="Starting SmartRaitha..." />;

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import RootNavigator from './navigation/RootNavigator';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </LanguageProvider>
  );
}

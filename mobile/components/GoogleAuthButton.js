import React, { useEffect } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { colors } from '../constants/colors';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleAuthButton({ title, onToken, onError }) {
  const configuredClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const googleClientId = configuredClientId && !configuredClientId.startsWith('YOUR_') ? configuredClientId : null;
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    expoClientId: googleClientId,
    webClientId: googleClientId,
    clientId: googleClientId,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      if (idToken) onToken(idToken);
      else onError('Google did not return an ID token.');
    } else if (response?.type === 'error') {
      const details = response.params?.error_description || response.params?.error;
      onError(details ? `Google sign-in failed: ${details}` : 'Google sign-in was cancelled or failed.');
    }
  }, [response]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => {
        if (!googleClientId) {
          onError('Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID and restart Expo.');
          return;
        }
        promptAsync();
      }}
      disabled={!request && !!googleClientId}
    >
      <Text style={styles.google}>G</Text>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 14, marginTop: 12 },
  google: { color: '#4285F4', fontSize: 18, fontWeight: '800', marginRight: 10 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
});

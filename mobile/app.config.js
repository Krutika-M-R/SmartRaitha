module.exports = ({ config }) => ({
  ...config,
  plugins: [
    'expo-font',
    ...(config.plugins || []),
    [
      'react-native-maps',
      process.env.GOOGLE_MAPS_ANDROID_API_KEY
        ? { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }
        : {},
    ],
  ],
});

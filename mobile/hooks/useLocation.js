import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Enable it to get mandi recommendations near you.');
        setLoading(false);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch (e) {
        setError('Could not fetch your location.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { location, error, loading };
}
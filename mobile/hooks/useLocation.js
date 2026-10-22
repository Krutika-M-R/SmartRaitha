import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('locationPermissionDenied');
        setLocation(null);
        return null;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let placeName = '';
      let state = '';
      let district = '';
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        const place = places[0];
        state = place?.region || '';
        district = place?.district || place?.subregion || place?.city || '';
        placeName = [place?.city, place?.district, place?.region]
          .filter(Boolean)
          .filter((value, index, values) => values.indexOf(value) === index)
          .join(', ');
      } catch (error) {
        // Coordinates are enough for weather and distance estimates.
      }

      const currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        placeName,
        state,
        district,
      };
      setLocation(currentLocation);
      return currentLocation;
    } catch (error) {
      setError('locationUnavailable');
      setLocation(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { location, error, loading, requestLocation };
}

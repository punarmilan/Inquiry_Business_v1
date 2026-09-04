import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { getCityAvailability, listSupportedCities } from '../services/api';
import type { City } from '../types/hyperlocal';

const STORAGE_KEY = 'anywork_hyperlocal_location';
const INTRO_KEY = 'anywork_hyperlocal_location_intro_seen';

export interface HyperlocalLocation {
  city: City | null;
  locality: string;
  latitude: number;
  longitude: number;
  source: 'gps' | 'manual';
}

const resolveManualCoordinates = async (city: City, locality?: string) => {
  const fallback = { longitude: city.center.coordinates[0], latitude: city.center.coordinates[1] };
  if (!locality || locality === city.name) return fallback;

  try {
    const matches = await Location.geocodeAsync(`${locality}, ${city.name}, ${city.state}, India`);
    const match = matches[0];
    if (match) return { longitude: match.longitude, latitude: match.latitude };
  } catch {
    // The city centre remains a safe fallback when device geocoding is unavailable.
  }
  return fallback;
};

export const useHyperlocalLocation = () => {
  const [location, setLocation] = useState<HyperlocalLocation | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);

  const chooseManual = useCallback(async (city: City, locality?: string) => {
    const coordinates = await resolveManualCoordinates(city, locality);
    const next: HyperlocalLocation = {
      city,
      locality: locality || city.name,
      ...coordinates,
      source: 'manual',
    };
    setLocation(next);
    setPickerVisible(false);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const selectCoordinates = useCallback(async (coordinates: { latitude: number; longitude: number }) => {
    const [place, availability] = await Promise.all([
      Location.reverseGeocodeAsync(coordinates).then((items) => items[0]),
      getCityAvailability(coordinates),
    ]);
    const next: HyperlocalLocation = {
      city: availability.city,
      locality: place?.district || place?.name || place?.city || availability.city?.name || 'Current location',
      ...coordinates,
      source: 'gps',
    };
    setLocation(next);
    setPickerVisible(!availability.supported);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { place, availability };
  }, []);

  const detect = useCallback(async () => {
    setLoadingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setPickerVisible(true);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const { availability } = await selectCoordinates(coordinates);
      // A GPS selection replaces the manual city-centre fallback. This keeps
      // the offer feed anchored to the user's real 10 KM discovery area.
      setPickerVisible(!availability.supported);
    } catch {
      setPickerVisible(true);
    } finally {
      setLoadingLocation(false);
    }
  }, [selectCoordinates]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [cityResponse, stored, introSeen] = await Promise.all([
        listSupportedCities().catch(() => ({ success: true as const, data: [] })),
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(INTRO_KEY),
      ]);
      if (!active) return;
      setCities(cityResponse.data);
      if (stored) {
        try {
          const storedLocation = JSON.parse(stored) as HyperlocalLocation;
          const liveCity = storedLocation.city
            ? cityResponse.data.find(
                (city) => city._id === storedLocation.city?._id || city.slug === storedLocation.city?.slug
              )
            : null;
          if (storedLocation.city && !liveCity) {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setLocation(null);
            setPickerVisible(true);
            setLoadingLocation(false);
            return;
          }
          const saved = liveCity ? { ...storedLocation, city: liveCity } : storedLocation;
          setLocation(saved);
          if (liveCity && liveCity._id !== storedLocation.city?._id) {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
          }
          // Older manual selections stored the city centre even when a user
          // chose a locality such as Wakad. Resolve it once so the nearby feed
          // uses the chosen locality rather than a distant city-centre pin.
          if (saved.source === 'manual' && saved.city && saved.locality && saved.locality !== saved.city.name) {
            resolveManualCoordinates(saved.city, saved.locality).then(async (coordinates) => {
              if (!active) return;
              const corrected = { ...saved, ...coordinates };
              setLocation(corrected);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(corrected));
            });
          }
        } catch { /* ignore stale storage */ }
        setLoadingLocation(false);
        return;
      }
      if (!introSeen) {
        await AsyncStorage.setItem(INTRO_KEY, '1');
        Alert.alert(
          'Discover what is near you',
          'Allow location to discover offers and services near you.',
          [
            { text: 'Choose city manually', onPress: () => { setPickerVisible(true); setLoadingLocation(false); } },
            { text: 'Allow location', onPress: detect },
          ],
          { cancelable: false }
        );
      } else {
        setPickerVisible(true);
        setLoadingLocation(false);
      }
    })();
    return () => { active = false; };
  }, [detect]);

  return { location, cities, pickerVisible, setPickerVisible, chooseManual, selectCoordinates, detect, loadingLocation };
};

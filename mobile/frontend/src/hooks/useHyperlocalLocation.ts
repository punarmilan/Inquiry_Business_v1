import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { getCityAvailability, listSupportedCities } from '../services/api';
import type { City } from '../types/hyperlocal';

const STORAGE_KEY = 'inquiryexperts_hyperlocal_location';
const INTRO_KEY = 'inquiryexperts_hyperlocal_location_intro_seen';
const LEGACY_STORAGE_KEY = 'anywork_hyperlocal_location';
const LEGACY_INTRO_KEY = 'anywork_hyperlocal_location_intro_seen';

const readStoredItem = async (key: string, legacyKey: string): Promise<string | null> => {
  const current = await AsyncStorage.getItem(key);
  if (current !== null) return current;
  const legacy = await AsyncStorage.getItem(legacyKey);
  if (legacy !== null) {
    await AsyncStorage.setItem(key, legacy).catch(() => undefined);
    await AsyncStorage.removeItem(legacyKey).catch(() => undefined);
  }
  return legacy;
};

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

export const useHyperlocalLocation = ({
  autoDetect = false,
  promptOnEmpty = true,
}: { autoDetect?: boolean; promptOnEmpty?: boolean } = {}) => {
  const [location, setLocation] = useState<HyperlocalLocation | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const detectingRef = useRef(false);

  const chooseManual = useCallback(async (city: City, locality?: string) => {
    setLocationError(null);
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
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => undefined);
  }, []);

  const selectCoordinates = useCallback(async (coordinates: { latitude: number; longitude: number }) => {
    const [place, availability] = await Promise.all([
      Location.reverseGeocodeAsync(coordinates).then((items) => items[0]).catch(() => undefined),
      getCityAvailability(coordinates),
    ]);
    const next: HyperlocalLocation = {
      city: availability.city,
      locality: place?.district || place?.name || place?.city || availability.city?.name || 'Current location',
      ...coordinates,
      source: 'gps',
    };
    setLocation(next);
    setPickerVisible(false);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => undefined);
    return { place, availability };
  }, []);

  const clearLocation = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY),
      AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
    ]).catch(() => undefined);
    setLocation(null);
    setLocationError(null);
    setPickerVisible(false);
    setLoadingLocation(false);
  }, []);

  const detect = useCallback(async () => {
    if (detectingRef.current) return;
    detectingRef.current = true;
    setLocationError(null);
    setLoadingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError('Location permission is required to detect your current position.');
        setPickerVisible(true);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      await selectCoordinates(coordinates);
      // A GPS selection replaces the manual city-centre fallback. This keeps
      // the offer feed anchored to the user's real 10 KM discovery area.
    } catch (error) {
      setLocationError(error instanceof Error && error.message ? error.message : 'Unable to detect your location. Try again or choose a city manually.');
      setPickerVisible(true);
    } finally {
      setLoadingLocation(false);
      detectingRef.current = false;
    }
  }, [selectCoordinates]);

  // Screens inside the tab navigator can stay mounted while another tab changes
  // the persisted location. Re-read that state on focus instead of keeping a
  // stale location in the mounted Services screen. A GPS request is only started
  // when no location exists, and detectingRef still prevents concurrent requests.
  const refreshStoredLocation = useCallback(async () => {
    const stored = await readStoredItem(STORAGE_KEY, LEGACY_STORAGE_KEY);
    if (!stored) {
      if (autoDetect && !detectingRef.current) await detect();
      else {
        setLocation(null);
        setLoadingLocation(false);
      }
      return;
    }
    try {
      const saved = JSON.parse(stored) as HyperlocalLocation;
      if (!saved.city || !Number.isFinite(saved.latitude) || !Number.isFinite(saved.longitude)) return;
      setLocation(saved);
      setLocationError(null);
      setLoadingLocation(false);
    } catch {
      if (autoDetect && !detectingRef.current) await detect();
    }
  }, [autoDetect, detect]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [cityResponse, stored, introSeen] = await Promise.all([
        listSupportedCities().catch(() => ({ success: true as const, data: [] })),
        readStoredItem(STORAGE_KEY, LEGACY_STORAGE_KEY),
        readStoredItem(INTRO_KEY, LEGACY_INTRO_KEY),
      ]);
      if (!active) return;
      const availableCities = Array.isArray(cityResponse.data) ? cityResponse.data : [];
      setCities(availableCities);
      if (stored) {
        try {
          const storedLocation = JSON.parse(stored) as HyperlocalLocation;
          const liveCity = storedLocation.city
            ? availableCities.find(
                (city) => city._id === storedLocation.city?._id || city.slug === storedLocation.city?.slug
              )
            : null;
          if (storedLocation.city && !liveCity) {
            await Promise.all([
              AsyncStorage.removeItem(STORAGE_KEY),
              AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
            ]).catch(() => undefined);
            setLocation(null);
            if (autoDetect) {
              void detect();
            } else if (promptOnEmpty) {
              setPickerVisible(true);
              setLoadingLocation(false);
            } else {
              setLoadingLocation(false);
            }
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
      if (autoDetect) {
        await AsyncStorage.setItem(INTRO_KEY, '1');
        await AsyncStorage.removeItem(LEGACY_INTRO_KEY).catch(() => undefined);
        void detect();
        return;
      }
      if (!promptOnEmpty) {
        setLoadingLocation(false);
        return;
      }
      if (!introSeen) {
        await AsyncStorage.setItem(INTRO_KEY, '1');
        await AsyncStorage.removeItem(LEGACY_INTRO_KEY).catch(() => undefined);
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
  }, [autoDetect, detect, promptOnEmpty]);

  return { location, cities, pickerVisible, setPickerVisible, chooseManual, selectCoordinates, detect, clearLocation, refreshStoredLocation, loadingLocation, locationError };
};

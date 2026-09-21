import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Platform, Pressable, ActivityIndicator, TextInput, Keyboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme, createThemedStyles } from '../theme';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { useApp } from '../context/AppContext';
import { placesAutocomplete, getPlaceLocation, PlaceSuggestion } from '../services/api';

const SUGGESTION_DEBOUNCE_MS = 350;
const MIN_SUGGESTION_QUERY_LENGTH = 3;

const newSessionToken = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

interface LocationValue {
  latitude: number;
  longitude: number;
  label: string;
}

interface LocationPickerModalProps {
  visible: boolean;
  initialLocation?: LocationValue | null;
  onClose: () => void;
  onConfirm: (location: LocationValue) => void;
}

const DEFAULT_CENTER = { latitude: 28.6139, longitude: 77.209 };
const DEFAULT_DELTA = 0.01;

const formatPlace = (place: Location.LocationGeocodedAddress): string => {
  const locality = place.district || place.name || place.street;
  const city = place.city || place.subregion || place.region;
  const parts = [locality, city].filter((p): p is string => !!p && p.trim().length > 0);
  return Array.from(new Set(parts)).join(', ');
};

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  initialLocation,
  onClose,
  onConfirm,
}) => {
  const { t, accessToken } = useApp();
  const mapRef = useRef<MapView>(null);
  const [coord, setCoord] = useState<{ latitude: number; longitude: number }>(
    initialLocation ?? DEFAULT_CENTER
  );
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const sessionTokenRef = useRef(newSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setCoord(initialLocation ?? DEFAULT_CENTER);
      setSearchQuery('');
      setSearchError(false);
      setSuggestions([]);
      sessionTokenRef.current = newSessionToken();
    }
  }, [visible, initialLocation]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!accessToken) return;
    setSuggestionsLoading(true);
    try {
      const res = await placesAutocomplete(accessToken, {
        input: query,
        lat: coord.latitude,
        lng: coord.longitude,
        sessionToken: sessionTokenRef.current,
      });
      setSuggestions(res.data);
    } catch {
      // Autocomplete is a nicety — the plain search-on-submit fallback still works
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    if (searchError) setSearchError(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < MIN_SUGGESTION_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(trimmed), SUGGESTION_DEBOUNCE_MS);
  };

  const selectSuggestion = async (suggestion: PlaceSuggestion) => {
    if (!accessToken) return;
    Keyboard.dismiss();
    setSuggestions([]);
    setSearchQuery(suggestion.text);
    setSearching(true);
    setSearchError(false);
    try {
      const res = await getPlaceLocation(accessToken, suggestion.placeId, sessionTokenRef.current);
      const next = { latitude: res.location.latitude, longitude: res.location.longitude };
      setCoord(next);
      mapRef.current?.animateToRegion({ ...next, latitudeDelta: DEFAULT_DELTA, longitudeDelta: DEFAULT_DELTA }, 350);
      // A new Places "session" starts after each Place Details call, per Google's session-token billing model.
      sessionTokenRef.current = newSessionToken();
    } catch {
      setSearchError(true);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query || searching) return;
    Keyboard.dismiss();
    setSuggestions([]);
    setSearching(true);
    setSearchError(false);
    try {
      const results = await Location.geocodeAsync(query);
      if (!results[0]) {
        setSearchError(true);
        return;
      }
      const next = { latitude: results[0].latitude, longitude: results[0].longitude };
      setCoord(next);
      mapRef.current?.animateToRegion({ ...next, latitudeDelta: DEFAULT_DELTA, longitudeDelta: DEFAULT_DELTA }, 350);
    } catch {
      setSearchError(true);
    } finally {
      setSearching(false);
    }
  };

  const initialRegion: Region = {
    latitude: coord.latitude,
    longitude: coord.longitude,
    latitudeDelta: DEFAULT_DELTA,
    longitudeDelta: DEFAULT_DELTA,
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return;
      const pos = await Location.getCurrentPositionAsync({});
      const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoord(next);
      mapRef.current?.animateToRegion({ ...next, latitudeDelta: DEFAULT_DELTA, longitudeDelta: DEFAULT_DELTA }, 350);
    } catch {
      // GPS unavailable — user can still drop a pin manually
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    let label = `Pinned location (${coord.latitude.toFixed(3)}, ${coord.longitude.toFixed(3)})`;
    try {
      const places = await Location.reverseGeocodeAsync(coord);
      if (places[0]) {
        const formatted = formatPlace(places[0]);
        if (formatted) label = formatted;
      }
    } catch {
      // reverse geocode best-effort only — fall back to raw coordinates
    }
    setConfirming(false);
    onConfirm({ latitude: coord.latitude, longitude: coord.longitude, label });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton name="close" accessibilityLabel={t('cancel')} onPress={onClose} />
          <Text style={styles.headerTitle}>{t('dropPinOnMap')}</Text>
          <View style={{ width: theme.MIN_TAP_TARGET }} />
        </View>

        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={initialRegion}
            onPress={(e) => setCoord(e.nativeEvent.coordinate)}
          >
            <Marker
              coordinate={coord}
              draggable
              onDragEnd={(e) => setCoord(e.nativeEvent.coordinate)}
            />
          </MapView>

          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={handleQueryChange}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                placeholder="Search for an area or address"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.searchInput}
              />
              {searching || suggestionsLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : searchQuery.trim().length > 0 ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={handleSearch} hitSlop={8}>
                  <MaterialCommunityIcons name="arrow-right-circle" size={22} color={theme.colors.primary} />
                </Pressable>
              ) : null}
            </View>

            {suggestions.length > 0 ? (
              <View style={styles.suggestionsPanel}>
                {suggestions.map((item) => (
                  <Pressable
                    key={item.placeId}
                    accessibilityRole="button"
                    onPress={() => selectSuggestion(item)}
                    style={({ pressed }) => [styles.suggestionRow, pressed && styles.suggestionRowPressed]}
                  >
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color={theme.colors.textMuted} />
                    <View style={styles.suggestionTextWrap}>
                      <Text style={styles.suggestionMainText} numberOfLines={1}>
                        {item.mainText || item.text}
                      </Text>
                      {item.secondaryText ? (
                        <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
                          {item.secondaryText}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : searchError ? (
              <Text style={styles.searchErrorText}>No matching place found — try a different search.</Text>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('useCurrentLocation')}
            onPress={useMyLocation}
            style={styles.locateBtn}
          >
            {locating ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color={theme.colors.primary} />
            )}
          </Pressable>
        </View>

        <View style={styles.coordRow}>
          <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.textSecondary} />
          <Text style={styles.coordText}>
            {coord.latitude.toFixed(4)}, {coord.longitude.toFixed(4)}
          </Text>
        </View>

        <View style={styles.footer}>
          <Button label={t('done')} onPress={handleConfirm} loading={confirming} fullWidth />
        </View>
      </View>
    </Modal>
  );
};

const styles = createThemedStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingTop: Platform.OS === 'ios' ? 50 : theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: c.text,
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchWrap: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    right: theme.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: c.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    minHeight: 48,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: c.text,
  },
  searchErrorText: {
    ...theme.typography.caption,
    color: c.danger,
    backgroundColor: c.surface,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  suggestionsPanel: {
    marginTop: theme.spacing.xs,
    backgroundColor: c.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.divider,
  },
  suggestionRowPressed: {
    backgroundColor: c.surfaceAlt,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionMainText: {
    ...theme.typography.body,
    color: c.text,
  },
  suggestionSecondaryText: {
    ...theme.typography.caption,
    color: c.textMuted,
    marginTop: 1,
  },
  locateBtn: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    backgroundColor: c.surfaceAlt,
  },
  coordText: {
    ...theme.typography.caption,
    color: c.textSecondary,
  },
  footer: {
    padding: theme.spacing.lg,
  },
}));

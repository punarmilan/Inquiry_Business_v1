import * as Location from 'expo-location';
import { getPlaceLocation, placesAutocomplete } from './api';
import type { City } from '../types/hyperlocal';

type Coordinates = { latitude: number; longitude: number };
type ManualLocation = Coordinates & { city: City | null; locality: string; source: string };

export function needsManualLocationRepair(location: ManualLocation) {
  return location.source === 'manual' && location.city && location.locality !== location.city.name
    && location.longitude === location.city.center.coordinates[0]
    && location.latitude === location.city.center.coordinates[1];
}

export async function resolveManualCoordinates(city: City, locality?: string, accessToken?: string | null): Promise<Coordinates | null> {
  const center = { longitude: city.center.coordinates[0], latitude: city.center.coordinates[1] };
  if (!locality || locality === city.name) return center;
  const query = `${locality}, ${city.name}, ${city.state}, India`;
  // Manual selection must work without Android's device-location permission.
  // Reuse the authenticated Places service instead of silently using the city pin.
  if (accessToken) {
    try {
      const result = await placesAutocomplete(accessToken, { input: query, lat: center.latitude, lng: center.longitude });
      const match = result.data.find(place => place.mainText.trim().toLocaleLowerCase('en-IN') === locality.trim().toLocaleLowerCase('en-IN'));
      if (match) {
        const { location } = await getPlaceLocation(accessToken, match.placeId);
        if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
          return { latitude: location.latitude, longitude: location.longitude };
        }
      }
    } catch { /* Try the platform geocoder when the service is unavailable. */ }
  }
  try {
    const [match] = await Location.geocodeAsync(query);
    if (match && Number.isFinite(match.latitude) && Number.isFinite(match.longitude)) {
      return { latitude: match.latitude, longitude: match.longitude };
    }
  } catch { /* Preserve an existing valid pin when lookup is unavailable. */ }
  return null;
}

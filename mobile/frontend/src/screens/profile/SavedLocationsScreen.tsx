import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CityPickerModal } from '../../components/CityPickerModal';
import { useHyperlocalLocation } from '../../hooks/useHyperlocalLocation';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SavedLocations'>;

export const SavedLocationsScreen: React.FC<Props> = ({ navigation }) => {
  const locationState = useHyperlocalLocation({ promptOnEmpty: false });
  const location = locationState.location;
  const locations = locationState.savedLocations.length ? locationState.savedLocations : location ? [location] : [];
  const isActiveLocation = (item: NonNullable<typeof location>) => {
    if (!location) return false;
    return item.city?._id === location.city?._id && item.locality.trim().toLocaleLowerCase('en-IN') === location.locality.trim().toLocaleLowerCase('en-IN');
  };

  const removeLocation = (target: typeof location) => {
    if (!target) return;
    Alert.alert(
      'Delete saved location?',
      'Nearby offers and services will ask you to choose a location again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void locationState.removeSavedLocation(target).then(() => locations.length === 1 ? locationState.clearLocation() : undefined) },
      ]
    );
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Saved Locations</Text>
      </View>

      {locationState.loadingLocation ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : locations.length ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>DISCOVERY LOCATION</Text>
          {locations.map((item) => <Pressable key={`${item.city?._id || 'gps'}:${item.locality}`} onPress={() => void locationState.selectSavedLocation(item)} style={[styles.card, isActiveLocation(item) && styles.activeCard]}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons
                name={item.source === 'gps' ? 'crosshairs-gps' : 'map-marker-outline'}
                size={25}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.copy}>
              <Text style={styles.locationName}>{item.locality}</Text>
              <Text style={styles.locationMeta}>
                {[item.city?.name, item.city?.state].filter(Boolean).join(', ') || 'Current location'}
              </Text>
              <Text style={styles.locationSource}>{isActiveLocation(item) ? 'Active discovery location' : item.source === 'gps' ? 'Saved from GPS' : 'Selected manually'}</Text>
            </View>
            <Pressable onPress={() => removeLocation(item)} hitSlop={10}><MaterialCommunityIcons name="delete-outline" size={20} color={theme.colors.danger} /></Pressable>
          </Pressable>)}
          <Text style={styles.help}>This same location is used to find nearby offers and services.</Text>
          <Pressable onPress={() => locationState.setPickerVisible(true)} style={styles.primaryAction} accessibilityRole="button">
            <MaterialCommunityIcons name="plus" size={19} color={theme.colors.textInverse} />
            <Text style={styles.primaryActionText}>Add location</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <MaterialCommunityIcons name="map-marker-plus-outline" size={42} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No saved location</Text>
          <Text style={styles.emptyText}>Add a city, area, or your current location to discover nearby offers and services.</Text>
          <Pressable onPress={() => locationState.setPickerVisible(true)} style={styles.primaryAction} accessibilityRole="button">
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.textInverse} />
            <Text style={styles.primaryActionText}>Add location</Text>
          </Pressable>
        </View>
      )}

      <CityPickerModal
        visible={locationState.pickerVisible}
        cities={locationState.cities.filter((city) => city.offersEnabled || city.servicesEnabled)}
        onSelect={locationState.chooseManual}
        onUseCurrentLocation={locationState.detect}
        currentLocationLoading={locationState.loadingLocation}
        currentLocationError={locationState.locationError}
        onClose={() => locationState.setPickerVisible(false)}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { height: 58, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  back: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  title: { ...theme.typography.h3, color: theme.colors.text },
  content: { flex: 1, padding: 18 },
  sectionLabel: { ...theme.typography.tiny, color: theme.colors.textMuted, fontWeight: '900', letterSpacing: 1.1, marginBottom: 9 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17, borderRadius: 19, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginBottom: 9 },
  activeCard: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  iconWrap: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  copy: { flex: 1 },
  locationName: { ...theme.typography.bodyBold, color: theme.colors.text },
  locationMeta: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  locationSource: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 5 },
  help: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 19, marginTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyIcon: { width: 78, height: 78, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  emptyTitle: { ...theme.typography.h2, color: theme.colors.text, marginTop: 18, textAlign: 'center' },
  emptyText: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 7, marginBottom: 7 },
  primaryAction: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', marginTop: 18, paddingHorizontal: 20, borderRadius: 26, backgroundColor: theme.colors.primary },
  primaryActionText: { ...theme.typography.button, color: theme.colors.textInverse },
  deleteAction: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 9 },
  deleteActionText: { ...theme.typography.bodyBold, color: theme.colors.danger },
});

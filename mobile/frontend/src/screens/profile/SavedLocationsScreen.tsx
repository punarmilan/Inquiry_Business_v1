import React from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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

  const removeLocation = () => {
    Alert.alert(
      'Delete saved location?',
      'Nearby offers and services will ask you to choose a location again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void locationState.clearLocation() },
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
      ) : location ? (
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>DISCOVERY LOCATION</Text>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons
                name={location.source === 'gps' ? 'crosshairs-gps' : 'map-marker-outline'}
                size={25}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.copy}>
              <Text style={styles.locationName}>{location.locality}</Text>
              <Text style={styles.locationMeta}>
                {[location.city?.name, location.city?.state].filter(Boolean).join(', ') || 'Current location'}
              </Text>
              <Text style={styles.locationSource}>{location.source === 'gps' ? 'Saved from GPS' : 'Selected manually'}</Text>
            </View>
          </View>
          <Text style={styles.help}>This same location is used to find nearby offers and services.</Text>
          <Pressable onPress={() => locationState.setPickerVisible(true)} style={styles.primaryAction} accessibilityRole="button">
            <MaterialCommunityIcons name="pencil-outline" size={19} color={theme.colors.textInverse} />
            <Text style={styles.primaryActionText}>Change location</Text>
          </Pressable>
          <Pressable onPress={removeLocation} style={styles.deleteAction} accessibilityRole="button">
            <MaterialCommunityIcons name="delete-outline" size={20} color={theme.colors.danger} />
            <Text style={styles.deleteActionText}>Delete location</Text>
          </Pressable>
        </View>
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17, borderRadius: 19, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
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

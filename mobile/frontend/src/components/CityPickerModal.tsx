import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import type { City } from '../types/hyperlocal';

export const CityPickerModal: React.FC<{
  visible: boolean;
  cities: City[];
  onSelect: (city: City, locality?: string) => void;
  onUseCurrentLocation?: () => void;
  onClose: () => void;
}> = ({ visible, cities, onSelect, onUseCurrentLocation, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.title}>Select city & area</Text>
            <Text style={styles.subtitle}>You can change this anytime.</Text>
          </View>
          <Pressable onPress={onClose} style={styles.close}><MaterialCommunityIcons name="close" size={24} /></Pressable>
        </View>
        {onUseCurrentLocation ? (
          <Pressable onPress={onUseCurrentLocation} style={styles.currentLocation}>
            <MaterialCommunityIcons name="crosshairs-gps" size={21} color={theme.colors.primary} />
            <View style={styles.flex}>
              <Text style={styles.currentLocationTitle}>Use my current location</Text>
              <Text style={styles.currentLocationText}>Show offers around your exact GPS position</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.primary} />
          </Pressable>
        ) : null}
        <ScrollView contentContainerStyle={styles.list}>
          {cities.map((city) => (
            <View key={city._id} style={styles.cityCard}>
              <Pressable onPress={() => onSelect(city)} style={styles.cityRow}>
                <MaterialCommunityIcons name="city-variant-outline" size={24} color={theme.colors.primary} />
                <View style={styles.flex}><Text style={styles.cityName}>{city.name}</Text><Text style={styles.state}>{city.state}</Text></View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
              </Pressable>
              {city.localities?.length ? (
                <View style={styles.localities}>
                  {city.localities.map((locality) => (
                    <Pressable key={locality} onPress={() => onSelect(city, locality)} style={styles.chip}>
                      <Text style={styles.chipText}>{locality}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {!cities.length && <Text style={styles.empty}>No cities have been enabled yet.</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { maxHeight: '82%', backgroundColor: theme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...theme.typography.h2, color: theme.colors.text },
  subtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  currentLocation: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 16, padding: 13, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primaryLight },
  currentLocationTitle: { ...theme.typography.bodyBold, color: theme.colors.primaryDark },
  currentLocationText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  list: { paddingVertical: 16, gap: 10 },
  cityCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: 12 },
  cityRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 }, cityName: { ...theme.typography.bodyBold, color: theme.colors.text },
  state: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  localities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  chip: { backgroundColor: theme.colors.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99 },
  chipText: { ...theme.typography.caption, color: theme.colors.primaryDark, fontWeight: '700' },
  empty: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', padding: 24 },
});

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { createServiceBooking, listServiceProviders } from '../../services/api';
import type { ServiceProvider } from '../../types/hyperlocal';
import type { ServicesStackParamList } from '../../navigation/types';
import { getProviderAvatar } from '../../config/providerAvatars';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'BookService'>;
export const BookServiceScreen: React.FC<Props> = ({ route, navigation }) => {
  const { accessToken, currentUser } = useApp();
  const [houseNo, setHouseNo] = useState('');
  const [address, setAddress] = useState(currentUser?.location?.label || '');
  const [locality, setLocality] = useState(route.params.availableAreas?.length === 1 ? route.params.availableAreas[0] : '');
  const [description, setDescription] = useState('');
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  const [scheduledFor, setScheduledFor] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(currentUser?.location ? { latitude: currentUser.location.latitude, longitude: currentUser.location.longitude } : null);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedProvider(null);
    setProvidersLoading(true);
    listServiceProviders(route.params.cityId, route.params.categoryId, locality)
      .then((response) => { setProviders(response.data); setSelectedProvider(route.params.providerId ? response.data.find((provider) => provider._id === route.params.providerId) || null : null); })
      .catch(() => setProviders([]))
      .finally(() => setProvidersLoading(false));
  }, [locality, route.params.categoryId, route.params.cityId, route.params.providerId]);

  const detect = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return Alert.alert('Location denied', 'Enter the service address manually and select your saved city location.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoordinates(coords);
      const [place] = await Location.reverseGeocodeAsync(coords);
      if (place) {
        if (!houseNo.trim() && place.name) setHouseNo(place.name);
        setAddress([place.street, place.district].filter(Boolean).join(', ') || [place.name, place.city].filter(Boolean).join(', '));
        if (!locality.trim() && (place.district || place.subregion)) setLocality(place.district || place.subregion || '');
      }
    } catch (error: any) {
      Alert.alert('Location unavailable', error?.message || 'Could not read your current location.');
    }
  };
  const submit = async () => {
    if (!accessToken || !address.trim() || !coordinates) return Alert.alert('Location required', 'Use current location or select a saved address before booking.');
    if (route.params.availableAreas?.length && !route.params.availableAreas.some((area) => area.toLowerCase() === locality.trim().toLowerCase())) return Alert.alert('Area required', 'Select an available service area to continue.');
    if (!selectedProvider) return Alert.alert('Provider required', 'Choose a provider to send your direct service request.');
    setLoading(true);
    try {
      const selectedDate = scheduleType === 'now' ? new Date() : scheduledFor;
      if (!Number.isFinite(selectedDate.getTime()) || (scheduleType === 'later' && selectedDate <= new Date())) return Alert.alert('Choose a future date', 'Schedule Later requires a valid future date.');
      const combinedAddress = [houseNo.trim(), address.trim(), locality.trim(), route.params.cityName].filter(Boolean).join(', ').slice(0, 300);
      const response = await createServiceBooking(accessToken, { cityId: route.params.cityId, categoryId: route.params.categoryId, workerId: selectedProvider._id, address: combinedAddress, locality, addressDetails: { houseNo: houseNo.trim(), streetAddress: address.trim(), area: locality.trim(), city: route.params.cityName || '' }, ...coordinates, scheduleType, scheduledFor: selectedDate.toISOString(), problemDescription: description });
      navigation.replace('BookingDetails', { bookingId: response.booking._id });
    } catch (error: any) { Alert.alert('Booking not created', error.message); }
    finally { setLoading(false); }
  };
  return <ScreenContainer><KeyboardAvoidingView style={styles.providerCopy} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={styles.top}><Pressable onPress={navigation.goBack} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={24} /></Pressable><Text style={styles.title}>Book {route.params.categoryName}</Text></View><ScrollView style={styles.providerCopy} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <View style={styles.estimate}><Text style={styles.estimateLabel}>Price estimate</Text><Text style={styles.estimatePrice}>From ₹{route.params.basePrice}</Text><Text style={styles.estimateNote}>Final amount is confirmed after inspection.</Text></View>
    <Input label="House No." value={houseNo} onChangeText={setHouseNo} placeholder="House / flat number" />
    <Input label="Street Address" value={address} onChangeText={setAddress} placeholder="Street, landmark" multiline textAlignVertical="top" />
    <Button label="Use current location" variant="outline" onPress={detect} icon={<MaterialCommunityIcons name="crosshairs-gps" size={20} color={theme.colors.primary} />} />
    <Text style={styles.label}>Select service area</Text>
    {route.params.availableAreas?.length ? <View style={styles.areaGrid}>{route.params.availableAreas.map((area) => <Pressable key={area} onPress={() => setLocality(area)} style={[styles.areaChip, locality === area && styles.areaChipActive]}><Text style={[styles.areaChipText, locality === area && styles.areaChipTextActive]}>{area}</Text></Pressable>)}</View> : <Input label="Area / locality" value={locality} onChangeText={setLocality} placeholder="Your area" />}
    <Input label="City" value={route.params.cityName || ''} editable={false} />
    <View style={styles.providerHeading}><Text style={styles.label}>Choose your provider</Text><View style={styles.onlineHint}><View style={[styles.onlineDot, styles.availableDot]} /><Text style={styles.hintText}>Online or offline</Text></View></View>
    {providersLoading ? <ActivityIndicator color={theme.colors.primary} style={styles.providerLoader} /> : null}
    {!providersLoading && !providers.length ? <View style={styles.noProviders}><MaterialCommunityIcons name="account-search-outline" size={25} color={theme.colors.textMuted} /><Text style={styles.noProvidersText}>No verified provider is listed for this area yet.</Text></View> : null}
    {providers.map((provider) => {
      const isSelected = selectedProvider?._id === provider._id;
      const isOnline = provider.availability === 'available';
      const localAvatar = getProviderAvatar(provider.name);
      return <Pressable key={provider._id} onPress={() => setSelectedProvider(provider)} style={[styles.providerCard, isSelected && styles.providerCardSelected]}>
        {localAvatar ? <Image source={localAvatar} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <Avatar uri={provider.photoUrl} name={provider.name} size={48} />}<View style={styles.providerCopy}><View style={styles.providerNameRow}><Text style={styles.providerName}>{provider.name}</Text><View style={[styles.availabilityPill, isOnline ? styles.availablePill : styles.unavailablePill]}><View style={[styles.onlineDot, isOnline ? styles.availableDot : styles.unavailableDot]} /><Text style={[styles.availabilityText, { color: isOnline ? theme.colors.success : theme.colors.textMuted }]}>{isOnline ? 'Online' : provider.availability === 'busy' ? 'Busy' : 'Offline'}</Text></View></View><Text style={styles.providerMeta}>★ {provider.ratingAverage || 'New'} · {provider.completedBookings || 0} jobs · {provider.experienceYears || 0} yrs exp.</Text><Text style={styles.providerAreas}>{provider.serviceAreas?.join(' · ') || 'Local service provider'}</Text></View>{isSelected ? <MaterialCommunityIcons name="check-circle" size={23} color={theme.colors.primary} /> : <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textMuted} />}
      </Pressable>;
    })}
    <Input label="Describe the issue" value={description} onChangeText={setDescription} placeholder="What needs to be fixed?" multiline />
    <Text style={styles.label}>When do you need it?</Text><View style={styles.toggle}>{(['now', 'later'] as const).map((item) => <Pressable key={item} onPress={() => { setScheduleType(item); setDatePickerVisible(item === 'later'); }} style={[styles.toggleItem, scheduleType === item && styles.toggleActive]}><Text style={[styles.toggleText, scheduleType === item && styles.toggleTextActive]}>{item === 'now' ? 'Book Now' : 'Schedule Later'}</Text></Pressable>)}</View>
    {scheduleType === 'later' ? <Pressable style={styles.picker} onPress={() => setDatePickerVisible(true)}><Text style={styles.toggleText}>{scheduledFor.toLocaleString('en-IN')}</Text><MaterialCommunityIcons name="calendar-edit" size={20} color={theme.colors.primary} /></Pressable> : null}
    {datePickerVisible && <DateTimePicker value={scheduledFor} mode="date" display={Platform.OS === 'ios' ? 'compact' : 'calendar'} minimumDate={new Date()} onChange={(event, date) => { setDatePickerVisible(false); if (event.type !== 'dismissed' && date && Number.isFinite(date.getTime())) setScheduledFor(date); }} />}
    <Button label="Confirm Booking" onPress={submit} loading={loading} fullWidth style={styles.submit} />
  </ScrollView></KeyboardAvoidingView></ScreenContainer>;
};
const styles = StyleSheet.create({ top: { height: 58, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface }, back: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, title: { ...theme.typography.h3, color: theme.colors.text }, content: { padding: 18, paddingBottom: 100 }, estimate: { padding: 18, borderRadius: 18, backgroundColor: theme.colors.secondaryLight, marginBottom: 20 }, estimateLabel: { ...theme.typography.caption, color: theme.colors.textSecondary }, estimatePrice: { fontSize: 25, fontWeight: '900', color: theme.colors.text, marginTop: 4 }, estimateNote: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 }, label: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 20, marginBottom: 8 }, areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, areaChip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 99, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: theme.colors.surface }, areaChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, areaChipText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '700' }, areaChipTextActive: { color: theme.colors.textInverse }, providerHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, onlineHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 20 }, hintText: { ...theme.typography.tiny, color: theme.colors.textMuted }, onlineDot: { width: 8, height: 8, borderRadius: 4 }, availableDot: { backgroundColor: theme.colors.success }, unavailableDot: { backgroundColor: theme.colors.textMuted }, providerLoader: { marginVertical: 15 }, noProviders: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surfaceAlt, borderRadius: 14, padding: 13 }, noProvidersText: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary }, providerCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 17, padding: 12, marginBottom: 9 }, providerCardSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }, providerCardDisabled: { opacity: 0.58 }, providerCopy: { flex: 1 }, providerNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, providerName: { ...theme.typography.bodyBold, color: theme.colors.text, flex: 1 }, availabilityPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 4 }, availablePill: { backgroundColor: theme.colors.successLight }, unavailablePill: { backgroundColor: theme.colors.surfaceAlt }, availabilityText: { ...theme.typography.tiny, fontWeight: '900' }, providerMeta: { ...theme.typography.tiny, color: theme.colors.textSecondary, marginTop: 4 }, providerAreas: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 3 }, toggle: { flexDirection: 'row', backgroundColor: theme.colors.surfaceAlt, borderRadius: 15, padding: 4 }, toggleItem: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, toggleActive: { backgroundColor: theme.colors.primary }, toggleText: { ...theme.typography.caption, fontWeight: '800', color: theme.colors.textSecondary }, toggleTextActive: { color: theme.colors.textInverse }, picker: { marginTop: 14, backgroundColor: theme.colors.surface, borderRadius: 14, padding: 8 }, submit: { marginTop: 28 } });

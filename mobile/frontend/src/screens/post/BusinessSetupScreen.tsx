import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { CityPickerModal } from '../../components/CityPickerModal';
import { useHyperlocalLocation } from '../../hooks/useHyperlocalLocation';
import { createBusiness, listMyBusinesses, updateBusiness } from '../../services/api';
import type { Business, City } from '../../types/hyperlocal';
import type { PostStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<PostStackParamList, 'BusinessSetup'>;
type RequiredField = 'name' | 'category' | 'city' | 'pin' | 'address' | 'phone';
type FormErrors = Partial<Record<RequiredField, string>>;

const fieldLabels: Record<RequiredField, string> = {
  name: 'business name',
  category: 'category',
  city: 'supported city and area',
  pin: 'exact location pin',
  address: 'business address',
  phone: 'phone number',
};

export const BusinessSetupScreen: React.FC<Props> = ({ route, navigation }) => {
  const { accessToken, currentUser, refreshBusinesses } = useApp();
  const locationState = useHyperlocalLocation();
  const businessId = route.params?.businessId;
  const isEditing = Boolean(businessId);
  const [existingBusiness, setExistingBusiness] = useState<Business | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [shopImage, setShopImage] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [website, setWebsite] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pinLoading, setPinLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken || !businessId) return;
    listMyBusinesses(accessToken).then((response) => {
      const item = response.data.find((candidate) => candidate._id === businessId);
      if (!item) return;
      setExistingBusiness(item);
      setName(item.name);
      setCategory(item.category);
      setDescription(item.description || '');
      setShopImage(item.coverImageUrl || item.logoUrl || '');
      setAddress(item.address);
      setPhone(item.phone);
      setWhatsapp(item.whatsapp || '');
      setEmail(item.email || '');
      setWebsite(item.website || '');
      setCoordinates({ latitude: item.location.coordinates[1], longitude: item.location.coordinates[0] });
      if (item.city && typeof item.city !== 'string') locationState.chooseManual(item.city, item.locality);
    }).catch(() => Alert.alert('Business profile unavailable', 'We could not load this business profile.'));
  }, [accessToken, businessId, locationState.chooseManual]);

  useEffect(() => {
    if (currentUser?.phone) setPhone((current) => current.trim() || currentUser.phone);
    if (currentUser?.email) setEmail((current) => current.trim() || currentUser.email || '');
  }, [currentUser?.email, currentUser?.phone]);

  const clearError = (field: RequiredField) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const chooseCity = async (city: City, locality?: string) => {
    await locationState.chooseManual(city, locality);
    clearError('city');
  };

  const pickShopImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission needed', 'Allow photo access to add your shop image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.75,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setShopImage(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
  };

  const detect = async () => {
    setPinLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setErrors((current) => ({ ...current, pin: 'Location permission is required to add the exact pin.' }));
        Alert.alert('Location denied', 'Allow location access, or retry after enabling it in app settings.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const { place, availability } = await locationState.selectCoordinates(coords);
      const detectedAddress = place
        ? [place.name, place.street, place.district, place.city, place.region].filter(Boolean).join(', ')
        : '';

      setCoordinates(coords);
      clearError('pin');
      if (detectedAddress) {
        setAddress(detectedAddress);
        clearError('address');
      }

      if (!availability.city || !availability.offersAvailable) {
        setErrors((current) => ({ ...current, city: 'Select a city where Offers are enabled.' }));
        locationState.setPickerVisible(true);
        Alert.alert('Select supported city', 'The pin was added, but this location is outside an Offers-enabled city.');
      } else {
        clearError('city');
      }
    } catch (error: any) {
      setErrors((current) => ({ ...current, pin: 'Could not read the exact location. Please retry.' }));
      Alert.alert('Location not added', error?.message || 'Could not read your location. Please try again.');
    } finally {
      setPinLoading(false);
    }
  };

  const submit = async () => {
    if (!accessToken) {
      Alert.alert('Session expired', 'Please sign in again before managing your business profile.');
      return;
    }

    const selected = locationState.location;
    const existingCity = existingBusiness?.city && typeof existingBusiness.city !== 'string' ? existingBusiness.city : null;
    const selectedCity = selected?.city || existingCity;
    const selectedCoordinates = coordinates || (existingBusiness ? { latitude: existingBusiness.location.coordinates[1], longitude: existingBusiness.location.coordinates[0] } : null);
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = 'Business name is required.';
    if (!category.trim()) nextErrors.category = 'Category is required.';
    if (!selectedCity || !selectedCity.offersEnabled) nextErrors.city = 'Select a city where Offers are enabled.';
    if (!selectedCoordinates) nextErrors.pin = 'Add the exact business location pin.';
    if (!address.trim()) nextErrors.address = 'Exact business address is required.';
    if (!phone.trim()) nextErrors.phone = 'Phone number is required.';

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const missing = (Object.keys(nextErrors) as RequiredField[]).map((field) => fieldLabels[field]);
      Alert.alert('Complete required fields', `Please complete: ${missing.join(', ')}.`);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        cityId: selectedCity!._id,
        category: category.trim(),
        description: description.trim(),
        logoUrl: shopImage.trim(),
        coverImageUrl: shopImage.trim(),
        address: address.trim(),
        locality: selected?.locality || existingBusiness?.locality,
        ...selectedCoordinates!,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim(),
        website: website.trim(),
      };
      if (isEditing && businessId) {
        await updateBusiness(accessToken, businessId, payload);
        await refreshBusinesses();
        Alert.alert('Profile sent for approval', 'Your business changes will be reviewed within 24 hours.');
        navigation.goBack();
      } else {
        await createBusiness(accessToken, payload);
        await refreshBusinesses();
        Alert.alert('Business submitted for approval', 'Admin review usually completes within 24 hours. You can post offers after approval.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Business not created', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.top}>
        <Pressable onPress={navigation.goBack} style={styles.back}>
          <MaterialCommunityIcons name="arrow-left" size={24} />
        </Pressable>
        <Text style={styles.title}>{isEditing ? 'Customize Business Profile' : 'Create Business Profile'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Business name *"
          value={name}
          onChangeText={(value) => {
            setName(value);
            clearError('name');
          }}
          error={errors.name}
          placeholder="e.g. Pizza Zone"
        />
        <Input
          label="Category *"
          value={category}
          onChangeText={(value) => {
            setCategory(value);
            clearError('category');
          }}
          error={errors.category}
          placeholder="Food, Salon, Shopping..."
        />
        <Input label="Description" value={description} onChangeText={setDescription} multiline placeholder="Tell customers about your business" />

        <Text style={styles.label}>Shop image</Text>
        <Pressable onPress={pickShopImage} style={styles.imagePicker} accessibilityRole="button" accessibilityLabel="Add shop image">
          {shopImage ? <Image source={{ uri: shopImage }} style={styles.shopImage} resizeMode="cover" /> : <View style={styles.imagePlaceholder}><MaterialCommunityIcons name="camera-plus-outline" size={30} color={theme.colors.primary} /><Text style={styles.imagePlaceholderText}>Add your shop image</Text></View>}
          <View style={styles.imageOverlay}><MaterialCommunityIcons name="pencil-outline" size={16} color={theme.colors.textInverse} /><Text style={styles.imageOverlayText}>{shopImage ? 'Change image' : 'Choose image'}</Text></View>
        </Pressable>
        <Text style={styles.imageHint}>This image appears on your business profile and is reviewed with the profile.</Text>

        <Text style={styles.label}>City & area *</Text>
        <Pressable
          onPress={() => locationState.setPickerVisible(true)}
          style={[styles.selector, errors.city && styles.selectorError]}
        >
          <MaterialCommunityIcons name="city-variant-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.selectorText}>
            {locationState.location?.city
              ? `${locationState.location.locality}, ${locationState.location.city.name}`
              : 'Select supported city'}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={22} />
        </Pressable>
        {errors.city ? <Text style={styles.error}>{errors.city}</Text> : null}

        <Input
          label="Exact business address *"
          value={address}
          onChangeText={(value) => {
            setAddress(value);
            clearError('address');
          }}
          error={errors.address}
          multiline
        />
        <Button
          label={coordinates ? 'Location pin added' : 'Pin exact location'}
          variant="outline"
          onPress={detect}
          loading={pinLoading}
          icon={
            <MaterialCommunityIcons
              name={coordinates ? 'check-circle' : 'map-marker-plus-outline'}
              size={20}
              color={theme.colors.primary}
            />
          }
        />
        {errors.pin ? <Text style={styles.pinError}>{errors.pin}</Text> : null}

        <View style={styles.spacer} />
        <Input
          label="Phone *"
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            clearError('phone');
          }}
          error={errors.phone}
          keyboardType="phone-pad"
        />
        <Input label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Website (optional)" value={website} onChangeText={setWebsite} autoCapitalize="none" />
        <View style={styles.approvalNote}>
          <MaterialCommunityIcons name="clock-check-outline" size={21} color={theme.colors.secondary} />
          <Text style={styles.approvalText}>{isEditing ? 'Any profile change goes to admin approval again. Expected review time: within 24 hours.' : 'Your business profile will be reviewed by admin. Expected approval time: within 24 hours.'}</Text>
        </View>
        <Button label={isEditing ? 'Submit Profile Changes' : 'Submit Business Profile'} onPress={submit} loading={loading} fullWidth />
      </ScrollView>
      <CityPickerModal
        visible={locationState.pickerVisible}
        cities={locationState.cities.filter((city) => city.offersEnabled)}
        onSelect={chooseCity}
        onClose={() => locationState.setPickerVisible(false)}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  top: {
    height: 58,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  content: {
    padding: 18,
    paddingBottom: 100,
  },
  label: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  selector: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  selectorError: {
    borderColor: theme.colors.danger,
    marginBottom: 4,
  },
  selectorText: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginBottom: 16,
  },
  pinError: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: 4,
  },
  spacer: {
    height: 18,
  },
  imagePicker: { height: 150, borderRadius: 18, overflow: 'hidden', backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.border, position: 'relative', marginBottom: 6 },
  shopImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7 },
  imagePlaceholderText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '800' },
  imageOverlay: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99 },
  imageOverlayText: { ...theme.typography.tiny, color: theme.colors.textInverse, fontWeight: '800' },
  imageHint: { ...theme.typography.tiny, color: theme.colors.textMuted, marginBottom: 16 },
  approvalNote: { flexDirection: 'row', gap: 10, backgroundColor: theme.colors.secondaryLight, borderRadius: 15, padding: 14, marginBottom: 18 },
  approvalText: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18 },
});

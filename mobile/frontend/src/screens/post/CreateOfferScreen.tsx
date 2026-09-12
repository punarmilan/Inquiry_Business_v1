import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, findNodeHandle, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { OfferCardDesigner } from '../../components/OfferCardDesigner';
import { OfferCard } from '../../components/OfferCard';
import { createOffer, listMyBusinesses, listOfferTemplates, updateOffer, type OfferPayload } from '../../services/api';
import { DEFAULT_OFFER_CARD_DESIGN, resolveOfferCardLayout, toOfferCardTemplate, type OfferCardDesign, type OfferCardTemplate } from '../../config/offerCardDesigner';
import type { Business } from '../../types/hyperlocal';
import type { PostStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';
import { sanitizeIndianPhoneInput, toIndianPhone } from '../../utils/phoneValidation';

type Props = NativeStackScreenProps<PostStackParamList, 'CreateOffer'>;
type DatePickerTarget = 'start' | 'expiry' | null;

const formatOfferDate = (date: Date) =>
  date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const CreateOfferScreen: React.FC<Props> = ({ route, navigation }) => {
  const { accessToken } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const params = route.params || ({} as PostStackParamList['CreateOffer']);
  const existingOffer = params.offer;
  const isEditing = Boolean(existingOffer);
  const designMode = params.designMode || 'templates';
  const hasDesignDraft = Boolean(params.initialDesign && !isEditing);
  const [business, setBusiness] = useState<Business | null>(null);
  const [title, setTitle] = useState(existingOffer?.title || params.initialTitle || '');
  const [description, setDescription] = useState(existingOffer?.description || params.initialDescription || '');
  const [category, setCategory] = useState(existingOffer?.category || params.initialCategory || '');
  const [originalPrice, setOriginalPrice] = useState(existingOffer ? String(existingOffer.originalPrice) : '');
  const [offerPrice, setOfferPrice] = useState(existingOffer ? String(existingOffer.offerPrice) : '');
  const [cardDesign, setCardDesign] = useState<OfferCardDesign>(() => existingOffer?.cardDesign
    ? { ...DEFAULT_OFFER_CARD_DESIGN, ...existingOffer.cardDesign, layout: resolveOfferCardLayout(existingOffer.cardDesign) }
    : params.initialDesign
      ? { ...DEFAULT_OFFER_CARD_DESIGN, ...params.initialDesign, layout: resolveOfferCardLayout(params.initialDesign) }
    : designMode === 'custom'
      ? { ...DEFAULT_OFFER_CARD_DESIGN, templateId: 'custom', templateSource: 'custom', previewUrl: undefined }
      : DEFAULT_OFFER_CARD_DESIGN);
  const [startsAt, setStartsAt] = useState(existingOffer ? new Date(existingOffer.startsAt) : new Date());
  const [expiresAt, setExpiresAt] = useState(existingOffer ? new Date(existingOffer.expiresAt) : new Date(Date.now() + 30 * 86400000));
  const [activeDatePicker, setActiveDatePicker] = useState<DatePickerTarget>(null);
  const [terms, setTerms] = useState(existingOffer?.terms || '');
  const [phone, setPhone] = useState(existingOffer?.phone || '');
  const [whatsapp, setWhatsapp] = useState(existingOffer?.whatsapp || '');
  const [offerAddress, setOfferAddress] = useState(existingOffer?.address || '');
  const [houseNo, setHouseNo] = useState(existingOffer?.addressDetails?.houseNo || '');
  const [streetAddress, setStreetAddress] = useState(existingOffer?.addressDetails?.streetAddress || existingOffer?.address || '');
  const [locality, setLocality] = useState(existingOffer?.locality || '');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(() => {
    const value = existingOffer?.location?.coordinates;
    return Array.isArray(value) && value.length >= 2 ? { latitude: value[1], longitude: value[0] } : null;
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(existingOffer?.imageUrls || params.initialImageUrls || []);
  const [adminTemplates, setAdminTemplates] = useState<OfferCardTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    listMyBusinesses(accessToken).then((response) => {
      const item = response.data.find((candidate) => candidate._id === params.businessId) || null;
      setBusiness(item);
      if (item && !isEditing) {
        setCategory(item.category);
        setPhone(sanitizeIndianPhoneInput(item.phone).digits);
        setWhatsapp(sanitizeIndianPhoneInput(item.whatsapp || '').digits);
        setOfferAddress(item.address);
        setStreetAddress(item.addressDetails?.streetAddress || item.address);
        setHouseNo(item.addressDetails?.houseNo || '');
        setLocality(item.locality || '');
        if (!coordinates && Array.isArray(item.location?.coordinates)) setCoordinates({ latitude: item.location.coordinates[1], longitude: item.location.coordinates[0] });
      }
    });
  }, [accessToken, isEditing, params.businessId]);

  useEffect(() => {
    let mounted = true;
    listOfferTemplates()
      .then((response) => {
        if (!mounted) return;
        // Admin data must never be allowed to break the create-offer screen.
        const templates = Array.isArray(response.data)
          ? response.data.filter((template) => template && typeof template === 'object').map(toOfferCardTemplate)
          : [];
        setAdminTemplates(templates);
        if (!isEditing && designMode === 'templates' && templates[0]) setCardDesign((current) => current.templateId === DEFAULT_OFFER_CARD_DESIGN.templateId ? ({
          ...current,
          templateId: templates[0].id,
          templateVersion: templates[0].version,
          templateSource: 'admin',
          previewUrl: templates[0].previewUrl,
          canvas: templates[0].canvas,
          dynamicFields: templates[0].dynamicFields || {},
          avatarId: current.avatarId,
          primaryColor: templates[0].primaryColor,
          secondaryColor: templates[0].secondaryColor,
          layout: templates[0].layout,
        }) : current);
      })
      .catch(() => {
        // The bundled templates remain available when the admin service is offline.
      });
    return () => { mounted = false; };
  }, [designMode, isEditing]);

  const selectedAdminTemplate = adminTemplates.find((template) => template.id === cardDesign.templateId);
  // Templates provide a starting layout only; every offer field remains editable
  // so the business owner can personalize it before submitting for approval.
  const isFieldEditable = (_key: string) => true;

  useEffect(() => {
    if (isEditing || !selectedAdminTemplate) return;
    selectedAdminTemplate.editableFields?.forEach((field) => {
      if (!field.defaultValue) return;
      if (field.key === 'title' && !title) setTitle(field.defaultValue);
      if (field.key === 'description' && !description) setDescription(field.defaultValue);
      if (field.key === 'category' && !category) setCategory(field.defaultValue);
      if (field.key === 'terms' && !terms) setTerms(field.defaultValue);
    });
  }, [selectedAdminTemplate, isEditing, title, description, category, terms]);

  const discount = useMemo(() => {
    const original = Number(originalPrice);
    const sale = Number(offerPrice);
    return original > 0 && sale >= 0 ? Math.max(0, Math.round(((original - sale) / original) * 100)) : 0;
  }, [originalPrice, offerPrice]);

  const handleDateChange = (event: { type?: string }, selectedDate?: Date) => {
    const target = activeDatePicker;
    // Android's native dialog must be unmounted after either Select or Cancel.
    setActiveDatePicker(null);
    if (!target || event.type === 'dismissed' || !selectedDate) return;

    if (target === 'start') {
      setStartsAt(selectedDate);
      if (expiresAt.getTime() < selectedDate.getTime()) setExpiresAt(selectedDate);
      return;
    }
    setExpiresAt(selectedDate);
  };

  const useCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return Alert.alert('Location denied', 'Enter the offer address manually or allow location access in app settings.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const places = await Location.reverseGeocodeAsync(next);
      const place = places[0];
      setCoordinates(next);
      if (place) {
        if (!houseNo.trim() && place.name) setHouseNo(place.name);
        if (!streetAddress.trim() && place.street) setStreetAddress(place.street);
        if (!locality.trim() && (place.district || place.subregion)) setLocality(place.district || place.subregion || '');
      }
    } catch (error: any) {
      Alert.alert('Location not added', error?.message || 'Could not read your current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const submit = async () => {
    if (!accessToken || !business || !title || !description || !originalPrice || !offerPrice || !streetAddress.trim()) {
      return Alert.alert('Complete required fields', 'Title, description and prices are required.');
    }

    setLoading(true);
    try {
      const businessCoordinates = business.location?.coordinates;
      const selectedCoordinates = coordinates || (Array.isArray(businessCoordinates) && businessCoordinates.length >= 2
        ? { latitude: businessCoordinates[1], longitude: businessCoordinates[0] }
        : null);
      if (!selectedCoordinates) throw new Error('Add a valid offer location before submitting.');
      const cityName = typeof business.city === 'string' ? '' : business.city?.name || '';
      const combinedAddress = [houseNo.trim(), streetAddress.trim(), locality.trim(), cityName].filter(Boolean).join(', ').slice(0, 300);
      const payload: Omit<OfferPayload, 'businessId'> = {
        title,
        description,
        category,
        originalPrice: Number(originalPrice),
        offerPrice: Number(offerPrice),
        discountPercentage: discount,
        imageUrls,
        cardDesign: {
          ...cardDesign,
          customizations: { ...(cardDesign.customizations || {}), title, description, category, originalPrice, offerPrice, startsAt: startsAt.toISOString(), expiresAt: expiresAt.toISOString(), terms },
        },
        startsAt: startsAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        address: combinedAddress || offerAddress || business.address,
        locality: locality || business.locality,
        addressDetails: { houseNo: houseNo.trim(), streetAddress: streetAddress.trim(), area: locality.trim(), city: cityName },
        latitude: selectedCoordinates.latitude,
        longitude: selectedCoordinates.longitude,
        phone: phone ? toIndianPhone(phone) || phone : '',
        whatsapp: whatsapp ? toIndianPhone(whatsapp) || whatsapp : '',
        terms,
      };
      if (existingOffer) {
        await updateOffer(accessToken, existingOffer._id, payload);
        Alert.alert('Offer submitted for review', 'Your changes will be reviewed by admin, usually within 1 hour, before becoming visible.');
        navigation.goBack();
      } else {
        await createOffer(accessToken, { businessId: business._id, ...payload });
        navigation.replace('OfferSubmitted');
      }
    } catch (error: any) {
      if (error?.code === 'ACTIVE_OFFER_LIMIT_REACHED' || (error?.status === 409 && /maximum active offer/i.test(error?.message || ''))) {
        Alert.alert(
          'Active offer limit reached',
          'Your current plan already has the maximum number of active offers. Deactivate an old offer or upgrade your plan to publish another one.',
          [
            { text: 'View plans', onPress: () => navigation.navigate('Plans', { businessId: business._id }) },
            { text: 'OK', style: 'cancel' },
          ],
        );
      } else {
        const validationMessage = Array.isArray(error?.details)
          ? error.details.map((detail: { message?: string }) => detail.message).filter(Boolean).join('\n')
          : '';
        Alert.alert('Offer not submitted', validationMessage || error?.message || 'Please check the offer details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const datePickerValue = activeDatePicker === 'expiry' ? expiresAt : startsAt;
  const datePickerMinimum = activeDatePicker === 'expiry' ? startsAt : new Date();
  const revealFocusedInput = () => {
    setTimeout(() => {
      const focusedInput = TextInput.State.currentlyFocusedInput();
      const scrollView = scrollRef.current;
      if (!focusedInput || !scrollView) return;
      const keyboardTop = Math.min(Keyboard.metrics()?.screenY ?? Number.POSITIVE_INFINITY, Dimensions.get('window').height);
      focusedInput.measureInWindow((_x, y, _width, height) => {
        if (Number.isFinite(keyboardTop)) {
          const hiddenByKeyboard = y + height + 28 - keyboardTop;
          if (hiddenByKeyboard > 0) scrollView.scrollTo({ y: scrollOffsetRef.current + hiddenByKeyboard, animated: true });
          return;
        }
        const nativeHandle = findNodeHandle(focusedInput as any);
        if (nativeHandle) scrollView.scrollResponderScrollNativeHandleToKeyboard(nativeHandle, 96, true);
      });
    }, 250);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.top}>
        <Pressable onPress={navigation.goBack} style={styles.back}>
          <MaterialCommunityIcons name="arrow-left" size={24} />
        </Pressable>
        <Text style={styles.topTitle}>{isEditing ? 'Edit Offer' : 'Create Offer'}</Text>
      </View>
      <ScrollView ref={scrollRef} onScroll={(event) => { scrollOffsetRef.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="always" keyboardDismissMode="none" automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
        <View style={styles.business}>
          <MaterialCommunityIcons name="storefront-outline" size={24} color={theme.colors.primary} />
          <View>
            <Text style={styles.businessLabel}>BUSINESS</Text>
            <Text style={styles.businessName}>{business?.name || 'Loading...'}</Text>
          </View>
        </View>

        {hasDesignDraft ? (
          <View style={styles.copySummary}>
            <View style={styles.copySummaryHeader}>
              <View style={styles.flex}>
                <Text style={styles.copySummaryTitle}>Offer copy ready</Text>
                <Text style={styles.copySummaryHint}>Title, description and category came from your design.</Text>
              </View>
              <Pressable onPress={() => navigation.goBack()} style={styles.editDesign}>
                <MaterialCommunityIcons name="pencil-outline" size={17} color={theme.colors.primary} />
                <Text style={styles.editDesignText}>Edit</Text>
              </Pressable>
            </View>
            <Text style={styles.copySummaryValue}>{title}</Text>
            <Text style={styles.copySummaryDescription}>{description}</Text>
            <Text style={styles.copySummaryCategory}>{category}</Text>
          </View>
        ) : (
          <>
            <Input label={`Offer title *${isFieldEditable('title') ? '' : ' (locked by template)'}`} editable={isFieldEditable('title')} value={title} onChangeText={setTitle} placeholder="30% off on family dinner" onFocus={revealFocusedInput} />
            <Input label={`Description *${isFieldEditable('description') ? '' : ' (locked by template)'}`} editable={isFieldEditable('description')} value={description} onChangeText={setDescription} multiline placeholder="What is included?" onFocus={revealFocusedInput} />
            <Input label={`Category *${isFieldEditable('category') ? '' : ' (locked by template)'}`} editable={isFieldEditable('category')} value={category} onChangeText={setCategory} onFocus={revealFocusedInput} />
          </>
        )}
        <View style={styles.two}>
          <View style={styles.flex}>
            <Input label={`Original price *${isFieldEditable('originalPrice') ? '' : ' (locked by template)'}`} editable={isFieldEditable('originalPrice')} value={originalPrice} onChangeText={setOriginalPrice} keyboardType="numeric" onFocus={revealFocusedInput} />
          </View>
          <View style={styles.flex}>
            <Input label={`Offer price *${isFieldEditable('offerPrice') ? '' : ' (locked by template)'}`} editable={isFieldEditable('offerPrice')} value={offerPrice} onChangeText={setOfferPrice} keyboardType="numeric" onFocus={revealFocusedInput} />
          </View>
        </View>

        <View style={styles.discount}>
          <Text style={styles.discountLabel}>Calculated discount</Text>
          <Text style={styles.discountValue}>{discount}% OFF</Text>
        </View>

        {params.initialDesign ? (
          <View style={styles.designReady}>
            <View style={styles.designReadyIcon}><MaterialCommunityIcons name="check-decagram" size={24} color={theme.colors.success} /></View>
            <View style={styles.flex}><Text style={styles.designReadyTitle}>Design ready</Text><Text style={styles.designReadyText}>Your card design, typography, colors and image are saved.</Text></View>
            <Pressable onPress={() => navigation.goBack()} style={styles.editDesign}><MaterialCommunityIcons name="pencil-outline" size={17} color={theme.colors.primary} /><Text style={styles.editDesignText}>Edit</Text></Pressable>
          </View>
        ) : isEditing && existingOffer?.cardDesign?.canvas ? (
          <View style={styles.existingDesign}><OfferCard offer={{ ...existingOffer, title, description, category, cardDesign }} variant="hero" onPress={() => undefined} /></View>
        ) : <OfferCardDesigner design={cardDesign} onChange={setCardDesign} title={title} description={description} price={offerPrice} category={category} templates={adminTemplates} mode={designMode} />}

        <Text style={styles.label}>Offer validity</Text>
        <View style={styles.dateCard}>
          <View style={styles.dateCopy}>
            <Text style={styles.dateLabel}>Starts on</Text>
            <Text style={styles.dateHint}>Choose the first live date</Text>
          </View>
          <Pressable disabled={!isFieldEditable('startsAt')} style={[styles.dateButton, !isFieldEditable('startsAt') && styles.disabledControl]} onPress={() => setActiveDatePicker('start')} accessibilityRole="button">
            <Text style={styles.dateValue}>{formatOfferDate(startsAt)}</Text>
            <MaterialCommunityIcons name="calendar-month-outline" size={20} color={theme.colors.primary} />
          </Pressable>
        </View>
        <View style={styles.dateCard}>
          <View style={styles.dateCopy}>
            <Text style={styles.dateLabel}>Expires on</Text>
            <Text style={styles.dateHint}>Offer will stop at the end of this date</Text>
          </View>
          <Pressable disabled={!isFieldEditable('expiresAt')} style={[styles.dateButton, !isFieldEditable('expiresAt') && styles.disabledControl]} onPress={() => setActiveDatePicker('expiry')} accessibilityRole="button">
            <Text style={styles.dateValue}>{formatOfferDate(expiresAt)}</Text>
            <MaterialCommunityIcons name="calendar-month-outline" size={20} color={theme.colors.primary} />
          </Pressable>
        </View>
        {activeDatePicker && (
          <DateTimePicker
            value={datePickerValue}
            mode="date"
            display="calendar"
            minimumDate={datePickerMinimum}
            onChange={handleDateChange}
          />
        )}

        <Input label="House No." value={houseNo} onChangeText={setHouseNo} placeholder="House / shop number" onFocus={revealFocusedInput} />
        <Input label="Street Address *" value={streetAddress} onChangeText={setStreetAddress} placeholder="Street, landmark" multiline textAlignVertical="top" onFocus={revealFocusedInput} />
        <Input label="Locality" value={locality} onChangeText={setLocality} placeholder="Area / neighbourhood" onFocus={revealFocusedInput} />
        <Input label="City" value={typeof business?.city === 'string' ? '' : business?.city?.name || ''} editable={false} />
        <Button label="Use Current Location" variant="outline" onPress={useCurrentLocation} loading={locationLoading} icon={<MaterialCommunityIcons name="crosshairs-gps" size={20} color={theme.colors.primary} />} />

        <Input label="Phone" value={phone} onChangeText={(value) => setPhone(sanitizeIndianPhoneInput(value).digits)} keyboardType="phone-pad" maxLength={10} onFocus={revealFocusedInput} />
        <Input label="WhatsApp" value={whatsapp} onChangeText={(value) => setWhatsapp(sanitizeIndianPhoneInput(value).digits)} keyboardType="phone-pad" maxLength={10} onFocus={revealFocusedInput} />
        <Input label={`Terms & Conditions${isFieldEditable('terms') ? '' : ' (locked by template)'}`} editable={isFieldEditable('terms')} value={terms} onChangeText={setTerms} multiline textAlignVertical="top" placeholder="Usage conditions, exclusions..." onFocus={revealFocusedInput} />

        <View style={styles.note}>
          <MaterialCommunityIcons name="shield-check-outline" size={22} color={theme.colors.secondary} />
          <Text style={styles.noteText}>{isEditing ? 'Your changes will go to admin review again. Expected offer approval time: within 1 hour.' : 'Your active plan lets you submit an offer. Expected offer approval time: within 1 hour.'}</Text>
        </View>
        <Button label={isEditing ? 'Submit changes' : 'Submit offer'} onPress={submit} loading={loading} fullWidth />
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { height: 58, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center' },
  back: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  topTitle: { ...theme.typography.h3, color: theme.colors.text },
  content: { flexGrow: 1, padding: 18, paddingBottom: 100 },
  business: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: 16, padding: 14, marginBottom: 18 },
  businessLabel: { fontSize: 9, color: theme.colors.textMuted, fontWeight: '900', letterSpacing: 1 },
  businessName: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 2 },
  two: { flexDirection: 'row', gap: 10 },
  discount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.secondaryLight, borderRadius: 14, padding: 14, marginBottom: 18 },
  discountLabel: { ...theme.typography.caption, color: theme.colors.textSecondary },
  discountValue: { ...theme.typography.h3, color: theme.colors.success },
  label: { ...theme.typography.bodyBold, color: theme.colors.text, marginBottom: 9 },
  dateCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 10 },
  dateCopy: { flex: 1, paddingRight: 8 },
  dateLabel: { ...theme.typography.bodyBold, color: theme.colors.text },
  dateHint: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 3 },
  dateButton: { minWidth: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, borderRadius: 10, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 9 },
  dateValue: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '800' },
  note: { flexDirection: 'row', gap: 10, backgroundColor: theme.colors.secondaryLight, borderRadius: 15, padding: 14, marginBottom: 18 },
  noteText: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18 },
  disabledControl: { opacity: 0.6 },
  designReady: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.successLight || '#E9F8EF', borderRadius: 16, padding: 13, marginBottom: 17 },
  designReadyIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  designReadyTitle: { ...theme.typography.bodyBold, color: theme.colors.text },
  designReadyText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  copySummary: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 14, marginBottom: 17 },
  copySummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  copySummaryTitle: { ...theme.typography.bodyBold, color: theme.colors.text },
  copySummaryHint: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 },
  copySummaryValue: { ...theme.typography.h3, color: theme.colors.text },
  copySummaryDescription: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 5 },
  copySummaryCategory: { ...theme.typography.tiny, color: theme.colors.primary, fontWeight: '800', marginTop: 8 },
  editDesign: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 7 },
  editDesignText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '900' },
  existingDesign: { marginBottom: 18 },
});

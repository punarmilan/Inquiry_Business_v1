import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Input } from '../../components/Input';
import { ScreenContainer } from '../../components/ScreenContainer';
import { theme } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';
import type { City, ServiceCategory } from '../../types/hyperlocal';
import { createProviderApplication, listServiceCategories, listSupportedCities } from '../../services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProviderRegistration'>;

export const ProviderRegistrationScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [experience, setExperience] = useState('');
  const [areas, setAreas] = useState('');
  const [message, setMessage] = useState('');
  const [terms, setTerms] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [city, setCity] = useState<City | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [picker, setPicker] = useState<'city' | 'category' | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    listSupportedCities('services')
      .then((response) => setCities(response.data.filter((item) => item.servicesEnabled)))
      .catch(() => Alert.alert('Could not load locations', 'Please try again in a moment.'))
      .finally(() => setLoadingOptions(false));
  }, []);

  useEffect(() => {
    if (!city) { setCategories([]); return; }
    setLoadingCategories(true);
    listServiceCategories(city._id)
      .then((response) => setCategories(response.data.filter((item) => item.name.toLowerCase() !== 'cleaning')))
      .catch(() => Alert.alert('Could not load skills', 'Please select the location again.'))
      .finally(() => setLoadingCategories(false));
  }, [city]);

  const selectedCategoryLabel = useMemo(() => {
    const labels = categories.filter((item) => selectedCategories.includes(item._id)).map((item) => item.name);
    return labels.length ? labels.join(', ') : 'Select your skill';
  }, [categories, selectedCategories]);

  const submit = async () => {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (!name.trim() || digits.length !== 10 || !city || !selectedCategories.length || !terms) {
      Alert.alert('Complete application', 'Name, valid phone, location, at least one skill and terms acceptance are required.');
      return;
    }
    setSubmitting(true);
    try {
      await createProviderApplication({
        name: name.trim(), phone: `+91${digits}`, email: email.trim(), cityId: city._id,
        categoryIds: selectedCategories, experienceYears: Number(experience) || 0,
        serviceAreas: areas.split(',').map((area) => area.trim()).filter(Boolean), message: message.trim(), termsAccepted: true,
      });
      setSubmitted(true);
    } catch (error: any) {
      Alert.alert('Application failed', error.message || 'Please try again.');
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return <ScreenContainer><View style={styles.success}><View style={styles.successIcon}><MaterialCommunityIcons name="check" size={42} color={theme.colors.textInverse} /></View><Text style={styles.successTitle}>Application submitted</Text><Text style={styles.successText}>Our admin team will check your details. If approved, they will create your provider login and share the phone number and password with you.</Text><Button label="Back to login" onPress={() => navigation.navigate('PhoneEntry')} fullWidth /></View></ScreenContainer>;
  }

  const pickerItems = picker === 'city' ? cities : categories;
  return <ScreenContainer><View style={styles.top}><IconButton name="arrow-left" accessibilityLabel="Back" onPress={navigation.goBack} /><Text style={styles.title}>Provider registration</Text></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.intro}><View style={styles.introIcon}><MaterialCommunityIcons name="account-hard-hat-outline" size={30} color={theme.colors.primary} /></View><View style={styles.introCopy}><Text style={styles.introTitle}>Join as a skilled worker</Text><Text style={styles.introText}>Submit your details. Admin approval is required before you can log in and receive bookings.</Text></View></View>
    <Input label="Full name" value={name} onChangeText={setName} placeholder="Your full name" />
    <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10 digit mobile number" />
    <Input label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
    <Pressable style={styles.select} onPress={() => setPicker('city')}><MaterialCommunityIcons name="map-marker-outline" size={21} color={theme.colors.textMuted} /><View style={styles.selectCopy}><Text style={styles.selectLabel}>Work location</Text><Text style={[styles.selectValue, !city && styles.placeholder]}>{city?.name || 'Select city'}</Text></View><MaterialCommunityIcons name="chevron-down" size={21} color={theme.colors.textMuted} /></Pressable>
    <Pressable style={styles.select} onPress={() => city && setPicker('category')} disabled={!city}><MaterialCommunityIcons name="tools" size={21} color={theme.colors.textMuted} /><View style={styles.selectCopy}><Text style={styles.selectLabel}>Skill / service</Text><Text style={[styles.selectValue, !selectedCategories.length && styles.placeholder]} numberOfLines={1}>{selectedCategoryLabel}</Text></View><MaterialCommunityIcons name="chevron-down" size={21} color={theme.colors.textMuted} /></Pressable>
    <Input label="Experience (years)" value={experience} onChangeText={setExperience} keyboardType="number-pad" placeholder="e.g. 5" />
    <Input label="Service areas (optional)" value={areas} onChangeText={setAreas} placeholder="e.g. Nigdi, Akurdi" />
    <Input label="About your work (optional)" value={message} onChangeText={setMessage} multiline placeholder="Tell admin about your skills" style={styles.multiline} />
    <Pressable onPress={() => setTerms((value) => !value)} style={styles.terms}><View style={[styles.checkbox, terms && styles.checked]}>{terms && <MaterialCommunityIcons name="check" size={16} color={theme.colors.textInverse} />}</View><Text style={styles.termsText}>I confirm these details are correct and agree to admin verification.</Text></Pressable>
    <Button label="Submit for admin review" onPress={submit} loading={submitting || loadingOptions} fullWidth />
    <Text style={styles.note}>Login number and password will be created and shared by admin after approval.</Text>
  </ScrollView>
  <Modal visible={Boolean(picker)} transparent animationType="slide" onRequestClose={() => setPicker(null)}><Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)}><Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}><Text style={styles.modalTitle}>{picker === 'city' ? 'Choose work location' : 'Choose your skills'}</Text>{loadingCategories && picker === 'category' ? <ActivityIndicator color={theme.colors.primary} /> : pickerItems.map((item: any) => { const selected = picker === 'category' && selectedCategories.includes(item._id); return <Pressable key={item._id} style={styles.modalOption} onPress={() => { if (picker === 'city') { setCity(item); setSelectedCategories([]); setPicker(null); } else { setSelectedCategories((current) => selected ? current.filter((id) => id !== item._id) : [...current, item._id]); } }}><Text style={styles.modalOptionText}>{item.name}</Text>{picker === 'category' && <MaterialCommunityIcons name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={selected ? theme.colors.primary : theme.colors.textMuted} />}</Pressable>; })}{picker === 'category' && <Button label="Done" onPress={() => setPicker(null)} fullWidth style={styles.modalDone} />}</Pressable></Pressable></Modal>
  </ScreenContainer>;
};

const styles = StyleSheet.create({
  top: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }, title: { ...theme.typography.h2, color: theme.colors.text },
  content: { padding: 20, paddingBottom: 80 },
  intro: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: 18, padding: 15, marginBottom: 18 }, introIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface }, introCopy: { flex: 1, marginLeft: 12 }, introTitle: { ...theme.typography.h3, color: theme.colors.text }, introText: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18, marginTop: 3 },
  select: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: 15, marginBottom: theme.spacing.md, backgroundColor: theme.colors.surface }, selectCopy: { flex: 1, marginHorizontal: 12 }, selectLabel: { ...theme.typography.tiny, color: theme.colors.textMuted }, selectValue: { ...theme.typography.body, color: theme.colors.text, marginTop: 2 }, placeholder: { color: theme.colors.textMuted }, multiline: { minHeight: 92, textAlignVertical: 'top' },
  terms: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }, checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, termsText: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary }, note: { ...theme.typography.caption, color: theme.colors.textMuted, textAlign: 'center', marginTop: 13, lineHeight: 18 },
  success: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' }, successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, marginBottom: 22 }, successTitle: { ...theme.typography.h1, color: theme.colors.text, textAlign: 'center' }, successText: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 23, marginVertical: 15 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }, modalCard: { maxHeight: '75%', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.colors.surface }, modalTitle: { ...theme.typography.h2, color: theme.colors.text, marginBottom: 13 }, modalOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 8 }, modalOptionText: { ...theme.typography.body, color: theme.colors.text }, modalDone: { marginTop: 16 },
});

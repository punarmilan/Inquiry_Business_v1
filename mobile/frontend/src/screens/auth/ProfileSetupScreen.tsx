import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { GoogleMark } from '../../components/GoogleMark';
import { useApp } from '../../context/AppContext';
import { signInWithGoogle } from '../../services/socialAuth';
import type { AuthStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;
export const ProfileSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { startRegistration, registerWithOAuth, loginWithOAuth } = useApp();
  const [name, setName] = useState(route.params?.prefillName || ''); const [email, setEmail] = useState(route.params?.prefillEmail || ''); const [phone, setPhone] = useState(''); const [password, setPassword] = useState(''); const [address, setAddress] = useState(''); const [terms, setTerms] = useState(false); const [loading, setLoading] = useState(false); const [googleToken, setGoogleToken] = useState('');
  const google = async () => { setLoading(true); try { const profile = await signInWithGoogle(); try { await loginWithOAuth('google', profile.idToken); return; } catch { setGoogleToken(profile.idToken); setName(profile.name); setEmail(profile.email); } } catch (error: any) { Alert.alert('Google sign-in unavailable', error.message); } finally { setLoading(false); } };
  const submit = async () => { const digits = phone.replace(/\D/g, '').slice(-10); if (digits.length !== 10 || !name.trim() || (!googleToken && password.length < 6) || !terms) return Alert.alert('Complete registration', 'Name, valid phone, password and terms acceptance are required.'); setLoading(true); try { if (googleToken) { await registerWithOAuth('google', googleToken, `+91${digits}`, 'employer'); return; } const response = await startRegistration(`+91${digits}`, { name: name.trim(), email: email.trim(), password, currentAddress: address.trim(), accountType: 'employer', termsAccepted: true, termsAcceptedAt: new Date().toISOString() }); navigation.navigate('OtpVerification', { demoOtp: response.demoOtp }); } catch (error: any) { Alert.alert('Registration failed', error.message); } finally { setLoading(false); } };
  return <ScreenContainer><View style={styles.top}><IconButton name="arrow-left" accessibilityLabel="Back" onPress={navigation.goBack} /><Text style={styles.title}>Create account</Text></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.intro}><MaterialCommunityIcons name="tag-heart-outline" size={34} color={theme.colors.primary} /><Text style={styles.introTitle}>Offers and services near you</Text><Text style={styles.introText}>One consumer account. Business profiles can be added later from the Post tab.</Text></View>
    {!googleToken && <Button label="Continue with Google" variant="outline" onPress={google} loading={loading} icon={<GoogleMark size={19} />} fullWidth style={styles.google} />}
    {googleToken && <View style={styles.googleAccount}><GoogleMark size={20} /><Text style={styles.googleText}>{email}</Text></View>}
    <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" /><Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10 digit mobile number" />
    <Input label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />{!googleToken && <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimum 6 characters" />}<Input label="Address (optional)" value={address} onChangeText={setAddress} multiline placeholder="You can select city and area after login" />
    <Pressable onPress={() => setTerms((value) => !value)} style={styles.terms}><View style={[styles.checkbox, terms && styles.checked]}>{terms && <MaterialCommunityIcons name="check" size={16} color={theme.colors.textInverse} />}</View><Text style={styles.termsText}>I accept the Terms & Conditions and Privacy Policy.</Text></Pressable>
    <Button label={googleToken ? 'Create Account' : 'Send OTP'} onPress={submit} loading={loading} fullWidth />
    <Text style={styles.note}>Want to work with us? Use “Register as a service provider” on the login screen. Your details will be reviewed by InquiryExperts staff.</Text>
  </ScrollView></ScreenContainer>;
};
const styles = StyleSheet.create({ top: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }, title: { ...theme.typography.h2, color: theme.colors.text }, content: { padding: 20, paddingBottom: 80 }, intro: { alignItems: 'center', backgroundColor: theme.colors.primaryLight, borderRadius: 20, padding: 18, marginBottom: 18 }, introTitle: { ...theme.typography.h3, color: theme.colors.text, marginTop: 8 }, introText: { ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4 }, google: { marginBottom: 18 }, googleAccount: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, backgroundColor: theme.colors.surface, borderRadius: 14, marginBottom: 18 }, googleText: { ...theme.typography.body, color: theme.colors.text }, terms: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }, checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, termsText: { flex: 1, ...theme.typography.caption, color: theme.colors.textSecondary }, note: { ...theme.typography.caption, color: theme.colors.secondary, textAlign: 'center', marginTop: 15, lineHeight: 18 } });

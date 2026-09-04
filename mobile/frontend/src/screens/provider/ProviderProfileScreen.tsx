import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Avatar } from '../../components/Avatar';
import { useApp } from '../../context/AppContext';
import { listProviderBookings } from '../../services/api';
import { getProviderAvatar } from '../../config/providerAvatars';
import { theme } from '../../theme';

export const ProviderProfileScreen: React.FC = () => {
  const { accessToken, currentUser, logout, updateProfile } = useApp();
  const [provider, setProvider] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState(currentUser?.avatar || '');
  const [photoLoading, setPhotoLoading] = useState(false);
  useFocusEffect(useCallback(() => { if (accessToken) listProviderBookings(accessToken).then((response) => setProvider(response.provider)).catch(() => undefined); }, [accessToken]));
  const confirmLogout = () => Alert.alert('Log out?', 'You can log back in with your provider phone and password.', [{ text: 'Cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }]);

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission needed', 'Allow photo access to add your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const nextPhotoUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
    if (!nextPhotoUrl) return;
    const previousPhotoUrl = photoUrl;
    setPhotoUrl(nextPhotoUrl);
    setPhotoLoading(true);
    try {
      await updateProfile({ name: currentUser?.name || provider?.name || 'Provider', avatar: nextPhotoUrl });
    } catch (error: any) {
      setPhotoUrl(previousPhotoUrl);
      Alert.alert('Photo not updated', error.message);
    } finally {
      setPhotoLoading(false);
    }
  };

  const providerName = currentUser?.name || provider?.name || 'Provider';
  const localAvatar = getProviderAvatar(providerName);

  return <ScreenContainer><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>ACCOUNT</Text><Text style={styles.title}>Provider profile</Text></View><MaterialCommunityIcons name="shield-check-outline" size={27} color={theme.colors.primary} /></View>
    <View style={styles.identity}><Pressable onPress={pickProfilePhoto} disabled={photoLoading} style={styles.photoPicker} accessibilityRole="button" accessibilityLabel="Add provider profile photo">{localAvatar ? <Image source={localAvatar} style={styles.profilePhoto} /> : <Avatar uri={photoUrl || provider?.photoUrl} name={providerName} size={82} />}<View style={styles.photoEdit}>{photoLoading ? <ActivityIndicator size="small" color={theme.colors.textInverse} /> : <MaterialCommunityIcons name="camera-plus-outline" size={17} color={theme.colors.textInverse} />}</View></Pressable><Text style={styles.photoHint}>Tap photo to add or change</Text><Text style={styles.name}>{providerName}</Text><Text style={styles.phone}>{currentUser?.phone || provider?.phone}</Text><View style={styles.approved}><MaterialCommunityIcons name="check-decagram" size={16} color={theme.colors.success} /><Text style={styles.approvedText}>Approved service provider</Text></View></View>
    <Text style={styles.sectionLabel}>PROVIDER DETAILS</Text>
    <InfoRow icon="map-marker-outline" title="Assigned city" value={provider?.city?.name || 'Not assigned'} /><InfoRow icon="tools" title="Services" value={provider?.categories?.map((category: any) => category.name).join(', ') || 'Not assigned'} /><InfoRow icon="map-marker-radius-outline" title="Service areas" value={provider?.serviceAreas?.join(' · ') || 'Not assigned'} /><InfoRow icon="briefcase-check-outline" title="Completed jobs" value={String(provider?.completedBookings || 0)} />
    <Text style={styles.sectionLabel}>ACCOUNT ACTIONS</Text>
    <Pressable onPress={confirmLogout} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><View style={styles.actionIcon}><MaterialCommunityIcons name="logout" size={21} color={theme.colors.danger} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>Log out</Text><Text style={styles.actionText}>Sign out from this provider account</Text></View><MaterialCommunityIcons name="chevron-right" size={21} color={theme.colors.textMuted} /></Pressable>
  </ScrollView></ScreenContainer>;
};

const InfoRow: React.FC<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; value: string }> = ({ icon, title, value }) => <View style={styles.info}><View style={styles.infoIcon}><MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} /></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoValue}>{value}</Text></View></View>;
const styles = StyleSheet.create({ content: { padding: 18, paddingBottom: 115 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, eyebrow: { ...theme.typography.tiny, color: theme.colors.primary, fontWeight: '900', letterSpacing: 1.3 }, title: { ...theme.typography.h1, color: theme.colors.text, marginTop: 5 }, identity: { alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 23, padding: 22, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadowStrong, shadowOpacity: 1, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 4 }, photoPicker: { position: 'relative' }, profilePhoto: { width: 82, height: 82, borderRadius: 41 }, photoEdit: { position: 'absolute', right: -2, bottom: -2, width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, borderWidth: 3, borderColor: theme.colors.surface }, photoHint: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 6 }, name: { ...theme.typography.h2, color: theme.colors.text, marginTop: 12 }, phone: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: 3 }, approved: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.successLight, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, marginTop: 13 }, approvedText: { ...theme.typography.tiny, color: theme.colors.success, fontWeight: '900' }, sectionLabel: { ...theme.typography.tiny, color: theme.colors.textMuted, fontWeight: '900', letterSpacing: 1.2, marginTop: 25, marginBottom: 9 }, info: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 17, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: theme.colors.border }, infoIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, infoCopy: { flex: 1 }, infoTitle: { ...theme.typography.caption, color: theme.colors.textMuted }, infoValue: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 3 }, action: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 17, padding: 13, borderWidth: 1, borderColor: theme.colors.border }, actionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.dangerLight, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, actionCopy: { flex: 1 }, actionTitle: { ...theme.typography.bodyBold, color: theme.colors.danger }, actionText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 }, pressed: { opacity: 0.75 } });

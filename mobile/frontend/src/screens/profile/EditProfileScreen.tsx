import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Avatar } from '../../components/Avatar';
import { useApp } from '../../context/AppContext';
import type { ProfileStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;
export const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { currentUser, updateProfile } = useApp();
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [address, setAddress] = useState(currentUser?.currentAddress || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [loading, setLoading] = useState(false);

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission needed', 'Allow photo access to add your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setAvatar(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name required');
    setLoading(true);
    try {
      await updateProfile({ name: name.trim(), avatar, email: email.trim(), currentAddress: address.trim() });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Profile not updated', error.message);
    } finally {
      setLoading(false);
    }
  };

  return <ScreenContainer><View style={styles.top}><Pressable onPress={navigation.goBack} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={24} /></Pressable><Text style={styles.title}>Edit Profile</Text></View><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.photoLabel}>Profile photo</Text>
    <Pressable onPress={pickProfilePhoto} style={styles.photoPicker} accessibilityRole="button" accessibilityLabel="Add profile photo">
      <Avatar uri={avatar || undefined} name={name || 'User'} size={104} />
      <View style={styles.photoEdit}><MaterialCommunityIcons name="camera-plus-outline" size={18} color={theme.colors.textInverse} /></View>
    </Pressable>
    <Text style={styles.photoHint}>Tap to add or change your profile picture.</Text>
    <Input label="Name" value={name} onChangeText={setName} /><Input label="Phone" value={currentUser?.phone || ''} editable={false} /><Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /><Input label="Address" value={address} onChangeText={setAddress} multiline /><Text style={styles.hint}>Saved city and area for discovery are managed from the location header.</Text><Button label="Save changes" onPress={save} loading={loading} fullWidth />
  </ScrollView></ScreenContainer>;
};
const styles = StyleSheet.create({ top: { height: 58, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center' }, back: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, title: { ...theme.typography.h3, color: theme.colors.text }, content: { padding: 20 }, photoLabel: { ...theme.typography.bodyBold, color: theme.colors.text, textAlign: 'center', marginBottom: 10 }, photoPicker: { alignSelf: 'center', position: 'relative', marginBottom: 8 }, photoEdit: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, borderWidth: 3, borderColor: theme.colors.surface }, photoHint: { ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 22 }, hint: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: 18 } });

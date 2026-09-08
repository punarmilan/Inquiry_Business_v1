import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Avatar } from '../../components/Avatar';
import { useApp } from '../../context/AppContext';
import { listSavedProviders, toggleSavedProvider } from '../../services/api';
import type { MoreStackParamList } from '../../navigation/types';
import type { ServiceProvider } from '../../types/hyperlocal';
import { getProviderAvatar } from '../../config/providerAvatars';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'SavedProviders'>;

export const SavedProvidersScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken } = useApp();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listSavedProviders(accessToken);
      setProviders(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load favourite providers.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = async (providerId: string) => {
    if (!accessToken) return;
    try {
      await toggleSavedProvider(accessToken, providerId);
      setProviders((current) => current.filter((provider) => provider._id !== providerId));
    } catch (removeError) {
      Alert.alert('Favourite provider', removeError instanceof Error ? removeError.message : 'Could not remove this provider.');
    }
  };

  const openProvider = (provider: ServiceProvider) => {
    const category = provider.categories?.[0];
    if (!category || !provider.city?._id) {
      Alert.alert('Booking unavailable', 'This provider is no longer available for direct booking.');
      return;
    }
    (navigation.getParent() as any)?.navigate('ServicesTab', {
      screen: 'BookService',
      params: { categoryId: category._id, categoryName: category.name, basePrice: category.basePrice || 0, cityId: provider.city._id, availableAreas: provider.city.localities || [], providerId: provider._id },
    });
  };

  return <ScreenContainer>
    <View style={styles.header}><Pressable onPress={() => navigation.goBack()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} /></Pressable><Text style={styles.title}>Favourite Providers</Text></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View> : error ? <View style={styles.center}><MaterialCommunityIcons name="alert-circle-outline" size={46} color={theme.colors.danger} /><Text style={styles.emptyTitle}>Could not load favourites.</Text><Text style={styles.error}>{error}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View> : <ScrollView contentContainerStyle={styles.content}>{providers.map((provider) => { const localAvatar = getProviderAvatar(provider.name); return <View key={provider._id} style={styles.card}><Pressable onPress={() => openProvider(provider)} style={styles.cardMain}>{localAvatar ? <Image source={localAvatar} style={styles.photo} /> : <Avatar uri={provider.photoUrl} name={provider.name} size={58} />}<View style={styles.copy}><Text style={styles.name} numberOfLines={1}>{provider.name}</Text><Text style={styles.service} numberOfLines={1}>{provider.categories?.[0]?.name || 'Service provider'}</Text><Text style={styles.meta}>{provider.ratingAverage || 'New'} rating · {provider.serviceAreas?.[0] || provider.city?.name || 'Local'}</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textMuted} /></Pressable><Pressable onPress={() => remove(provider._id)} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Remove ${provider.name} from favourites`}><MaterialCommunityIcons name="heart" size={20} color={theme.colors.danger} /></Pressable></View>; })}{!providers.length ? <View style={styles.center}><MaterialCommunityIcons name="heart-outline" size={46} color={theme.colors.textMuted} /><Text style={styles.emptyTitle}>No favourite providers yet.</Text><Text style={styles.emptyText}>Tap the heart on a service provider to save them here.</Text></View> : null}</ScrollView>}
  </ScreenContainer>;
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface },
  back: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  title: { ...theme.typography.h3, color: theme.colors.text },
  content: { padding: 18, paddingBottom: 110, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  photo: { width: 58, height: 58, borderRadius: 29 },
  copy: { flex: 1 },
  name: { ...theme.typography.bodyBold, color: theme.colors.text },
  service: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  meta: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 4 },
  remove: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26 },
  emptyTitle: { ...theme.typography.bodyBold, color: theme.colors.text, marginTop: 10, textAlign: 'center' },
  emptyText: { ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 5 },
  error: { ...theme.typography.caption, color: theme.colors.danger, textAlign: 'center', marginTop: 5 },
  retry: { marginTop: 14, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 99, backgroundColor: theme.colors.primary },
  retryText: { ...theme.typography.bodyBold, color: theme.colors.textInverse },
});

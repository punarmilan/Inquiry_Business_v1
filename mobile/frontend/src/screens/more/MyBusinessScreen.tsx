import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { listMyBusinesses } from '../../services/api';
import type { Business } from '../../types/hyperlocal';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

export const MyBusinessScreen: React.FC<any> = ({ navigation }) => {
  const { accessToken } = useApp();
  const [items, setItems] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    listMyBusinesses(accessToken).then((response) => setItems(response.data)).finally(() => setLoading(false));
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer>
      <View style={styles.top}>
        <Pressable onPress={navigation.goBack} style={styles.back} accessibilityLabel="Go back"><MaterialCommunityIcons name="arrow-left" size={24} /></Pressable>
        <View style={styles.flex}><Text style={styles.title}>Business Profiles</Text><Text style={styles.subtitle}>Manage multiple businesses from one account</Text></View>
        <Pressable onPress={() => navigation.navigate('BusinessSetup')} style={styles.add} accessibilityRole="button" accessibilityLabel="Add business profile"><MaterialCommunityIcons name="plus" size={23} color={theme.colors.primary} /></Pressable>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[theme.colors.primary]} />} contentContainerStyle={styles.content}>
        {loading && !items.length ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {items.map((business) => {
          const approved = business.verificationStatus === 'verified';
          const hasPlan = Boolean(approved && business.activeSubscription?.status === 'active' && new Date(business.activeSubscription.endsAt) >= new Date());
          const image = business.logoUrl || business.coverImageUrl;
          const statusText = business.verificationStatus === 'verified' ? 'Approved' : business.verificationStatus === 'pending' ? 'Pending approval' : business.verificationStatus === 'rejected' ? 'Needs changes' : 'Suspended';
          return (
            <View key={business._id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.logo}>{image ? <Image source={{ uri: image }} style={styles.logoImage} /> : <MaterialCommunityIcons name="storefront-outline" size={30} color={theme.colors.primary} />}</View>
                <View style={styles.flex}><Text style={styles.name}>{business.name}</Text><Text style={styles.category}>{business.category}</Text></View>
                <Text style={[styles.status, approved && styles.statusApproved]}>{statusText}</Text>
              </View>
              <Text style={styles.address}>{business.address}</Text>
              {business.verificationStatus === 'pending' ? <Text style={styles.note}>Admin review usually completes within 24 hours.</Text> : null}
              {business.verificationStatus === 'rejected' && business.verificationNote ? <Text style={styles.note}>{business.verificationNote}</Text> : null}
              {business.activeSubscription && approved ? <View style={styles.plan}><MaterialCommunityIcons name="crown-outline" size={20} color={theme.colors.accentDark} /><View style={styles.flex}><Text style={styles.planName}>{typeof business.activeSubscription.plan === 'object' ? business.activeSubscription.plan.name : 'Active plan'}</Text><Text style={styles.planDate}>Valid until {new Date(business.activeSubscription.endsAt).toLocaleDateString()}</Text></View></View> : null}
              <View style={styles.actions}>
                <Button label="Customize" variant="outline" onPress={() => navigation.navigate('BusinessSetup', { businessId: business._id })} style={styles.actionButton} />
                {!hasPlan && approved ? <Button label="Choose Plan" onPress={() => navigation.navigate('Plans', { businessId: business._id })} style={styles.actionButton} /> : null}
              </View>
            </View>
          );
        })}
        {!loading && !items.length ? <View style={styles.empty}><MaterialCommunityIcons name="storefront-plus-outline" size={40} color={theme.colors.primary} /><Text style={styles.emptyTitle}>No business profile yet</Text><Text style={styles.emptyText}>Add your first business profile here. You can add more later without creating another account.</Text><Button label="Add Business Profile" onPress={() => navigation.navigate('BusinessSetup')} fullWidth style={styles.emptyButton} /></View> : null}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  top: { minHeight: 70, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.divider }, back: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, title: { ...theme.typography.h2, color: theme.colors.text }, subtitle: { ...theme.typography.tiny, color: theme.colors.textSecondary, marginTop: 2 }, add: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, content: { padding: 18, paddingBottom: 120, gap: 13 }, card: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 17, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, logo: { width: 52, height: 52, borderRadius: 17, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, logoImage: { width: '100%', height: '100%' }, name: { ...theme.typography.h3, color: theme.colors.text }, category: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 }, status: { ...theme.typography.tiny, color: theme.colors.warning, fontWeight: '900', textTransform: 'uppercase' }, statusApproved: { color: theme.colors.success }, address: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: 14 }, note: { ...theme.typography.caption, color: theme.colors.textSecondary, backgroundColor: theme.colors.secondaryLight, borderRadius: 10, padding: 10, marginTop: 12 }, plan: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: theme.colors.accentLight, borderRadius: 14, padding: 12, marginTop: 14 }, planName: { ...theme.typography.bodyBold, color: theme.colors.text }, planDate: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 }, actions: { flexDirection: 'row', gap: 9, marginTop: 14 }, actionButton: { flex: 1, paddingHorizontal: 9 }, empty: { alignItems: 'center', padding: 30, backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border }, emptyTitle: { ...theme.typography.h3, color: theme.colors.text, marginTop: 10 }, emptyText: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: 6 }, emptyButton: { marginTop: 17 },
});

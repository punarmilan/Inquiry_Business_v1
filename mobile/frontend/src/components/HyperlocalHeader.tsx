import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, createThemedStyles } from '../theme';
import { useApp } from '../context/AppContext';
import { Avatar } from './Avatar';

export const HyperlocalHeader: React.FC<{
  cityLabel: string;
  onLocationPress: () => void;
  onNotifications: () => void;
  unreadCount?: number;
  locationLabel?: string;
  offersStyle?: boolean;
  discoveryStyle?: boolean;
  /** Optional third line naming the neighbouring areas covered by this city. */
  areaLine?: string;
  /** Wishlist/saved-offers shortcut shown before the bell icon. */
  onWishlist?: () => void;
  wishlistHasItems?: boolean;
  /** Profile shortcut rendered as an avatar after the bell icon. */
  onAvatarPress?: () => void;
  avatarUri?: string;
  avatarName?: string;
}> = ({ cityLabel, onLocationPress, onNotifications, unreadCount = 0, locationLabel, offersStyle = false, discoveryStyle = false, areaLine, onWishlist, wishlistHasItems, onAvatarPress, avatarUri, avatarName }) => {
  const { t } = useApp();
  return <View style={[styles.row, offersStyle && styles.offersRow, discoveryStyle && styles.discoveryRow]}>
    {discoveryStyle ? <View style={[styles.locationCopy, styles.discoveryCopy]}>
      <Text style={styles.discoveryEyebrow}>{t('appName')}</Text>
      <Text style={styles.discoveryTitle}>{t('homeDiscoverTitle')}</Text>
    </View> : <Pressable accessibilityRole="button" onPress={onLocationPress} style={[styles.location, offersStyle && styles.offersLocation]} accessibilityLabel={t('changeCityArea')}>
      {offersStyle ? <View style={styles.locationMarker}><MaterialCommunityIcons name="map-marker" size={24} color="#FFFFFF" /></View> : <MaterialCommunityIcons name="map-marker" size={42} color={theme.colors.primary} />}
      <View style={styles.locationCopy}>
        <Text style={[styles.nearby, offersStyle && styles.offersNearby]}>{locationLabel || t('nearYou')}</Text>
        <View style={styles.cityRow}>
          <Text style={[styles.city, offersStyle && styles.offersCity]} numberOfLines={1}>{cityLabel || t('chooseLocation')}</Text>
          <MaterialCommunityIcons name="chevron-down" size={23} color={theme.colors.text} />
        </View>
        {areaLine ? <Text style={styles.areaLine} numberOfLines={1}>{areaLine}</Text> : null}
      </View>
    </Pressable>}
    {onWishlist ? <Pressable accessibilityRole="button" onPress={onWishlist} style={styles.iconButton} accessibilityLabel={t('savedOffersTitle')}>
      <MaterialCommunityIcons name="heart-outline" size={19} color={theme.colors.text} />
      {wishlistHasItems ? <View style={styles.dot} /> : null}
    </Pressable> : null}
    <Pressable accessibilityRole="button" onPress={onNotifications} style={styles.iconButton} accessibilityLabel={t('notificationsLabel')}>
      <MaterialCommunityIcons name="bell-outline" size={20} color={theme.colors.text} />
      {unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View> : null}
    </Pressable>
    {onAvatarPress ? <Pressable accessibilityRole="button" onPress={onAvatarPress} style={styles.avatarButton} accessibilityLabel={t('navProfile')}>
      <Avatar uri={avatarUri} name={avatarName} size={34} />
    </Pressable> : null}
  </View>
};

const styles = createThemedStyles((c) => ({
  // The discovery variant pairs a compact brand row with a separate location strip.
  discoveryRow: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 9, backgroundColor: c.marketHeader },
  discoveryCopy: { justifyContent: 'center', minHeight: 41 },
  discoveryEyebrow: { color: c.marketInk, fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 0.3 },
  discoveryTitle: { color: c.marketInk, fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.5 },
  offersRow: { backgroundColor: 'transparent', paddingTop: 13, paddingBottom: 7, paddingLeft: 21, paddingRight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, backgroundColor: c.background },
  location: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 60 },
  offersLocation: { minHeight: 54, gap: 9 },
  locationMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  offersNearby: { fontSize: 10, lineHeight: 14, fontWeight: '500', letterSpacing: 0, color: c.textSecondary },
  locationCopy: { flex: 1, minWidth: 0 },
  nearby: { fontSize: 13, fontWeight: '900', letterSpacing: 0.8, color: c.primary },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  city: { flexShrink: 1, fontSize: 24, lineHeight: 29, fontWeight: '800', color: c.text, marginTop: 1 },
  offersCity: { fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.5 },
  areaLine: { fontSize: 12, lineHeight: 17, color: c.textSecondary, marginTop: 1 },
  // White pill chips, matching the circular actions in the design.
  iconButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', marginLeft: 4, shadowColor: c.cardGlow, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  badge: { position: 'absolute', top: -3, right: -4, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.surface },
  badgeText: { fontSize: 10, lineHeight: 13, fontWeight: '900', color: '#FFFFFF' },
  dot: { position: 'absolute', top: 1, right: 1, width: 9, height: 9, borderRadius: 5, backgroundColor: c.danger, borderWidth: 1.5, borderColor: c.surface },
  avatarButton: { marginLeft: 4 },
}));

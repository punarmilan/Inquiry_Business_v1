import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useApp } from '../context/AppContext';

export const HyperlocalHeader: React.FC<{
  cityLabel: string;
  onLocationPress: () => void;
  onNotifications: () => void;
  onInbox: () => void;
  unreadCount?: number;
  locationLabel?: string;
  offersStyle?: boolean;
}> = ({ cityLabel, onLocationPress, onNotifications, onInbox, unreadCount = 0, locationLabel, offersStyle = false }) => {
  const { t } = useApp();
  return <View style={[styles.row, offersStyle && styles.offersRow]}>
    {offersStyle ? <View pointerEvents="none" style={styles.mapArt}><View style={styles.roadOne} /><View style={styles.roadTwo} /><View style={styles.mapPin}><MaterialCommunityIcons name="map-marker" size={23} color="#239EB8" /></View><Text style={styles.tagline}>Good{`\n`}Deals Nearby</Text></View> : null}
    <Pressable onPress={onLocationPress} style={styles.location} accessibilityLabel={t('changeCityArea')}>
      <MaterialCommunityIcons name="map-marker" size={42} color={theme.colors.primary} />
      <View style={styles.locationCopy}>
        <Text style={styles.nearby}>{locationLabel || t('nearYou')}</Text>
        <Text style={[styles.city, offersStyle && { fontSize: 23 }]} numberOfLines={1}>{cityLabel || t('chooseLocation')}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-down" size={23} color={theme.colors.text} />
    </Pressable>
    <Pressable onPress={onNotifications} style={styles.iconButton} accessibilityLabel={t('notificationsLabel')}>
      <MaterialCommunityIcons name="bell-outline" size={30} color={theme.colors.text} />
      {unreadCount > 0 && <View style={styles.dot} />}
    </Pressable>
    {!offersStyle ? <Pressable onPress={onInbox} style={styles.iconButton} accessibilityLabel={t('inbox')}>
      <MaterialCommunityIcons name="message-text-outline" size={29} color={theme.colors.text} />
    </Pressable> : null}
  </View>
};

const styles = StyleSheet.create({
  offersRow: { backgroundColor: 'transparent', paddingTop: 24, paddingBottom: 10, overflow: 'hidden' },
  mapArt: { position: 'absolute', right: 0, top: -15, width: '58%', height: 145, backgroundColor: '#E5F7FA', transform: [{ rotate: '-8deg' }], opacity: 0.7 },
  roadOne: { position: 'absolute', width: '150%', height: 10, backgroundColor: '#FFF', top: 45, left: -25, transform: [{ rotate: '-25deg' }] },
  roadTwo: { position: 'absolute', width: 10, height: 180, backgroundColor: '#FFF', left: 55, top: -20, transform: [{ rotate: '-25deg' }] },
  mapPin: { position: 'absolute', left: 55, top: 17, width: 45, height: 45, borderRadius: 30, backgroundColor: '#B9EEF4', alignItems: 'center', justifyContent: 'center' },
  tagline: { position: 'absolute', right: 20, top: 30, fontSize: 10, lineHeight: 12, color: '#008B9A', fontStyle: 'italic', transform: [{ rotate: '8deg' }] },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, backgroundColor: theme.colors.background },
  location: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60 },
  locationCopy: { flex: 1, minWidth: 0 },
  nearby: { fontSize: 13, fontWeight: '900', letterSpacing: 0.8, color: theme.colors.primary },
  city: { fontSize: 24, lineHeight: 29, fontWeight: '800', color: theme.colors.text, marginTop: 1 },
  iconButton: { width: 44, height: 52, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  dot: { position: 'absolute', top: 6, right: 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#F03A3A', borderWidth: 1.5, borderColor: theme.colors.background },
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export const HyperlocalHeader: React.FC<{
  cityLabel: string;
  onLocationPress: () => void;
  onNotifications: () => void;
  onInbox: () => void;
  unreadCount?: number;
  locationLabel?: string;
}> = ({ cityLabel, onLocationPress, onNotifications, onInbox, unreadCount = 0, locationLabel = 'NEAR YOU' }) => (
  <View style={styles.row}>
    <Pressable onPress={onLocationPress} style={styles.location} accessibilityLabel="Change city or area">
      <MaterialCommunityIcons name="map-marker" size={42} color={theme.colors.primary} />
      <View style={styles.locationCopy}>
        <Text style={styles.nearby}>{locationLabel}</Text>
        <Text style={styles.city} numberOfLines={1}>{cityLabel || 'Choose location'}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-down" size={23} color={theme.colors.text} />
    </Pressable>
    <Pressable onPress={onNotifications} style={styles.iconButton} accessibilityLabel="Notifications">
      <MaterialCommunityIcons name="bell-outline" size={30} color={theme.colors.text} />
      {unreadCount > 0 && <View style={styles.dot} />}
    </Pressable>
    <Pressable onPress={onInbox} style={styles.iconButton} accessibilityLabel="Inbox">
      <MaterialCommunityIcons name="message-text-outline" size={29} color={theme.colors.text} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, backgroundColor: theme.colors.background },
  location: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60 },
  locationCopy: { flex: 1, minWidth: 0 },
  nearby: { fontSize: 13, fontWeight: '900', letterSpacing: 0.8, color: theme.colors.primary },
  city: { fontSize: 24, lineHeight: 29, fontWeight: '800', color: theme.colors.text, marginTop: 1 },
  iconButton: { width: 44, height: 52, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  dot: { position: 'absolute', top: 6, right: 5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#F03A3A', borderWidth: 1.5, borderColor: theme.colors.background },
});

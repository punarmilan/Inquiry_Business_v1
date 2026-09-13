import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

export const serviceColors = { background: '#F3FBFD', teal: '#009BA4', darkTeal: '#006978', text: '#11181D', muted: '#697586', border: '#E5F4F7' };
export type ServiceIconName = keyof typeof MaterialCommunityIcons.glyphMap;
export const safeIcon = (name?: string): ServiceIconName => name && name in MaterialCommunityIcons.glyphMap ? name as ServiceIconName : 'tools';
export const isEmergencyCategory = (name: string) => /ambulance|fire brigade|police|rescue/i.test(name);
const palettes = [
  { ink: '#008A96', light: '#E0F8FA' }, { ink: '#DE2046', light: '#FFE9EF' },
  { ink: '#D7A400', light: '#FFF8DC' }, { ink: '#098F50', light: '#E4FAE7' },
  { ink: '#8555CE', light: '#F0EAFF' }, { ink: '#D57836', light: '#FFF0E4' },
];
export const categoryPalette = (name: string) => {
  if (/ambulance|fire brigade|police/i.test(name)) return palettes[1];
  if (/electric|gas/i.test(name)) return palettes[2];
  if (/animal|gard|yoga|snake/i.test(name)) return palettes[3];
  if (/\bac\b|plumb|water/i.test(name)) return palettes[0];
  return palettes[[...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % palettes.length];
};

export const ServiceBackdrop = () => { const insets = useSafeAreaInsets(); return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: insets.top }]}>
  <LinearGradient colors={['#F3FCFD', '#F6FBFF']} style={StyleSheet.absoluteFill} />
  <View style={ui.headerBlob} />
  <View style={ui.dottedRoute} />
  <View style={ui.mapDot}><MaterialCommunityIcons name="map-marker" size={24} color="#49C0B0" /></View>
</View>; };

export const ServiceSearch = ({ value, onChangeText, placeholder }: { value: string; onChangeText: (text: string) => void; placeholder: string }) => <View style={ui.search}>
  <MaterialCommunityIcons name="magnify" size={27} color="#536170" />
  <TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#7C8795" style={ui.searchInput} returnKeyType="search" />
  {value ? <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}><MaterialCommunityIcons name="close-circle" size={21} color="#7C8795" /></Pressable> : null}
</View>;

export const ServiceHeader = ({ title, subtitle, onBack, icon = 'map-marker-radius', onAction, compact = false }: { title: string; subtitle: string; onBack?: () => void; icon?: ServiceIconName; onAction?: () => void; compact?: boolean }) => <View style={ui.header}>
  {onBack ? <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={ui.back}><MaterialCommunityIcons name="arrow-left" size={27} color={serviceColors.text} /></Pressable> : <MaterialCommunityIcons name="map-marker" size={37} color={serviceColors.teal} />}
  <View style={ui.headerCopy}><Text style={[ui.title, !onBack && { fontSize: 27 }, compact && { fontSize: 19, lineHeight: 24 }]} numberOfLines={2}>{title}</Text><Text style={[ui.subtitle, !onBack && ui.homeSubtitle]}>{subtitle}</Text></View>
  {onAction ? <Pressable onPress={onAction} accessibilityLabel="Change location" accessibilityRole="button" style={ui.locationButton}><MaterialCommunityIcons name={icon} size={27} color={serviceColors.teal} /></Pressable> : null}
</View>;

export const ServiceImage = ({ uri, style, fallback }: { uri?: string; style: React.ComponentProps<typeof Image>['style']; fallback: React.ReactNode }) => {
  const [failedUri, setFailedUri] = useState<string>();
  return uri && /^(https?:\/\/|data:image\/)/i.test(uri) && failedUri !== uri ? <Image source={{ uri }} style={style} onError={() => setFailedUri(uri)} /> : <>{fallback}</>;
};

// Native vector artwork stays crisp on every phone and needs no remote asset.
export const CoolingArtwork = ({ width = 90 }: { width?: number }) => <Svg width={width} height={68} viewBox="0 0 140 95">
  <Defs><SvgGradient id="ac" x1="0" y1="0" x2="0.8" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#C9E8F4" /></SvgGradient></Defs>
  <Circle cx="85" cy="45" r="49" fill="#DAF7F9" />
  <Rect x="24" y="15" width="108" height="43" rx="10" fill="#B9DDEB" opacity="0.5" />
  <Rect x="18" y="9" width="108" height="43" rx="9" fill="url(#ac)" stroke="#FFFFFF" strokeWidth="2" />
  <Path d="M29 38H114 M30 43H113" stroke="#7BAAC5" strokeWidth="2.5" strokeLinecap="round" />
  <Circle cx="113" cy="22" r="2" fill="#7BBCEE" />
  <Path d="M50 57Q54 70 44 79 M69 57Q76 73 66 88 M90 57Q96 71 86 80" fill="none" stroke="#6BCFF1" strokeWidth="2.5" strokeLinecap="round" />
  <Path d="M10 52v16 M3 56l14 8 M3 64l14-8" stroke="#6BCFF1" strokeWidth="2" />
</Svg>;

export const ui = StyleSheet.create({
  headerBlob: { position: 'absolute', right: -14, top: 0, width: 140, height: 134, borderRadius: 65, backgroundColor: '#E5F9FA', transform: [{ rotate: '-25deg' }] },
  dottedRoute: { position: 'absolute', right: 89, top: 24, width: 66, height: 75, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CDF2F3', transform: [{ rotate: '-23deg' }] },
  mapDot: { position: 'absolute', right: 113, top: 9 },
  header: { minHeight: 85, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { minHeight: 44, width: 30, justifyContent: 'center' }, headerCopy: { flex: 1 },
  title: { fontSize: 23, lineHeight: 29, fontWeight: '800', color: serviceColors.text },
  subtitle: { fontSize: 16, fontWeight: '700', color: '#00848E', marginTop: 2 },
  homeSubtitle: { fontSize: 12, lineHeight: 18, fontWeight: '400', color: '#7A8491' },
  locationButton: { height: 47, width: 47, borderRadius: 15, borderWidth: 1.5, borderColor: '#FFFFFF', backgroundColor: '#E0FAFA', alignItems: 'center', justifyContent: 'center', shadowColor: '#52BDC7', shadowOpacity: 0.17, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  search: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 18, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 20, shadowColor: '#55BBC8', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, color: serviceColors.text, paddingVertical: 15, minWidth: 0 },
  shadow: { shadowColor: '#63BACA', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sectionTitle: { fontSize: 23, lineHeight: 30, fontWeight: '800', color: serviceColors.text },
  pill: { minHeight: 36, paddingHorizontal: 13, borderRadius: 22, backgroundColor: '#E3F7F8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  pillText: { color: '#007783', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  empty: { padding: 30, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: serviceColors.muted, textAlign: 'center', lineHeight: 22 },
});

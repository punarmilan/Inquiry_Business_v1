import React, { useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PosterLayers } from '../../components/OfferCard';
import { isPosterUploadOffer } from '../../config/offerCardDesigner';
import type { Offer } from '../../types/hyperlocal';
import type { TranslationKey } from '../../i18n/translations';
import { createThemedStyles, getThemeMode } from '../../theme';

// Offer-surface palette. Light keeps the original tuned hues; dark switches to
// the night palette. Read through getters so both resolve at render time.
const offerPalettes = {
  light: { bg: '#F5FBFD', teal: '#009DA5', ink: '#141B20', muted: '#77808C', line: '#E5EDF1' },
  dark: { bg: '#00161B', teal: '#00E5EF', ink: '#EAF7F9', muted: '#A7C3C9', line: '#0F4551' },
};
export const colors = {
  get bg() { return offerPalettes[getThemeMode()].bg; },
  get teal() { return offerPalettes[getThemeMode()].teal; },
  get ink() { return offerPalettes[getThemeMode()].ink; },
  get muted() { return offerPalettes[getThemeMode()].muted; },
  get line() { return offerPalettes[getThemeMode()].line; },
};
export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// The category taxonomy the offers feed and the all-offers browser both filter
// by. `label` is what the API expects; 'All' means "don't filter".
export const offerCategories: Array<{ label: string; translationKey: TranslationKey; icon: IconName; color: string }> = [
  { label: 'All', translationKey: 'allCategories', icon: 'view-grid', color: '#118F91' },
  { label: 'Food', translationKey: 'offerFood', icon: 'silverware-fork-knife', color: '#12AA78' },
  { label: 'Hotels', translationKey: 'offerHotels', icon: 'bed', color: '#286BE2' },
  { label: 'Shopping', translationKey: 'offerShopping', icon: 'shopping-outline', color: '#7A56D5' },
  { label: 'Fashion', translationKey: 'offerFashion', icon: 'hanger', color: '#D866A5' },
  { label: 'Gym', translationKey: 'offerGym', icon: 'dumbbell', color: '#E18A24' },
  { label: 'Electronics', translationKey: 'offerElectronics', icon: 'cellphone', color: '#4E77C8' },
  { label: 'Entertainment', translationKey: 'offerEntertainment', icon: 'movie-open-outline', color: '#B44B95' },
];

export const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
export const openContact = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Unable to open', 'Please check that a compatible app is installed.'));
export const whatsappUrl = (phone: string) => { const digits = phone.replace(/\D/g, ''); return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`; };

export function RemotePhoto({ uri, style, icon = 'storefront-outline' }: { uri?: string; style: any; icon?: IconName }) {
  const [failed, setFailed] = useState('');
  return uri && uri !== failed && /^https?:\/\//i.test(uri) ? <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setFailed(uri)} /> : <View style={[style, { backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' }]}><MaterialCommunityIcons name={icon} size={40} color={colors.teal} /></View>;
}

// Wide posters retain their design; portrait posters use a readable landscape summary.
export function OfferArtwork({ offer }: { offer: Offer }) {
  const canvas = offer.cardDesign?.canvas;
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const ratio = canvas && canvas.width > 0 && canvas.height > 0 ? canvas.width / canvas.height : 2.5;
  const innerWidth = width ? Math.min(width, (width / 1.78) * ratio) : 0;
  const photo = offer.imageUrls?.[0] || canvas?.elements.find(element => element.type === 'image' && (element.imageUrl || element.src))?.imageUrl;
  // An uploaded poster is shown whole at its own proportions; it has no summary
  // text, prices or discount to overlay.
  if (isPosterUploadOffer(offer) && photo) return <Image source={{ uri: photo }} style={[s.poster, { aspectRatio: Math.min(Math.max(ratio, 0.5), 2.5) }]} resizeMode="contain" />;
  if (canvas && ratio < 1.8) return <LinearGradient colors={['#007F89', '#004D61']} style={s.art}>
    {photo ? <Image source={{ uri: photo }} style={s.summaryPhoto} resizeMode="cover" /> : <MaterialCommunityIcons name="sale" size={85} color="#B4EEEE" style={s.summaryPhoto} />}
    <LinearGradient colors={['#006D79', '#006D79EE', '#006D7900']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    <View style={s.summaryCopy}><Text style={s.eyebrow}>{Math.round(offer.discountPercentage)}% OFF</Text><Text numberOfLines={2} adjustsFontSizeToFit style={[s.artTitle, { fontSize: 20 }]}>{offer.title}</Text><Text numberOfLines={1} style={s.summaryDescription}>{offer.description}</Text><Text style={s.artPrice}>{money(offer.offerPrice)}</Text></View>
  </LinearGradient>;
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={s.art}>
    {canvas && innerWidth ? <View style={{ width: innerWidth, aspectRatio: ratio }}><PosterLayers offer={offer} canvas={canvas} previewUrl={offer.cardDesign?.previewUrl} /></View> : (offer.imageUrls?.[0] || offer.cardDesign?.previewUrl) && !failed ? <Image source={{ uri: offer.cardDesign?.previewUrl || offer.imageUrls[0] }} style={StyleSheet.absoluteFill} resizeMode="contain" onError={() => setFailed(true)} /> : <LinearGradient colors={['#009DA5', '#006D79']} style={s.fallback}><MaterialCommunityIcons name="sale" color="#BFF9ED" size={40} /><Text numberOfLines={2} style={s.artTitle}>{offer.title}</Text><Text style={s.artPrice}>{money(offer.offerPrice)} · {Math.round(offer.discountPercentage)}% OFF</Text></LinearGradient>}
  </View>;
}

export function RoundAction({ icon, label, onPress, disabled = false, filled = false }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; filled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.action, filled && s.filled, disabled && { opacity: 0.4 }]}><MaterialCommunityIcons name={icon} size={19} color={filled ? '#FFF' : colors.teal} /><Text numberOfLines={1} adjustsFontSizeToFit style={[s.actionLabel, filled && { color: '#FFF' }]}>{label}</Text></Pressable>;
}

const s = createThemedStyles((c) => ({
  art: { width: '100%', aspectRatio: 1.78, borderRadius: 18, borderWidth: 1.5, borderColor: c.cardBorder, boxShadow: `0 0 14px ${c.cardGlow}`, overflow: 'hidden', backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  poster: { width: '100%', maxHeight: 520, borderRadius: 18, borderWidth: 1.5, borderColor: c.cardBorder, backgroundColor: c.surfaceAlt },
  fallback: { width: '100%', height: '100%', padding: 15, justifyContent: 'center' }, artTitle: { color: c.textInverse, fontWeight: '900', fontSize: 24 }, artPrice: { color: c.textInverse, fontSize: 16, marginTop: 5 },
  summaryPhoto: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '52%', height: '100%' }, summaryCopy: { width: '100%', padding: 14, paddingRight: '36%' }, eyebrow: { color: '#FFE369', fontWeight: '900', fontSize: 12, marginBottom: 3 }, summaryDescription: { color: '#DCFAFC', fontSize: 10, marginTop: 3 },
  action: { flex: 1, minWidth: 0, minHeight: 40, paddingHorizontal: 5, gap: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: c.surface }, actionLabel: { fontSize: 10, color: colors.ink, fontWeight: '600', flexShrink: 1 }, filled: { backgroundColor: colors.teal, borderColor: colors.teal },
}));

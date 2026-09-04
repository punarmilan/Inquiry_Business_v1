import React from 'react';
import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { findOfferAvatar } from '../config/offerCardDesigner';
import { OfferAvatarSprite } from './OfferAvatarSprite';
import { theme } from '../theme';
import type { Offer, Business, OfferTemplateCanvas, OfferTemplateElement } from '../types/hyperlocal';

const expiryLabel = (expiresAt: string) => {
  const hours = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000);
  if (hours <= 24) return 'Ends today';
  return `Ends in ${Math.ceil(hours / 24)} days`;
};

const heroPalette = (offer: Offer): [string, string] => {
  if (offer.cardDesign?.primaryColor && offer.cardDesign.secondaryColor) {
    return [offer.cardDesign.primaryColor, offer.cardDesign.secondaryColor];
  }
  const category = offer.category.toLowerCase();
  if (/travel|flight|trip|holiday|tour/.test(category)) return ['#1676DF', '#0A4EAD'];
  if (/food|pizza|restaurant|cafe|dining/.test(category)) return ['#0BA7A3', '#087471'];
  if (/shop|fashion|salon|beauty|bag/.test(category)) return ['#8268D8', '#5A4AB5'];
  return ['#3D8FE6', '#1C5EB8'];
};

const heroIcon = (category: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] => {
  const value = category.toLowerCase();
  if (/travel|flight|trip|holiday|tour/.test(value)) return 'airplane';
  if (/food|pizza|restaurant|cafe|dining/.test(value)) return 'pizza';
  if (/shop|fashion|salon|beauty|bag/.test(value)) return 'shopping-outline';
  if (/hotel|stay/.test(value)) return 'office-building-outline';
  return 'sale-outline';
};

const posterText = (offer: Offer, element: OfferTemplateElement) => {
  const field = element.field || element.key;
  if (field === 'title') return offer.title;
  if (field === 'description') return offer.description;
  if (field === 'category') return offer.category;
  if (field === 'offerPrice') return `₹${offer.offerPrice.toLocaleString('en-IN')}`;
  if (field === 'originalPrice') return `₹${offer.originalPrice.toLocaleString('en-IN')}`;
  if (field === 'discount' || field === 'discountPercentage') return `${Math.round(offer.discountPercentage)}% OFF`;
  if (field === 'businessName' && offer.business && typeof offer.business !== 'string') return offer.business.name;
  if (field === 'startsAt') return new Date(offer.startsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  if (field === 'expiresAt') return new Date(offer.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  if (field === 'buttonText') return element.content || element.text || 'VIEW OFFER';
  return element.content || element.text || '';
};

const posterImage = (offer: Offer, element: OfferTemplateElement) => {
  const field = element.field || element.key || '';
  if (field === 'businessLogo' && offer.business && typeof offer.business !== 'string') return offer.business.logoUrl;
  if (field === 'imageUrls' || /image|photo|product/i.test(field)) return offer.imageUrls?.[0] || element.imageUrl || element.src;
  return element.imageUrl || element.src;
};

const PosterLayers: React.FC<{ offer: Offer; canvas: OfferTemplateCanvas; previewUrl?: string }> = ({ offer, canvas, previewUrl }) => {
  const [surfaceWidth, setSurfaceWidth] = React.useState(0);
  const scale = surfaceWidth ? surfaceWidth / canvas.width : 0.28;
  const customAvatar = offer.cardDesign?.templateId === 'custom' && offer.cardDesign.avatarId ? findOfferAvatar(offer.cardDesign.avatarId) : null;
  const avatarOffsetX = Number(offer.cardDesign?.customizations?.avatarOffsetX || 0);
  const avatarOffsetY = Number(offer.cardDesign?.customizations?.avatarOffsetY || 0);
  const background = canvas.background;
  const backgroundImageUrl = canvas.backgroundImageUrl || background?.imageUrl || (!canvas.elements.length ? previewUrl : undefined);
  return (
    <View onLayout={(event) => setSurfaceWidth(event.nativeEvent.layout.width)} style={[styles.posterSurface, { backgroundColor: canvas.backgroundColor || '#F4F4F4' }]}>
      {background?.type === 'gradient' ? <LinearGradient colors={[background.from || '#111827', background.to || '#374151']} style={styles.posterBackground} /> : null}
      {backgroundImageUrl ? <Image source={{ uri: backgroundImageUrl }} style={styles.posterBackground} resizeMode="cover" /> : null}
      {canvas.overlay?.color ? <View pointerEvents="none" style={[styles.posterBackground, { backgroundColor: canvas.overlay.color, opacity: canvas.overlay.opacity ?? 0.25 }]} /> : null}
      {canvas.elements.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((element) => {
        if (element.visible === false) return null;
        const elementStyle = element.style || {};
        const value = (key: string, fallback: any) => (elementStyle[key] as any) ?? fallback;
        const layer = {
          position: 'absolute' as const,
          left: `${(element.x / canvas.width) * 100}%`,
          top: `${(element.y / canvas.height) * 100}%`,
          width: `${(element.width / canvas.width) * 100}%`,
          height: `${(element.height / canvas.height) * 100}%`,
          zIndex: element.zIndex ?? 2,
          opacity: element.opacity ?? value('opacity', 1),
          transform: element.rotation ? [{ rotate: `${element.rotation}deg` }] : undefined,
          borderRadius: (element.borderRadius ?? value('borderRadius', 0)) * scale,
          borderWidth: (element.borderWidth ?? value('borderWidth', 0)) * scale,
          borderColor: element.borderColor || value('borderColor', 'transparent'),
          borderStyle: element.borderStyle || value('borderStyle', 'solid'),
        } as any;
        if (element.type === 'image') {
          const uri = posterImage(offer, element);
          return uri ? <Image key={element.id} source={{ uri }} style={layer} resizeMode={element.resizeMode === 'stretch' ? 'stretch' : element.resizeMode || value('objectFit', 'contain')} /> : null;
        }
        if (element.type === 'shape' || element.type === 'divider' || element.type === 'group') return <View key={element.id} style={[layer, { backgroundColor: element.backgroundColor || value('backgroundColor', element.color || 'transparent') }]} />;
        const fontSize = Math.max(1, (element.fontSize || value('fontSize', 36)) * scale);
        return <Text key={element.id} numberOfLines={element.numberOfLines} style={[layer, styles.posterText, {
          backgroundColor: element.backgroundColor || value('backgroundColor', element.type === 'button' || element.type === 'badge' ? '#FFC400' : undefined),
          color: element.color || value('color', '#FFFFFF'),
          fontSize,
          lineHeight: Math.max(1, element.lineHeight ? element.lineHeight * scale : fontSize * 1.12),
          fontWeight: (element.fontWeight || '700') as '400' | '500' | '600' | '700' | '800' | '900',
          fontFamily: element.fontFamily || value('fontFamily', undefined),
          fontStyle: element.fontStyle || value('fontStyle', 'normal'),
          letterSpacing: element.letterSpacing === undefined ? (value('letterSpacing', undefined) === undefined ? undefined : value('letterSpacing', 0) * scale) : element.letterSpacing * scale,
          textAlign: element.textAlign || value('textAlign', 'left'),
          textAlignVertical: element.textAlignVertical || value('textAlignVertical', 'center'),
          textDecorationLine: element.textDecorationLine || value('textDecorationLine', 'none'),
          textTransform: element.textTransform || value('textTransform', 'none'),
        }]}>{posterText(offer, element)}</Text>;
      })}
      {customAvatar ? <OfferAvatarSprite avatar={customAvatar} size={Math.max(72, Math.round((surfaceWidth || 320) * 0.23))} style={[styles.posterAvatar, { transform: [{ translateX: avatarOffsetX * scale }, { translateY: avatarOffsetY * scale }] }]} /> : null}
    </View>
  );
};

export const OfferCard: React.FC<{
  offer: Offer;
  onPress: () => void;
  onSave?: () => void;
  compact?: boolean;
  variant?: 'standard' | 'hero';
}> = ({ offer, onPress, onSave, compact, variant = 'standard' }) => {
  const business = (offer.businessDocument || offer.business) as Business;
  const selectedAvatar = offer.cardDesign ? findOfferAvatar(offer.cardDesign.avatarId) : null;
  const titleAlign = offer.cardDesign?.textAlign || (offer.cardDesign?.layout === 'center' ? 'center' : 'left');
  const titleFontSize = offer.cardDesign?.titleFontSize || 30;
  const descriptionFontSize = offer.cardDesign?.descriptionFontSize || 16;
  const fontWeight = offer.cardDesign?.fontWeight || '900';
  const fontStyle = offer.cardDesign?.fontStyle || 'normal';
  const titleFontWeight = String(offer.cardDesign?.customizations?.titleFontWeight || fontWeight) as '500' | '600' | '700' | '800' | '900';
  const descriptionFontWeight = String(offer.cardDesign?.customizations?.descriptionFontWeight || '600') as '500' | '600' | '700' | '800' | '900';
  const titleFontStyle = String(offer.cardDesign?.customizations?.titleFontStyle || fontStyle) as 'normal' | 'italic';
  const descriptionFontStyle = String(offer.cardDesign?.customizations?.descriptionFontStyle || fontStyle) as 'normal' | 'italic';
  const titleTextAlign = String(offer.cardDesign?.customizations?.titleTextAlign || titleAlign) as 'left' | 'center' | 'right';
  const descriptionTextAlign = String(offer.cardDesign?.customizations?.descriptionTextAlign || titleAlign) as 'left' | 'center' | 'right';
  const titleOffsetX = Number(offer.cardDesign?.customizations?.titleOffsetX || 0);
  const titleOffsetY = Number(offer.cardDesign?.customizations?.titleOffsetY || 0);
  const descriptionOffsetX = Number(offer.cardDesign?.customizations?.descriptionOffsetX || 0);
  const descriptionOffsetY = Number(offer.cardDesign?.customizations?.descriptionOffsetY || 0);
  const posterCanvas = offer.cardDesign?.canvas;

  if (variant === 'hero' && posterCanvas && posterCanvas.width > 0 && posterCanvas.height > 0) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.posterCard, compact && styles.posterCardCompact, { aspectRatio: posterCanvas.width / posterCanvas.height }, pressed && styles.pressed]}>
        <PosterLayers offer={offer} canvas={posterCanvas} previewUrl={offer.cardDesign?.previewUrl} />
      </Pressable>
    );
  }

  if (variant === 'hero') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.heroCard, compact && styles.heroCardCompact, pressed && styles.pressed]}>
        <LinearGradient colors={heroPalette(offer)} style={[styles.heroGradient, compact && styles.heroGradientCompact]}>
          {offer.imageUrls?.[0] || offer.cardDesign?.previewUrl ? (
            <Image source={{ uri: offer.imageUrls?.[0] || offer.cardDesign?.previewUrl || '' }} style={[styles.heroPhoto, compact && styles.heroPhotoCompact]} resizeMode="contain" />
          ) : selectedAvatar ? (
            <OfferAvatarSprite avatar={selectedAvatar} size={compact ? 178 : 200} style={[styles.heroAvatar, compact && styles.heroAvatarCompact]} />
          ) : (
            <MaterialCommunityIcons name={heroIcon(offer.category)} size={118} color="rgba(255,255,255,0.32)" style={styles.heroFallbackIcon} />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.01)', 'rgba(0,0,0,0.34)']} style={styles.heroShade} />
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            style={styles.heroSheen}
          />
          <View style={[styles.heroTopRow, compact && styles.heroTopRowCompact]}>
            <View style={[styles.heroCategory, compact && styles.heroCategoryCompact]}>
              <Text style={[styles.heroCategoryText, compact && styles.heroCategoryTextCompact]}>{offer.category.toUpperCase()} - NEAR YOU</Text>
            </View>
            <View style={[styles.heroDiscount, compact && styles.heroDiscountCompact]}>
              <Text style={[styles.heroDiscountText, compact && styles.heroDiscountTextCompact]}>{Math.round(offer.discountPercentage)}% OFF</Text>
            </View>
          </View>
          <Pressable onPress={(event) => { event.stopPropagation(); onPress(); }} style={[styles.heroMore, compact && styles.heroMoreCompact]} accessibilityLabel="Open offer details">
            <MaterialCommunityIcons name="dots-horizontal" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
            <Text style={[styles.heroTitle, compact && styles.heroTitleCompact, { fontSize: compact ? Math.min(titleFontSize, 24) : titleFontSize, lineHeight: (compact ? Math.min(titleFontSize, 24) : titleFontSize) + 4, fontWeight: titleFontWeight, fontStyle: titleFontStyle, textAlign: titleTextAlign, color: String(offer.cardDesign?.customizations?.titleColor || '#FFFFFF'), letterSpacing: Number(offer.cardDesign?.customizations?.titleLetterSpacing || 0), textDecorationLine: String(offer.cardDesign?.customizations?.titleTextDecoration || 'none') as 'none' | 'underline' | 'line-through', textTransform: String(offer.cardDesign?.customizations?.titleTextTransform || 'none') as 'none' | 'uppercase' | 'lowercase' | 'capitalize', transform: [{ translateX: titleOffsetX }, { translateY: titleOffsetY }] }]} numberOfLines={2}>{offer.title}</Text>
            <Text style={[styles.heroDescription, compact && styles.heroDescriptionCompact, { fontSize: compact ? Math.min(descriptionFontSize, 14) : descriptionFontSize, fontWeight: descriptionFontWeight, fontStyle: descriptionFontStyle, textAlign: descriptionTextAlign, color: String(offer.cardDesign?.customizations?.descriptionColor || 'rgba(255,255,255,0.94)'), letterSpacing: Number(offer.cardDesign?.customizations?.descriptionLetterSpacing || 0), textDecorationLine: String(offer.cardDesign?.customizations?.descriptionTextDecoration || 'none') as 'none' | 'underline' | 'line-through', textTransform: String(offer.cardDesign?.customizations?.descriptionTextTransform || 'none') as 'none' | 'uppercase' | 'lowercase' | 'capitalize', transform: [{ translateX: descriptionOffsetX }, { translateY: descriptionOffsetY }] }]} numberOfLines={2}>{offer.description}</Text>
          </View>
          <View style={styles.heroFooter}>
            <View>
              <Text style={styles.heroPrice}>{`\u20B9${offer.offerPrice.toLocaleString('en-IN')}`}</Text>
              <Text style={styles.heroOriginal}>{`\u20B9${offer.originalPrice.toLocaleString('en-IN')}`}</Text>
            </View>
            <Pressable onPress={(event) => { event.stopPropagation(); onPress(); }} style={styles.viewOffer}>
              <Text style={styles.viewOfferText}>View Offer</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.accent} />
            </Pressable>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, compact && styles.compact, pressed && styles.pressed]}>
      {offer.imageUrls?.[0] || offer.cardDesign?.previewUrl ? (
        <Image source={{ uri: offer.imageUrls?.[0] || offer.cardDesign?.previewUrl || '' }} style={styles.image} />
      ) : selectedAvatar ? (
        <LinearGradient colors={heroPalette(offer)} style={[styles.image, styles.placeholder]}>
          <OfferAvatarSprite avatar={selectedAvatar} size={148} style={styles.cardAvatar} />
        </LinearGradient>
      ) : (
        <View style={[styles.image, styles.placeholder]}><MaterialCommunityIcons name="sale" size={46} color={theme.colors.primary} /></View>
      )}
      <View style={styles.discount}><Text style={styles.discountText}>{Math.round(offer.discountPercentage)}% OFF</Text></View>
      <View style={styles.body}>
        <Text style={[styles.title, { transform: [{ translateX: titleOffsetX }, { translateY: titleOffsetY }] }]} numberOfLines={2}>{offer.title}</Text>
        <View style={styles.businessRow}>
          <Text style={styles.business} numberOfLines={1}>{business?.name || 'Local business'}</Text>
          {business?.verificationStatus === 'verified' && <MaterialCommunityIcons name="check-decagram" size={16} color={theme.colors.verified} />}
        </View>
        <Text style={styles.category}>{offer.category}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.original}>{`\u20B9${offer.originalPrice.toLocaleString('en-IN')}`}</Text>
          <Text style={styles.price}>{`\u20B9${offer.offerPrice.toLocaleString('en-IN')}`}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{offer.distanceKm != null ? `${offer.distanceKm} KM away` : expiryLabel(offer.expiresAt)}</Text>
          <Text style={styles.expiry}>{expiryLabel(offer.expiresAt)}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={(event) => { event.stopPropagation(); onSave?.(); }} style={styles.action}>
            <MaterialCommunityIcons name="bookmark-outline" size={19} color={theme.colors.primary} /><Text style={styles.actionText}>Save</Text>
          </Pressable>
          <Pressable onPress={(event) => { event.stopPropagation(); Share.share({ message: `${offer.title} - \u20B9${offer.offerPrice}` }); }} style={styles.action}>
            <MaterialCommunityIcons name="share-variant-outline" size={19} color={theme.colors.primary} /><Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },
  posterSurface: { flex: 1, width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }, posterBackground: { ...StyleSheet.absoluteFill }, posterText: { includeFontPadding: false, textAlignVertical: 'center' }, posterAvatar: { position: 'absolute', right: 12, bottom: 12, zIndex: 20 },
  posterCard: { width: '100%', overflow: 'hidden', backgroundColor: '#F4F4F4', borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadowStrong, shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 7 }, posterCardCompact: { width: 260 },
  heroCard: { width: '100%', height: 264, borderRadius: 29, overflow: 'hidden', backgroundColor: '#176FCF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', shadowColor: theme.colors.shadowStrong, shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 7 }, heroCardCompact: { width: 260, height: 342, borderRadius: 24 },
  heroGradient: { flex: 1, overflow: 'hidden', padding: 20 }, heroGradientCompact: { padding: 14 },
  heroPhoto: { position: 'absolute', right: -10, bottom: 32, width: '62%', height: '64%', zIndex: 2 }, heroPhotoCompact: { right: -8, bottom: 52, width: '64%', height: '50%' },
  heroAvatar: { position: 'absolute', right: -20, bottom: 28, zIndex: 2 }, heroAvatarCompact: { right: -16, bottom: 52 },
  heroFallbackIcon: { position: 'absolute', right: 12, bottom: 48, zIndex: 2 },
  heroShade: { ...StyleSheet.absoluteFill, zIndex: 3 },
  heroSheen: { position: 'absolute', top: -48, right: -80, width: '86%', height: 150, borderRadius: 90, transform: [{ rotate: '-15deg' }], zIndex: 4 },
  heroTopRow: { zIndex: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, heroTopRowCompact: { gap: 4 },
  heroCategory: { maxWidth: '64%', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }, heroCategoryCompact: { maxWidth: '58%', paddingHorizontal: 8, paddingVertical: 6 },
  heroCategoryText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6, color: '#FFFFFF' }, heroCategoryTextCompact: { fontSize: 8, letterSpacing: 0.25 },
  heroDiscount: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 99, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', shadowColor: '#FFFFFF', shadowOpacity: 0.55, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, heroDiscountCompact: { paddingHorizontal: 9, paddingVertical: 7 },
  heroDiscountText: { fontSize: 12, fontWeight: '900', color: theme.colors.accent }, heroDiscountTextCompact: { fontSize: 10 },
  heroMore: { position: 'absolute', top: 78, right: 17, zIndex: 6, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,25,70,0.22)' }, heroMoreCompact: { top: 65, right: 12, width: 34, height: 34, borderRadius: 17 },
  heroCopy: { zIndex: 5, width: '62%', marginTop: 18 }, heroCopyCompact: { marginTop: 14 },
  heroTitle: { fontSize: 30, lineHeight: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, textShadowColor: 'rgba(0,37,75,0.3)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 5 }, heroTitleCompact: { fontSize: 24, lineHeight: 28 },
  heroDescription: { marginTop: 7, fontSize: 16, lineHeight: 21, color: 'rgba(255,255,255,0.96)', fontWeight: '600', textShadowColor: 'rgba(0,37,75,0.24)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 }, heroDescriptionCompact: { marginTop: 5, fontSize: 14, lineHeight: 18 },
  heroFooter: { zIndex: 5, position: 'absolute', left: 20, right: 20, bottom: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  heroPrice: { fontSize: 25, lineHeight: 29, fontWeight: '900', color: '#FFFFFF', textShadowColor: 'rgba(0,37,75,0.32)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 5 },
  heroOriginal: { marginTop: 2, fontSize: 14, lineHeight: 18, fontWeight: '700', textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.7)' },
  viewOffer: { minHeight: 49, paddingHorizontal: 17, borderRadius: 27, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', shadowColor: theme.colors.accent, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  viewOfferText: { fontSize: 16, fontWeight: '800', color: theme.colors.accent },
  card: { width: 286, backgroundColor: theme.colors.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.shadowStrong, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  compact: { width: 260 },
  image: { width: '100%', height: 138, backgroundColor: theme.colors.surfaceAlt }, cardAvatar: { position: 'absolute', right: -8, bottom: -17 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  discount: { position: 'absolute', top: 12, left: 12, backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  discountText: { color: theme.colors.textInverse, fontWeight: '900', fontSize: 12 },
  body: { padding: 14 },
  title: { ...theme.typography.bodyBold, color: theme.colors.text, minHeight: 42 },
  businessRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  business: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '700', maxWidth: '85%' },
  category: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 9 },
  original: { ...theme.typography.caption, color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  price: { fontSize: 19, fontWeight: '900', color: theme.colors.text },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta: { ...theme.typography.tiny, color: theme.colors.secondary, fontWeight: '700' },
  expiry: { ...theme.typography.tiny, color: theme.colors.warning, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: theme.colors.divider, marginTop: 11, paddingTop: 10 },
  action: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '800' },
});

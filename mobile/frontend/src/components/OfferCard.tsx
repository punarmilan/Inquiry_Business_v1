import React from 'react';
import { Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { findOfferAvatar, isPosterUploadOffer, resolveDynamicValue, resolveOfferFontFamily, resolveOfferLineHeight, resolveTemplateElementValue, resolveTemplateImageValue } from '../config/offerCardDesigner';
import { OfferAvatarSprite } from './OfferAvatarSprite';
import { theme, createThemedStyles } from '../theme';
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

const posterText = (offer: Offer, element: OfferTemplateElement, editedText: Record<string, string>) => {
  const field = element.field || element.key;
  const business = offer.businessDocument || (offer.business && typeof offer.business !== 'string' ? offer.business : undefined);
  const values: Record<string, unknown> = {
    ...(offer.cardDesign?.dynamicFields || {}),
    ...(offer.cardDesign?.customizations || {}),
    title: offer.title,
    description: offer.description,
    category: offer.category,
    originalPrice: offer.originalPrice,
    offerPrice: offer.offerPrice,
    discount: offer.discountPercentage,
    discountPercentage: offer.discountPercentage,
    business,
    ...(business?.name ? { businessName: business.name } : {}),
    startsAt: new Date(offer.startsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    expiresAt: new Date(offer.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    ...(offer.imageUrls?.[0] ? { imageUrls: offer.imageUrls[0] } : {}),
  };
  if (Object.prototype.hasOwnProperty.call(editedText, element.id)) return resolveDynamicValue(editedText[element.id], values);
  if (field === 'title') return offer.title;
  if (field === 'description') return offer.description;
  if (field === 'category') return offer.category;
  if (field === 'offerPrice') return `₹${offer.offerPrice.toLocaleString('en-IN')}`;
  if (field === 'originalPrice') return `₹${offer.originalPrice.toLocaleString('en-IN')}`;
  if (field === 'discount' || field === 'discountPercentage') return `${Math.round(offer.discountPercentage)}% OFF`;
  if (field === 'businessName' && business?.name) return business.name;
  if (field === 'startsAt') return new Date(offer.startsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  if (field === 'expiresAt') return new Date(offer.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  if (field === 'buttonText') return resolveTemplateElementValue(element.content || element.text || 'VIEW OFFER', field, values);
  return resolveTemplateElementValue(element.content || element.text || '', field, values);
};

const posterImage = (offer: Offer, element: OfferTemplateElement) => {
  const field = element.field || element.key || '';
  const business = offer.businessDocument || (offer.business && typeof offer.business !== 'string' ? offer.business : undefined);
  const values: Record<string, unknown> = {
    ...(offer.cardDesign?.dynamicFields || {}),
    ...(offer.cardDesign?.customizations || {}),
    business,
    ...(business?.logoUrl ? { businessLogo: business.logoUrl } : {}),
    ...(offer.imageUrls?.[0] ? { imageUrls: offer.imageUrls[0] } : {}),
  };
  const dynamicValue = field ? values[field] : undefined;
  const dynamicImage = Array.isArray(dynamicValue)
    ? dynamicValue.find((value): value is string => typeof value === 'string' && value.length > 0)
    : typeof dynamicValue === 'string' && dynamicValue.length > 0 ? dynamicValue : undefined;
  const elementImage = resolveTemplateImageValue(element.imageUrl || element.src || '', field, values);
  if (field === 'businessLogo') return business?.logoUrl || dynamicImage || elementImage;
  if (field === 'imageUrls') return offer.imageUrls?.[0] || dynamicImage || elementImage;
  return dynamicImage || elementImage;
};

const rotationTransform = (rotation?: number) => (
  typeof rotation === 'number' && Number.isFinite(rotation) && rotation !== 0
    ? [{ rotate: `${rotation}deg` }]
    : []
);

const PosterHeroArtwork: React.FC<{ offer: Offer; canvas?: OfferTemplateCanvas }> = ({ offer, canvas }) => {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  if (!canvas && offer.imageUrls?.[0]) return <Image source={{ uri: offer.imageUrls[0] }} style={styles.posterImageFill} resizeMode="contain" />;
  const ratio = canvas && canvas.width > 0 && canvas.height > 0 ? canvas.width / canvas.height : 1;
  const width = Math.min(size.width, size.height * ratio);
  const height = ratio > 0 ? width / ratio : 0;
  return <View style={styles.posterFrame} onLayout={(event) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setSize((current) => current.width === nextWidth && current.height === nextHeight ? current : { width: nextWidth, height: nextHeight });
  }}>
    {width > 0 && height > 0 ? <View style={{ width, height, overflow: 'hidden' }}>
      {isPosterUploadOffer(offer) && offer.imageUrls?.[0]
        ? <Image source={{ uri: offer.imageUrls[0] }} style={styles.posterImageFill} resizeMode="contain" />
        : canvas ? <PosterLayers offer={offer} canvas={canvas} previewUrl={offer.cardDesign?.previewUrl} /> : null}
    </View> : null}
  </View>;
};

export const PosterLayers: React.FC<{ offer: Offer; canvas: OfferTemplateCanvas; previewUrl?: string }> = ({ offer, canvas, previewUrl }) => {
  const [surfaceWidth, setSurfaceWidth] = React.useState(0);
  const editedText = React.useMemo(() => {
    try {
      const value = JSON.parse(String(offer.cardDesign?.customizations?.posterTextValues || '{}'));
      return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, string> : {};
    } catch { return {}; }
  }, [offer.cardDesign?.customizations?.posterTextValues]);
  const scale = surfaceWidth ? surfaceWidth / canvas.width : 0.28;
  const customAvatar = offer.cardDesign?.templateId === 'custom' && offer.cardDesign.avatarId ? findOfferAvatar(offer.cardDesign.avatarId) : null;
  const avatarOffsetX = Number(offer.cardDesign?.customizations?.avatarOffsetX || 0);
  const avatarOffsetY = Number(offer.cardDesign?.customizations?.avatarOffsetY || 0);
  const background = canvas.background;
  const backgroundImageUrl = canvas.backgroundImageUrl || background?.imageUrl || (!canvas.elements.length ? previewUrl : undefined);
  return (
    <View onLayout={(event) => setSurfaceWidth(event.nativeEvent.layout.width)} style={[styles.posterSurface, { backgroundColor: canvas.backgroundColor || '#F4F4F4' }]}>
      {background?.type === 'gradient' || background?.type === 'linear-gradient' ? <LinearGradient colors={background.colors && background.colors.length >= 2 ? background.colors as [string, string, ...string[]] : [background.from || '#111827', background.to || '#374151']} style={styles.posterBackground} /> : null}
      {backgroundImageUrl ? <Image source={{ uri: backgroundImageUrl }} style={[styles.posterBackground, { opacity: background?.opacity ?? 1 }]} resizeMode="cover" /> : null}
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
          transform: rotationTransform(element.rotation),
          borderRadius: (element.borderRadius ?? value('borderRadius', 0)) * scale,
          borderWidth: (element.borderWidth ?? value('borderWidth', 0)) * scale,
          borderColor: element.borderColor || value('borderColor', 'transparent'),
          borderStyle: element.borderStyle || value('borderStyle', 'solid'),
        } as any;
        if (element.avatarId) {
          const avatar = findOfferAvatar(element.avatarId);
          const avatarSize = Math.max(1, Math.round(Math.min(
            surfaceWidth * (element.width / canvas.width),
            surfaceWidth * (element.height / canvas.height),
          )));
          return <OfferAvatarSprite key={element.id} avatar={avatar} size={avatarSize} style={layer} />;
        }
        if (element.type === 'image') {
          const uri = posterImage(offer, element);
          return uri ? <Image key={element.id} source={{ uri }} style={layer} resizeMode={element.resizeMode === 'stretch' ? 'stretch' : element.resizeMode || value('objectFit', 'contain')} /> : null;
        }
        if (element.type === 'shape' || element.type === 'rectangle' || element.type === 'circle' || element.type === 'line' || element.type === 'divider' || element.type === 'group') return <View key={element.id} style={[layer, { backgroundColor: element.backgroundColor || value('backgroundColor', element.color || 'transparent') }]} />;
        const baseFontSize = element.fontSize || value('fontSize', 36);
        const fontSize = Math.max(1, baseFontSize * scale);
        const rawLineHeight = element.lineHeight || value('lineHeight', undefined);
        return <Text key={element.id} numberOfLines={Math.max(2, element.numberOfLines || 1)} adjustsFontSizeToFit minimumFontScale={0.55} allowFontScaling={false} style={[layer, styles.posterText, {
          backgroundColor: element.backgroundColor || value('backgroundColor', element.type === 'button' || element.type === 'badge' ? '#FFC400' : undefined),
          color: element.color || value('color', '#FFFFFF'),
          fontSize,
          lineHeight: Math.max(1, resolveOfferLineHeight(baseFontSize, rawLineHeight) * scale),
          fontWeight: (element.fontWeight || '700') as '400' | '500' | '600' | '700' | '800' | '900',
          fontFamily: resolveOfferFontFamily(element.fontFamily || value('fontFamily', undefined)),
          fontStyle: element.fontStyle || value('fontStyle', 'normal'),
          letterSpacing: element.letterSpacing === undefined ? (value('letterSpacing', undefined) === undefined ? undefined : value('letterSpacing', 0) * scale) : element.letterSpacing * scale,
          textAlign: element.textAlign || value('textAlign', 'left'),
          textAlignVertical: element.textAlignVertical || value('textAlignVertical', 'center'),
          textDecorationLine: element.textDecorationLine || value('textDecorationLine', 'none'),
          textTransform: element.textTransform || value('textTransform', 'none'),
        }]}>{posterText(offer, element, editedText)}</Text>;
      })}
      {customAvatar ? <OfferAvatarSprite avatar={customAvatar} size={Math.max(72, Math.round((surfaceWidth || 320) * 0.23))} style={[styles.posterAvatar, { transform: [{ translateX: avatarOffsetX * scale }, { translateY: avatarOffsetY * scale }] }]} /> : null}
    </View>
  );
};

export const OfferCard: React.FC<{
  offer: Offer;
  onPress: () => void;
  onSave?: () => void;
  saved?: boolean;
  compact?: boolean;
  variant?: 'standard' | 'hero';
}> = ({ offer, onPress, onSave, saved = false, compact, variant = 'standard' }) => {
  const business = (offer.businessDocument || offer.business) as Business;
  const selectedAvatar = offer.cardDesign?.avatarId ? findOfferAvatar(offer.cardDesign.avatarId) : null;
  const titleOffsetX = Number(offer.cardDesign?.customizations?.titleOffsetX || 0);
  const titleOffsetY = Number(offer.cardDesign?.customizations?.titleOffsetY || 0);
  const posterCanvas = offer.cardDesign?.canvas;
  const heroPhotoUrl = offer.imageUrls?.[0];
  // An uploaded poster already carries its own offer text and has no real prices
  // or discount, so it never gets the summary overlays.
  const isPoster = isPosterUploadOffer(offer);

  const posterRatio = posterCanvas && posterCanvas.width > 0 && posterCanvas.height > 0
    ? posterCanvas.width / posterCanvas.height
    : 0;

  // The saved canvas is the user's poster. Fit it within the carousel slot;
  // never layer an unrelated offer summary over a finished template.
  if (variant === 'hero' && ((posterCanvas && posterRatio > 0 && Array.isArray(posterCanvas.elements)) || (isPoster && offer.imageUrls?.[0]))) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.posterCard, { backgroundColor: posterCanvas?.background?.color || posterCanvas?.backgroundColor || '#071E20' }, compact && styles.posterCardCompact, pressed && styles.pressed]}>
        <PosterHeroArtwork offer={offer} canvas={posterCanvas} />
        {onSave ? <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Unsave offer' : 'Save offer'} hitSlop={8} onPress={(event) => { event.stopPropagation(); onSave(); }} style={[styles.posterSave, compact && styles.posterSaveCompact]}>
          <MaterialCommunityIcons name={saved ? 'heart' : 'heart-outline'} size={compact ? 17 : 21} color={saved ? theme.colors.danger : '#FFFFFF'} />
        </Pressable> : null}
      </Pressable>
    );
  }

  if (variant === 'hero') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.heroCard, compact && styles.heroCardCompact, pressed && styles.pressed]}>
        <LinearGradient colors={heroPalette(offer)} style={[styles.heroGradient, compact && styles.heroGradientCompact]}>
          {heroPhotoUrl ? (
            <Image source={{ uri: heroPhotoUrl }} style={[styles.heroPhoto, compact && styles.heroPhotoCompact]} resizeMode="cover" />
          ) : selectedAvatar ? (
            <OfferAvatarSprite avatar={selectedAvatar} size={compact ? 178 : 200} style={[styles.heroAvatar, compact && styles.heroAvatarCompact]} />
          ) : (
            <MaterialCommunityIcons name={heroIcon(offer.category)} size={118} color="rgba(255,255,255,0.32)" style={styles.heroFallbackIcon} />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.03)', 'rgba(0,8,10,0.28)', 'rgba(0,8,10,0.94)']} locations={[0, 0.42, 1]} style={styles.heroShade} />
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
            <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Unsave offer' : 'Save offer'} hitSlop={8} onPress={(event) => { event.stopPropagation(); onSave?.(); }} style={[styles.heroHeart, compact && styles.heroHeartCompact]}>
              <MaterialCommunityIcons name={saved ? 'heart' : 'heart-outline'} size={compact ? 18 : 23} color={saved ? theme.colors.danger : '#FFFFFF'} />
            </Pressable>
          </View>
          <View style={[styles.heroDiscount, compact && styles.heroDiscountCompact]}>
            <Text style={[styles.heroDiscountText, compact && styles.heroDiscountTextCompact]}>{Math.round(offer.discountPercentage)}% OFF</Text>
          </View>
          <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
            <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]} numberOfLines={2}>{offer.title}</Text>
            <Text style={[styles.heroDescription, compact && styles.heroDescriptionCompact]} numberOfLines={compact ? 1 : 2}>{offer.description}</Text>
          </View>
          <View style={[styles.heroFooter, compact && styles.heroFooterCompact]}>
            <View style={styles.heroPriceRow}>
              <Text style={[styles.heroPrice, compact && styles.heroPriceCompact]}>{`\u20B9${offer.offerPrice.toLocaleString('en-IN')}`}</Text>
              <Text style={[styles.heroOriginal, compact && styles.heroOriginalCompact]}>{`\u20B9${offer.originalPrice.toLocaleString('en-IN')}`}</Text>
            </View>
            <Pressable onPress={(event) => { event.stopPropagation(); onPress(); }} style={[styles.viewOffer, compact && styles.viewOfferCompact]}>
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
      {isPoster ? null : <View style={styles.discount}><Text style={styles.discountText}>{Math.round(offer.discountPercentage)}% OFF</Text></View>}
      <View style={styles.body}>
        <Text style={[styles.title, { transform: [{ translateX: titleOffsetX }, { translateY: titleOffsetY }] }]} numberOfLines={2}>{offer.title}</Text>
        <View style={styles.businessRow}>
          <Text style={styles.business} numberOfLines={1}>{business?.name || 'Local business'}</Text>
          {business?.verificationStatus === 'verified' && <MaterialCommunityIcons name="check-decagram" size={16} color={theme.colors.verified} />}
        </View>
        <Text style={styles.category}>{offer.category}</Text>
        {isPoster ? null : (
          <View style={styles.priceRow}>
            <Text style={styles.original}>{`\u20B9${offer.originalPrice.toLocaleString('en-IN')}`}</Text>
            <Text style={styles.price}>{`\u20B9${offer.offerPrice.toLocaleString('en-IN')}`}</Text>
          </View>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{offer.distanceKm != null ? `${offer.distanceKm} KM away` : expiryLabel(offer.expiresAt)}</Text>
          <Text style={styles.expiry}>{expiryLabel(offer.expiresAt)}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={(event) => { event.stopPropagation(); onSave?.(); }} style={[styles.action, saved && { backgroundColor: theme.colors.primaryLight }]}>
            <MaterialCommunityIcons name={saved ? 'bookmark' : 'bookmark-outline'} size={19} color={theme.colors.primary} /><Text style={styles.actionText}>{saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
          <Pressable onPress={(event) => { event.stopPropagation(); Share.share({ message: isPoster ? offer.title : `${offer.title} - \u20B9${offer.offerPrice}` }); }} style={styles.action}>
            <MaterialCommunityIcons name="share-variant-outline" size={19} color={theme.colors.primary} /><Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

const styles = createThemedStyles((c) => ({
  pressed: { opacity: 0.9 },
  posterSurface: { flex: 1, width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }, posterBackground: { ...StyleSheet.absoluteFill }, posterText: { includeFontPadding: false, textAlignVertical: 'center' }, posterAvatar: { position: 'absolute', right: 12, bottom: 12, zIndex: 20 },
  posterCard: { width: '100%', height: 218, overflow: 'hidden', backgroundColor: c.surfaceAlt, borderRadius: 20, borderWidth: 1.5, borderColor: c.cardBorder, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 5 }, posterCardCompact: { width: '100%', height: 105, borderRadius: 16 },
  posterFrame: { flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  posterImageFill: { width: '100%', height: '100%' },
  posterSave: { position: 'absolute', top: 7, right: 7, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,10,13,0.62)' },
  posterSaveCompact: { width: 25, height: 25, borderRadius: 13, top: 5, right: 5 },
  heroCard: { width: '100%', height: 218, borderRadius: 16, overflow: 'hidden', backgroundColor: '#061519', borderWidth: 1.25, borderColor: c.cardBorder, shadowColor: c.cardGlow, shadowOpacity: 0.92, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, heroCardCompact: { width: '100%', height: 105, borderRadius: 14 },
  heroGradient: { flex: 1, overflow: 'hidden', padding: 12 }, heroGradientCompact: { padding: 8 },
  heroPhoto: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', zIndex: 2 }, heroPhotoCompact: { width: '100%', height: '100%' },
  heroAvatar: { position: 'absolute', right: -20, bottom: 28, zIndex: 2 }, heroAvatarCompact: { right: -16, bottom: 52 },
  heroFallbackIcon: { position: 'absolute', right: 12, bottom: 12, zIndex: 2 },
  heroShade: { ...StyleSheet.absoluteFill, zIndex: 3 },
  heroSheen: { position: 'absolute', top: -48, right: -80, width: '86%', height: 150, borderRadius: 90, transform: [{ rotate: '-15deg' }], zIndex: 4 },
  heroTopRow: { zIndex: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, heroTopRowCompact: { gap: 3 },
  heroCategory: { maxWidth: '72%', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(2,23,28,0.78)', borderWidth: 1, borderColor: 'rgba(160,244,249,0.42)' }, heroCategoryCompact: { maxWidth: '72%', paddingHorizontal: 6, paddingVertical: 3 },
  heroCategoryText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.45, color: c.textInverse }, heroCategoryTextCompact: { fontSize: 6.5, letterSpacing: 0.1 },
  heroHeart: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,10,13,0.42)' }, heroHeartCompact: { width: 24, height: 24, borderRadius: 12 },
  heroDiscount: { position: 'absolute', top: 48, right: 10, zIndex: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FF4A43', shadowColor: '#FF4A43', shadowOpacity: 0.38, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 }, heroDiscountCompact: { top: 42, right: 7, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  heroDiscountText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' }, heroDiscountTextCompact: { fontSize: 7.5 },
  heroCopy: { zIndex: 5, position: 'absolute', left: 12, right: 12, bottom: 57 }, heroCopyCompact: { left: 8, right: 8, bottom: 24 },
  heroTitle: { fontSize: 21, lineHeight: 24, fontWeight: '900', color: c.textInverse, letterSpacing: -0.35, textShadowColor: 'rgba(0,0,0,0.92)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }, heroTitleCompact: { fontSize: 12.5, lineHeight: 15 },
  heroDescription: { marginTop: 3, fontSize: 11, lineHeight: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }, heroDescriptionCompact: { marginTop: 0, fontSize: 7.5, lineHeight: 9 },
  heroFooter: { zIndex: 5, position: 'absolute', left: 12, right: 10, bottom: 9, minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  heroFooterCompact: { left: 8, right: 8, bottom: 4, minHeight: 18 },
  heroPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroPrice: { fontSize: 20, lineHeight: 24, fontWeight: '900', color: c.primary, textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 }, heroPriceCompact: { fontSize: 11, lineHeight: 14 },
  heroOriginal: { fontSize: 11, lineHeight: 15, fontWeight: '700', textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.62)' }, heroOriginalCompact: { fontSize: 7.5, lineHeight: 9 },
  viewOffer: { minHeight: 38, paddingHorizontal: 13, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: c.primary, borderWidth: 1, borderColor: c.primaryBright, shadowColor: c.primary, shadowOpacity: 0.38, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, viewOfferCompact: { display: 'none' },
  viewOfferText: { fontSize: 12.5, fontWeight: '900', color: '#001418' },
  card: { width: 286, backgroundColor: c.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.border, shadowColor: c.shadowStrong, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  compact: { width: 260 },
  image: { width: '100%', height: 138, backgroundColor: c.surfaceAlt }, cardAvatar: { position: 'absolute', right: -8, bottom: -17 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primaryLight },
  discount: { position: 'absolute', top: 12, left: 12, backgroundColor: c.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  discountText: { color: c.textInverse, fontWeight: '900', fontSize: 12 },
  body: { padding: 14 },
  title: { ...theme.typography.bodyBold, color: c.text, minHeight: 42 },
  businessRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  business: { ...theme.typography.caption, color: c.textSecondary, fontWeight: '700', maxWidth: '85%' },
  category: { ...theme.typography.tiny, color: c.textMuted, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 9 },
  original: { ...theme.typography.caption, color: c.textMuted, textDecorationLine: 'line-through' },
  price: { fontSize: 19, fontWeight: '900', color: c.text },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta: { ...theme.typography.tiny, color: c.secondary, fontWeight: '700' },
  expiry: { ...theme.typography.tiny, color: c.warning, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: c.divider, marginTop: 11, paddingTop: 10 },
  action: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { ...theme.typography.caption, color: c.primary, fontWeight: '800' },
}));

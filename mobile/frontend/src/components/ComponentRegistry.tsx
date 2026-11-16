import React from 'react';
import { Image, Platform, ScrollView, Text, View } from 'react-native';
import { uiIllustration } from '../utils/uiIllustrations';
import { Button } from './Button';
import { OfferCard } from './OfferCard';
import { UILottie } from './UILottie';
import { useDynamicTheme } from '../context/DynamicThemeProvider';
import type { Offer } from '../types/hyperlocal';
import type { UIAction, UIBlock, UILocale, UILocalizedText } from '../types/dynamicUI';
import { visualText } from '../utils/uiVisual';
import { UINativeIcon, UIUploadedImage } from './UIVisualAssets';

export type UIActions = Partial<Record<UIAction, () => void | Promise<void>>>;
export type UIBusinessData = {
  offers?: Partial<Record<'nearby' | 'showcase', Offer[]>>;
  onOfferPress?: (offerId: string) => void;
  onOfferSave?: (offerId: string) => void;
  savedOfferIds?: string[];
};
type BlockProps = { block: UIBlock; locale: UILocale; actions: UIActions; data: UIBusinessData };
const copy = (value: UILocalizedText, locale: UILocale) => value[locale] || value.en;
const invoke = (action: UIActions[UIAction]) => {
  try { if (action) void Promise.resolve(action()).catch(() => undefined); } catch { /* Trusted host handles its own action errors. */ }
};
const TextBlock = ({ block, locale }: BlockProps) => {
  const theme = useDynamicTheme();
  if (block.type !== 'text') return null;
  const font = block.props.variant === 'heading' ? theme.typography.h2 : block.props.variant === 'caption' ? theme.typography.caption : theme.typography.body;
  return <View style={{ backgroundColor: block.style?.backgroundColor || theme.colors[block.props.backgroundToken || 'surface'], padding: block.style?.padding !== undefined ? 0 : theme.spacing.md }}>
    <Text accessibilityRole={block.props.variant === 'heading' ? 'header' : undefined} style={[font, { color: block.style?.color || theme.colors[block.props.colorToken || 'text'] }, visualText(block.style, Platform.OS)]}>{copy(block.props.text, locale)}</Text>
  </View>;
};
const HeroBanner = ({ block, locale, actions }: BlockProps) => {
  const theme = useDynamicTheme();
  if (block.type !== 'heroBanner') return null;
  const color = block.style?.color || theme.colors[block.props.colorToken || 'text'];
  const handler = block.props.action ? actions[block.props.action] : undefined;
  return <View style={{ backgroundColor: block.style?.backgroundColor || theme.colors[block.props.backgroundToken || 'surface'], borderColor: theme.colors.border,
    borderWidth: 1, borderRadius: block.style?.borderRadius ?? theme.radius.lg, padding: block.style?.padding !== undefined ? 0 : theme.spacing.lg, gap: theme.spacing.sm }}>
    {block.props.imageAssetId ? <UIUploadedImage assetId={block.props.imageAssetId} height={block.props.imageHeight || 160} alt={copy(block.props.title, locale)} /> : null}
    <Text accessibilityRole="header" style={[theme.typography.h2, { color }, visualText(block.style, Platform.OS)]}>{copy(block.props.title, locale)}</Text>
    {block.props.subtitle ? <Text style={[theme.typography.body, { color, textAlign: block.style?.textAlign }]}>{copy(block.props.subtitle, locale)}</Text> : null}
    {block.props.buttonLabel && handler ? <Button label={copy(block.props.buttonLabel, locale)} onPress={() => invoke(handler)} /> : null}
  </View>;
};
const ActionLink = ({ block, locale, actions }: BlockProps) => {
  if (block.type !== 'actionLink') return null;
  const handler = actions[block.props.action];
  return handler ? <Button variant="outline" label={copy(block.props.label, locale)} onPress={() => invoke(handler)} /> : null;
};
const Spacer = ({ block }: BlockProps) => block.type === 'spacer' ? <View accessible={false} pointerEvents="none" style={{ height: block.props.height }} /> : null;
const OfferRail = ({ block, data }: BlockProps) => {
  if (block.type !== 'offerRail' || !data.onOfferPress) return null;
  const offers = data.offers?.[block.props.source]?.slice(0, block.props.limit || 12) || [];
  if (!offers.length) return null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {offers.map((offer) => <OfferCard key={offer._id} offer={offer} variant="standard" compact={block.props.variant === 'compact'}
      onPress={() => data.onOfferPress!(offer._id)} onSave={data.onOfferSave ? () => data.onOfferSave!(offer._id) : undefined}
      saved={data.savedOfferIds?.includes(offer._id)} />)}
  </ScrollView>;
};

const Illustration = ({ block, locale }: BlockProps) => block.type === 'illustration' ? <Image source={uiIllustration(block.props.image)} accessibilityLabel={copy(block.props.alt, locale)} resizeMode={block.props.fit || 'contain'} style={{ width: '100%', height: block.props.height || 160 }} /> : null;
const UploadedImage = ({ block, locale }: BlockProps) => block.type === 'image' ? <UIUploadedImage assetId={block.props.assetId} height={block.props.height || 180} fit={block.props.fit} alt={copy(block.props.alt, locale)} /> : null;
const IconBlock = ({ block, locale }: BlockProps) => {
  const theme = useDynamicTheme();
  if (block.type !== 'icon') return null;
  const alignment = block.style?.textAlign || block.style?.alignment || 'center';
  return <View style={{ backgroundColor: block.style?.backgroundColor || theme.colors[block.props.backgroundToken || 'surface'], alignItems: alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center', padding: block.style?.padding !== undefined ? 0 : 12, gap: 8 }}>
    <UINativeIcon name={block.props.name} size={block.props.size} color={block.style?.color || theme.colors[block.props.colorToken || 'text']} />
    {block.props.label ? <Text style={[theme.typography.body, { color: block.style?.color || theme.colors[block.props.colorToken || 'text'] }, visualText(block.style, Platform.OS)]}>{copy(block.props.label, locale)}</Text> : null}
  </View>;
};
export const ComponentRegistry: Readonly<Record<UIBlock['type'], React.ComponentType<BlockProps>>> = Object.freeze({
  // Native home placements are consumed by OffersHomeScreen, never duplicated in optional slots.
  homeCard: () => null,
  text: TextBlock, heroBanner: HeroBanner, offerRail: OfferRail, spacer: Spacer, actionLink: ActionLink, lottie: UILottie, illustration: Illustration, image: UploadedImage, icon: IconBlock,
});

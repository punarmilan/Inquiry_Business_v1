import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { UIHomeCard } from '../types/dynamicUI';
import { useUIConfig } from '../hooks/useUIConfig';
import { UIUploadedImage } from './UIVisualAssets';
import { UILottie } from './UILottie';
import type { UIPlaybackResult } from './UILottie';
import { homeCardMediaFit } from '../utils/uiHome';

const artwork = {
  offers: require('../../assets/reference-home/local-offers.png'), post: require('../../assets/reference-home/create-post.png'),
  events: require('../../assets/reference-home/local-events.png'), services: require('../../assets/reference-home/find-services.png'),
  support: require('../../assets/reference-home/support-local.png'), moreDeals: require('../../assets/reference-home/more-local-deals.png'),
};
const expanded = { ...artwork, post: require('../../assets/reference-home/create-post-active.png'), events: require('../../assets/reference-home/local-events-active.png'), services: require('../../assets/reference-home/find-services-active.png') };
export function UIHomeMedia({ card, style, active = true, expandedCard = false, fallback, onPlaybackEnd }: { card: UIHomeCard; style?: StyleProp<ViewStyle>; active?: boolean; expandedCard?: boolean; fallback?: React.ReactNode; onPlaybackEnd?: (result: UIPlaybackResult) => void }) {
  const { locale } = useUIConfig();
  const [height, setHeight] = useState(120);
  const p = card.props;
  const bundled = <Image source={(expandedCard ? expanded : artwork)[p.bundled]} resizeMode={p.fit || 'cover'} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />;
  const still = fallback || bundled;
  if (p.media === 'none') return null;
  return <View pointerEvents="none" style={style} onLayout={event => setHeight(event.nativeEvent.layout.height)}>
    {p.media === 'lottie' && p.assetId ? <UILottie key={`${card.id}:${p.assetId}`} enabled={active} onPlaybackEnd={onPlaybackEnd} locale={locale} staticFallback={still} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
      block={{ id: card.id, type: 'lottie', props: { assetId: p.assetId, fallback: p.title, speed: p.speed || 1, loop: true, loopCount: p.loopCount || 3, height: Math.min(320, Math.max(32, height)) } }} />
      : p.media === 'image' && p.assetId ? <UIUploadedImage assetId={p.assetId} height={height} fit={homeCardMediaFit(card)} alt={p.title[locale] || p.title.en} fallback={still} /> : bundled}
  </View>;
}

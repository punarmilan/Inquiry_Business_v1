import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { UIHomeCard, UILocale } from '../types/dynamicUI';
import { UIHomeMedia } from './UIHomeMedia';
import { homeCopy } from '../utils/uiHome';

export function UIHomeBanner({ card, locale, onPress, width }: { card: UIHomeCard; locale: UILocale; onPress: () => void; width: number }) {
  if (card.hidden) return null;
  const showCopy = card.props.showCopy !== false;
  const backgroundColor = card.style?.backgroundColor || '#DCF0F5';
  const color = card.style?.color || '#08152F';
  return <Pressable accessibilityRole="button" accessibilityLabel={homeCopy(card.props.title, locale)} onPress={onPress}
    style={({ pressed }) => ({ width, minHeight: card.props.height || 100, alignSelf: 'center', marginTop: 4, marginBottom: 6, borderRadius: card.style?.borderRadius ?? 20, backgroundColor, overflow: 'hidden', opacity: pressed ? 0.85 : 1 })}>
    <UIHomeMedia card={card} style={[StyleSheet.absoluteFill, card.props.media === 'lottie' && showCopy ? { left: '62%' } : {}]} />
    {showCopy ? <View style={{ width: '62%', padding: 13, backgroundColor }}>
      <Text numberOfLines={2} style={{ fontSize: 15, lineHeight: 19, fontWeight: '800', color }}>{homeCopy(card.props.title, locale)}</Text>
      {card.props.subtitle ? <Text numberOfLines={2} style={{ color, fontSize: 9, lineHeight: 13, marginTop: 3 }}>{homeCopy(card.props.subtitle, locale)}</Text> : null}
      {card.props.buttonLabel ? <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 6, backgroundColor: '#086C6F', borderRadius: 16, paddingVertical: 5, paddingHorizontal: 10, marginTop: 6 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>{homeCopy(card.props.buttonLabel, locale)}</Text><MaterialCommunityIcons name="arrow-right" size={14} color="#FFFFFF" />
      </View> : null}
    </View> : null}
  </Pressable>;
}

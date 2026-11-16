import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Gift, Flame, Sparkles, Heart, Star, ShoppingBag, Store, Tag, MapPin, Phone, Bell, Percent, CheckCircle, Calendar, PartyPopper, Sun } from 'lucide-react-native';
import { useUIConfig } from '../hooks/useUIConfig';
import { useDynamicTheme } from '../context/DynamicThemeProvider';
import { apiUrl } from '../services/api';
import { getUICity } from '../services/uiCampaignLocation';
import { UI_RENDERER_VERSION, type UILocale } from '../types/dynamicUI';

const icons = { Gift, Flame, Sparkles, Heart, Star, ShoppingBag, Store, Tag, MapPin, Phone, Bell, Percent, CheckCircle, Calendar, PartyPopper, Sun };
export function UINativeIcon({ name, size = 40, color }: { name: string; size?: number; color: string }) {
  const Icon = icons[name as keyof typeof icons];
  return Icon ? <Icon size={size} color={color} /> : null;
}
export function UIUploadedImage({ assetId, height = 180, fit = 'cover', alt, fallback }: { assetId: string; height?: number; fit?: 'contain' | 'cover'; alt: string; locale?: UILocale; fallback?: React.ReactNode }) {
  const { state } = useUIConfig();
  const theme = useDynamicTheme();
  const [failedId, setFailedId] = useState('');
  const asset = state.config.assets[assetId];
  if (!asset || asset.kind !== 'image' || failedId === assetId) return fallback || <View style={{ height, justifyContent: 'center', backgroundColor: theme.colors.surface }}><Text style={{ color: theme.colors.textSecondary }}>{alt}</Text></View>;
  const cityId = getUICity();
  const uri = apiUrl(`/ui/assets/${assetId}?rendererVersion=${UI_RENDERER_VERSION}&campaignVersion=1${cityId ? `&cityId=${encodeURIComponent(cityId)}` : ''}`);
  return <Image key={assetId} accessibilityLabel={alt} source={{ uri }} resizeMode={fit} style={{ width: '100%', height }} onError={() => setFailedId(assetId)} />;
}

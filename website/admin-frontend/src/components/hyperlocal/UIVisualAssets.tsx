import { useEffect, useState } from 'react';
import { Gift, Flame, Sparkle, Heart, Star, ShoppingBag, Storefront, Tag, MapPin, Phone, Bell, Percent, CheckCircle, Calendar, Confetti, Sun } from '@phosphor-icons/react';
import { getUIImageContent } from '@/api/ui';

const icons = { Gift, Flame, Sparkles: Sparkle, Heart, Star, ShoppingBag, Store: Storefront, Tag, MapPin, Phone, Bell, Percent, CheckCircle, Calendar, PartyPopper: Confetti, Sun };
export function UIEditorIcon({ name, size = 40, color }: { name: string; size?: number; color?: string }) {
  const Icon = icons[name as keyof typeof icons];
  return Icon ? <Icon size={size} color={color} aria-hidden="true" /> : null;
}
export function UIImagePreview({ assetId, alt, height = 180, fit = 'cover' }: { assetId: string; alt: string; height?: number; fit?: 'contain' | 'cover' }) {
  const [source, setSource] = useState<{ id: string; url: string } | null>(null);
  const [failed, setFailed] = useState('');
  useEffect(() => {
    if (!assetId) return;
    const controller = new AbortController(); let url = '';
    void getUIImageContent(assetId, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob); setSource({ id: assetId, url });
    }).catch(() => { if (!controller.signal.aborted) setFailed(assetId); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [assetId]);
  return source?.id === assetId && failed !== assetId ? <img src={source.url} alt={alt} style={{ width: '100%', height, objectFit: fit }} onError={() => setFailed(assetId)} />
    : <div className="flex items-center justify-center rounded-lg bg-muted p-4 text-center text-xs text-muted-foreground" style={{ height }} role="img" aria-label={alt}>{failed === assetId ? 'Image unavailable' : assetId ? 'Loading image…' : 'Select or upload an image'}</div>;
}

import type { CSSProperties } from 'react';
import type { OfferRecord, TemplateElementRecord } from '@/api/hyperlocal';
import { resolveDynamicValue, resolveTemplateElementValue, resolveTemplateImageValue } from '@/utils/templateSchema';
import avatarSheet1 from '../../../../../mobile/frontend/assets/offer-avatars/avatars-01-v2.png';
import avatarSheet2 from '../../../../../mobile/frontend/assets/offer-avatars/avatars-02-v2.png';
import avatarSheet3 from '../../../../../mobile/frontend/assets/offer-avatars/avatars-03-v2.png';
import avatarSheet4 from '../../../../../mobile/frontend/assets/offer-avatars/avatars-04-v2.png';
import avatarSheet5 from '../../../../../mobile/frontend/assets/offer-avatars/avatars-05-v2.png';

const avatarSheets = [avatarSheet1, avatarSheet2, avatarSheet3, avatarSheet4, avatarSheet5];
const avatarSprite = (id: string, size: number, style?: CSSProperties) => {
  const match = /^avatar-(\d{2})$/.exec(id);
  const index = match ? Number(match[1]) - 1 : -1;
  if (index < 0 || index >= avatarSheets.length * 4) return null;
  const slot = index % 4;
  return <div aria-hidden="true" style={{ width: size, height: size, flex: '0 0 auto', backgroundImage: `url(${avatarSheets[Math.floor(index / 4)]})`, backgroundRepeat: 'no-repeat', backgroundSize: '200% 200%', backgroundPosition: `${slot % 2 ? '100%' : '0'} ${slot >= 2 ? '100%' : '0'}`, ...style }} />;
};

const editedText = (offer: OfferRecord): Record<string, string> => {
  try {
    const value = JSON.parse(String(offer.cardDesign?.customizations?.posterTextValues || '{}'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
};

const valuesFor = (offer: OfferRecord): Record<string, unknown> => ({
  ...(offer.cardDesign?.dynamicFields || {}),
  ...(offer.cardDesign?.customizations || {}),
  title: offer.title,
  description: offer.description || '',
  category: offer.category || '',
  businessName: offer.business?.name || '',
  business: offer.business,
  imageUrls: offer.imageUrls?.[0] || '',
  offerPrice: `₹${Number(offer.offerPrice || 0).toLocaleString('en-IN')}`,
  originalPrice: `₹${Number(offer.originalPrice || 0).toLocaleString('en-IN')}`,
  discount: `${Math.round(offer.discountPercentage || 0)}% OFF`,
  discountPercentage: `${Math.round(offer.discountPercentage || 0)}% OFF`,
});

const textFor = (element: TemplateElementRecord, values: Record<string, unknown>, edits: Record<string, string>) => {
  const field = element.field || element.key;
  if (typeof edits[element.id] === 'string') return resolveDynamicValue(edits[element.id], values);
  return resolveTemplateElementValue(element.content || element.text || '', field, values);
};

const renderElement = (offer: OfferRecord, element: TemplateElementRecord, values: Record<string, unknown>, edits: Record<string, string>) => {
  if (element.visible === false) return null;
  const field = element.field || element.key;
  const style: CSSProperties = {
    position: 'absolute',
    left: element.position?.x ?? element.x, top: element.position?.y ?? element.y,
    width: element.size?.width ?? element.width, height: element.size?.height ?? element.height,
    zIndex: element.zIndex ?? 1,
    opacity: element.opacity ?? 1,
    transform: `rotate(${element.rotation || 0}deg)`,
    borderRadius: element.borderRadius || 0,
    borderWidth: element.borderWidth || 0,
    borderColor: element.borderColor || 'transparent',
    borderStyle: element.borderStyle || 'solid',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };
  if (element.avatarId) return <div key={element.id} style={style}>{avatarSprite(element.avatarId, Math.max(1, Math.min(element.width, element.height)))}</div>;
  if (element.type === 'image') {
    const src = field === 'imageUrls' && offer.imageUrls?.[0]
      ? offer.imageUrls[0]
      : resolveTemplateImageValue(element.imageUrl || element.src || '', field, values);
    return src ? <img key={element.id} src={src} alt="" style={{ ...style, objectFit: element.resizeMode === 'stretch' ? 'fill' : element.resizeMode || 'contain' }} /> : null;
  }
  if (['shape', 'rectangle', 'circle', 'line', 'divider', 'group'].includes(element.type))
    return <div key={element.id} style={{ ...style, backgroundColor: element.backgroundColor || element.color || 'transparent' }} />;
  return <div key={element.id} style={{ ...style, display: 'flex', alignItems: element.textAlignVertical === 'top' ? 'flex-start' : element.textAlignVertical === 'bottom' ? 'flex-end' : 'center', justifyContent: element.textAlign === 'right' ? 'flex-end' : element.textAlign === 'center' ? 'center' : 'flex-start', color: element.color || '#fff', backgroundColor: element.backgroundColor === 'transparent' ? undefined : element.backgroundColor, fontSize: element.fontSize || 36, fontFamily: element.fontFamily, fontWeight: element.fontWeight as CSSProperties['fontWeight'], fontStyle: element.fontStyle, lineHeight: element.lineHeight ? (element.lineHeight <= 4 ? element.lineHeight : `${element.lineHeight}px`) : 1.1, letterSpacing: element.letterSpacing, textAlign: element.textAlign, textTransform: element.textTransform, textDecoration: element.textDecorationLine, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: '0 2px', textShadow: typeof element.style?.textShadow === 'string' ? element.style.textShadow : undefined }}>{textFor(element, values, edits)}</div>;
};

export const OfferPosterPreview = ({ offer, width, height }: { offer: OfferRecord; width: number; height: number }) => {
  const canvas = offer.cardDesign?.canvas;
  const photo = offer.imageUrls?.[0] || offer.cardDesign?.previewUrl;
  const frameStyle: CSSProperties = { width, height, flex: '0 0 auto' };
  if (offer.cardDesign?.templateId === 'poster-upload' && offer.imageUrls?.[0]) return <div className="flex items-center justify-center overflow-hidden rounded-lg bg-muted" style={frameStyle}><img src={offer.imageUrls[0]} alt={offer.title} className="h-full w-full object-contain" /></div>;
  if (!canvas || !Array.isArray(canvas.elements) || canvas.width <= 0 || canvas.height <= 0) return <div className="flex items-center justify-center overflow-hidden rounded-lg bg-muted" style={frameStyle}>{photo ? <img src={photo} alt={offer.title} className="h-full w-full object-contain" /> : <span className="px-2 text-center text-xs">No poster image</span>}</div>;

  const scale = Math.min(width / canvas.width, height / canvas.height);
  const fittedWidth = canvas.width * scale;
  const fittedHeight = canvas.height * scale;
  const background = canvas.background;
  const colors = background?.colors && background.colors.length >= 2 ? background.colors : [background?.from || canvas.backgroundColor || '#111827', background?.to || canvas.backgroundColor || '#374151'];
  const surfaceStyle: CSSProperties = {
    position: 'relative', width: canvas.width, height: canvas.height, flex: '0 0 auto',
    transform: `scale(${scale})`, transformOrigin: 'top left', overflow: 'hidden',
    backgroundColor: background?.color || canvas.backgroundColor || '#f4f4f4',
    backgroundImage: background?.type === 'gradient' || background?.type === 'linear-gradient' ? `linear-gradient(${colors.join(', ')})` : undefined,
  };
  const values = valuesFor(offer);
  const edits = editedText(offer);
  const backgroundImage = canvas.backgroundImageUrl || background?.imageUrl || (!canvas.elements.length ? offer.cardDesign?.previewUrl : '');
  const customAvatar = offer.cardDesign?.templateId === 'custom' && offer.cardDesign.avatarId
    ? avatarSprite(offer.cardDesign.avatarId, Math.max(72, Math.round(fittedWidth * 0.23)), {
        position: 'absolute', right: 12, bottom: 12, zIndex: 20,
        transform: `translate(${Number(offer.cardDesign.customizations?.avatarOffsetX || 0) * scale}px, ${Number(offer.cardDesign.customizations?.avatarOffsetY || 0) * scale}px)`,
      })
    : null;
  return <div className="flex items-center justify-center overflow-hidden rounded-lg bg-muted" style={frameStyle}>
    <div style={{ position: 'relative', width: fittedWidth, height: fittedHeight, flex: '0 0 auto' }}>
      <div style={surfaceStyle}>
        {backgroundImage && <img src={backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: background?.opacity ?? 1 }} />}
        {canvas.overlay?.color && <div className="absolute inset-0" style={{ backgroundColor: canvas.overlay.color, opacity: canvas.overlay.opacity ?? 0.25 }} />}
        {[...canvas.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((element) => renderElement(offer, element, values, edits))}
      </div>
      {customAvatar}
    </div>
  </div>;
};

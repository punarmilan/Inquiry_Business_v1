import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TemplateBuilder } from '@/components/hyperlocal/TemplateBuilder';
import { StickerCatalog } from '@/components/hyperlocal/StickerCatalog';
import { deleteTemplateAsset, uploadTemplateAsset } from '@/api/hyperlocal';
import { useCreateOfferTemplate, useDeleteOfferTemplate, useOfferTemplatesList, useUpdateOfferTemplate } from '@/hooks/useHyperlocal';
import type { OfferTemplateRecord, TemplateAssetRecord } from '@/api/hyperlocal';
import PRESET_TEMPLATES from '@/data/offer-template-presets.json';
import FOOD_TEMPLATE_PACK from '@/data/food-offer-template-pack.json';
import PROMO_TEMPLATE_PACK from '@/data/promo-offer-template-pack.json';
import LOCAL_BUSINESS_PACK from '@/data/local-business-36-template-pack.json';
import TEMPLATE_V2_EXAMPLE from '@/data/template-schema-v2.example.json';
import { getDynamicFieldName, resolveTemplateElementValue } from '@/utils/templateSchema';
import { assertPublishableTemplateJson, assertSupportedInputElementTypes, formatTemplateJson, getTemplateJsonEntries, insertAssetIntoTemplateJson, replaceTemplateAssetUrl } from '@/utils/offerTemplateJsonTools';
import { SectionCard } from '@/components/shared/SectionCard';
import { FormField } from '@/components/shared/FormField';
import { EmptyState } from '@/components/shared/EmptyState';
import { ActionButtons } from '@/components/shared/ActionButtons';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CheckCircle, Copy, PencilSimple, Plus, Upload, FileCode } from '@phosphor-icons/react';

const FIELD_OPTIONS = [
  { key: 'title', label: 'Offer title', type: 'text', defaultMax: 60 },
  { key: 'description', label: 'Description', type: 'text', defaultMax: 180 },
  { key: 'category', label: 'Category', type: 'text', defaultMax: 40 },
  { key: 'originalPrice', label: 'Original price', type: 'number', defaultMax: 20 },
  { key: 'offerPrice', label: 'Offer price', type: 'number', defaultMax: 20 },
  { key: 'imageUrls', label: 'Offer images', type: 'image', defaultMax: 1 },
  { key: 'startsAt', label: 'Start date', type: 'date', defaultMax: 30 },
  { key: 'expiresAt', label: 'Expiry date', type: 'date', defaultMax: 30 },
  { key: 'terms', label: 'Terms & conditions', type: 'text', defaultMax: 240 },
];

type TemplateForm = {
  name: string; slug: string; category: string; description: string; previewUrl: string;
  primaryColor: string; secondaryColor: string; layout: OfferTemplateRecord['layout']; avatarId: string;
  allowColorChange: boolean; allowLayoutChange: boolean; allowAvatarChange: boolean; isActive: boolean; sortOrder: string;
  fields: Record<string, { editable: boolean; required: boolean; maxLength: string; defaultValue: string }>;
};

const makeFields = (source?: any[]) => Object.fromEntries(FIELD_OPTIONS.map((option) => {
  const existing = source?.find((field: any) => field.key === option.key);
  return [option.key, {
    editable: existing?.editable ?? true,
    required: existing?.required ?? ['title', 'description', 'offerPrice'].includes(option.key),
    maxLength: String(existing?.maxLength ?? option.defaultMax),
    defaultValue: existing?.defaultValue ?? '',
  }];
})) as TemplateForm['fields'];

const initialForm: TemplateForm = {
  name: '', slug: '', category: 'Food', description: '', previewUrl: '', primaryColor: '#4F9FE8', secondaryColor: '#2167BD',
  layout: 'right', avatarId: 'avatar-01', allowColorChange: true, allowLayoutChange: true, allowAvatarChange: true, isActive: true, sortOrder: '0',
  fields: makeFields(),
};

const isJsonObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const readNumber = (source: Record<string, unknown>, keys: string[], fallback: number) => {
  for (const key of keys) if (isFiniteNumber(source[key])) return source[key];
  return fallback;
};
const readString = (source: Record<string, unknown>, keys: string[], fallback = '') => {
  for (const key of keys) if (typeof source[key] === 'string' && source[key].trim()) return source[key].trim();
  return fallback;
};
const readEnum = <T extends string>(source: Record<string, unknown>, keys: string[], values: readonly T[], fallback: T) => {
  const value = readString(source, keys);
  return (values as readonly string[]).includes(value) ? value as T : fallback;
};
const slugify = (value: string, fallback: string) => {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || fallback;
};
const validColor = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : fallback;
const validLayout = (value: unknown): TemplateForm['layout'] | null => ['right', 'left', 'bottom', 'center'].includes(String(value)) ? value as TemplateForm['layout'] : null;
const normalizeFieldKey = (value: string) => {
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, string> = {
    headline: 'title', title_text: 'title', body: 'description', subtitle: 'description',
    price: 'offerPrice', offer_price: 'offerPrice', sale_price: 'offerPrice', old_price: 'originalPrice', original_price: 'originalPrice', mrp: 'originalPrice',
    images: 'imageUrls', image: 'imageUrls', image_urls: 'imageUrls', photo: 'imageUrls', start_date: 'startsAt', starts_at: 'startsAt', end_date: 'expiresAt', expires_at: 'expiresAt',
    terms_and_conditions: 'terms',
  };
  const direct = ['title', 'description', 'category', 'originalPrice', 'offerPrice', 'imageUrls', 'startsAt', 'expiresAt', 'terms', 'phone', 'whatsapp', 'discount', 'discountPercentage', 'timing', 'buttonText', 'businessName', 'businessLogo', 'subtitle'];
  if (direct.includes(value)) return value;
  if (aliases[key]) return aliases[key];
  return /^[a-z][a-z0-9_.-]{0,59}$/i.test(value) ? value : undefined;
};

const TemplateCardPreview = ({ template }: { template: OfferTemplateRecord }) => {
  const canvas = template.canvas;
  if (!canvas) return <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${template.primaryColor}, ${template.secondaryColor})` }} />;
  const dynamicFields = { ...(template.editableFields || []).reduce<Record<string, unknown>>((values, field) => { if (field.defaultValue !== undefined) values[field.key] = field.defaultValue; return values; }, {}), ...(template.dynamicFields || {}) };
  const background = canvas.background;
  const gradientColors = background?.colors?.length && background.colors.length >= 2 ? background.colors : [background?.from || template.primaryColor, background?.to || template.secondaryColor];
  const backgroundStyle: React.CSSProperties = background?.type === 'gradient' || background?.type === 'linear-gradient'
    ? { backgroundImage: `linear-gradient(${background.angle !== undefined ? `${background.angle}deg` : background.direction || 'to bottom'}, ${gradientColors.join(', ')})` }
    : { backgroundColor: canvas.backgroundColor || background?.color || template.primaryColor };
  return <div className="absolute inset-0 overflow-hidden" style={{ ...backgroundStyle }}>
    {(canvas.backgroundImageUrl || background?.imageUrl) && <img src={canvas.backgroundImageUrl || background?.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
    {canvas.elements.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((element: any) => {
      const rawContent = element.content;
      const contentObject = isJsonObject(rawContent) ? rawContent : {};
      const field = element.field || element.key || (typeof contentObject.field === 'string' ? contentObject.field : undefined);
      const content = typeof rawContent === 'string' ? rawContent : typeof contentObject.text === 'string' ? contentObject.text : element.text || '';
      const rawImageUrl = typeof contentObject.src === 'string' ? contentObject.src : typeof contentObject.imageUrl === 'string' ? contentObject.imageUrl : undefined;
      const resolvedContent = resolveTemplateElementValue(content, field, dynamicFields);
      const resolvedImageUrl = resolveTemplateElementValue(element.imageUrl || element.src || rawImageUrl || '', field, dynamicFields);
      const x = element.position?.x ?? element.x;
      const y = element.position?.y ?? element.y;
      const width = element.size?.width ?? element.width;
      const height = element.size?.height ?? element.height;
      const style: React.CSSProperties = { position: 'absolute', left: `${x / canvas.width * 100}%`, top: `${y / canvas.height * 100}%`, width: `${width / canvas.width * 100}%`, height: `${height / canvas.height * 100}%`, zIndex: element.zIndex || 1, opacity: element.visible === false ? 0 : element.opacity ?? 1, transform: `rotate(${element.rotation || 0}deg)`, borderRadius: element.type === 'circle' ? '9999px' : element.borderRadius || 0, overflow: 'hidden' };
      if (element.type === 'image') return resolvedImageUrl && !/\{\{\s*[\w.-]+\s*\}\}/.test(resolvedImageUrl)
        ? <img key={element.id} src={resolvedImageUrl} alt="" className="object-contain" style={style} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        : <div key={element.id} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB', color: '#64748B', fontSize: 10 }}>Add image</div>;
      if (element.type === 'shape' || element.type === 'rectangle' || element.type === 'circle') return <div key={element.id} style={{ ...style, backgroundColor: element.backgroundColor || element.color || '#FFFFFF' }} />;
      if (element.type === 'divider' || element.type === 'line') return <div key={element.id} style={{ ...style, backgroundColor: element.backgroundColor || element.color || '#111827' }} />;
      return <div key={element.id} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: element.textAlign === 'left' ? 'flex-start' : element.textAlign === 'right' ? 'flex-end' : 'center', backgroundColor: ['button', 'badge'].includes(element.type) ? element.backgroundColor || '#FFC400' : element.backgroundColor === 'transparent' ? undefined : element.backgroundColor, color: element.color || '#FFFFFF', fontFamily: element.fontFamily, fontSize: `${Math.max(7, (element.fontSize || 42) * 0.11)}px`, fontWeight: element.fontWeight, lineHeight: element.lineHeight || 1.1, textAlign: element.textAlign, textTransform: element.textTransform, whiteSpace: 'pre-wrap' }}>{resolvedContent}</div>;
    })}
  </div>;
};

const normalizeTemplateImport = (value: unknown, index: number) => {
  if (!isJsonObject(value)) throw new Error(`Template ${index + 1} must be a JSON object.`);
  const source = value;
  const design = isJsonObject(source.design) ? source.design : {};
  const poster = isJsonObject(source.poster) ? source.poster : {};
  const visual = isJsonObject(source.visual) ? source.visual : {};
  const colors = isJsonObject(source.colors) ? source.colors : (isJsonObject(design.colors) ? design.colors : {});
  const dynamicFields = isJsonObject(source.dynamicFields) ? { ...source.dynamicFields } : isJsonObject(design.dynamicFields) ? { ...design.dynamicFields } : {};
  const sourceFieldEntries = Array.isArray(source.editableFields) ? source.editableFields : Array.isArray(source.fields) ? source.fields : [];
  sourceFieldEntries.forEach((entry: any) => {
    if (!isJsonObject(entry)) return;
    const key = readString(entry, ['key', 'name', 'id']);
    if (key && dynamicFields[key] === undefined && entry.defaultValue !== undefined) dynamicFields[key] = entry.defaultValue;
  });
  const rawCanvas = isJsonObject(source.canvas) ? source.canvas : isJsonObject(design.canvas) ? design.canvas : isJsonObject(poster.canvas) ? poster.canvas : isJsonObject(visual.canvas) ? visual.canvas : {};
  const rawElementsValue = rawCanvas.elements ?? rawCanvas.layers ?? design.elements ?? design.layers ?? poster.elements ?? source.elements ?? source.layers;
  const rawElements = Array.isArray(rawElementsValue) ? rawElementsValue : isJsonObject(rawElementsValue) ? Object.values(rawElementsValue) : [];
  const name = readString(source, ['name', 'templateName', 'template_name', 'title'], readString(design, ['name', 'templateName', 'template_name', 'title'], `JSON template ${index + 1}`));
  const dimensions = isJsonObject(source.dimensions) ? source.dimensions : isJsonObject(design.dimensions) ? design.dimensions : {};
  const canvasWidth = Math.min(10000, Math.max(1, readNumber(rawCanvas, ['width', 'canvasWidth', 'canvas_width'], readNumber(dimensions, ['width', 'canvasWidth', 'canvas_width'], readNumber(source, ['canvasWidth', 'canvas_width', 'width'], 1080)))));
  const canvasHeight = Math.min(10000, Math.max(1, readNumber(rawCanvas, ['height', 'canvasHeight', 'canvas_height'], readNumber(dimensions, ['height', 'canvasHeight', 'canvas_height'], readNumber(source, ['canvasHeight', 'canvas_height', 'height'], 1350)))));
  const primaryColor = validColor(source.primaryColor || source.primary_color || colors.primary || source.accentColor || colors.accent, '#4F9FE8');
  const secondaryColor = validColor(source.secondaryColor || source.secondary_color || colors.secondary, '#2167BD');
  const canvas = rawElements.length || rawCanvas.backgroundImageUrl || rawCanvas.background_image_url || source.backgroundImageUrl || source.background_image_url || source.backgroundImage
    ? {
      ...rawCanvas, width: canvasWidth, height: canvasHeight,
      backgroundColor: readString(rawCanvas, ['backgroundColor', 'background_color', 'background'], readString(source, ['backgroundColor', 'background_color', 'background'], primaryColor)),
      backgroundImageUrl: readString(rawCanvas, ['backgroundImageUrl', 'background_image_url', 'backgroundImage'], readString(source, ['backgroundImageUrl', 'background_image_url', 'backgroundImage'])),
      elements: rawElements.map((entry: any, elementIndex: number) => {
        if (!isJsonObject(entry)) throw new Error(`Template "${name}": element ${elementIndex + 1} must be an object.`);
        const style = isJsonObject(entry.style) ? entry.style : {};
        const position = isJsonObject(entry.position) ? entry.position : {};
        const frame = isJsonObject(entry.frame) ? entry.frame : {};
        const size = isJsonObject(entry.size) ? entry.size : {};
        const typeValue = readString(entry, ['type', 'kind', 'elementType', 'shape', 'assetType'], 'text').toLowerCase();
        const type = typeValue === 'rectangle' || typeValue === 'rect' ? 'rectangle' : typeValue === 'circle' || typeValue === 'ellipse' ? 'circle' : typeValue === 'line' ? 'line' : typeValue.includes('image') || typeValue.includes('photo') || typeValue.includes('picture') ? 'image' : typeValue.includes('shape') || typeValue.includes('background') ? 'shape' : typeValue.includes('button') || typeValue.includes('cta') ? 'button' : typeValue.includes('badge') || typeValue.includes('sticker') ? 'badge' : typeValue.includes('icon') ? 'icon' : typeValue.includes('divider') || typeValue.includes('separator') ? 'divider' : typeValue.includes('group') ? 'group' : 'text';
        const x = readNumber(entry, ['x', 'left'], readNumber(position, ['x', 'left'], readNumber(frame, ['x', 'left'], 0)));
        const y = readNumber(entry, ['y', 'top'], readNumber(position, ['y', 'top'], readNumber(frame, ['y', 'top'], 0)));
        const width = readNumber(entry, ['width', 'w'], readNumber(size, ['width', 'w'], readNumber(frame, ['width', 'w'], canvasWidth * 0.8)));
        const height = readNumber(entry, ['height', 'h'], readNumber(size, ['height', 'h'], readNumber(frame, ['height', 'h'], 80)));
        const safeX = Math.min(Math.max(0, x), Math.max(0, canvasWidth - 1));
        const safeY = Math.min(Math.max(0, y), Math.max(0, canvasHeight - 1));
        const safeWidth = Math.max(1, Math.min(width, canvasWidth - safeX));
        const safeHeight = Math.max(1, Math.min(height, canvasHeight - safeY));
        const contentObject = isJsonObject(entry.content) ? entry.content : {};
        const contentValue = typeof entry.content === 'string' ? entry.content : readString(contentObject, ['text', 'value', 'label']);
        const imageValue = readString(entry, ['imageUrl', 'image', 'src', 'url'], readString(contentObject, ['imageUrl', 'src', 'image', 'url'], ''));
        const binding = readString(entry, ['field', 'key', 'binding', 'bind'], readString(contentObject, ['field', 'key', 'binding', 'bind'], getDynamicFieldName(type === 'image' ? imageValue : contentValue) || getDynamicFieldName(type === 'image' ? contentValue : imageValue) || ''));
        const normalized = {
          ...entry, id: readString(entry, ['id', 'key', 'name'], `layer-${elementIndex + 1}`), type, key: binding, field: binding,
          text: contentValue, content: contentValue, imageUrl: imageValue, src: imageValue,
          x: safeX, y: safeY, width: safeWidth, height: safeHeight,
          position: { x: safeX, y: safeY }, size: { width: safeWidth, height: safeHeight },
          zIndex: isFiniteNumber(entry.zIndex) ? Math.round(entry.zIndex) : elementIndex,
          color: readString(entry, ['color', 'textColor'], readString(style, ['color', 'textColor'])),
          backgroundColor: readString(entry, ['backgroundColor', 'fill', 'background'], readString(style, ['backgroundColor', 'fill', 'background'])),
          fontSize: readNumber(entry, ['fontSize', 'size'], readNumber(style, ['fontSize', 'size'], 42)),
          fontWeight: readString(entry, ['fontWeight', 'weight'], readString(style, ['fontWeight', 'weight'], '700')),
          fontFamily: readString(entry, ['fontFamily', 'font'], readString(style, ['fontFamily', 'font'])),
          fontStyle: readEnum(entry, ['fontStyle'], ['normal', 'italic'], readEnum(style, ['fontStyle'], ['normal', 'italic'], 'normal')),
          letterSpacing: readNumber(entry, ['letterSpacing'], readNumber(style, ['letterSpacing'], 0)),
          lineHeight: readNumber(entry, ['lineHeight'], readNumber(style, ['lineHeight'], 0)),
          numberOfLines: Math.max(1, Math.round(readNumber(entry, ['numberOfLines', 'lines'], readNumber(style, ['numberOfLines', 'lines'], 1)))),
          textAlign: readEnum(entry, ['textAlign', 'align'], ['left', 'center', 'right'], readEnum(style, ['textAlign', 'align'], ['left', 'center', 'right'], 'left')),
          textAlignVertical: readEnum(entry, ['textAlignVertical', 'verticalAlign'], ['top', 'center', 'bottom'], readEnum(style, ['textAlignVertical', 'verticalAlign'], ['top', 'center', 'bottom'], 'center')),
          textDecorationLine: readEnum(entry, ['textDecorationLine', 'decoration'], ['none', 'underline', 'line-through', 'underline line-through'], readEnum(style, ['textDecorationLine', 'decoration'], ['none', 'underline', 'line-through', 'underline line-through'], 'none')),
          textTransform: readEnum(entry, ['textTransform', 'transformText'], ['none', 'uppercase', 'lowercase', 'capitalize'], readEnum(style, ['textTransform', 'transformText'], ['none', 'uppercase', 'lowercase', 'capitalize'], 'none')),
          borderRadius: readNumber(entry, ['borderRadius', 'radius'], readNumber(style, ['borderRadius', 'radius'], 0)),
          borderWidth: readNumber(entry, ['borderWidth'], readNumber(style, ['borderWidth'], 0)),
          borderColor: readString(entry, ['borderColor'], readString(style, ['borderColor'])),
          borderStyle: readEnum(entry, ['borderStyle'], ['solid', 'dotted', 'dashed'], readEnum(style, ['borderStyle'], ['solid', 'dotted', 'dashed'], 'solid')),
          rotation: readNumber(entry, ['rotation', 'rotate'], readNumber(style, ['rotation', 'rotate'], 0)),
          opacity: Math.min(1, Math.max(0, readNumber(entry, ['opacity'], readNumber(style, ['opacity'], 1)))),
          resizeMode: readEnum(entry, ['resizeMode', 'objectFit'], ['cover', 'contain', 'stretch'], readEnum(style, ['resizeMode', 'objectFit'], ['cover', 'contain', 'stretch'], 'contain')),
          visible: entry.visible !== false, locked: entry.locked === true, editable: typeof entry.editable === 'boolean' ? entry.editable : true,
        };
        if (!normalized.key) delete (normalized as any).key;
        if (!normalized.field) delete (normalized as any).field;
        if (!normalized.imageUrl) delete (normalized as any).imageUrl;
        if (!normalized.src) delete (normalized as any).src;
        if (!normalized.fontStyle) delete (normalized as any).fontStyle;
        if (!normalized.fontFamily) delete (normalized as any).fontFamily;
        if (!normalized.letterSpacing) delete (normalized as any).letterSpacing;
        if (!normalized.lineHeight) delete (normalized as any).lineHeight;
        if (!normalized.color) delete (normalized as any).color;
        if (!normalized.backgroundColor) delete (normalized as any).backgroundColor;
        if (!normalized.borderColor) delete (normalized as any).borderColor;
        return normalized;
      }),
    }
    : undefined;
  const layout = validLayout(source.layout || design.layout) || (canvasHeight > canvasWidth ? 'center' : 'right');
  const elementFields = canvas?.elements.flatMap((element: any) => {
    if (!isJsonObject(element)) return [];
    const content = isJsonObject(element.content) ? element.content : {};
    const field = readString(element, ['field', 'key', 'binding', 'bind'], readString(content, ['field', 'key', 'binding', 'bind']));
    const text = typeof element.content === 'string' ? element.content : readString(content, ['text', 'value', 'label']);
    const image = typeof element.src === 'string' ? element.src : readString(content, ['src', 'imageUrl', 'image', 'url']);
    const tokens = [text, image].flatMap((value) => [...value.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]{0,59})\s*\}\}/g)].map((match) => match[1]));
    return [field, ...tokens].filter(Boolean);
  }) || [];
  const rawFields = [
    ...(Array.isArray(source.editableFields) ? source.editableFields : Array.isArray(source.fields) ? source.fields : []),
    ...Object.entries(dynamicFields).map(([key, value]) => ({ key, defaultValue: value === null || value === undefined ? '' : String(value) })),
    ...elementFields.map((key) => ({ key })),
  ];
  const seenFieldKeys = new Set<string>();
  const editableFields = rawFields.map((entry: any, fieldIndex: number) => {
    if (!isJsonObject(entry)) throw new Error(`Template "${name}": field ${fieldIndex + 1} must be an object.`);
    const key = normalizeFieldKey(readString(entry, ['key', 'name', 'id'], ''));
    if (!key) return null;
    if (seenFieldKeys.has(key)) return null;
    seenFieldKeys.add(key);
    const type = readEnum(entry, ['type'], ['text', 'image', 'number', 'color', 'date', 'select'], 'text');
    const required = typeof entry.required === 'boolean' ? entry.required : false;
    return {
      key, label: readString(entry, ['label', 'name', 'key'], key), type,
      editable: typeof entry.editable === 'boolean' ? entry.editable : true,
      required, optional: typeof entry.optional === 'boolean' ? entry.optional : !required,
      maxLength: Math.min(5000, Math.max(1, Math.round(readNumber(entry, ['maxLength', 'maxChars'], 120)))),
      defaultValue: readString(entry, ['defaultValue', 'default'], ''),
      ...(Array.isArray(entry.options) ? { options: entry.options.filter((option: any): option is string => typeof option === 'string').map((option: string) => option.trim()).filter(Boolean).slice(0, 50) } : {}),
    };
  }).filter((field): field is NonNullable<typeof field> => Boolean(field)).slice(0, 30);
  const metadata = source.metadata !== undefined ? source.metadata : [source.tags, source.contrast, source.primaryFocus, source.secondaryFocus, source.accentColor].some((item: any) => item !== undefined)
    ? { ...(source.tags !== undefined ? { tags: source.tags } : {}), ...(source.contrast !== undefined ? { contrast: source.contrast } : {}), ...(source.primaryFocus !== undefined ? { primaryFocus: source.primaryFocus } : {}), ...(source.secondaryFocus !== undefined ? { secondaryFocus: source.secondaryFocus } : {}), ...(source.accentColor !== undefined ? { accentColor: source.accentColor } : {}) }
    : undefined;
  return {
    name, slug: slugify(readString(source, ['slug', 'templateId', 'template_id', 'id'], name), `json-template-${index + 1}`),
    category: readString(source, ['category', 'vertical', 'industry', 'categoryName', 'category_name'], 'General'),
    description: readString(source, ['description', 'summary', 'prompt']),
    previewUrl: readString(source, ['previewUrl', 'preview_url', 'previewImage', 'thumbnailUrl', 'thumbnail_url']),
    primaryColor, secondaryColor, layout, avatarId: readString(source, ['avatarId', 'avatar'], 'avatar-01'),
    dynamicFields, editableFields,
    allowColorChange: typeof source.allowColorChange === 'boolean' ? source.allowColorChange : true,
    allowLayoutChange: typeof source.allowLayoutChange === 'boolean' ? source.allowLayoutChange : true,
    allowAvatarChange: typeof source.allowAvatarChange === 'boolean' ? source.allowAvatarChange : true,
    isActive: typeof source.isActive === 'boolean' ? source.isActive : true,
    sortOrder: isFiniteNumber(source.sortOrder) ? Math.max(0, Math.round(source.sortOrder)) : index,
    ...(canvas ? { canvas } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  };
};

const MAX_ASSET_BYTES = 8_000_000;
const ASSET_MIME_BY_EXTENSION: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };
const readAsDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this image.')); reader.onerror = () => reject(new Error('Could not read this image.')); reader.readAsDataURL(blob); });
const loadBrowserImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not decode this SVG image.')); image.src = url; });
const prepareAssetUpload = async (file: File) => {
  if (!file.size || file.size > MAX_ASSET_BYTES) throw new Error('Asset must be smaller than 8 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = file.type.toLowerCase() || ASSET_MIME_BY_EXTENSION[extension] || '';
  if (!Object.values(ASSET_MIME_BY_EXTENSION).includes(mimeType)) throw new Error('Choose a PNG, JPG, JPEG, WEBP or SVG image.');
  if (mimeType !== 'image/svg+xml') { const normalizedBlob = file.type === mimeType ? file : new Blob([file], { type: mimeType }); return { dataUrl: await readAsDataUrl(normalizedBlob), name: file.name }; }
  const svg = await file.text();
  if (/<svg[\s>]/i.test(svg) && (/<script|<foreignObject|javascript:|\son\w+\s*=/i.test(svg))) throw new Error('This SVG contains unsupported or unsafe content.');
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = await loadBrowserImage(objectUrl);
    const sourceWidth = image.naturalWidth || 1080; const sourceHeight = image.naturalHeight || 1080;
    const scale = Math.min(1, 4096 / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(sourceWidth * scale)); canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d'); if (!context) throw new Error('SVG conversion is not available in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height); return { dataUrl: canvas.toDataURL('image/png'), name: file.name.replace(/\.svg$/i, '.png') };
  } finally { URL.revokeObjectURL(objectUrl); }
};
const parseAndNormalizeJsonTemplates = (input: string) => {
  const parsed = JSON.parse(input) as unknown;
  const entries = getTemplateJsonEntries(parsed);
  if (!entries.length || entries.some((entry) => !entry || typeof entry !== 'object')) throw new Error('JSON must contain a template object or an array of objects.');
  entries.forEach(assertSupportedInputElementTypes);
  const normalized = entries.map(normalizeTemplateImport);
  normalized.forEach(assertPublishableTemplateJson);
  return normalized;
};

export const OfferTemplatesPage = () => {
  const [form, setForm] = useState<TemplateForm>(initialForm);
  const [editing, setEditing] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderTemplate, setBuilderTemplate] = useState<OfferTemplateRecord | null>(null);
  const [asset, setAsset] = useState<TemplateAssetRecord | null>(null);
  const [assetUploading, setAssetUploading] = useState(false);
  const [jsonStatus, setJsonStatus] = useState<{ valid: boolean; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [showJsonImport, setShowJsonImport] = useState(false);
  const assetInputRef = useRef<HTMLInputElement>(null);
  const { data: templates, isLoading } = useOfferTemplatesList();
  const createTemplate = useCreateOfferTemplate();
  const updateTemplate = useUpdateOfferTemplate();
  const deleteTemplate = useDeleteOfferTemplate();

  const jsonPreviewResult = useMemo(() => {
    if (!jsonInput.trim()) return { templates: [] as OfferTemplateRecord[], error: '' };
    try { return { templates: parseAndNormalizeJsonTemplates(jsonInput) as OfferTemplateRecord[], error: '' }; }
    catch (error) { return { templates: [] as OfferTemplateRecord[], error: error instanceof Error ? error.message : 'Invalid template JSON.' }; }
  }, [jsonInput]);

  const fieldPayload = useMemo(() => FIELD_OPTIONS.map((option) => ({
    key: option.key, label: option.label, type: option.type,
    editable: form.fields[option.key].editable, required: form.fields[option.key].required,
    optional: !form.fields[option.key].required, maxLength: Number(form.fields[option.key].maxLength) || option.defaultMax,
    defaultValue: form.fields[option.key].defaultValue,
  })), [form.fields]);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));
  }, [templates, search]);

  const save = () => {
    if (!form.name.trim() || !form.slug.trim() || !form.category.trim()) { toast.error('Name and category are required.'); return; }
    const templateBase = Object.fromEntries(Object.entries(form).filter(([key]) => key !== 'fields'));
    const payload = { ...templateBase, sortOrder: Number(form.sortOrder) || 0, editableFields: fieldPayload };
    const options = {
      onSuccess: () => { toast.success('Template saved.'); setEditing(''); setForm(initialForm); },
      onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to save template.'),
    };
    if (editing) updateTemplate.mutate({ id: editing, payload }, options);
    else createTemplate.mutate(payload, options);
  };

  const edit = (template: OfferTemplateRecord) => { setBuilderTemplate(template); setBuilderOpen(true); };
  const saving = createTemplate.isPending || updateTemplate.isPending;
  const openBuilder = () => { setBuilderTemplate(null); setBuilderOpen(true); };
  const duplicateTemplate = (template: OfferTemplateRecord) => { setBuilderTemplate({ ...template, _id: '', name: `${template.name} Copy`, slug: `${template.slug}-copy`, version: 1 }); setBuilderOpen(true); };
  const toggleTemplate = (template: OfferTemplateRecord) => updateTemplate.mutate({ id: template._id, payload: { isActive: !template.isActive } }, { onSuccess: () => toast.success(template.isActive ? 'Template deactivated.' : 'Template activated.') });
  const saveBuilder = async (payload: Record<string, unknown>) => {
    if (builderTemplate?._id) await updateTemplate.mutateAsync({ id: builderTemplate._id, payload });
    else await createTemplate.mutateAsync(payload);
    toast.success(builderTemplate?._id ? 'Template updated and published.' : 'Template saved and published.');
    setBuilderOpen(false); setBuilderTemplate(null);
  };
  const uploadAsset = async (dataUrl: string, name: string) => uploadTemplateAsset(dataUrl, name);
  const handleAssetFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    const previousAsset = asset; setAssetUploading(true);
    try {
      const prepared = await prepareAssetUpload(file);
      const uploaded = await uploadTemplateAsset(prepared.dataUrl, prepared.name);
      if (previousAsset) { setJsonInput((current) => { try { return replaceTemplateAssetUrl(current, previousAsset.url, uploaded.url); } catch { return current; } }); await deleteTemplateAsset(previousAsset._id).catch(() => undefined); }
      setAsset(uploaded); toast.success(previousAsset ? 'Asset replaced.' : 'Asset uploaded.');
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || error?.message || 'Asset upload failed.'); }
    finally { setAssetUploading(false); }
  };
  const copyAssetUrl = async () => { if (!asset) return; try { await navigator.clipboard.writeText(asset.url); toast.success('Asset URL copied.'); } catch { toast.error('Could not copy the URL.'); } };
  const insertAsset = () => { if (!asset) return; try { setJsonInput((current) => insertAssetIntoTemplateJson(current, asset.url, TEMPLATE_V2_EXAMPLE)); setJsonStatus(null); toast.success('Editable image layer inserted into JSON.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not insert this asset.'); } };
  const removeAsset = async () => { if (!asset || !window.confirm('Delete this uploaded asset? Templates already published with this URL may lose the image.')) return; try { await deleteTemplateAsset(asset._id); setAsset(null); toast.success('Asset deleted.'); } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Could not delete this asset.'); } };
  const formatJson = () => { try { setJsonInput((current) => formatTemplateJson(current)); setJsonStatus({ valid: true, message: 'JSON formatted successfully.' }); } catch (error) { setJsonStatus({ valid: false, message: error instanceof Error ? error.message : 'Invalid JSON.' }); } };
  const validateJson = () => { try { const normalized = parseAndNormalizeJsonTemplates(jsonInput); setJsonStatus({ valid: true, message: `${normalized.length} template${normalized.length === 1 ? '' : 's'} valid and ready to publish.` }); } catch (error) { setJsonStatus({ valid: false, message: error instanceof Error ? error.message : 'Invalid template JSON.' }); } };
  const importJsonTemplates = async () => {
    try {
      const normalizedEntries = parseAndNormalizeJsonTemplates(jsonInput); setImporting(true);
      for (const entry of normalizedEntries) {
        const existing = templates?.find((template) => template.slug === entry.slug);
        if (existing) await updateTemplate.mutateAsync({ id: existing._id, payload: entry });
        else await createTemplate.mutateAsync(entry);
      }
      toast.success(`${normalizedEntries.length} template${normalizedEntries.length === 1 ? '' : 's'} published.`); setJsonInput(''); setShowJsonImport(false);
    } catch (error: any) { const detail = error.response?.data?.error?.details?.[0]?.message; toast.error(detail || error.response?.data?.error?.message || error.message || 'Invalid template JSON.'); }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Offer Templates"
        description="Create promotional poster templates with visual canvas editing."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowJsonImport(!showJsonImport)}>
              <FileCode className="h-4 w-4" /> {showJsonImport ? 'Close Import' : 'Import JSON'}
            </Button>
            <Button onClick={openBuilder}><Plus className="h-4 w-4" /> Create Template</Button>
          </div>
        }
      />

      {builderOpen && <TemplateBuilder template={builderTemplate} saving={saving} onClose={() => { setBuilderOpen(false); setBuilderTemplate(null); }} onSave={saveBuilder} onUploadAsset={uploadAsset} />}

      {showJsonImport && (
        <SectionCard title="Import Templates" description="Paste a template definition below. Publishing converts each entry into an active mobile template.">
          <div className="space-y-3">
            <textarea
              className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={jsonInput}
              onChange={(e) => { setJsonInput(e.target.value); setJsonStatus(null); }}
              placeholder={'[\n  { "name": "Weekend deal", "category": "Food", ... }\n]'}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { setJsonInput(JSON.stringify(TEMPLATE_V2_EXAMPLE, null, 2)); setJsonStatus(null); }}>Load Example</Button>
              <Button variant="outline" size="sm" onClick={() => { setJsonInput(JSON.stringify(FOOD_TEMPLATE_PACK, null, 2)); setJsonStatus(null); }}>Load Food Pack</Button>
              <Button variant="outline" size="sm" onClick={() => { setJsonInput(JSON.stringify(PROMO_TEMPLATE_PACK, null, 2)); setJsonStatus(null); }}>Load Promo Pack</Button>
              <Button variant="outline" size="sm" onClick={() => { setJsonInput(JSON.stringify(LOCAL_BUSINESS_PACK, null, 2)); setJsonStatus(null); }}>Load Business Pack</Button>
              <Button variant="outline" size="sm" onClick={() => { setJsonInput(JSON.stringify(PRESET_TEMPLATES, null, 2)); setJsonStatus(null); }}>Load Starter Pack</Button>
              <Button variant="outline" size="sm" onClick={formatJson} disabled={!jsonInput.trim()}>Format</Button>
              <Button variant="outline" size="sm" onClick={validateJson} disabled={!jsonInput.trim()}><CheckCircle className="h-4 w-4" /> Validate</Button>
              <Button size="sm" onClick={importJsonTemplates} disabled={importing || !jsonInput.trim()}>{importing ? 'Publishing…' : 'Import & Publish'}</Button>
            </div>
            {jsonStatus && (
              <p role="status" className={`rounded-md border px-3 py-2 text-sm ${jsonStatus.valid ? 'border-green-300 bg-green-50 text-green-800' : 'border-destructive/40 bg-destructive/5 text-destructive'}`}>{jsonStatus.message}</p>
            )}
            {jsonInput.trim() && jsonPreviewResult.templates[0] && (
              <div className="rounded-lg border p-3">
                <h4 className="text-sm font-semibold mb-2">Preview</h4>
                {jsonPreviewResult.error ? (
                  <p className="text-sm text-destructive">{jsonPreviewResult.error}</p>
                ) : (
                  <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
                    <TemplateCardPreview template={jsonPreviewResult.templates[0]} />
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Template Assets"
        collapsible
        defaultOpen={!!asset}
        description="Upload PNG, JPG, WEBP or SVG artwork."
        action={
          <input ref={assetInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleAssetFile} />
        }
      >
        {!asset ? (
          <Button variant="outline" onClick={() => assetInputRef.current?.click()} disabled={assetUploading}>
            <Upload className="h-4 w-4" /> {assetUploading ? 'Uploading…' : 'Upload Asset'}
          </Button>
        ) : (
          <div className="flex items-center gap-4">
            <img src={asset.url} alt={asset.name} className="h-16 w-16 rounded-lg border object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{asset.name}</p>
              <p className="text-xs text-muted-foreground">{asset.mimeType} · {(asset.size / 1024).toFixed(1)} KB</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyAssetUrl} className="h-8">Copy URL</Button>
              <Button size="sm" onClick={insertAsset} className="h-8"><Plus className="h-3.5 w-3.5" /> Insert</Button>
              <Button variant="outline" size="sm" onClick={() => assetInputRef.current?.click()} disabled={assetUploading} className="h-8">Replace</Button>
              <Button variant="destructive" size="sm" onClick={removeAsset} className="h-8">Delete</Button>
            </div>
          </div>
        )}
      </SectionCard>

      {!builderOpen && <StickerCatalog />}

      <SectionCard title="Templates" className="p-0">
        <div className="p-4 border-b">
          <SearchFilterBar searchValue={search} onSearchChange={setSearch} onClearSearch={() => setSearch('')} />
        </div>
        <div className="p-4">
          {isLoading ? (
            <EmptyState title="Loading templates…" />
          ) : filteredTemplates.length ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <div key={template._id} className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-all">
                  <div className="relative h-40 bg-muted overflow-hidden">
                    <TemplateCardPreview template={template} />
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent" />
                    <StatusBadge status={template.isActive ? 'active' : 'inactive'} className="absolute top-2 left-2" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold truncate text-sm">{template.name}</h4>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">{template.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{template.description || 'No description'}</p>
                    <p className="text-xs text-muted-foreground">{template.category} · {template.layout} layout</p>
                    <ActionButtons
                      actions={[
                        { label: 'Edit', onClick: () => edit(template), icon: <PencilSimple className="h-3.5 w-3.5" /> },
                        { label: 'Duplicate', onClick: () => duplicateTemplate(template), icon: <Copy className="h-3.5 w-3.5" /> },
                        {
                          label: template.isActive ? 'Deactivate' : 'Activate',
                          onClick: () => toggleTemplate(template),
                        },
                        {
                          label: 'Delete',
                          variant: 'destructive',
                          onClick: () => {
                            if (window.confirm('Delete this template? It will be deactivated and existing offers will be preserved.')) {
                              deleteTemplate.mutate(template._id, { onSuccess: () => toast.success('Template deleted.') });
                            }
                          },
                        },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Plus className="h-8 w-8" />}
              title="No templates yet"
              description={search ? 'No templates match your search.' : 'Create your first template using the button above.'}
            />
          )}
        </div>
      </SectionCard>

      <details className="rounded-lg border bg-card shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">Advanced Template Editor</summary>
        <div className="px-4 pb-4 space-y-4 border-t">
          <p className="text-xs text-muted-foreground pt-3">Use the visual builder for new templates. This form is for manual editing only.</p>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField label="Template Name" required>
                <Input value={form.name} placeholder="Weekend food deal" onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} />
              </FormField>
              <FormField label="URL Path" required>
                <Input value={form.slug} placeholder="weekend-food-deal" onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
              </FormField>
              <FormField label="Category" required>
                <Input value={form.category} placeholder="Food" onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Description">
              <textarea className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short guidance shown with the template." />
            </FormField>
            <div className="grid gap-3 md:grid-cols-4">
              <FormField label="Preview URL"><Input value={form.previewUrl} placeholder="https://..." onChange={(e) => setForm({ ...form, previewUrl: e.target.value })} /></FormField>
              <FormField label="Layout">
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.layout} onChange={(e) => setForm({ ...form, layout: e.target.value as any })}>
                  {[
                    ['right', 'Right-aligned'],
                    ['left', 'Left-aligned'],
                    ['bottom', 'Bottom-aligned'],
                    ['center', 'Centered'],
                  ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
              <FormField label="Primary Color"><input type="color" className="h-10 w-full rounded-md border border-input bg-background p-1" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} /></FormField>
              <FormField label="Secondary Color"><input type="color" className="h-10 w-full rounded-md border border-input bg-background p-1" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} /></FormField>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {([['allowColorChange', 'User can change colors'], ['allowLayoutChange', 'User can change layout'], ['allowAvatarChange', 'User can change avatar'], ['isActive', 'Template is active']] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 accent-primary" />{label}</label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Template'}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(''); setForm(initialForm); }}>Cancel</Button>}
            </div>
          </form>
        </div>
      </details>
    </div>
  );
};

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateBuilder } from '@/components/hyperlocal/TemplateBuilder';
import { StickerCatalog } from '@/components/hyperlocal/StickerCatalog';
import { deleteTemplateAsset, uploadTemplateAsset } from '@/api/hyperlocal';
import { useCreateOfferTemplate, useDeleteOfferTemplate, useOfferTemplatesList, useUpdateOfferTemplate } from '@/hooks/useHyperlocal';
import type { OfferTemplateRecord, TemplateAssetRecord, TemplateElementRecord, TemplateFieldRecord } from '@/api/hyperlocal';
import PRESET_TEMPLATES from '@/data/offer-template-presets.json';
import FOOD_TEMPLATE_PACK from '@/data/food-offer-template-pack.json';
import TEMPLATE_V2_EXAMPLE from '@/data/template-schema-v2.example.json';
import { getDynamicFieldName, resolveTemplateElementValue } from '@/utils/templateSchema';
import { assertPublishableTemplateJson, assertSupportedInputElementTypes, formatTemplateJson, getTemplateJsonEntries, insertAssetIntoTemplateJson, replaceTemplateAssetUrl } from '@/utils/offerTemplateJsonTools';
import { CheckCircle2, Copy, Plus, Trash2, Upload } from 'lucide-react';

const FIELD_OPTIONS: Array<{ key: string; label: string; type: TemplateFieldRecord['type']; defaultMax: number }> = [
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

const makeFields = (source?: TemplateFieldRecord[]) => Object.fromEntries(FIELD_OPTIONS.map((option) => {
  const existing = source?.find((field) => field.key === option.key);
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
  const aliases: Record<string, TemplateFieldRecord['key']> = {
    headline: 'title', title_text: 'title', body: 'description', subtitle: 'description',
    price: 'offerPrice', offer_price: 'offerPrice', sale_price: 'offerPrice', old_price: 'originalPrice', original_price: 'originalPrice', mrp: 'originalPrice',
    images: 'imageUrls', image: 'imageUrls', image_urls: 'imageUrls', photo: 'imageUrls', start_date: 'startsAt', starts_at: 'startsAt', end_date: 'expiresAt', expires_at: 'expiresAt',
    terms_and_conditions: 'terms',
  };
  const direct = ['title', 'description', 'category', 'originalPrice', 'offerPrice', 'imageUrls', 'startsAt', 'expiresAt', 'terms', 'phone', 'whatsapp', 'discount', 'discountPercentage', 'timing', 'buttonText', 'businessName', 'businessLogo', 'subtitle'];
  if (direct.includes(value)) return value as TemplateFieldRecord['key'];
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
    {canvas.elements.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((element: TemplateElementRecord) => {
      const rawContent = (element as unknown as Record<string, unknown>).content;
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
       return <div key={element.id} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: element.textAlign === 'left' ? 'flex-start' : element.textAlign === 'right' ? 'flex-end' : 'center', backgroundColor: ['button', 'badge'].includes(element.type) ? element.backgroundColor || '#FFC400' : element.backgroundColor === 'transparent' ? undefined : element.backgroundColor, color: element.color || '#FFFFFF', fontFamily: element.fontFamily, fontSize: `${Math.max(7, (element.fontSize || 42) * 0.11)}px`, fontWeight: element.fontWeight as React.CSSProperties['fontWeight'], lineHeight: element.lineHeight || 1.1, textAlign: element.textAlign, textTransform: element.textTransform, whiteSpace: 'pre-wrap' }}>{resolvedContent}</div>;
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
  sourceFieldEntries.forEach((entry) => {
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
      ...rawCanvas,
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: readString(rawCanvas, ['backgroundColor', 'background_color', 'background'], readString(source, ['backgroundColor', 'background_color', 'background'], primaryColor)),
      backgroundImageUrl: readString(rawCanvas, ['backgroundImageUrl', 'background_image_url', 'backgroundImage'], readString(source, ['backgroundImageUrl', 'background_image_url', 'backgroundImage'])),
      elements: rawElements.map((entry, elementIndex) => {
        if (!isJsonObject(entry)) throw new Error(`Template “${name}”: element ${elementIndex + 1} must be an object.`);
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
          ...entry,
          id: readString(entry, ['id', 'key', 'name'], `layer-${elementIndex + 1}`),
          type,
          key: binding,
          field: binding,
          text: contentValue,
          content: contentValue,
          imageUrl: imageValue,
          src: imageValue,
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
          visible: entry.visible !== false,
          locked: entry.locked === true,
          editable: typeof entry.editable === 'boolean' ? entry.editable : true,
        };
        if (!normalized.key) delete (normalized as Record<string, unknown>).key;
        if (!normalized.field) delete (normalized as Record<string, unknown>).field;
        if (!normalized.imageUrl) delete (normalized as Record<string, unknown>).imageUrl;
        if (!normalized.src) delete (normalized as Record<string, unknown>).src;
        if (!normalized.fontStyle) delete (normalized as Record<string, unknown>).fontStyle;
        if (!normalized.fontFamily) delete (normalized as Record<string, unknown>).fontFamily;
        if (!normalized.letterSpacing) delete (normalized as Record<string, unknown>).letterSpacing;
        if (!normalized.lineHeight) delete (normalized as Record<string, unknown>).lineHeight;
        if (!normalized.color) delete (normalized as Record<string, unknown>).color;
        if (!normalized.backgroundColor) delete (normalized as Record<string, unknown>).backgroundColor;
        if (!normalized.borderColor) delete (normalized as Record<string, unknown>).borderColor;
        return normalized;
      }),
    }
    : undefined;
  const layout = validLayout(source.layout || design.layout) || (canvasHeight > canvasWidth ? 'center' : 'right');
  const elementFields = canvas?.elements.flatMap((element) => {
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
  const editableFields = rawFields.map((entry, fieldIndex) => {
    if (!isJsonObject(entry)) throw new Error(`Template “${name}”: field ${fieldIndex + 1} must be an object.`);
    const key = normalizeFieldKey(readString(entry, ['key', 'name', 'id'], ''));
    if (!key) return null;
    if (seenFieldKeys.has(key)) return null;
    seenFieldKeys.add(key);
    const type = readEnum(entry, ['type'], ['text', 'image', 'number', 'color', 'date', 'select'], 'text');
    const required = typeof entry.required === 'boolean' ? entry.required : false;
    return {
      key,
      label: readString(entry, ['label', 'name', 'key'], key),
      type,
      editable: typeof entry.editable === 'boolean' ? entry.editable : true,
      required,
      optional: typeof entry.optional === 'boolean' ? entry.optional : !required,
      maxLength: Math.min(5000, Math.max(1, Math.round(readNumber(entry, ['maxLength', 'maxChars'], 120)))),
      defaultValue: readString(entry, ['defaultValue', 'default'], ''),
      ...(Array.isArray(entry.options) ? { options: entry.options.filter((option): option is string => typeof option === 'string').map((option) => option.trim()).filter(Boolean).slice(0, 50) } : {}),
    };
  }).filter((field): field is NonNullable<typeof field> => Boolean(field)).slice(0, 30);
  const metadata = source.metadata !== undefined ? source.metadata : [source.tags, source.contrast, source.primaryFocus, source.secondaryFocus, source.accentColor].some((item) => item !== undefined)
    ? {
      ...(source.tags !== undefined ? { tags: source.tags } : {}),
      ...(source.contrast !== undefined ? { contrast: source.contrast } : {}),
      ...(source.primaryFocus !== undefined ? { primaryFocus: source.primaryFocus } : {}),
      ...(source.secondaryFocus !== undefined ? { secondaryFocus: source.secondaryFocus } : {}),
      ...(source.accentColor !== undefined ? { accentColor: source.accentColor } : {}),
    }
    : undefined;
  return {
    name,
    slug: slugify(readString(source, ['slug', 'templateId', 'template_id', 'id'], name), `json-template-${index + 1}`),
    category: readString(source, ['category', 'vertical', 'industry', 'categoryName', 'category_name'], 'General'),
    description: readString(source, ['description', 'summary', 'prompt']),
    previewUrl: readString(source, ['previewUrl', 'preview_url', 'previewImage', 'thumbnailUrl', 'thumbnail_url']),
    primaryColor,
    secondaryColor,
    layout,
    avatarId: readString(source, ['avatarId', 'avatar'], 'avatar-01'),
    dynamicFields,
    editableFields,
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
const ASSET_MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml',
};

const readAsDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this image.'));
  reader.onerror = () => reject(new Error('Could not read this image.'));
  reader.readAsDataURL(blob);
});

const loadBrowserImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not decode this SVG image.'));
  image.src = url;
});

const prepareAssetUpload = async (file: File) => {
  if (!file.size || file.size > MAX_ASSET_BYTES) throw new Error('Asset must be smaller than 8 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = file.type.toLowerCase() || ASSET_MIME_BY_EXTENSION[extension] || '';
  if (!Object.values(ASSET_MIME_BY_EXTENSION).includes(mimeType)) throw new Error('Choose a PNG, JPG, JPEG, WEBP or SVG image.');

  if (mimeType !== 'image/svg+xml') {
    const normalizedBlob = file.type === mimeType ? file : new Blob([file], { type: mimeType });
    return { dataUrl: await readAsDataUrl(normalizedBlob), name: file.name };
  }

  const svg = await file.text();
  if (!/<svg[\s>]/i.test(svg) || /<script|<foreignObject|javascript:|\son\w+\s*=/i.test(svg)) {
    throw new Error('This SVG contains unsupported or unsafe content.');
  }
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = await loadBrowserImage(objectUrl);
    const sourceWidth = image.naturalWidth || 1080;
    const sourceHeight = image.naturalHeight || 1080;
    const scale = Math.min(1, 4096 / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('SVG conversion is not available in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/png'), name: file.name.replace(/\.svg$/i, '.png') };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const parseAndNormalizeJsonTemplates = (input: string) => {
  const parsed = JSON.parse(input) as unknown;
  const entries = getTemplateJsonEntries(parsed);
  if (!entries.length || entries.some((entry) => !entry || typeof entry !== 'object')) {
    throw new Error('JSON must contain a template object or an array of objects.');
  }
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
  const assetInputRef = useRef<HTMLInputElement>(null);
  const { data: templates, isLoading } = useOfferTemplatesList();
  const createTemplate = useCreateOfferTemplate();
  const updateTemplate = useUpdateOfferTemplate();
  const deleteTemplate = useDeleteOfferTemplate();

  const jsonPreview = useMemo(() => {
    if (!jsonInput.trim()) return { templates: [] as OfferTemplateRecord[], error: '' };
    try {
      return { templates: parseAndNormalizeJsonTemplates(jsonInput) as OfferTemplateRecord[], error: '' };
    } catch (error) {
      return { templates: [] as OfferTemplateRecord[], error: error instanceof Error ? error.message : 'Invalid template JSON.' };
    }
  }, [jsonInput]);

  const fieldPayload = useMemo(() => FIELD_OPTIONS.map((option) => ({
    key: option.key,
    label: option.label,
    type: option.type,
    editable: form.fields[option.key].editable,
    required: form.fields[option.key].required,
    optional: !form.fields[option.key].required,
    maxLength: Number(form.fields[option.key].maxLength) || option.defaultMax,
    defaultValue: form.fields[option.key].defaultValue,
  })), [form.fields]);

  const save = () => {
    if (!form.name.trim() || !form.slug.trim() || !form.category.trim()) {
      toast.error('Name, slug and category are required.');
      return;
    }
    const templateBase = Object.fromEntries(Object.entries(form).filter(([key]) => key !== 'fields'));
    const payload = { ...templateBase, sortOrder: Number(form.sortOrder) || 0, editableFields: fieldPayload };
    const options = {
      onSuccess: () => { toast.success('Template saved.'); setEditing(''); setForm(initialForm); },
      onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to save template.'),
    };
    if (editing) updateTemplate.mutate({ id: editing, payload }, options);
    else createTemplate.mutate(payload, options);
  };

  const edit = (template: OfferTemplateRecord) => {
    setBuilderTemplate(template);
    setBuilderOpen(true);
  };

  const saving = createTemplate.isPending || updateTemplate.isPending;
  const openBuilder = () => { setBuilderTemplate(null); setBuilderOpen(true); };
  const duplicateTemplate = (template: OfferTemplateRecord) => {
    setBuilderTemplate({ ...template, _id: '', name: `${template.name} Copy`, slug: `${template.slug}-copy`, version: 1 });
    setBuilderOpen(true);
  };
  const toggleTemplate = (template: OfferTemplateRecord) => updateTemplate.mutate({ id: template._id, payload: { isActive: !template.isActive } }, { onSuccess: () => toast.success(template.isActive ? 'Template deactivated.' : 'Template activated.') });
  const saveBuilder = async (payload: Record<string, unknown>) => {
    if (builderTemplate?._id) await updateTemplate.mutateAsync({ id: builderTemplate._id, payload });
    else await createTemplate.mutateAsync(payload);
    toast.success(builderTemplate?._id ? 'Template updated and published.' : 'Template saved and published.');
    setBuilderOpen(false);
    setBuilderTemplate(null);
  };
  const uploadAsset = async (dataUrl: string, name: string) => uploadTemplateAsset(dataUrl, name);
  const handleAssetFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const previousAsset = asset;
    setAssetUploading(true);
    try {
      const prepared = await prepareAssetUpload(file);
      const uploaded = await uploadTemplateAsset(prepared.dataUrl, prepared.name);
      if (previousAsset) {
        setJsonInput((current) => {
          try { return replaceTemplateAssetUrl(current, previousAsset.url, uploaded.url); }
          catch { return current; }
        });
        await deleteTemplateAsset(previousAsset._id).catch(() => undefined);
      }
      setAsset(uploaded);
      toast.success(previousAsset ? 'Asset replaced.' : 'Asset uploaded.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.message || 'Asset upload failed.');
    } finally {
      setAssetUploading(false);
    }
  };
  const copyAssetUrl = async () => {
    if (!asset) return;
    try {
      await navigator.clipboard.writeText(asset.url);
      toast.success('Asset URL copied.');
    } catch {
      toast.error('Could not copy the URL. Select it and copy manually.');
    }
  };
  const insertAsset = () => {
    if (!asset) return;
    try {
      setJsonInput((current) => insertAssetIntoTemplateJson(current, asset.url, TEMPLATE_V2_EXAMPLE));
      setJsonStatus(null);
      toast.success('Editable image layer inserted into JSON.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not insert this asset.');
    }
  };
  const removeAsset = async () => {
    if (!asset || !window.confirm('Delete this uploaded asset? Templates already published with this URL may lose the image.')) return;
    try {
      await deleteTemplateAsset(asset._id);
      setAsset(null);
      toast.success('Asset deleted.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Could not delete this asset.');
    }
  };
  const formatJson = () => {
    try {
      setJsonInput((current) => formatTemplateJson(current));
      setJsonStatus({ valid: true, message: 'JSON formatted successfully.' });
    } catch (error) {
      setJsonStatus({ valid: false, message: error instanceof Error ? error.message : 'Invalid JSON.' });
    }
  };
  const validateJson = () => {
    try {
      const normalized = parseAndNormalizeJsonTemplates(jsonInput);
      setJsonStatus({ valid: true, message: `${normalized.length} template${normalized.length === 1 ? '' : 's'} valid and ready to preview/publish.` });
    } catch (error) {
      setJsonStatus({ valid: false, message: error instanceof Error ? error.message : 'Invalid template JSON.' });
    }
  };
  const importJsonTemplates = async () => {
    try {
      const normalizedEntries = parseAndNormalizeJsonTemplates(jsonInput);
      setImporting(true);
      for (const entry of normalizedEntries) {
        const existing = templates?.find((template) => template.slug === entry.slug);
        if (existing) await updateTemplate.mutateAsync({ id: existing._id, payload: entry });
        else await createTemplate.mutateAsync(entry);
      }
      toast.success(`${normalizedEntries.length} template${normalizedEntries.length === 1 ? '' : 's'} published.`);
      setJsonInput('');
    } catch (error: any) {
      const validationDetail = error.response?.data?.error?.details?.[0]?.message;
      toast.error(validationDetail || error.response?.data?.error?.message || error.message || 'Invalid template JSON.');
    } finally {
      setImporting(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Offer Templates" description="Create independent promotional posters with a visual canvas and reusable dynamic fields." actions={<Button onClick={openBuilder}><Plus className="h-4 w-4" /> Create template</Button>} />
      {builderOpen && <TemplateBuilder template={builderTemplate} saving={saving} onClose={() => { setBuilderOpen(false); setBuilderTemplate(null); }} onSave={saveBuilder} onUploadAsset={uploadAsset} />}
      <Card>
        <CardHeader><CardTitle>Template assets</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Upload PNG, JPG, JPEG, WEBP or SVG artwork to Cloudinary and get its secure public URL. SVG files are safely converted to PNG before upload.</p>
          <input ref={assetInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleAssetFile} />
          {!asset ? (
            <Button variant="outline" onClick={() => assetInputRef.current?.click()} disabled={assetUploading}><Upload className="h-4 w-4" /> {assetUploading ? 'Uploading…' : 'Upload asset'}</Button>
          ) : (
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 p-2"><img src={asset.url} alt={asset.name} className="max-h-full max-w-full object-contain" /></div>
              <div className="min-w-0 space-y-3">
                <div><p className="text-sm font-medium">{asset.name}</p><p className="text-xs text-muted-foreground">{asset.mimeType} · {(asset.size / 1024).toFixed(1)} KB</p></div>
                <label className="block text-xs font-medium">Cloudinary secure URL<Input readOnly value={asset.url} className="mt-1 font-mono text-xs" onFocus={(event) => event.currentTarget.select()} /></label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={copyAssetUrl}><Copy className="h-3.5 w-3.5" /> Copy URL</Button>
                  <Button size="sm" onClick={insertAsset}><Plus className="h-3.5 w-3.5" /> Insert into JSON</Button>
                  <Button variant="outline" size="sm" onClick={() => assetInputRef.current?.click()} disabled={assetUploading}><Upload className="h-3.5 w-3.5" /> {assetUploading ? 'Replacing…' : 'Replace'}</Button>
                  <Button variant="destructive" size="sm" onClick={removeAsset}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Publish templates from JSON</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Paste one template object or an array. Publishing converts each JSON definition into an active mobile template.</p>
          <textarea className="min-h-44 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs" value={jsonInput} onChange={(e) => { setJsonInput(e.target.value); setJsonStatus(null); }} placeholder={'[\n  { "name": "Weekend food deal", "slug": "weekend-food-deal", ... }\n]'} />
          <p className="text-xs text-muted-foreground"><code>canvas.elements</code> supports text, image, shape, button, badge, icon, divider and group layers. Set <code>editable: true</code> for mobile editing; use <code>field</code> or <code>key</code> to bind live offer data.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setJsonInput(JSON.stringify(TEMPLATE_V2_EXAMPLE, null, 2)); setJsonStatus(null); }}>Load v2 example</Button>
            <Button variant="outline" onClick={() => { setJsonInput(JSON.stringify(FOOD_TEMPLATE_PACK, null, 2)); setJsonStatus(null); }}>Load 10 Food pack</Button>
            <Button variant="outline" onClick={() => { setJsonInput(JSON.stringify(PRESET_TEMPLATES, null, 2)); setJsonStatus(null); }}>Load legacy starters</Button>
            <Button variant="outline" onClick={formatJson} disabled={!jsonInput.trim()}>Format JSON</Button>
            <Button variant="outline" onClick={validateJson} disabled={!jsonInput.trim()}><CheckCircle2 className="h-4 w-4" /> Validate JSON</Button>
            <Button onClick={importJsonTemplates} disabled={importing || !jsonInput.trim()}>{importing ? 'Publishing…' : 'Convert JSON & publish'}</Button>
          </div>
          {jsonStatus && <p role="status" className={`rounded-md border px-3 py-2 text-sm ${jsonStatus.valid ? 'border-green-300 bg-green-50 text-green-800' : 'border-destructive/40 bg-destructive/5 text-destructive'}`}>{jsonStatus.message}</p>}
          {jsonInput.trim() && <div className="space-y-2 rounded-lg border p-3">
            <div><h3 className="text-sm font-semibold">Live preview</h3><p className="text-xs text-muted-foreground">Previewing the first template from the current JSON{jsonPreview.templates.length > 1 ? ` (${jsonPreview.templates.length} templates loaded)` : ''}.</p></div>
            {jsonPreview.error ? <p className="rounded-md bg-destructive/5 p-3 text-sm text-destructive">{jsonPreview.error}</p> : jsonPreview.templates[0] ? <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-lg border bg-muted"><TemplateCardPreview template={jsonPreview.templates[0]} /></div> : null}
          </div>}
          <p className="text-xs text-muted-foreground">Professional Food pack: 10 unique 1080×1350 layouts with editable layers, dynamic offer fields and replaceable image URLs. Existing legacy starters remain available.</p>
        </CardContent>
      </Card>
      {!builderOpen && <StickerCatalog />}
      {!builderOpen && <details className="rounded-xl border bg-card shadow-sm">
        <summary className="cursor-pointer list-none px-6 py-4 text-sm font-semibold">Advanced form fallback <span className="ml-2 text-xs font-normal text-muted-foreground">Use the visual builder for new layouts</span></summary>
      <Card className="rounded-t-none border-x-0 border-b-0 shadow-none">
        <CardHeader><CardTitle>{editing ? 'Edit template' : 'Add admin template'}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm font-medium">Template name<Input value={form.name} placeholder="Weekend food deal" onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} /></label>
            <label className="space-y-2 text-sm font-medium">Slug<Input value={form.slug} placeholder="weekend-food-deal" onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /></label>
            <label className="space-y-2 text-sm font-medium">Category<Input value={form.category} placeholder="Food" onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
            <label className="space-y-2 text-sm font-medium md:col-span-3">Description<textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short guidance shown with the template." /></label>
            <label className="space-y-2 text-sm font-medium">Preview URL<input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal" value={form.previewUrl} onChange={(e) => setForm({ ...form, previewUrl: e.target.value })} placeholder="https://..." /></label>
            <label className="space-y-2 text-sm font-medium">Avatar ID<Input value={form.avatarId} onChange={(e) => setForm({ ...form, avatarId: e.target.value })} placeholder="avatar-01" /></label>
            <label className="space-y-2 text-sm font-medium">Display order<Input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></label>
            <label className="space-y-2 text-sm font-medium">Layout<select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal" value={form.layout} onChange={(e) => setForm({ ...form, layout: e.target.value as TemplateForm['layout'] })}>{['right', 'left', 'bottom', 'center'].map((layout) => <option key={layout}>{layout}</option>)}</select></label>
            <label className="space-y-2 text-sm font-medium">Primary color<input type="color" className="h-10 w-full rounded-md border border-input bg-background p-1" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} /></label>
            <label className="space-y-2 text-sm font-medium">Secondary color<input type="color" className="h-10 w-full rounded-md border border-input bg-background p-1" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} /></label>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-lg border bg-muted/30 p-4">
            {([['allowColorChange', 'User can change colors'], ['allowLayoutChange', 'User can change layout'], ['allowAvatarChange', 'User can change avatar'], ['isActive', 'Template is active']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />{label}</label>)}
          </div>
          <div className="space-y-3">
            <div><h3 className="text-sm font-semibold">Editable fields</h3><p className="text-xs text-muted-foreground">Lock a field when every offer should keep the template default or the first saved value.</p></div>
            <div className="grid gap-3 md:grid-cols-2">
              {FIELD_OPTIONS.map((option) => <div key={option.key} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{option.label}</span><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.fields[option.key].editable} onChange={(e) => setForm({ ...form, fields: { ...form.fields, [option.key]: { ...form.fields[option.key], editable: e.target.checked } } })} />Editable</label></div><div className="mt-3 flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.fields[option.key].required} onChange={(e) => setForm({ ...form, fields: { ...form.fields, [option.key]: { ...form.fields[option.key], required: e.target.checked } } })} />Required</label><label className="flex items-center gap-2 text-xs">Max chars<input className="h-8 w-20 rounded-md border border-input bg-background px-2 text-xs" type="number" min="1" value={form.fields[option.key].maxLength} onChange={(e) => setForm({ ...form, fields: { ...form.fields, [option.key]: { ...form.fields[option.key], maxLength: e.target.value } } })} /></label></div><input className="mt-3 h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={form.fields[option.key].defaultValue} onChange={(e) => setForm({ ...form, fields: { ...form.fields, [option.key]: { ...form.fields[option.key], defaultValue: e.target.value } } })} placeholder="Optional default value" /></div>)}
            </div>
          </div>
          <div className="flex gap-2"><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save template'}</Button>{editing && <Button variant="outline" onClick={() => { setEditing(''); setForm(initialForm); }}>Cancel</Button>}</div>
        </CardContent>
      </Card>
      </details>}
      {!builderOpen && templates?.length ? <Card><CardHeader className="pb-3"><CardTitle className="text-base">Template actions</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{templates.map((template) => <div key={template._id} className="flex items-center gap-1 rounded-md border bg-background px-2 py-1"><span className="max-w-40 truncate text-xs font-medium">{template.name}</span><Button variant="ghost" size="icon" onClick={() => duplicateTemplate(template)} title="Duplicate template"><Copy className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="sm" onClick={() => toggleTemplate(template)}>{template.isActive ? 'Deactivate' : 'Activate'}</Button></div>)}</CardContent></Card> : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading templates…</p> : templates?.map((template) => <Card key={template._id} className="overflow-hidden"><div className="relative h-48 bg-muted"><TemplateCardPreview template={template} /><div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" /></div><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle>{template.name}</CardTitle><span className="rounded-full bg-muted px-2 py-1 text-xs">v{template.version}</span></div><p className="text-xs text-muted-foreground">{template.category} · {template.layout} · {template.isActive ? 'Active' : 'Inactive'}</p></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{template.description || 'No description'}</p><p className="text-xs text-muted-foreground">{template.canvas?.elements?.length || 0} layers · {template.editableFields.filter((field) => field.editable).length} editable fields</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => edit(template)}>Edit</Button>{template.isActive && <><Button variant="outline" size="sm" onClick={() => { if (window.confirm('Deactivate this template? It can be activated again later.')) toggleTemplate(template); }}>Deactivate</Button><Button variant="destructive" size="sm" onClick={() => { if (window.confirm('Delete this template? It will be deactivated and existing offers will be preserved.')) deleteTemplate.mutate(template._id, { onSuccess: () => toast.success('Template deleted.') }); }}>Delete</Button></>}</div></CardContent></Card>)}
      </div>
    </div>
  );
};

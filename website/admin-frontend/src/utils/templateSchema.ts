import type { TemplateCanvasBackground, TemplateElementRecord, TemplateElementType } from '@/api/hyperlocal';

export const TEMPLATE_SCHEMA_VERSION = 2;

export const TEMPLATE_ELEMENT_TYPES: TemplateElementType[] = [
  'text', 'image', 'shape', 'rectangle', 'circle', 'line', 'button', 'badge', 'icon', 'divider', 'group',
];

type JsonRecord = Record<string, unknown>;
export type DynamicFields = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const readNested = (source: JsonRecord, key: string): JsonRecord => isRecord(source[key]) ? source[key] : {};

const getContentObject = (source: JsonRecord): JsonRecord => isRecord(source.content) ? source.content : {};

const getElementType = (value: unknown): TemplateElementType => {
  const normalized = String(value || 'text').trim().toLowerCase();
  if (normalized === 'rect' || normalized === 'rectangle') return 'rectangle';
  if (normalized === 'circle' || normalized === 'ellipse') return 'circle';
  if (normalized === 'line') return 'line';
  if (normalized === 'photo' || normalized === 'picture') return 'image';
  if (normalized === 'cta') return 'button';
  if (normalized === 'sticker') return 'badge';
  if (normalized === 'separator') return 'divider';
  return TEMPLATE_ELEMENT_TYPES.includes(normalized as TemplateElementType) ? normalized as TemplateElementType : 'text';
};

const finiteOr = (source: JsonRecord, keys: string[], fallback: number) => {
  for (const key of keys) if (isFiniteNumber(source[key])) return source[key];
  return fallback;
};

const stringOr = (source: JsonRecord, keys: string[], fallback = '') => {
  for (const key of keys) if (typeof source[key] === 'string' && source[key].trim()) return source[key] as string;
  return fallback;
};

const dynamicToken = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Returns the first dynamic binding found in a value, including mixed text. */
export const getDynamicFieldName = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const match = dynamicToken.exec(value);
  dynamicToken.lastIndex = 0;
  return match?.[1];
};

const hasOwn = (source: DynamicFields, key: string) => Object.prototype.hasOwnProperty.call(source, key);

/** Resolves exact and embedded {{tokens}} without mutating the template definition. */
export const resolveDynamicValue = (value: unknown, dynamicFields: DynamicFields): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((item) => resolveDynamicValue(item, dynamicFields)).filter(Boolean).join(', ');
  if (typeof value !== 'string') return String(value);
  return value.replace(dynamicToken, (token, path: string) => {
    const result = path.split('.').reduce<unknown>((current, key) => isRecord(current) ? current[key] : undefined, dynamicFields);
    return result === undefined || result === null ? token : resolveDynamicValue(result, dynamicFields);
  });
};

/** Applies an explicit element binding when legacy JSON stores static starter copy. */
export const resolveTemplateElementValue = (value: unknown, field: string | undefined, dynamicFields: DynamicFields): string => {
  const embeddedField = getDynamicFieldName(value);
  const boundValue = field ? dynamicFields[field] : undefined;
  if (field && !embeddedField && hasOwn(dynamicFields, field) && boundValue !== undefined && boundValue !== null && boundValue !== '') {
    return resolveDynamicValue(`{{${field}}}`, dynamicFields);
  }
  return resolveDynamicValue(value, dynamicFields);
};

export const cloneDynamicFields = (value: unknown): DynamicFields => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Array.isArray(item) ? [...item] : item]));
};

/**
 * Converts v2 nested geometry and the older flat geometry into the one runtime
 * shape used by the admin canvas and by the mobile renderer.
 */
export const normalizeTemplateElement = (
  raw: unknown,
  index: number,
  canvasWidth = 1080,
  canvasHeight = 1350,
): TemplateElementRecord => {
  const source = isRecord(raw) ? raw : {};
  const style = readNested(source, 'style');
  const position = readNested(source, 'position');
  const frame = readNested(source, 'frame');
  const size = readNested(source, 'size');
  const contentObject = getContentObject(source);
  const type = getElementType(source.type ?? source.kind ?? source.elementType);

  const x = clamp(finiteOr(source, ['x', 'left'], finiteOr(position, ['x', 'left'], finiteOr(frame, ['x', 'left'], canvasWidth * 0.1))), 0, canvasWidth);
  const y = clamp(finiteOr(source, ['y', 'top'], finiteOr(position, ['y', 'top'], finiteOr(frame, ['y', 'top'], canvasHeight * 0.1 + index * 80))), 0, canvasHeight);
  const width = clamp(Math.max(1, finiteOr(source, ['width', 'w'], finiteOr(size, ['width', 'w'], finiteOr(frame, ['width', 'w'], type === 'divider' || type === 'line' ? 700 : 420)))), 1, canvasWidth);
  const height = clamp(Math.max(1, finiteOr(source, ['height', 'h'], finiteOr(size, ['height', 'h'], finiteOr(frame, ['height', 'h'], type === 'divider' || type === 'line' ? 8 : type === 'badge' ? 180 : 120)))), 1, canvasHeight);
  const content = typeof source.content === 'string'
    ? source.content
    : stringOr(contentObject, ['text', 'value', 'label'], stringOr(source, ['text', 'value', 'label'], ''));
  const imageUrl = stringOr(source, ['imageUrl', 'src', 'image', 'url'], stringOr(contentObject, ['imageUrl', 'src', 'image', 'url']));
  const explicitField = stringOr(source, ['field', 'key', 'binding', 'bind'], stringOr(contentObject, ['field', 'key', 'binding', 'bind']));
  const field = explicitField || getDynamicFieldName(type === 'image' ? imageUrl : content) || getDynamicFieldName(type === 'image' ? content : imageUrl);
  const fontStyle = stringOr(source, ['fontStyle'], stringOr(style, ['fontStyle'], 'normal')) === 'italic' ? 'italic' : 'normal';
  const textAlign = stringOr(source, ['textAlign', 'align'], stringOr(style, ['textAlign', 'align'], 'center'));
  const textTransform = stringOr(source, ['textTransform', 'transformText'], stringOr(style, ['textTransform', 'transformText'], 'none'));
  const resizeMode = stringOr(source, ['resizeMode', 'objectFit'], stringOr(style, ['resizeMode', 'objectFit'], 'contain'));

  const boundedWidth = Math.max(1, Math.min(width, Math.max(1, canvasWidth - x)));
  const boundedHeight = Math.max(1, Math.min(height, Math.max(1, canvasHeight - y)));
  return {
    ...source,
    id: stringOr(source, ['id', 'name'], `layer-${index + 1}`),
    type,
    ...(field ? { field, key: field } : {}),
    ...(content || type !== 'image' ? { text: content, content } : {}),
    ...(imageUrl ? { imageUrl, src: imageUrl } : {}),
    x,
    y,
    width: boundedWidth,
    height: boundedHeight,
    position: { x, y },
    size: { width: boundedWidth, height: boundedHeight },
    rotation: finiteOr(source, ['rotation', 'rotate'], finiteOr(style, ['rotation', 'rotate'], 0)),
    zIndex: Math.round(finiteOr(source, ['zIndex'], index + 1)),
    visible: source.visible !== false,
    locked: source.locked === true,
    editable: typeof source.editable === 'boolean' ? source.editable : true,
    color: stringOr(source, ['color', 'textColor'], stringOr(style, ['color', 'textColor'], type === 'shape' || type === 'rectangle' || type === 'circle' ? '#FFC400' : '#FFFFFF')),
    backgroundColor: stringOr(source, ['backgroundColor', 'fill', 'background'], stringOr(style, ['backgroundColor', 'fill', 'background'], type === 'button' || type === 'badge' ? '#FFC400' : 'transparent')),
    fontFamily: stringOr(source, ['fontFamily', 'font'], stringOr(style, ['fontFamily', 'font'], 'Inter')),
    fontSize: Math.max(1, finiteOr(source, ['fontSize', 'size'], finiteOr(style, ['fontSize', 'size'], type === 'text' ? 64 : 30))),
    fontWeight: stringOr(source, ['fontWeight', 'weight'], stringOr(style, ['fontWeight', 'weight'], '700')),
    fontStyle,
    letterSpacing: finiteOr(source, ['letterSpacing'], finiteOr(style, ['letterSpacing'], 0)),
    lineHeight: finiteOr(source, ['lineHeight'], finiteOr(style, ['lineHeight'], 0)),
    numberOfLines: Math.max(1, Math.round(finiteOr(source, ['numberOfLines', 'lines'], finiteOr(style, ['numberOfLines', 'lines'], 1)))),
    textAlign: (['left', 'center', 'right'].includes(textAlign) ? textAlign : 'center') as 'left' | 'center' | 'right',
    textTransform: (['none', 'uppercase', 'lowercase', 'capitalize'].includes(textTransform) ? textTransform : 'none') as 'none' | 'uppercase' | 'lowercase' | 'capitalize',
    borderRadius: Math.max(0, finiteOr(source, ['borderRadius', 'radius'], finiteOr(style, ['borderRadius', 'radius'], type === 'circle' ? 999 : type === 'badge' ? 999 : type === 'button' ? 18 : 0))),
    borderWidth: Math.max(0, finiteOr(source, ['borderWidth'], finiteOr(style, ['borderWidth'], 0))),
    borderColor: stringOr(source, ['borderColor'], stringOr(style, ['borderColor'], '#111827')),
    opacity: clamp(finiteOr(source, ['opacity'], finiteOr(style, ['opacity'], 1)), 0, 1),
    resizeMode: (['cover', 'contain', 'stretch'].includes(resizeMode) ? resizeMode : 'contain') as 'cover' | 'contain' | 'stretch',
    style,
  };
};

const clean = (value: JsonRecord) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));

const canonicalStyle = (element: TemplateElementRecord) => clean({
  ...(element.style || {}),
  color: element.color,
  backgroundColor: element.backgroundColor,
  fontFamily: element.fontFamily,
  fontSize: element.fontSize,
  fontWeight: element.fontWeight,
  fontStyle: element.fontStyle,
  letterSpacing: element.letterSpacing,
  lineHeight: element.lineHeight && element.lineHeight > 0 ? element.lineHeight : undefined,
  numberOfLines: element.numberOfLines,
  textAlign: element.textAlign,
  textAlignVertical: element.textAlignVertical,
  textDecorationLine: element.textDecorationLine,
  textTransform: element.textTransform,
  borderRadius: element.borderRadius,
  borderWidth: element.borderWidth,
  borderColor: element.borderColor,
  borderStyle: element.borderStyle,
  objectFit: element.resizeMode,
});

/** Produces the portable v2 element shape used by JSON export. */
export const toCanonicalTemplateElement = (element: TemplateElementRecord): JsonRecord => {
  const x = isFiniteNumber(element.position?.x) ? element.position.x : element.x;
  const y = isFiniteNumber(element.position?.y) ? element.position.y : element.y;
  const width = isFiniteNumber(element.size?.width) ? element.size.width : element.width;
  const height = isFiniteNumber(element.size?.height) ? element.size.height : element.height;
  const field = element.field || element.key;
  const imageUrl = element.imageUrl || element.src;
  const content: JsonRecord = {
    ...(element.type === 'image' ? (imageUrl ? { src: imageUrl } : {}) : { text: element.content ?? element.text ?? '' }),
    ...(field ? { field } : {}),
  };
  return clean({
    id: element.id,
    type: element.type,
    position: { x, y },
    size: { width, height },
    rotation: element.rotation ?? 0,
    zIndex: element.zIndex ?? 0,
    opacity: element.opacity ?? 1,
    visible: element.visible !== false,
    locked: element.locked === true,
    editable: element.editable !== false,
    style: canonicalStyle(element),
    content,
  });
};

/** Produces the API/mobile-compatible element while retaining v2 geometry. */
export const toApiTemplateElement = (element: TemplateElementRecord): JsonRecord => clean({
  ...element,
  position: { x: element.x, y: element.y },
  size: { width: element.width, height: element.height },
  field: element.field || element.key || undefined,
  key: element.field || element.key || undefined,
  text: element.content ?? element.text ?? '',
  content: element.content ?? element.text ?? '',
  src: element.src || element.imageUrl || undefined,
  imageUrl: element.imageUrl || element.src || undefined,
  style: canonicalStyle(element),
});

export const toCanonicalBackground = (
  background: TemplateCanvasBackground | undefined,
  fallbackPrimary: string,
  fallbackSecondary: string,
): JsonRecord => {
  const source = background || {};
  const colors = Array.isArray(source.colors) && source.colors.length >= 2
    ? source.colors.filter((color): color is string => typeof color === 'string')
    : [source.from || fallbackPrimary, source.to || fallbackSecondary];
  if (source.type === 'gradient' || source.type === 'linear-gradient') {
    return clean({ type: 'linear-gradient', angle: source.angle ?? 135, colors, opacity: source.opacity });
  }
  return clean({ ...source, type: source.type || 'solid', color: source.color || fallbackPrimary });
};

// Backwards-compatible name for callers outside the builder.
export const resolveTemplateValue = resolveDynamicValue;

export const collectTemplateBindings = (elements: TemplateElementRecord[]) => {
  const bindings = new Set<string>();
  elements.forEach((element) => {
    const field = element.field || element.key;
    if (field) bindings.add(field);
    [element.content, element.text, element.imageUrl, element.src].forEach((value) => {
      if (typeof value !== 'string') return;
      for (const match of value.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)) bindings.add(match[1]);
    });
  });
  return [...bindings];
};

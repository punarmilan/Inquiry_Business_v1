import type { ImageSourcePropType } from 'react-native';

export type OfferCardDesign = {
  templateId: string;
  templateVersion?: number;
  templateSource?: 'admin' | 'system' | 'custom';
  previewUrl?: string;
  canvas?: OfferTemplateCanvas;
  avatarId: string;
  primaryColor: string;
  secondaryColor: string;
  layout: OfferCardLayout;
  customizations?: Record<string, string | number | boolean>;
  titleFontSize?: number;
  descriptionFontSize?: number;
  fontWeight?: '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
};

export type OfferCardLayout = 'right' | 'left' | 'bottom' | 'center';

export type OfferTemplateElement = {
  id: string;
  type: 'text' | 'image' | 'shape' | 'rectangle' | 'circle' | 'line' | 'button' | 'badge' | 'icon' | 'divider' | 'group';
  key?: string;
  field?: string;
  text?: string;
  content?: string;
  imageUrl?: string;
  src?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  visible?: boolean;
  locked?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  letterSpacing?: number;
  lineHeight?: number;
  numberOfLines?: number;
  textAlign?: 'left' | 'center' | 'right';
  textAlignVertical?: 'top' | 'center' | 'bottom';
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dotted' | 'dashed';
  rotation?: number;
  opacity?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch';
  editable?: boolean;
  style?: Record<string, unknown>;
};

export type OfferTemplateCanvas = {
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  background?: { type?: 'solid' | 'gradient' | 'linear-gradient' | 'image' | 'texture'; color?: string; from?: string; to?: string; direction?: string; angle?: number; colors?: string[]; imageUrl?: string; opacity?: number; overlayColor?: string; overlayOpacity?: number };
  overlay?: { color?: string; opacity?: number };
  elements: OfferTemplateElement[];
};

export type OfferCardTemplate = {
  id: string;
  name: string;
  category?: string;
  defaultAvatarId?: string;
  primaryColor: string;
  secondaryColor: string;
  layout: OfferCardLayout;
  description?: string;
  previewUrl?: string;
  canvas?: OfferTemplateCanvas;
  editableFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'image' | 'number' | 'color' | 'date' | 'select';
    editable: boolean;
    required: boolean;
    optional: boolean;
    maxLength: number;
    options?: string[];
    defaultValue?: string;
  }>;
  allowColorChange?: boolean;
  allowLayoutChange?: boolean;
  allowAvatarChange?: boolean;
  version?: number;
  source?: 'admin' | 'system';
};

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Accepts canonical v2 JSON and legacy API templates at the mobile boundary. */
export const normalizeOfferTemplateCanvas = (canvas?: OfferTemplateCanvas): OfferTemplateCanvas | undefined => {
  if (!canvas) return undefined;
  const rawCanvas = canvas as unknown as Record<string, unknown>;
  const width = Math.max(1, finite(rawCanvas.width, 1080));
  const height = Math.max(1, finite(rawCanvas.height, 1350));
  const rawElements = Array.isArray(rawCanvas.elements) ? rawCanvas.elements : [];
  const elements = rawElements.map((raw, index) => {
    const source = isObject(raw) ? raw : {};
    const position = isObject(source.position) ? source.position : {};
    const size = isObject(source.size) ? source.size : {};
    const content = isObject(source.content) ? source.content : {};
    const x = Math.max(0, finite(source.x, finite(position.x, 0)));
    const y = Math.max(0, finite(source.y, finite(position.y, 0)));
    const elementWidth = Math.max(1, finite(source.width, finite(size.width, width * 0.8)));
    const elementHeight = Math.max(1, finite(source.height, finite(size.height, 80)));
    const field = typeof source.field === 'string' ? source.field : typeof source.key === 'string' ? source.key : typeof content.field === 'string' ? content.field : undefined;
    const imageUrl = typeof source.imageUrl === 'string' ? source.imageUrl : typeof source.src === 'string' ? source.src : typeof content.src === 'string' ? content.src : undefined;
    const text = typeof source.content === 'string' ? source.content : typeof source.text === 'string' ? source.text : typeof content.text === 'string' ? content.text : '';
    return {
      ...(source as unknown as OfferTemplateElement),
      id: typeof source.id === 'string' && source.id ? source.id : `layer-${index + 1}`,
      type: (typeof source.type === 'string' ? source.type : 'text') as OfferTemplateElement['type'],
      ...(field ? { field, key: field } : {}),
      ...(imageUrl ? { imageUrl, src: imageUrl } : {}),
      content: text,
      text,
      x,
      y,
      width: elementWidth,
      height: elementHeight,
      position: { x, y },
      size: { width: elementWidth, height: elementHeight },
    };
  });
  return { ...(canvas as OfferTemplateCanvas), width, height, elements };
};

export type OfferAvatar = {
  id: string;
  name: string;
  source: ImageSourcePropType;
  row: 0 | 1;
  column: 0 | 1;
};

const templateDefinitions: Array<[string, string, string, string, OfferCardTemplate['layout']]> = [
  ['party-pink', 'Party Pink', '#D66CAB', '#A73E81', 'right'],
  ['sunset-coral', 'Sunset Coral', '#FF8B6A', '#E74E4E', 'bottom'],
  ['royal-purple', 'Royal Purple', '#9B6CE5', '#5B3AAB', 'center'],
  ['ocean-blue', 'Ocean Blue', '#4F9FE8', '#2167BD', 'left'],
  ['mint-fresh', 'Mint Fresh', '#52C59B', '#167C63', 'right'],
  ['golden-hour', 'Golden Hour', '#F5B84D', '#DE6D24', 'bottom'],
  ['berry-pop', 'Berry Pop', '#D75B87', '#812858', 'center'],
  ['skyline', 'Skyline', '#67B6DD', '#23639E', 'left'],
  ['orchid-glow', 'Orchid Glow', '#C686D8', '#78449B', 'right'],
  ['lime-punch', 'Lime Punch', '#A8CF58', '#497D35', 'bottom'],
  ['midnight', 'Midnight', '#4B587C', '#1F2845', 'center'],
  ['terracotta', 'Terracotta', '#E48162', '#A54232', 'left'],
  ['rose-cloud', 'Rose Cloud', '#E99FB6', '#B94C79', 'right'],
  ['indigo-night', 'Indigo Night', '#6B79CF', '#303879', 'bottom'],
  ['teal-tide', 'Teal Tide', '#50BFB9', '#14756F', 'center'],
  ['mango-splash', 'Mango Splash', '#F7BE55', '#E37B21', 'left'],
  ['plum-vibe', 'Plum Vibe', '#A75D97', '#5E2C5D', 'right'],
  ['cherry-red', 'Cherry Red', '#E45A62', '#A52D3A', 'bottom'],
  ['ice-blue', 'Ice Blue', '#8BCDEB', '#3B789D', 'center'],
  ['forest', 'Forest', '#6DAD76', '#2F6B46', 'left'],
  ['lavender', 'Lavender', '#AB9BE8', '#6858AC', 'right'],
  ['peach-glow', 'Peach Glow', '#F2A479', '#CE594D', 'bottom'],
  ['coffee', 'Coffee', '#A97B67', '#614137', 'center'],
  ['neon-night', 'Neon Night', '#6863C7', '#2C2B69', 'left'],
];

const SYSTEM_COLOR_TEMPLATES: OfferCardTemplate[] = templateDefinitions.map(([id, name, primaryColor, secondaryColor, layout]) => ({
  id,
  name,
  source: 'system',
  primaryColor,
  secondaryColor,
  layout,
}));

// Bundled starter templates keep the picker useful even before an admin has
// published remote templates. Once remote templates are available they appear
// first, while these remain a safe offline fallback.
const BUNDLED_APP_TEMPLATES: OfferCardTemplate[] = [
  ['starter-food-pizza', 'Pizza Weekend', 'Food', '#F97316', '#B91C1C', 'right', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80'],
  ['starter-food-cafe', 'Cafe Happy Hours', 'Food', '#A16207', '#713F12', 'bottom', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80'],
  ['starter-food-family', 'Family Dining', 'Food', '#0F766E', '#134E4A', 'center', 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80'],
  ['starter-food-dessert', 'Dessert Drop', 'Food', '#DB2777', '#831843', 'left', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80'],
  ['starter-shopping-fashion', 'Fashion Edit', 'Shopping', '#7C3AED', '#312E81', 'right', 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80'],
  ['starter-shopping-store', 'Big Store Savings', 'Shopping', '#2563EB', '#1E3A8A', 'bottom', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80'],
  ['starter-shopping-accessories', 'Accessory Spotlight', 'Shopping', '#0891B2', '#164E63', 'left', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80'],
  ['starter-hotels-escape', 'Hotel Escape', 'Hotels', '#0369A1', '#0C4A6E', 'right', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80'],
  ['starter-hotels-pool', 'Poolside Stay', 'Hotels', '#14B8A6', '#115E59', 'bottom', 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=900&q=80'],
  ['starter-hotels-boutique', 'Boutique Hotel', 'Hotels', '#9333EA', '#581C87', 'center', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=80'],
  ['starter-hotels-flash', 'Hotel Flash Deal', 'Hotels', '#DC2626', '#7F1D1D', 'left', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80'],
].map(([id, name, category, primaryColor, secondaryColor, layout, previewUrl]) => ({
  id, name, category, primaryColor, secondaryColor, layout: layout as OfferCardLayout, previewUrl, source: 'system' as const,
}));

export const OFFER_CARD_TEMPLATES: OfferCardTemplate[] = [...SYSTEM_COLOR_TEMPLATES, ...BUNDLED_APP_TEMPLATES];

const avatarSheets = [
  require('../../assets/offer-avatars/avatars-01-v2.png'),
  require('../../assets/offer-avatars/avatars-02-v2.png'),
  require('../../assets/offer-avatars/avatars-03-v2.png'),
  require('../../assets/offer-avatars/avatars-04-v2.png'),
  require('../../assets/offer-avatars/avatars-05-v2.png'),
] as ImageSourcePropType[];

export const OFFER_AVATARS: OfferAvatar[] = avatarSheets.flatMap((source, sheetIndex) =>
  [0, 1, 2, 3].map((slot) => ({
    id: `avatar-${String(sheetIndex * 4 + slot + 1).padStart(2, '0')}`,
    name: `Avatar ${sheetIndex * 4 + slot + 1}`,
    source,
    row: (slot < 2 ? 0 : 1) as 0 | 1,
    column: (slot % 2) as 0 | 1,
  }))
);

export const OFFER_CARD_COLORS = [
  ['#D66CAB', '#A73E81'], ['#FF8B6A', '#E74E4E'], ['#9B6CE5', '#5B3AAB'], ['#4F9FE8', '#2167BD'],
  ['#52C59B', '#167C63'], ['#F5B84D', '#DE6D24'], ['#D75B87', '#812858'], ['#67B6DD', '#23639E'],
  ['#E99FB6', '#B94C79'], ['#6B79CF', '#303879'], ['#50BFB9', '#14756F'], ['#A97B67', '#614137'],
] as const;

export const DEFAULT_OFFER_CARD_DESIGN: OfferCardDesign = {
  templateId: OFFER_CARD_TEMPLATES[0].id,
  avatarId: OFFER_AVATARS[0].id,
  primaryColor: OFFER_CARD_TEMPLATES[0].primaryColor,
  secondaryColor: OFFER_CARD_TEMPLATES[0].secondaryColor,
  layout: OFFER_CARD_TEMPLATES[0].layout,
  titleFontSize: 30,
  descriptionFontSize: 16,
  fontWeight: '900',
  fontStyle: 'normal',
  textAlign: 'left',
};

export const toOfferCardTemplate = (template: {
  _id: string;
  name: string;
  category: string;
  description?: string;
  previewUrl?: string;
  canvas?: OfferTemplateCanvas;
  primaryColor: string;
  secondaryColor: string;
  layout: OfferCardLayout;
  avatarId: string;
  editableFields?: OfferCardTemplate['editableFields'];
  allowColorChange?: boolean;
  allowLayoutChange?: boolean;
  allowAvatarChange?: boolean;
  version?: number;
}): OfferCardTemplate => ({
  id: template._id,
  name: template.name,
  category: template.category,
  defaultAvatarId: template.avatarId,
  primaryColor: template.primaryColor,
  secondaryColor: template.secondaryColor,
  layout: template.layout,
  description: template.description,
  previewUrl: template.previewUrl,
  canvas: normalizeOfferTemplateCanvas(template.canvas),
  editableFields: template.editableFields,
  allowColorChange: template.allowColorChange,
  allowLayoutChange: template.allowLayoutChange,
  allowAvatarChange: template.allowAvatarChange,
  version: template.version,
  source: 'admin',
});

export const findOfferAvatar = (id?: string) => OFFER_AVATARS.find((avatar) => avatar.id === id) || OFFER_AVATARS[0];
export const findOfferTemplate = (id?: string) => OFFER_CARD_TEMPLATES.find((template) => template.id === id) || OFFER_CARD_TEMPLATES[0];
export const resolveOfferCardLayout = (design?: Partial<OfferCardDesign>): OfferCardLayout => design?.layout || findOfferTemplate(design?.templateId).layout;

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Badge as BadgeIcon,
  BringToFront,
  Copy,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Layers3,
  Lock,
  Minus,
  Move,
  Palette,
  Pencil,
  Plus,
  Redo2,
  Save,
  Scissors,
  SendToBack,
  Shapes,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  OfferTemplateRecord,
  TemplateCanvasBackground,
  TemplateElementRecord,
  TemplateElementType,
  TemplateFieldRecord,
} from '@/api/hyperlocal';
import {
  collectTemplateBindings,
  normalizeTemplateElement,
  resolveTemplateValue,
  toApiTemplateElement,
  toCanonicalBackground,
  toCanonicalTemplateElement,
  TEMPLATE_SCHEMA_VERSION,
} from '@/utils/templateSchema';

export type TemplateBuilderProps = {
  template?: OfferTemplateRecord | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onUploadAsset?: (dataUrl: string, name: string) => Promise<{ url: string }>;
};

type BuilderDocument = {
  name: string;
  slug: string;
  category: string;
  description: string;
  previewUrl: string;
  primaryColor: string;
  secondaryColor: string;
  layout: OfferTemplateRecord['layout'];
  avatarId: string;
  allowColorChange: boolean;
  allowLayoutChange: boolean;
  allowAvatarChange: boolean;
  isActive: boolean;
  sortOrder: number;
  metadata?: unknown;
  editableFields: TemplateFieldRecord[];
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    backgroundImageUrl?: string;
    background?: TemplateCanvasBackground;
    overlay?: { color?: string; opacity?: number };
    elements: TemplateElementRecord[];
  };
};

type Interaction = {
  id: string;
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  element: TemplateElementRecord;
};

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const ELEMENT_TYPES: Array<{ type: TemplateElementType; label: string; icon: typeof Type }> = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'image', label: 'Image', icon: ImageIcon },
  { type: 'shape', label: 'Shape', icon: Shapes },
  { type: 'rectangle', label: 'Rectangle', icon: Shapes },
  { type: 'circle', label: 'Circle', icon: Shapes },
  { type: 'line', label: 'Line', icon: Minus },
  { type: 'button', label: 'Button', icon: Scissors },
  { type: 'badge', label: 'Badge', icon: BadgeIcon },
  { type: 'icon', label: 'Icon', icon: Palette },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'group', label: 'Group', icon: Layers3 },
];
const FONT_OPTIONS = ['Inter', 'Arial', 'Roboto', 'Montserrat', 'Poppins', 'Anton', 'Bebas Neue', 'Oswald', 'Impact', 'Pacifico', 'Playfair Display', 'cursive'];
const DYNAMIC_FIELDS = [
  { value: '', label: 'Static content' },
  { value: 'title', label: 'Offer title' },
  { value: 'description', label: 'Description' },
  { value: 'category', label: 'Category' },
  { value: 'originalPrice', label: 'Original price' },
  { value: 'offerPrice', label: 'Offer price' },
  { value: 'discount', label: 'Discount' },
  { value: 'imageUrls', label: 'Offer image' },
  { value: 'startsAt', label: 'Start date' },
  { value: 'expiresAt', label: 'Expiry date' },
  { value: 'timing', label: 'Timing' },
  { value: 'terms', label: 'Terms' },
  { value: 'buttonText', label: 'Button text' },
  { value: 'businessName', label: 'Business name' },
  { value: 'businessLogo', label: 'Business logo' },
  { value: 'subtitle', label: 'Subtitle' },
];
const PREVIEW_VALUES: Record<string, string> = {
  title: 'DELICIOUS BURGER', description: 'Fresh, hot and made for sharing', category: 'FOOD', originalPrice: '₹299', offerPrice: '₹149',
  discount: '50% OFF', startsAt: 'Today', expiresAt: 'This weekend', timing: '09:00 AM - 09:00 PM', terms: 'Terms apply', buttonText: 'ORDER NOW',
  businessName: 'AnyWork Kitchen', subtitle: 'SPECIAL MENU',
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-template';
const colorValue = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
const normalizeElement = (raw: unknown, index: number, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) => normalizeTemplateElement(raw, index, width, height);

const fromTemplate = (template?: OfferTemplateRecord | null): BuilderDocument => {
  const sourceCanvas = template?.canvas;
  const sourceBackground = sourceCanvas?.background;
  const width = sourceCanvas?.width || CANVAS_WIDTH;
  const height = sourceCanvas?.height || CANVAS_HEIGHT;
  const elements = sourceCanvas?.elements?.map((element, index) => normalizeElement(element, index, width, height)) || [];
  const backgroundColor = sourceCanvas?.backgroundColor || sourceBackground?.color || template?.primaryColor || '#F5E9D5';
  return {
    name: template?.name || 'New promotional template', slug: template?.slug || 'new-promotional-template', category: template?.category || 'Food',
    description: template?.description || '', previewUrl: template?.previewUrl || '', primaryColor: template?.primaryColor || '#F97316', secondaryColor: template?.secondaryColor || '#B91C1C',
    layout: template?.layout || 'center', avatarId: template?.avatarId || 'avatar-01', allowColorChange: template?.allowColorChange ?? true,
    allowLayoutChange: template?.allowLayoutChange ?? true, allowAvatarChange: template?.allowAvatarChange ?? true, isActive: template?.isActive ?? true,
    sortOrder: template?.sortOrder || 0, metadata: template?.metadata, editableFields: template?.editableFields || [],
    canvas: { width, height, backgroundColor, backgroundImageUrl: sourceCanvas?.backgroundImageUrl || sourceBackground?.imageUrl, background: sourceBackground || { type: 'solid', color: backgroundColor }, overlay: sourceCanvas?.overlay, elements },
  };
};

const toPayload = (document: BuilderDocument) => {
  const usedFields = new Set(collectTemplateBindings(document.canvas.elements));
  const existing = new Map(document.editableFields.map((field) => [field.key, field]));
  const editableFields = [...usedFields].map((key) => existing.get(key) || ({ key, label: DYNAMIC_FIELDS.find((item) => item.value === key)?.label || key, type: /image|logo/i.test(key) ? 'image' : /price|discount/i.test(key) ? 'number' : 'text', editable: true, required: false, optional: true, maxLength: 5000, defaultValue: '' } as TemplateFieldRecord));
  const elements = document.canvas.elements.map(toApiTemplateElement);
  const width = Math.max(1, Math.min(10000, Math.round(document.canvas.width)));
  const height = Math.max(1, Math.min(10000, Math.round(document.canvas.height)));
  return {
    name: document.name.trim(), slug: slugify(document.slug), category: document.category.trim() || 'General', description: document.description.trim(), previewUrl: document.previewUrl.trim(),
    primaryColor: colorValue(document.primaryColor, '#4F9FE8'), secondaryColor: colorValue(document.secondaryColor, '#2167BD'), layout: document.layout, avatarId: document.avatarId.trim() || 'avatar-01',
    editableFields, allowColorChange: document.allowColorChange, allowLayoutChange: document.allowLayoutChange, allowAvatarChange: document.allowAvatarChange, isActive: document.isActive, sortOrder: document.sortOrder,
    ...(document.metadata !== undefined ? { metadata: document.metadata } : {}),
    canvas: { ...document.canvas, schemaVersion: TEMPLATE_SCHEMA_VERSION, width, height, elements },
  } satisfies Record<string, unknown>;
};

const previewText = (element: TemplateElementRecord) => {
  const field = element.field || element.key;
  const content = element.content || element.text || (element.type === 'button' ? 'BUTTON' : element.type === 'badge' ? '50% OFF' : element.type === 'icon' ? '★' : '');
  return resolveTemplateValue(field && PREVIEW_VALUES[field] ? PREVIEW_VALUES[field] : content, PREVIEW_VALUES);
};

export const TemplateBuilder = ({ template, saving, onClose, onSave, onUploadAsset }: TemplateBuilderProps) => {
  const [document, setDocument] = useState<BuilderDocument>(() => fromTemplate(template));
  const [selectedId, setSelectedId] = useState<string | null>(() => fromTemplate(template).canvas.elements[0]?.id || null);
  const [past, setPast] = useState<BuilderDocument[]>([]);
  const [future, setFuture] = useState<BuilderDocument[]>([]);
  const [zoom, setZoom] = useState(0.52);
  const [grid, setGrid] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const documentRef = useRef(document);
  const canvasRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  useEffect(() => { documentRef.current = document; }, [document]);

  const selected = useMemo(() => document.canvas.elements.find((element) => element.id === selectedId) || null, [document.canvas.elements, selectedId]);
  const pushHistory = () => { setPast((items) => [...items.slice(-49), documentRef.current]); setFuture([]); };
  const replaceDocument = (next: BuilderDocument, history = true) => { if (history) pushHistory(); documentRef.current = next; setDocument(next); };
  const updateDocument = (patch: Partial<BuilderDocument>) => replaceDocument({ ...documentRef.current, ...patch });
  const updateElement = (id: string, patch: Partial<TemplateElementRecord>, history = true) => {
    const next = { ...documentRef.current, canvas: { ...documentRef.current.canvas, elements: documentRef.current.canvas.elements.map((element) => {
      if (element.id !== id) return element;
      const nextElement = { ...element, ...patch };
      const x = patch.x ?? element.x;
      const y = patch.y ?? element.y;
      const width = patch.width ?? element.width;
      const height = patch.height ?? element.height;
      return { ...nextElement, position: { x, y }, size: { width, height } };
    }) } };
    replaceDocument(next, history);
    if (patch.id && selectedId === id) setSelectedId(patch.id);
  };
  const addElement = (type: TemplateElementType) => {
    const id = `${type}-${Date.now().toString(36)}`;
    const isLine = type === 'divider' || type === 'line';
    const isCircle = type === 'circle';
    const element = normalizeElement({ id, type, x: 110, y: 160 + documentRef.current.canvas.elements.length * 28, width: isLine ? 760 : isCircle ? 180 : type === 'badge' ? 180 : 520, height: isLine ? 8 : isCircle ? 180 : type === 'badge' ? 180 : type === 'image' ? 360 : 110, content: type === 'button' ? 'ORDER NOW' : type === 'badge' ? '50% OFF' : type === 'icon' ? '★' : type === 'shape' || type === 'rectangle' || type === 'circle' || isLine ? '' : 'New text', zIndex: documentRef.current.canvas.elements.length + 1 }, documentRef.current.canvas.elements.length, documentRef.current.canvas.width, documentRef.current.canvas.height);
    pushHistory();
    const next = { ...documentRef.current, canvas: { ...documentRef.current.canvas, elements: [...documentRef.current.canvas.elements, element] } };
    documentRef.current = next; setDocument(next); setSelectedId(id);
  };
  const removeSelected = () => { if (!selectedId) return; pushHistory(); const next = { ...documentRef.current, canvas: { ...documentRef.current.canvas, elements: documentRef.current.canvas.elements.filter((element) => element.id !== selectedId) } }; documentRef.current = next; setDocument(next); setSelectedId(next.canvas.elements[0]?.id || null); };
  const duplicateSelected = () => {
    if (!selected) return;
    const x = Math.min(documentRef.current.canvas.width - selected.width, selected.x + 24);
    const y = Math.min(documentRef.current.canvas.height - selected.height, selected.y + 24);
    const clone = { ...selected, id: `${selected.type}-${Date.now().toString(36)}`, x, y, position: { x, y }, zIndex: Math.max(...documentRef.current.canvas.elements.map((element) => element.zIndex || 0), 0) + 1 };
    pushHistory(); const next = { ...documentRef.current, canvas: { ...documentRef.current.canvas, elements: [...documentRef.current.canvas.elements, clone] } }; documentRef.current = next; setDocument(next); setSelectedId(clone.id);
  };
  const orderSelected = (mode: 'front' | 'back' | 'forward' | 'backward') => {
    if (!selected) return;
    const values = documentRef.current.canvas.elements.map((element) => element.zIndex || 0);
    const target = mode === 'front' ? Math.max(...values, 0) + 1 : mode === 'back' ? Math.min(...values, 0) - 1 : (selected.zIndex || 0) + (mode === 'forward' ? 1 : -1);
    updateElement(selected.id, { zIndex: target });
  };
  const undo = () => { const previous = past[past.length - 1]; if (!previous) return; setPast((items) => items.slice(0, -1)); setFuture((items) => [documentRef.current, ...items]); documentRef.current = previous; setDocument(previous); setSelectedId(previous.canvas.elements.find((element) => element.id === selectedId)?.id || previous.canvas.elements[0]?.id || null); };
  const redo = () => { const next = future[0]; if (!next) return; setFuture((items) => items.slice(1)); setPast((items) => [...items, documentRef.current]); documentRef.current = next; setDocument(next); setSelectedId(next.canvas.elements.find((element) => element.id === selectedId)?.id || next.canvas.elements[0]?.id || null); };

  const beginInteraction = (event: PointerEvent, element: TemplateElementRecord, mode: 'move' | 'resize') => {
    event.preventDefault(); event.stopPropagation(); if (element.locked || element.visible === false) return;
    interactionRef.current = { id: element.id, mode, startX: event.clientX, startY: event.clientY, element };
    pushHistory();
    const move = (moveEvent: PointerEvent) => {
      const interaction = interactionRef.current; const canvas = canvasRef.current; if (!interaction || !canvas) return;
      const rect = canvas.getBoundingClientRect(); const dx = (moveEvent.clientX - interaction.startX) / rect.width * documentRef.current.canvas.width; const dy = (moveEvent.clientY - interaction.startY) / rect.height * documentRef.current.canvas.height;
      const current = documentRef.current.canvas.elements.find((item) => item.id === interaction.id); if (!current) return;
      const patch = interaction.mode === 'move'
        ? { x: Math.max(0, Math.min(documentRef.current.canvas.width - current.width, interaction.element.x + dx)), y: Math.max(0, Math.min(documentRef.current.canvas.height - current.height, interaction.element.y + dy)) }
        : { width: Math.max(24, Math.min(documentRef.current.canvas.width - current.x, interaction.element.width + dx)), height: Math.max(16, Math.min(documentRef.current.canvas.height - current.y, interaction.element.height + dy)) };
      updateElement(interaction.id, patch, false);
    };
    const end = () => { interactionRef.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>, id?: string) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return; }
    if (!onUploadAsset) { toast.error('Image upload is not available in this environment. Use an image URL.'); return; }
    setImporting(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read image.')); reader.readAsDataURL(file); });
      const asset = await onUploadAsset(dataUrl, file.name);
      if (id) updateElement(id, { imageUrl: asset.url, src: asset.url });
      else updateDocument({ canvas: { ...documentRef.current.canvas, backgroundImageUrl: asset.url, background: { ...(documentRef.current.canvas.background || {}), type: 'image', imageUrl: asset.url } } });
      toast.success('Image uploaded and linked to this template.');
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || error?.message || 'Image upload failed.'); } finally { setImporting(false); }
  };
  const importJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const wrapper = isRecord(parsed) && isRecord(parsed.template) ? parsed.template : parsed;
      const entries = Array.isArray(wrapper) ? wrapper : isRecord(parsed) && Array.isArray(parsed.templates) ? parsed.templates : [wrapper];
      const candidate = entries[0];
      if (!isRecord(candidate)) throw new Error('JSON must contain a template object.');
      const next = fromTemplate(candidate as unknown as OfferTemplateRecord);
      replaceDocument(next);
      setSelectedId(next.canvas.elements[0]?.id || null);
      toast.success(entries.length > 1 ? `Imported the first of ${entries.length} templates into the builder.` : 'Template JSON imported into the builder.');
    } catch (error: any) { toast.error(error?.message || 'Invalid template JSON.'); }
  };
  const save = async () => {
    const payload = toPayload(documentRef.current);
    if (String(payload.name).length < 2) { toast.error('Template name must be at least 2 characters.'); return; }
    if (String(payload.slug).length < 1) { toast.error('Add a valid slug.'); return; }
    const canvas = payload.canvas as unknown as BuilderDocument['canvas'];
    if (!canvas.elements.length) { toast.error('Add at least one layer before saving.'); return; }
    const ids = new Set<string>();
    if (canvas.elements.some((element) => {
      const duplicate = ids.has(element.id); ids.add(element.id);
      return !ELEMENT_TYPES.some((item) => item.type === element.type) || element.width <= 0 || element.height <= 0 || element.x < 0 || element.y < 0 || element.x + element.width > canvas.width || element.y + element.height > canvas.height || duplicate;
    })) { toast.error('Every layer needs a unique id and valid in-bounds geometry.'); return; }
    try { await onSave(payload); } catch (error: any) { const message = error?.response?.data?.error?.message || error?.message || 'Could not save template.'; toast.error(error?.response?.status === 409 ? `${message}. Change the slug and try again.` : message); }
  };
  const exportJson = () => {
    const current = documentRef.current;
    const canonical = {
      schemaVersion: TEMPLATE_SCHEMA_VERSION,
      name: current.name.trim(),
      slug: slugify(current.slug),
      category: current.category.trim() || 'General',
      description: current.description.trim(),
      previewUrl: current.previewUrl.trim(),
      primaryColor: colorValue(current.primaryColor, '#4F9FE8'),
      secondaryColor: colorValue(current.secondaryColor, '#2167BD'),
      layout: current.layout,
      avatarId: current.avatarId.trim() || 'avatar-01',
      editableFields: current.editableFields,
      allowColorChange: current.allowColorChange,
      allowLayoutChange: current.allowLayoutChange,
      allowAvatarChange: current.allowAvatarChange,
      isActive: current.isActive,
      sortOrder: current.sortOrder,
      ...(current.metadata !== undefined ? { metadata: current.metadata } : {}),
      canvas: {
        width: Math.round(current.canvas.width),
        height: Math.round(current.canvas.height),
        background: toCanonicalBackground({ ...(current.canvas.background || {}), imageUrl: current.canvas.background?.imageUrl || current.canvas.backgroundImageUrl }, current.primaryColor, current.secondaryColor),
        ...(current.canvas.overlay ? { overlay: current.canvas.overlay } : {}),
        elements: current.canvas.elements.map(toCanonicalTemplateElement),
      },
    };
    const blob = new Blob([JSON.stringify(canonical, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugify(current.name)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Canonical template JSON exported.');
  };
  const background = document.canvas.background || { type: 'solid', color: document.canvas.backgroundColor };
  const gradientColors = background.colors?.length && background.colors.length >= 2 ? background.colors : [background.from || document.primaryColor, background.to || document.secondaryColor];
  const backgroundStyle: React.CSSProperties = background.type === 'gradient' || background.type === 'linear-gradient'
    ? { backgroundImage: `linear-gradient(${background.angle !== undefined ? `${background.angle}deg` : background.direction || 'to bottom'}, ${gradientColors.join(', ')})` }
    : background.type === 'texture'
      ? { backgroundColor: background.color || document.canvas.backgroundColor || document.primaryColor, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.12) 0, rgba(255,255,255,.12) 2px, transparent 2px, transparent 9px)' }
    : { backgroundColor: background.color || document.canvas.backgroundColor || document.primaryColor };
  const sortedElements = [...document.canvas.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const renderElement = (element: TemplateElementRecord, preview = false) => {
    const selectedState = !preview && selectedId === element.id;
    const style: React.CSSProperties = {
      position: 'absolute', left: `${(element.x / document.canvas.width) * 100}%`, top: `${(element.y / document.canvas.height) * 100}%`, width: `${(element.width / document.canvas.width) * 100}%`, height: `${(element.height / document.canvas.height) * 100}%`,
      zIndex: element.zIndex || 1, opacity: element.visible === false ? 0 : element.opacity ?? 1, transform: `rotate(${element.rotation || 0}deg)`, transformOrigin: 'center', borderRadius: element.borderRadius || 0, borderWidth: element.borderWidth || 0, borderColor: element.borderColor || 'transparent', borderStyle: 'solid', boxSizing: 'border-box',
    };
    const common = { onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => { if (!preview) { setSelectedId(element.id); beginInteraction(event.nativeEvent, element, 'move'); } }, onClick: (event: React.MouseEvent) => { if (!preview) { event.stopPropagation(); setSelectedId(element.id); } } };
    const imageUrl = element.imageUrl || element.src;
    let content: React.ReactNode;
    if (element.type === 'image') content = imageUrl ? <img src={imageUrl} alt="" draggable={false} className="h-full w-full" style={{ objectFit: element.resizeMode === 'stretch' ? 'fill' : element.resizeMode || 'contain', borderRadius: element.borderRadius || 0 }} /> : <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs text-slate-500"><ImageIcon className="mr-1 h-4 w-4" /> Add image</div>;
    else if (element.type === 'shape' || element.type === 'rectangle' || element.type === 'circle') content = <div className="h-full w-full" style={{ backgroundColor: element.backgroundColor || element.color || '#E5E7EB', borderRadius: element.type === 'circle' ? '9999px' : undefined }} />;
    else if (element.type === 'divider' || element.type === 'line') content = <div className="h-full w-full" style={{ backgroundColor: element.backgroundColor || element.color || '#111827' }} />;
    else if (element.type === 'icon') content = <div className="flex h-full w-full items-center justify-center" style={{ color: element.color || '#111827', fontSize: element.fontSize || 48 }}>{previewText(element)}</div>;
    else content = <div className="flex h-full w-full items-center justify-center whitespace-pre-wrap break-words p-1" style={{ color: element.color || '#111827', backgroundColor: element.backgroundColor === 'transparent' ? undefined : element.backgroundColor, fontFamily: element.fontFamily, fontSize: element.fontSize, fontWeight: element.fontWeight as React.CSSProperties['fontWeight'], fontStyle: element.fontStyle, letterSpacing: element.letterSpacing, lineHeight: element.lineHeight || 1.1, textAlign: element.textAlign, textTransform: element.textTransform, textShadow: (element.style?.textShadow as string | undefined) }}>{previewText(element)}</div>;
    return <div key={element.id} {...common} style={{ ...style, cursor: preview ? 'default' : element.locked ? 'not-allowed' : 'move', outline: selectedState ? '2px solid #f97316' : element.type === 'group' ? '1px dashed rgba(100,116,139,.6)' : undefined, outlineOffset: 2, display: element.visible === false ? 'none' : undefined }}>{content}{selectedState && <><div className="pointer-events-none absolute inset-0 border border-dashed border-primary" /><div className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-sm border-2 border-primary bg-white" onPointerDown={(event) => beginInteraction(event.nativeEvent, element, 'resize')} /><div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">{element.id}</div></>}</div>;
  };

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
      <Button variant="ghost" size="icon" onClick={onClose} title="Close builder"><X className="h-4 w-4" /></Button>
      <div className="mr-auto min-w-[230px] flex-1"><Input value={document.name} onChange={(event) => updateDocument({ name: event.target.value, slug: document.slug === slugify(document.name) ? slugify(event.target.value) : document.slug })} className="h-9 text-base font-semibold" placeholder="Template name" /><p className="mt-1 text-[11px] text-muted-foreground">Visual template builder · {document.canvas.width} × {document.canvas.height}px</p></div>
      <Input value={document.category} onChange={(event) => updateDocument({ category: event.target.value })} className="h-9 w-28" placeholder="Category" />
      <Button variant="outline" size="sm" onClick={undo} disabled={!past.length}><Undo2 className="h-4 w-4" /> Undo</Button><Button variant="outline" size="sm" onClick={redo} disabled={!future.length}><Redo2 className="h-4 w-4" /> Redo</Button>
      <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /> Preview</Button>
      <Button variant="outline" size="sm" onClick={exportJson}><Download className="h-4 w-4" /> Export JSON</Button>
      <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent"><Upload className="h-4 w-4" /> Import<input type="file" accept="application/json,.json" className="hidden" onChange={importJson} /></label>
      <Button size="sm" onClick={save} disabled={saving || importing}><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save & publish'}</Button>
    </div>
    <div className="grid min-h-[720px] gap-3 xl:grid-cols-[154px_minmax(440px,1fr)_290px]">
      <aside className="rounded-xl border bg-card p-2 shadow-sm"><p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add layer</p><div className="grid grid-cols-2 gap-1.5">{ELEMENT_TYPES.map(({ type, label, icon: Icon }) => <button key={type} type="button" onClick={() => addElement(type)} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-background px-1 text-[11px] font-medium hover:border-primary hover:bg-accent"><Icon className="h-5 w-5 text-secondary" /><span>{label}</span></button>)}</div><div className="mt-3 space-y-2 border-t pt-3"><p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canvas</p><label className="flex items-center justify-between px-2 text-xs"><span>Grid</span><input type="checkbox" checked={grid} onChange={(event) => setGrid(event.target.checked)} /></label><div className="flex items-center gap-1 px-1"><Button variant="outline" size="icon" onClick={() => setZoom((value) => Math.max(.3, Number((value - .08).toFixed(2))))}><Minus className="h-4 w-4" /></Button><span className="flex-1 text-center text-xs">{Math.round(zoom * 100)}%</span><Button variant="outline" size="icon" onClick={() => setZoom((value) => Math.min(1, Number((value + .08).toFixed(2))))}><Plus className="h-4 w-4" /></Button></div></div></aside>
      <section className="flex min-h-[720px] flex-col rounded-xl border bg-slate-100/70 p-3 shadow-sm"><div className="flex items-center justify-between pb-2 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Move className="h-3.5 w-3.5" /> Drag layers · resize from corner</span><span>Logical canvas · {document.canvas.width} × {document.canvas.height}</span></div><div className="flex flex-1 items-start justify-center overflow-auto rounded-lg bg-slate-200/70 p-5"><div style={{ width: `${document.canvas.width * zoom}px`, height: `${document.canvas.height * zoom}px`, minWidth: `${document.canvas.width * zoom}px`, minHeight: `${document.canvas.height * zoom}px` }}><div ref={canvasRef} role="application" aria-label="Template canvas" className="relative h-full w-full overflow-hidden shadow-2xl" style={{ ...backgroundStyle, backgroundImage: background.type === 'gradient' || background.type === 'linear-gradient' ? backgroundStyle.backgroundImage : grid ? `${backgroundStyle.backgroundColor ? `linear-gradient(${backgroundStyle.backgroundColor},${backgroundStyle.backgroundColor}),` : ''}repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(15,23,42,.08) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(15,23,42,.08) 40px)` : undefined }} onPointerDown={() => setSelectedId(null)}>{(background.type === 'image' || document.canvas.backgroundImageUrl) && document.canvas.backgroundImageUrl ? <img src={document.canvas.backgroundImageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ opacity: background.opacity ?? 1 }} /> : null}{document.canvas.overlay?.color ? <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: document.canvas.overlay.color, opacity: document.canvas.overlay.opacity ?? .25 }} /> : null}{sortedElements.map((element) => renderElement(element))}</div></div></div></section>
      <aside className="flex min-h-[720px] flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Properties</h2>{selected && <Button variant="ghost" size="icon" onClick={removeSelected} title="Delete selected"><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>{selected ? <div className="space-y-3 overflow-y-auto pr-1"><div className="grid grid-cols-2 gap-2"><label className="text-xs font-medium">Layer name<Input value={selected.id} onChange={(event) => updateElement(selected.id, { id: event.target.value.replace(/\s+/g, '-').toLowerCase() || selected.id })} className="mt-1 h-8 text-xs" /></label><label className="text-xs font-medium">Type<select value={selected.type} onChange={(event) => updateElement(selected.id, { type: event.target.value as TemplateElementType })} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs">{ELEMENT_TYPES.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label></div><label className="block text-xs font-medium">Dynamic field<select value={selected.field || selected.key || ''} onChange={(event) => updateElement(selected.id, { field: event.target.value || undefined, key: event.target.value || undefined })} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs">{DYNAMIC_FIELDS.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}</select></label>{selected.type !== 'image' && selected.type !== 'shape' && selected.type !== 'divider' && <label className="block text-xs font-medium">Content<textarea value={selected.content || selected.text || ''} onChange={(event) => updateElement(selected.id, { content: event.target.value, text: event.target.value })} className="mt-1 min-h-16 w-full resize-y rounded-md border bg-background px-2 py-1.5 text-xs" /></label>}{selected.type === 'image' && <><label className="block text-xs font-medium">Image URL<input value={selected.imageUrl || selected.src || ''} onChange={(event) => updateElement(selected.id, { imageUrl: event.target.value, src: event.target.value })} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs" placeholder="https://…" /></label><label className="flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md border text-xs font-medium hover:bg-accent"><Upload className="h-3.5 w-3.5" /> Upload image<input type="file" accept="image/*" className="hidden" onChange={(event) => uploadImage(event, selected.id)} /></label></>}{(selected.type === 'text' || selected.type === 'button' || selected.type === 'badge' || selected.type === 'icon') && <div className="grid grid-cols-2 gap-2"><label className="text-xs font-medium">Font<select value={selected.fontFamily || 'Inter'} onChange={(event) => updateElement(selected.id, { fontFamily: event.target.value })} className="mt-1 h-8 w-full rounded-md border bg-background px-1 text-xs">{FONT_OPTIONS.map((font) => <option key={font}>{font}</option>)}</select></label><label className="text-xs font-medium">Size<input type="number" min="1" max="500" value={selected.fontSize || 42} onChange={(event) => updateElement(selected.id, { fontSize: Number(event.target.value) || 1 })} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-xs" /></label></div>}<div className="grid grid-cols-2 gap-2"><label className="text-xs font-medium">Text color<input type="color" value={colorValue(selected.color || '#111827', '#111827')} onChange={(event) => updateElement(selected.id, { color: event.target.value })} className="mt-1 h-8 w-full rounded border bg-background p-1" /></label><label className="text-xs font-medium">Fill color<input type="color" value={colorValue(selected.backgroundColor || '#FFFFFF', '#FFFFFF')} onChange={(event) => updateElement(selected.id, { backgroundColor: event.target.value })} className="mt-1 h-8 w-full rounded border bg-background p-1" /></label></div><div className="grid grid-cols-4 gap-2"><label className="text-xs font-medium">X<input type="number" value={Math.round(selected.x)} onChange={(event) => updateElement(selected.id, { x: Math.max(0, Number(event.target.value) || 0) })} className="mt-1 h-8 w-full rounded border bg-background px-1 text-xs" /></label><label className="text-xs font-medium">Y<input type="number" value={Math.round(selected.y)} onChange={(event) => updateElement(selected.id, { y: Math.max(0, Number(event.target.value) || 0) })} className="mt-1 h-8 w-full rounded border bg-background px-1 text-xs" /></label><label className="text-xs font-medium">W<input type="number" value={Math.round(selected.width)} onChange={(event) => updateElement(selected.id, { width: Math.max(1, Number(event.target.value) || 1) })} className="mt-1 h-8 w-full rounded border bg-background px-1 text-xs" /></label><label className="text-xs font-medium">H<input type="number" value={Math.round(selected.height)} onChange={(event) => updateElement(selected.id, { height: Math.max(1, Number(event.target.value) || 1) })} className="mt-1 h-8 w-full rounded border bg-background px-1 text-xs" /></label></div><div className="grid grid-cols-3 gap-2"><label className="text-xs font-medium">Rotate<input type="number" value={Math.round(selected.rotation || 0)} onChange={(event) => updateElement(selected.id, { rotation: Number(event.target.value) || 0 })} className="mt-1 h-8 w-full rounded border bg-background px-1 text-xs" /></label><label className="text-xs font-medium">Radius<input type="number" value={Math.round(selected.borderRadius || 0)} onChange={(event) => updateElement(selected.id, { borderRadius: Math.max(0, Number(event.target.value) || 0) })} className="mt-1 h-8 w-full rounded border bg-background px-1 text-xs" /></label><label className="text-xs font-medium">Opacity<input type="number" min="0" max="1" step=".05" value={selected.opacity ?? 1} onChange={(event) => updateElement(selected.id, { opacity: Math.min(1, Math.max(0, Number(event.target.value) || 0)) })} className="mt-1 h-8 w-full rounded border bg-background px-1 text-xs" /></label></div><div className="grid grid-cols-2 gap-2"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selected.visible !== false} onChange={(event) => updateElement(selected.id, { visible: event.target.checked })} /> Visible</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selected.locked === true} onChange={(event) => updateElement(selected.id, { locked: event.target.checked })} /> <Lock className="h-3.5 w-3.5" /> Locked</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selected.editable !== false} onChange={(event) => updateElement(selected.id, { editable: event.target.checked })} /> Editable</label></div><div className="flex flex-wrap gap-1 border-t pt-3"><Button variant="outline" size="sm" onClick={duplicateSelected}><Copy className="h-3.5 w-3.5" /> Duplicate</Button><Button variant="outline" size="icon" onClick={() => orderSelected('front')} title="Bring to front"><BringToFront className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => orderSelected('back')} title="Send to back"><SendToBack className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => orderSelected('forward')} title="Bring forward"><ArrowUp className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => orderSelected('backward')} title="Send backward"><ArrowDown className="h-4 w-4" /></Button></div></div> : <div className="flex flex-1 flex-col items-center justify-center text-center text-sm text-muted-foreground"><Pencil className="mb-2 h-7 w-7" /><p>Select a layer to edit its properties.</p></div>}</aside>
    </div>
    <div className="grid gap-3 lg:grid-cols-[1fr_320px]"><section className="rounded-xl border bg-card p-3 shadow-sm"><div className="mb-2 flex items-center gap-2"><Layers3 className="h-4 w-4 text-secondary" /><h2 className="text-sm font-semibold">Layers</h2><span className="text-xs text-muted-foreground">{document.canvas.elements.length} objects</span></div><div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{[...document.canvas.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)).map((element) => <button key={element.id} type="button" onClick={() => setSelectedId(element.id)} className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${selectedId === element.id ? 'border-primary bg-primary/10 text-primary' : 'bg-background hover:bg-accent'}`}><GripVertical className="h-3.5 w-3.5" /><span className="max-w-36 truncate">{element.id}</span>{element.locked ? <Lock className="h-3 w-3" /> : element.visible === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</button>)}</div></section><section className="rounded-xl border bg-card p-3 shadow-sm"><div className="mb-2 flex items-center gap-2"><Palette className="h-4 w-4 text-secondary" /><h2 className="text-sm font-semibold">Background</h2></div><div className="grid grid-cols-2 gap-2"><label className="text-xs font-medium">Mode<select value={background.type || 'solid'} onChange={(event) => updateDocument({ canvas: { ...documentRef.current.canvas, background: { ...(documentRef.current.canvas.background || {}), type: event.target.value as TemplateCanvasBackground['type'], color: documentRef.current.canvas.backgroundColor } } })} className="mt-1 h-8 w-full rounded border bg-background px-1 text-xs"><option value="solid">Solid</option><option value="gradient">Gradient</option><option value="linear-gradient">Gradient (JSON)</option><option value="image">Image</option></select></label><label className="text-xs font-medium">Color<input type="color" value={colorValue(background.color || document.canvas.backgroundColor, '#F5E9D5')} onChange={(event) => updateDocument({ canvas: { ...documentRef.current.canvas, backgroundColor: event.target.value, background: { ...(documentRef.current.canvas.background || {}), color: event.target.value } } })} className="mt-1 h-8 w-full rounded border bg-background p-1" /></label></div>{(background.type === 'gradient' || background.type === 'linear-gradient') && <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs font-medium">From<input type="color" value={colorValue(background.from || background.colors?.[0] || document.primaryColor, document.primaryColor)} onChange={(event) => updateDocument({ canvas: { ...documentRef.current.canvas, background: { ...(documentRef.current.canvas.background || {}), type: background.type, from: event.target.value } } })} className="mt-1 h-8 w-full rounded border bg-background p-1" /></label><label className="text-xs font-medium">To<input type="color" value={colorValue(background.to || background.colors?.[1] || document.secondaryColor, document.secondaryColor)} onChange={(event) => updateDocument({ canvas: { ...documentRef.current.canvas, background: { ...(documentRef.current.canvas.background || {}), type: background.type, to: event.target.value } } })} className="mt-1 h-8 w-full rounded border bg-background p-1" /></label></div>}{background.type === 'image' && <><Input value={document.canvas.backgroundImageUrl || ''} onChange={(event) => updateDocument({ canvas: { ...documentRef.current.canvas, backgroundImageUrl: event.target.value, background: { ...(documentRef.current.canvas.background || {}), type: 'image', imageUrl: event.target.value } } })} className="mt-2 h-8 text-xs" placeholder="Background image URL" /><label className="mt-2 flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md border text-xs font-medium hover:bg-accent"><Upload className="h-3.5 w-3.5" /> Upload background<input type="file" accept="image/*" className="hidden" onChange={(event) => uploadImage(event)} /></label></>}<div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs font-medium">Poster width<input type="number" value={document.canvas.width} onChange={(event) => updateDocument({ canvas: { ...documentRef.current.canvas, width: Math.max(1, Number(event.target.value) || CANVAS_WIDTH) } })} className="mt-1 h-8 w-full rounded border bg-background px-1 text-xs" /></label><label className="text-xs font-medium">Poster height<input type="number" value={document.canvas.height} onChange={(event) => updateDocument({ canvas: { ...documentRef.current.canvas, height: Math.max(1, Number(event.target.value) || CANVAS_HEIGHT) } })} className="mt-1 h-8 w-full rounded border bg-background px-1 text-xs" /></label></div><div className="mt-3 flex flex-wrap gap-2 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={document.allowColorChange} onChange={(event) => updateDocument({ allowColorChange: event.target.checked })} /> Allow user colors</label><label className="flex items-center gap-2"><input type="checkbox" checked={document.isActive} onChange={(event) => updateDocument({ isActive: event.target.checked })} /> Active</label></div></section></div>
    {previewOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-5" onClick={() => setPreviewOpen(false)}><div className="flex max-h-[95vh] w-full max-w-3xl flex-col items-center gap-3 overflow-auto rounded-xl bg-card p-4" onClick={(event) => event.stopPropagation()}><div className="flex w-full items-center justify-between"><h2 className="font-semibold">Template preview</h2><Button variant="ghost" size="icon" onClick={() => setPreviewOpen(false)}><X className="h-4 w-4" /></Button></div><div className="relative w-full max-w-[540px] overflow-hidden shadow-2xl" style={{ aspectRatio: `${document.canvas.width}/${document.canvas.height}`, ...backgroundStyle }}>{document.canvas.backgroundImageUrl && <img src={document.canvas.backgroundImageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />}{sortedElements.map((element) => renderElement(element, true))}</div></div></div>}
  </div>;
};

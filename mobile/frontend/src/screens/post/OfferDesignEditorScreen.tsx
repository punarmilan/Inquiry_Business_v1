import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Keyboard, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listMyBusinesses, listOfferTemplates, listTemplateStickers } from '../../services/api';
import { DEFAULT_OFFER_CARD_DESIGN, OFFER_AVATARS, OFFER_CARD_COLORS, OFFER_CARD_TEMPLATES, findOfferAvatar, resolveDynamicValue, resolveOfferFontFamily, resolveOfferLineHeight, resolveTemplateElementValue, toOfferCardTemplate, type OfferCardDesign, type OfferCardTemplate, type OfferTemplateCanvas, type OfferTemplateElement } from '../../config/offerCardDesigner';
import { OfferAvatarSprite } from '../../components/OfferAvatarSprite';
import type { OfferSticker } from '../../config/offerStickers';
import type { Business } from '../../types/hyperlocal';
import type { PostStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<PostStackParamList, 'OfferDesignEditor'>;
type EditorTool = 'templates' | 'text' | 'brand' | 'uploads' | 'stickers' | 'shapes';

const TOOLS: Array<{ id: EditorTool; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }> = [
  { id: 'templates', label: 'Templates', icon: 'view-grid-outline' },
  { id: 'text', label: 'Text', icon: 'format-text' },
  { id: 'brand', label: 'Brand', icon: 'palette-outline' },
  { id: 'uploads', label: 'Uploads', icon: 'cloud-upload-outline' },
  { id: 'stickers', label: 'Stickers', icon: 'sticker-outline' },
  { id: 'shapes', label: 'Shapes', icon: 'shape-outline' },
];
const FONT_WEIGHT_OPTIONS = [
  { value: '500' as const, label: 'Light' },
  { value: '600' as const, label: 'Regular' },
  { value: '700' as const, label: 'Bold' },
  { value: '800' as const, label: 'Heavy' },
  { value: '900' as const, label: 'Extra bold' },
];
const TEXT_COLOR_OPTIONS = ['#FFFFFF', '#111827', '#F45B18', '#E53935', '#FFC107', '#2563EB', '#16A34A', '#9333EA'] as const;
const makeBlankCanvas = (): OfferTemplateCanvas => ({
  width: 1080,
  height: 1350,
  backgroundColor: '#FFFFFF',
  background: { type: 'solid', color: '#FFFFFF' },
  elements: [{
    id: 'blank-add-text',
    type: 'text',
    key: 'title',
    field: 'title',
    text: 'Add text',
    content: 'Add text',
    x: 100,
    y: 180,
    width: 880,
    height: 130,
    zIndex: 2,
    color: '#9CA3AF',
    fontSize: 64,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    editable: true,
  }],
});

const BLANK_TEMPLATE: OfferCardTemplate = {
  id: 'custom',
  name: 'Start blank',
  primaryColor: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  layout: 'center',
  canvas: makeBlankCanvas(),
};

const makeBlankDesign = (): OfferCardDesign => ({
  ...DEFAULT_OFFER_CARD_DESIGN,
  templateId: 'custom',
  templateSource: 'custom',
  avatarId: '',
  primaryColor: '#FFFFFF',
  secondaryColor: '#FFFFFF',
  layout: 'center',
  canvas: makeBlankCanvas(),
});

const makeCanvasFromDesign = (design: OfferCardDesign): OfferTemplateCanvas => ({
  width: 1080,
  height: 1350,
  backgroundColor: design.primaryColor,
  background: { type: 'gradient', from: design.primaryColor, to: design.secondaryColor },
  overlay: design.previewUrl ? { color: '#000000', opacity: 0.28 } : undefined,
  elements: [
    ...(design.previewUrl ? [{
      id: 'template-background-image', type: 'image' as const, field: 'imageUrls', imageUrl: design.previewUrl,
      x: 0, y: 0, width: 1080, height: 1350, zIndex: 1, editable: true, resizeMode: 'cover' as const,
    }] : []),
    {
      id: 'template-category', type: 'text', field: 'category', content: 'LOCAL OFFER',
      x: 80, y: 90, width: 920, height: 70, zIndex: 3, color: '#FFFFFF', fontSize: 34,
      fontWeight: '800', letterSpacing: 3, textAlign: 'center', editable: true,
    },
    {
      id: 'template-title', type: 'text', field: 'title', content: 'Special offer',
      x: 80, y: 760, width: 920, height: 190, zIndex: 3, color: '#FFFFFF', fontSize: 78,
      fontWeight: design.fontWeight || '900', fontStyle: design.fontStyle || 'normal', textAlign: design.textAlign || 'center', editable: true,
    },
    {
      id: 'template-description', type: 'text', field: 'description', content: 'Add your offer details',
      x: 120, y: 955, width: 840, height: 130, zIndex: 3, color: '#FFFFFF', fontSize: 38,
      fontWeight: '600', textAlign: design.textAlign || 'center', editable: true,
    },
    {
      id: 'template-price', type: 'badge', field: 'offerPrice', content: '₹299',
      x: 340, y: 1140, width: 400, height: 105, zIndex: 4, color: '#111827', backgroundColor: '#FFC107',
      borderRadius: 52, fontSize: 48, fontWeight: '900', textAlign: 'center', textAlignVertical: 'center', editable: true,
    },
  ],
});

const isTextElement = (element: OfferTemplateElement) =>
  !['image', 'shape', 'rectangle', 'circle', 'line', 'divider', 'group'].includes(element.type) && !element.id.startsWith('sticker-');
const isShapeElement = (element: OfferTemplateElement) => ['shape', 'rectangle', 'circle', 'line', 'divider', 'group'].includes(element.type);

type EditableTextKey = string;
type TextOffset = { x: number; y: number };
type TextOffsets = Record<EditableTextKey, TextOffset>;
type LayoutSize = { width: number; height: number };
type TouchPoint = { pageX: number; pageY: number };

const distanceBetweenTouches = (touches: TouchPoint[]) => {
  if (touches.length < 2) return null;
  const [first, second] = touches;
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
};
const angleBetweenTouches = (touches: TouchPoint[]) => {
  if (touches.length < 2) return null;
  const [first, second] = touches;
  return Math.atan2(second.pageY - first.pageY, second.pageX - first.pageX) * (180 / Math.PI);
};
const normalizeRotationDelta = (delta: number) => {
  let next = delta;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return next;
};

const MovablePosterElement: React.FC<{
  style: React.ComponentProps<typeof View>['style'];
  baseTransform?: any[];
  children: React.ReactNode;
  onCommit: (delta: TextOffset) => void;
  onSelect?: () => void;
  onTransformCommit?: (scale: number, rotation: number) => void;
}> = ({ style, baseTransform = [], children, onCommit, onSelect, onTransformCommit }) => {
  const [drag, setDrag] = useState<TextOffset>({ x: 0, y: 0 });
  const [liveScale, setLiveScale] = useState(1);
  const [liveRotation, setLiveRotation] = useState(0);
  const lastPinchDistance = useRef<number | null>(null);
  const lastTouchAngle = useRef<number | null>(null);
  const pinching = useRef(false);
  const liveScaleRef = useRef(1);
  const liveRotationRef = useRef(0);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (event, gesture) => {
      const touches = event.nativeEvent.touches;
      const distance = distanceBetweenTouches(touches);
      const angle = angleBetweenTouches(touches);
      if (touches.length >= 2 && onTransformCommit) {
        pinching.current = true;
        if (distance && lastPinchDistance.current) {
          const factor = distance / lastPinchDistance.current;
          if (Number.isFinite(factor)) {
            liveScaleRef.current = Math.max(0.35, Math.min(3, liveScaleRef.current * factor));
            setLiveScale(liveScaleRef.current);
          }
        }
        if (angle !== null && lastTouchAngle.current !== null) {
          const delta = normalizeRotationDelta(angle - lastTouchAngle.current);
          if (Number.isFinite(delta)) {
            liveRotationRef.current += delta;
            setLiveRotation(liveRotationRef.current);
          }
        }
        lastPinchDistance.current = distance;
        lastTouchAngle.current = angle;
        setDrag({ x: 0, y: 0 });
        return;
      }
      if (!pinching.current) setDrag({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderGrant: (event) => {
      onSelect?.();
      lastPinchDistance.current = distanceBetweenTouches(event.nativeEvent.touches);
      lastTouchAngle.current = angleBetweenTouches(event.nativeEvent.touches);
      liveScaleRef.current = 1;
      liveRotationRef.current = 0;
      setLiveScale(1);
      setLiveRotation(0);
      pinching.current = false;
    },
    onPanResponderRelease: (_, gesture) => {
      if (pinching.current) onTransformCommit?.(liveScaleRef.current, liveRotationRef.current);
      else onCommit({ x: gesture.dx, y: gesture.dy });
      lastPinchDistance.current = null;
      lastTouchAngle.current = null;
      liveScaleRef.current = 1;
      liveRotationRef.current = 0;
      setLiveScale(1);
      setLiveRotation(0);
      pinching.current = false;
      setDrag({ x: 0, y: 0 });
    },
    onPanResponderTerminate: () => {
      lastPinchDistance.current = null;
      lastTouchAngle.current = null;
      liveScaleRef.current = 1;
      liveRotationRef.current = 0;
      setLiveScale(1);
      setLiveRotation(0);
      pinching.current = false;
      setDrag({ x: 0, y: 0 });
    },
  }), [onCommit, onSelect, onTransformCommit]);
  return <View {...responder.panHandlers} style={[style, { transform: [...baseTransform, { rotate: `${liveRotation}deg` }, { scale: liveScale }, { translateX: drag.x }, { translateY: drag.y }] }]}>{children}</View>;
};

const CANVAS_FRAME_PADDING = 14;
const CANVAS_STAGE_HORIZONTAL_PADDING = 24;
const CANVAS_STAGE_VERTICAL_PADDING = 10;
const CANVAS_MAX_WIDTH = 365;
const MOVE_HINT_RESERVED_HEIGHT = 32;
// Keep the thumbnail close to the poster's 4:5 shape so canvas content is
// actually visible instead of being scaled into a tiny landscape strip.
const TEMPLATE_THUMB_WIDTH = 72;
const TEMPLATE_THUMB_HEIGHT = 90;
const gradientStops = (colors: string[] | undefined, first: string, second: string): [string, string, ...string[]] => {
  const stops = colors?.filter(Boolean) || [];
  return [stops[0] || first, stops[1] || second, ...stops.slice(2)];
};
const rotationTransform = (rotation?: number) => (
  typeof rotation === 'number' && Number.isFinite(rotation) && rotation !== 0
    ? [{ rotate: `${rotation}deg` }]
    : []
);
const displayLineCount = (element: OfferTemplateElement) => Math.max(2, element.numberOfLines || 1);

const EditableCanvasText: React.FC<{
  kind: EditableTextKey;
  text: string;
  placeholder: string;
  style: React.ComponentProps<typeof Text>['style'];
  layerStyle?: React.ComponentProps<typeof View>['style'];
  numberOfLines?: number;
  showPlaceholder?: boolean;
  rotation?: number;
  editingText: EditableTextKey | null;
  movingText: EditableTextKey | null;
  offset: TextOffset;
  onEditText: (kind: EditableTextKey | null) => void;
  onToggleMove: (kind: EditableTextKey) => void;
  onChangeText: (kind: EditableTextKey, value: string) => void;
  onOffsetChange: (kind: EditableTextKey, offset: TextOffset) => void;
  onTransformCommit?: (scale: number, rotation: number) => void;
}> = ({ kind, text, placeholder, style, layerStyle, numberOfLines, showPlaceholder = true, rotation = 0, editingText, movingText, offset, onEditText, onToggleMove, onChangeText, onOffsetChange, onTransformCommit }) => {
  const offsetRef = useRef(offset);
  const dragStart = useRef(offset);
  const lastPinchDistance = useRef<number | null>(null);
  const lastTouchAngle = useRef<number | null>(null);
  const rotating = useRef(false);
  const dragged = useRef(false);
  const [liveScale, setLiveScale] = useState(1);
  const [liveRotation, setLiveRotation] = useState(0);
  const liveScaleRef = useRef(1);
  const liveRotationRef = useRef(0);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => movingText === kind,
    onMoveShouldSetPanResponder: (_, gesture) => movingText === kind || gesture.numberActiveTouches > 1 || Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,
    onMoveShouldSetPanResponderCapture: (_, gesture) => movingText === kind || gesture.numberActiveTouches > 1 || Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,
    onPanResponderGrant: (event) => {
      dragStart.current = offsetRef.current;
      lastPinchDistance.current = distanceBetweenTouches(event.nativeEvent.touches);
      lastTouchAngle.current = angleBetweenTouches(event.nativeEvent.touches);
      liveScaleRef.current = 1;
      liveRotationRef.current = 0;
      setLiveScale(1);
      setLiveRotation(0);
      dragged.current = false;
      rotating.current = false;
    },
    onPanResponderMove: (event, gesture) => {
      const angle = angleBetweenTouches(event.nativeEvent.touches);
      const distance = distanceBetweenTouches(event.nativeEvent.touches);
      if (event.nativeEvent.touches.length >= 2 && angle !== null && onTransformCommit) {
        rotating.current = true;
        if (distance !== null && lastPinchDistance.current !== null) {
          const factor = distance / lastPinchDistance.current;
          if (Number.isFinite(factor)) {
            liveScaleRef.current = Math.max(0.35, Math.min(3, liveScaleRef.current * factor));
            setLiveScale(liveScaleRef.current);
          }
        }
        if (lastTouchAngle.current !== null) {
          const delta = normalizeRotationDelta(angle - lastTouchAngle.current);
          if (Number.isFinite(delta)) {
            liveRotationRef.current += delta;
            setLiveRotation(liveRotationRef.current);
          }
        }
        lastTouchAngle.current = angle;
        return;
      }
      if (rotating.current) return;
      if (Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2) dragged.current = true;
      const next = {
        x: Math.max(-320, Math.min(320, dragStart.current.x + gesture.dx)),
        y: Math.max(-320, Math.min(320, dragStart.current.y + gesture.dy)),
      };
      onOffsetChange(kind, next);
    },
    onPanResponderRelease: () => {
      if (rotating.current && onTransformCommit) onTransformCommit(liveScaleRef.current, liveRotationRef.current);
      lastPinchDistance.current = null;
      lastTouchAngle.current = null;
      liveScaleRef.current = 1;
      liveRotationRef.current = 0;
      setLiveScale(1);
      setLiveRotation(0);
      rotating.current = false;
    },
    onPanResponderTerminate: () => {
      lastPinchDistance.current = null;
      lastTouchAngle.current = null;
      liveScaleRef.current = 1;
      liveRotationRef.current = 0;
      setLiveScale(1);
      setLiveRotation(0);
      rotating.current = false;
    },
  }), [kind, movingText, onOffsetChange, onTransformCommit]);

  const handleTap = () => {
    if (movingText === kind) onToggleMove(kind);
    onEditText(kind);
  };

  const isActive = editingText === kind || movingText === kind;
  return (
    <View collapsable={false} {...responder.panHandlers} style={[styles.canvasMovableText, layerStyle, { transform: [{ translateX: offset.x }, { translateY: offset.y }, { rotate: `${rotation + liveRotation}deg` }, { scale: liveScale }] }]}>
      <Pressable onPress={handleTap} hitSlop={8} style={[styles.canvasTextTouch, isActive && styles.canvasTextSelected]}>
        {editingText === kind ? (
          <TextInput
            autoFocus
            value={text}
            onChangeText={(value) => onChangeText(kind, value)}
            onBlur={() => onEditText(null)}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.78)"
            multiline={kind === 'description'}
            numberOfLines={numberOfLines}
            allowFontScaling={false}
            style={[style, styles.canvasTextInput]}
          />
        ) : (
          <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit minimumFontScale={0.55} allowFontScaling={false}>{text || (showPlaceholder ? placeholder : '')}</Text>
        )}
      </Pressable>
    </View>
  );
};

const TemplateThumbnail: React.FC<{ template: OfferCardTemplate }> = ({ template }) => {
  const [previewFailed, setPreviewFailed] = useState(false);
  const poster = template.canvas;
  const templateValues = template.dynamicFields || {};
  if (!poster || !poster.width || !poster.height) {
    if (template.previewUrl && !previewFailed) return <Image source={{ uri: template.previewUrl }} style={styles.templateThumb} resizeMode="cover" onError={() => setPreviewFailed(true)} />;
    return <LinearGradient colors={[template.primaryColor, template.secondaryColor]} style={styles.templateThumb}><MaterialCommunityIcons name="palette-outline" size={23} color="#FFFFFF" /></LinearGradient>;
  }

  const scale = Math.min(TEMPLATE_THUMB_WIDTH / poster.width, TEMPLATE_THUMB_HEIGHT / poster.height);
  const renderElement = (element: OfferTemplateElement) => {
    const frame = {
      position: 'absolute' as const,
      left: element.x * scale,
      top: element.y * scale,
      width: element.width * scale,
      height: element.height * scale,
      zIndex: element.zIndex ?? 2,
      opacity: element.opacity ?? 1,
      transform: rotationTransform(element.rotation),
      borderRadius: (element.borderRadius || 0) * scale,
      borderWidth: (element.borderWidth || 0) * scale,
      borderColor: element.borderColor || 'transparent',
      borderStyle: element.borderStyle || 'solid',
    } as const;
    if (element.type === 'image') return (element.imageUrl || element.src) ? <Image key={element.id} source={{ uri: element.imageUrl || element.src }} style={frame} resizeMode={element.resizeMode === 'stretch' ? 'stretch' : element.resizeMode || 'contain'} /> : null;
    if (element.type === 'shape' || element.type === 'rectangle' || element.type === 'circle' || element.type === 'divider' || element.type === 'line' || element.type === 'group') return <View key={element.id} style={[frame, { backgroundColor: element.backgroundColor || element.color || 'transparent', borderRadius: element.type === 'circle' ? 9999 : frame.borderRadius }]} />;
    const baseFontSize = element.fontSize || 42;
    const fontSize = Math.max(1, baseFontSize * scale);
    const text = resolveTemplateElementValue(element.text || element.content || '', element.field || element.key, templateValues);
    return <Text key={element.id} numberOfLines={displayLineCount(element)} adjustsFontSizeToFit minimumFontScale={0.55} allowFontScaling={false} style={[frame, styles.posterText, {
      backgroundColor: element.backgroundColor || (element.type === 'button' || element.type === 'badge' ? '#FFC400' : undefined),
      color: element.color || '#FFFFFF',
      fontSize,
       lineHeight: Math.max(1, resolveOfferLineHeight(baseFontSize, element.lineHeight) * scale),
      fontWeight: (element.fontWeight || '700') as '400' | '500' | '600' | '700' | '800' | '900',
       fontFamily: resolveOfferFontFamily(element.fontFamily),
      fontStyle: element.fontStyle || 'normal',
      letterSpacing: element.letterSpacing === undefined ? undefined : element.letterSpacing * scale,
      textAlign: element.textAlign || 'left',
      textAlignVertical: element.textAlignVertical || 'center',
      textDecorationLine: element.textDecorationLine || 'none',
      textTransform: element.textTransform || 'none',
     }]}>{text}</Text>;
  };

  return (
    <View style={[styles.templateThumb, styles.templateCanvasThumb]}>
      <View style={{ width: poster.width * scale, height: poster.height * scale, overflow: 'hidden', backgroundColor: poster.backgroundColor || template.primaryColor }}>
        {poster.background?.type === 'gradient' || poster.background?.type === 'linear-gradient' ? <LinearGradient colors={gradientStops(poster.background.colors, poster.background.from || template.primaryColor, poster.background.to || template.secondaryColor)} style={StyleSheet.absoluteFill} /> : null}
        {(poster.backgroundImageUrl || poster.background?.imageUrl) ? <Image source={{ uri: poster.backgroundImageUrl || poster.background?.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        {poster.overlay?.color ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: poster.overlay.color, opacity: poster.overlay.opacity ?? 0.25 }]} /> : null}
        {poster.elements.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(renderElement)}
      </View>
    </View>
  );
};

const CanvasPreview: React.FC<{
  design: OfferCardDesign;
  template?: OfferCardTemplate;
  business?: Business | null;
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  textValues: Record<string, string>;
  editingText: EditableTextKey | null;
  movingText: EditableTextKey | null;
  textOffsets: TextOffsets;
  onEditText: (kind: EditableTextKey | null) => void;
  onToggleMove: (kind: EditableTextKey) => void;
  onChangeText: (kind: EditableTextKey, value: string) => void;
  onOffsetChange: (kind: EditableTextKey, offset: TextOffset) => void;
  onMoveElement: (id: string, delta: TextOffset) => void;
  onResizeElement: (id: string, factor: number) => void;
  onRotateElement: (id: string, delta: number) => void;
  onDeleteElement: (id: string) => void;
  selectedStickerId: string | null;
  onSelectSticker: (id: string | null) => void;
  selectedImageId: string | null;
  onSelectImage: (id: string | null) => void;
  selectedShapeId: string | null;
  onSelectShape: (id: string | null) => void;
  onSelectTextElement: (id: string) => void;
  avatarOffset: TextOffset;
  onMoveAvatar: (delta: TextOffset) => void;
  avatarScale: number;
  avatarSelected: boolean;
  onSelectAvatar: () => void;
  onResizeAvatar: (factor: number) => void;
}> = ({ design, template, business, title, description, category, imageUrl, textValues, editingText, movingText, textOffsets, onEditText, onToggleMove, onChangeText, onOffsetChange, onMoveElement, onResizeElement, onRotateElement, onDeleteElement, selectedStickerId, onSelectSticker, selectedImageId, onSelectImage, selectedShapeId, onSelectShape, onSelectTextElement, avatarOffset, onMoveAvatar, avatarScale, avatarSelected, onSelectAvatar, onResizeAvatar }) => {
  const avatar = design.avatarId ? findOfferAvatar(design.avatarId) : null;
  const source = imageUrl || design.previewUrl;
  const textAlign = design.textAlign || (design.layout === 'center' ? 'center' : 'left');
  const titleSize = design.titleFontSize || 30;
  const bodySize = design.descriptionFontSize || 16;
  const poster = design.canvas || template?.canvas;
  const selectedSticker = poster?.elements.find((element) => element.id === selectedStickerId && element.id.startsWith('sticker-'));
  const selectedImage = poster?.elements.find((element) => element.id === selectedImageId && element.type === 'image');
  const selectedShape = poster?.elements.find((element) => element.id === selectedShapeId && isShapeElement(element));
  const selectedEditableElement = selectedImage || selectedShape || selectedSticker;
  const defaultValues = Object.fromEntries((template?.editableFields || []).map((field) => [field.key, field.defaultValue || '']));
  const customValues = Object.fromEntries(Object.entries(design.customizations || {}).map(([key, value]) => [key, value]));
  const values: Record<string, unknown> = {
    ...(template?.dynamicFields || {}),
    ...defaultValues,
    ...(design.dynamicFields || {}),
    ...customValues,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(category ? { category } : {}),
    business,
    businessName: business?.name || customValues.businessName || '',
    ...(imageUrl ? { imageUrls: imageUrl } : {}),
  };
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [stageSize, setStageSize] = useState<LayoutSize>({ width: 0, height: 0 });
  const posterScale = poster && canvasWidth ? canvasWidth / poster.width : 0.28;
  const canvasAspectRatio = poster && Number.isFinite(poster.width) && Number.isFinite(poster.height) && poster.width > 0 && poster.height > 0
    ? poster.width / poster.height
    : 0.82;
  const previewFrameSize = useMemo(() => {
    const availableFrameWidth = Math.min(
      CANVAS_MAX_WIDTH,
      Math.max(0, stageSize.width - CANVAS_STAGE_HORIZONTAL_PADDING * 2),
    );
    const availableFrameHeight = Math.max(
      0,
      stageSize.height - CANVAS_STAGE_VERTICAL_PADDING * 2 - (movingText ? MOVE_HINT_RESERVED_HEIGHT : 0),
    );
    const maxCanvasWidth = availableFrameWidth - CANVAS_FRAME_PADDING * 2;
    const maxCanvasHeight = availableFrameHeight - CANVAS_FRAME_PADDING * 2;

    if (maxCanvasWidth <= 0 || maxCanvasHeight <= 0) return null;

    let width = maxCanvasWidth;
    let height = width / canvasAspectRatio;
    if (height > maxCanvasHeight) {
      height = maxCanvasHeight;
      width = height * canvasAspectRatio;
    }

    return {
      width: Math.floor(width + CANVAS_FRAME_PADDING * 2),
      height: Math.floor(height + CANVAS_FRAME_PADDING * 2),
    };
  }, [canvasAspectRatio, movingText, stageSize.height, stageSize.width]);
  const handleStageLayout = useCallback((event: { nativeEvent: { layout: LayoutSize } }) => {
    const nextSize = {
      width: Math.round(event.nativeEvent.layout.width),
      height: Math.round(event.nativeEvent.layout.height),
    };
    setStageSize((current) => current.width === nextSize.width && current.height === nextSize.height ? current : nextSize);
  }, []);
  const positionFor = (element: OfferTemplateElement, canvas: OfferTemplateCanvas) => ({
    ...(() => {
      const x = element.position?.x ?? element.x;
      const y = element.position?.y ?? element.y;
      const width = element.size?.width ?? element.width;
      const height = element.size?.height ?? element.height;
      return { left: (x / canvas.width * 100) + '%', top: (y / canvas.height * 100) + '%', width: (width / canvas.width * 100) + '%', height: (height / canvas.height * 100) + '%' };
    })(),
    position: 'absolute' as const,
    zIndex: element.zIndex ?? 2,
    opacity: element.opacity ?? 1,
      transform: rotationTransform(element.rotation),
  } as any);
  const textFor = (element: OfferTemplateElement) => {
    const field = element.field || element.key;
    // Poster layers keep their starter copy in `content`, while edits are
    // stored in `posterTextValues`/`text`. Prefer the edited value so a
    // controlled TextInput does not snap back to the starter copy.
    let raw = textValues[element.id];
    if (raw === undefined && field === 'title') raw = title || element.text || element.content || '';
    if (raw === undefined && field === 'description') raw = description || element.text || element.content || '';
    if (raw === undefined && field === 'category') raw = category || element.text || element.content || '';
    if (raw === undefined && (field === 'discount' || field === 'discountPercentage')) raw = element.content || element.text || '50% OFF';
    if (raw === undefined && field === 'offerPrice') raw = element.content || element.text || '₹149';
    if (raw === undefined && field === 'originalPrice') raw = element.content || element.text || '₹299';
    if (raw === undefined && field === 'buttonText') raw = element.content || element.text || 'ORDER NOW';
    if (raw === undefined && field === 'timing') raw = element.content || element.text || '09:00 AM - 09:00 PM';
    if (raw === undefined && field === 'businessName') raw = business?.name || element.content || element.text || '';
    if (raw === undefined) raw = element.content || element.text || '';
    return textValues[element.id] !== undefined
      ? resolveDynamicValue(raw, values)
      : resolveTemplateElementValue(raw, field, values);
  };
  const imageFor = (element: OfferTemplateElement) => {
    const field = element.field || element.key || '';
    const boundValue = values[field];
    const boundImage = Array.isArray(boundValue)
      ? boundValue.find((value): value is string => typeof value === 'string' && value.length > 0)
      : typeof boundValue === 'string' && boundValue.length > 0 ? boundValue : undefined;
    const elementImage = resolveDynamicValue(element.imageUrl || element.src || '', values);
    if (field === 'imageUrls' || /image|photo|product/i.test(field)) return imageUrl || boundImage || elementImage || undefined;
    return boundImage || elementImage || imageUrl;
  };
  const renderPosterElement = (element: OfferTemplateElement) => {
    if (!poster) return null;
    const layer = positionFor(element, poster);
    if (element.visible === false) return null;
    const elementStyle = element.style || {};
    const styleValue = (key: string, fallback: any) => (elementStyle[key] as any) ?? fallback;
    const borderStyle = {
      borderRadius: (element.borderRadius ?? styleValue('borderRadius', 0)) * posterScale,
      borderWidth: (element.borderWidth ?? styleValue('borderWidth', 0)) * posterScale,
      borderColor: element.borderColor || styleValue('borderColor', 'transparent'),
      borderStyle: element.borderStyle || styleValue('borderStyle', 'solid'),
    } as const;
    if (element.type === 'image') {
      const elementImage = imageFor(element);
      const imageNode = elementImage ? <Image source={{ uri: elementImage }} style={[StyleSheet.absoluteFill, borderStyle]} resizeMode={element.resizeMode || 'contain'} /> : <View style={[StyleSheet.absoluteFill, borderStyle, { backgroundColor: element.backgroundColor || 'transparent' }]} />;
      const isSticker = element.id.startsWith('sticker-');
      return <MovablePosterElement key={element.id} style={layer} baseTransform={rotationTransform(element.rotation)} onSelect={() => isSticker ? onSelectSticker(element.id) : onSelectImage(element.id)} onTransformCommit={(scale, rotation) => { onResizeElement(element.id, scale); if (Math.abs(rotation) > 0.1) onRotateElement(element.id, rotation); }} onCommit={(delta) => onMoveElement(element.id, { x: delta.x / Math.max(posterScale, 0.01), y: delta.y / Math.max(posterScale, 0.01) })}>{imageNode}</MovablePosterElement>;
    }
    if (element.type === 'shape' || element.type === 'rectangle' || element.type === 'circle' || element.type === 'divider' || element.type === 'line' || element.type === 'group') {
      const shapeStyle = { ...borderStyle, backgroundColor: element.backgroundColor || styleValue('backgroundColor', element.color || 'transparent'), borderRadius: element.type === 'circle' ? 9999 : borderStyle.borderRadius };
      const shapeNode = <View style={[StyleSheet.absoluteFill, shapeStyle]} />;
      return <MovablePosterElement key={element.id} style={layer} baseTransform={rotationTransform(element.rotation)} onSelect={() => onSelectShape(element.id)} onTransformCommit={(scale, rotation) => { onResizeElement(element.id, scale); if (Math.abs(rotation) > 0.1) onRotateElement(element.id, rotation); }} onCommit={(delta) => onMoveElement(element.id, { x: delta.x / Math.max(posterScale, 0.01), y: delta.y / Math.max(posterScale, 0.01) })}>{shapeNode}</MovablePosterElement>;
    }
    const boundField = element.field || element.key;
    const editableKind = element.editable === false ? null : (boundField === 'title' || boundField === 'description' || boundField === 'category' ? boundField : `poster:${element.id}`);
    const baseFontSize = element.fontSize || 42;
    const scaledFontSize = Math.max(1, baseFontSize * posterScale);
    const rawLineHeight = element.lineHeight || styleValue('lineHeight', undefined);
    const textStyle = {
      ...borderStyle,
      backgroundColor: element.backgroundColor,
      color: element.color || styleValue('color', '#FFFFFF'),
      fontSize: scaledFontSize,
       lineHeight: Math.max(1, resolveOfferLineHeight(baseFontSize, rawLineHeight) * posterScale),
      fontWeight: (element.fontWeight || '700') as '400' | '500' | '600' | '700' | '800' | '900',
       fontFamily: resolveOfferFontFamily(element.fontFamily || styleValue('fontFamily', undefined)),
      fontStyle: element.fontStyle || styleValue('fontStyle', 'normal'),
      letterSpacing: element.letterSpacing === undefined ? (styleValue('letterSpacing', undefined) === undefined ? undefined : styleValue('letterSpacing', 0) * posterScale) : element.letterSpacing * posterScale,
      textAlign: (element.textAlign || styleValue('textAlign', 'left')) as 'left' | 'center' | 'right',
      textAlignVertical: element.textAlignVertical || styleValue('textAlignVertical', 'center'),
      textDecorationLine: element.textDecorationLine || styleValue('textDecorationLine', 'none'),
      textTransform: element.textTransform || styleValue('textTransform', 'none'),
    } as const;
    if (element.id.startsWith('sticker-')) {
      return <MovablePosterElement key={element.id} style={layer} baseTransform={rotationTransform(element.rotation)} onSelect={() => onSelectSticker(element.id)} onCommit={(delta) => onMoveElement(element.id, { x: delta.x / Math.max(posterScale, 0.01), y: delta.y / Math.max(posterScale, 0.01) })}><Text style={[StyleSheet.absoluteFill, styles.posterText, textStyle]} numberOfLines={displayLineCount(element)} adjustsFontSizeToFit minimumFontScale={0.55} allowFontScaling={false}>{textFor(element)}</Text></MovablePosterElement>;
    }
    if (editableKind) return <EditableCanvasText key={element.id} kind={editableKind} text={textFor(element)} placeholder={element.text || ''} showPlaceholder={false} rotation={element.rotation} style={[styles.posterText, textStyle]} layerStyle={layer} numberOfLines={displayLineCount(element)} editingText={editingText} movingText={movingText} offset={textOffsets[editableKind] || { x: 0, y: 0 }} onEditText={(kind) => { if (kind) onSelectTextElement(element.id); onEditText(kind); }} onToggleMove={onToggleMove} onChangeText={onChangeText} onOffsetChange={onOffsetChange} onTransformCommit={(scale, rotation) => { if (Math.abs(scale - 1) > 0.01) onResizeElement(element.id, scale); if (Math.abs(rotation) > 0.1) onRotateElement(element.id, rotation); }} />;
    return <MovablePosterElement key={element.id} style={layer} baseTransform={rotationTransform(element.rotation)} onTransformCommit={(scale, rotation) => { onResizeElement(element.id, scale); if (Math.abs(rotation) > 0.1) onRotateElement(element.id, rotation); }} onCommit={(delta) => onMoveElement(element.id, { x: delta.x / Math.max(posterScale, 0.01), y: delta.y / Math.max(posterScale, 0.01) })}><Text style={[StyleSheet.absoluteFill, styles.posterText, textStyle]} numberOfLines={displayLineCount(element)} adjustsFontSizeToFit minimumFontScale={0.55} allowFontScaling={false}>{textFor(element)}</Text></MovablePosterElement>;
  };

  const renderDefaultCanvas = () => (
    <LinearGradient colors={[design.primaryColor, design.secondaryColor]} style={styles.canvasCard}>
      {source ? <Image source={{ uri: source }} style={styles.canvasImage} resizeMode="cover" /> : <View style={styles.canvasImageFallback}><MaterialCommunityIcons name="image-outline" size={46} color="rgba(255,255,255,0.45)" /></View>}
      <LinearGradient colors={['rgba(0,0,0,0.03)', 'rgba(0,0,0,0.62)']} style={styles.canvasShade} />
      <View style={styles.canvasTop}><Text style={styles.canvasCategory}>{(category || 'LOCAL OFFER').toUpperCase()}</Text><View style={styles.canvasBadge}><Text style={styles.canvasBadgeText}>OFFER</Text></View></View>
      <View style={[styles.canvasCopy, design.layout === 'left' && styles.canvasCopyLeft, design.layout === 'bottom' && styles.canvasCopyBottom, design.layout === 'center' && styles.canvasCopyCenter]}>
        <EditableCanvasText kind="title" text={title} placeholder="Your offer title" style={[styles.canvasTitle, { fontSize: titleSize, lineHeight: titleSize + 4, fontWeight: (design.customizations?.titleFontWeight || design.fontWeight || '900') as '500' | '600' | '700' | '800' | '900', fontStyle: (design.customizations?.titleFontStyle || design.fontStyle || 'normal') as 'normal' | 'italic', textAlign: (design.customizations?.titleTextAlign || textAlign) as 'left' | 'center' | 'right', color: String(design.customizations?.titleColor || '#FFFFFF'), letterSpacing: Number(design.customizations?.titleLetterSpacing || 0), textDecorationLine: (design.customizations?.titleTextDecoration || 'none') as 'none' | 'underline' | 'line-through', textTransform: (design.customizations?.titleTextTransform || 'none') as 'none' | 'uppercase' | 'lowercase' | 'capitalize' }]} numberOfLines={2} editingText={editingText} movingText={movingText} offset={textOffsets.title} onEditText={(kind) => { if (kind) onSelectTextElement('$title'); onEditText(kind); }} onToggleMove={onToggleMove} onChangeText={onChangeText} onOffsetChange={onOffsetChange} />
        <EditableCanvasText kind="description" text={description} placeholder="Your offer description appears here." style={[styles.canvasDescription, { fontSize: bodySize, fontWeight: (design.customizations?.descriptionFontWeight || '600') as '500' | '600' | '700' | '800' | '900', fontStyle: (design.customizations?.descriptionFontStyle || design.fontStyle || 'normal') as 'normal' | 'italic', textAlign: (design.customizations?.descriptionTextAlign || textAlign) as 'left' | 'center' | 'right', color: String(design.customizations?.descriptionColor || 'rgba(255,255,255,0.95)'), letterSpacing: Number(design.customizations?.descriptionLetterSpacing || 0), textDecorationLine: (design.customizations?.descriptionTextDecoration || 'none') as 'none' | 'underline' | 'line-through', textTransform: (design.customizations?.descriptionTextTransform || 'none') as 'none' | 'uppercase' | 'lowercase' | 'capitalize' }]} numberOfLines={3} editingText={editingText} movingText={movingText} offset={textOffsets.description} onEditText={(kind) => { if (kind) onSelectTextElement('$description'); onEditText(kind); }} onToggleMove={onToggleMove} onChangeText={onChangeText} onOffsetChange={onOffsetChange} />
        <Text style={styles.canvasPrice}>Add price next</Text>
      </View>
      {!source && avatar ? <Image source={avatar.source} style={[styles.canvasAvatar, design.layout === 'left' && styles.canvasAvatarLeft, design.layout === 'center' && styles.canvasAvatarCenter]} /> : null}
    </LinearGradient>
  );

  return (
    <View onLayout={handleStageLayout} style={styles.canvasStage}>
      <View style={[styles.canvasPaper, previewFrameSize || styles.canvasPaperMeasuring]}>
        {poster ? (
          <View onLayout={(event) => setCanvasWidth(event.nativeEvent.layout.width)} style={[styles.canvasCard, { backgroundColor: poster.backgroundColor || design.primaryColor }]}>
            {poster.background?.type === 'gradient' || poster.background?.type === 'linear-gradient' ? <LinearGradient colors={gradientStops(poster.background.colors, poster.background.from || design.primaryColor, poster.background.to || design.secondaryColor)} style={styles.canvasImage} /> : null}
            {(poster.backgroundImageUrl || poster.background?.imageUrl) ? <Image source={{ uri: poster.backgroundImageUrl || poster.background?.imageUrl }} style={[styles.canvasImage, { opacity: poster.background?.opacity ?? 1 }]} resizeMode="cover" /> : null}
            {poster.overlay?.color ? <View pointerEvents="none" style={[styles.canvasImage, { backgroundColor: poster.overlay.color, opacity: poster.overlay.opacity ?? 0.25 }]} /> : null}
            {poster.elements.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(renderPosterElement)}
            {selectedEditableElement ? <View pointerEvents="none" style={[positionFor(selectedEditableElement, poster), styles.selectedElementFrame]} /> : null}
            {design.templateId === 'custom' && avatar ? <MovablePosterElement style={styles.blankAvatarOverlay} baseTransform={[{ translateX: avatarOffset.x * posterScale }, { translateY: avatarOffset.y * posterScale }]} onSelect={onSelectAvatar} onTransformCommit={(scale) => onResizeAvatar(scale)} onCommit={(delta) => onMoveAvatar({ x: delta.x / Math.max(posterScale, 0.01), y: delta.y / Math.max(posterScale, 0.01) })}><OfferAvatarSprite avatar={avatar} size={Math.max(72, Math.round((canvasWidth || 320) * 0.23 * avatarScale))} /></MovablePosterElement> : null}
          </View>
        ) : renderDefaultCanvas()}
      </View>
      {movingText ? <View style={styles.moveHint}><MaterialCommunityIcons name="gesture-swipe" size={15} color={theme.colors.primary} /><Text style={styles.moveHintText}>Drag selected text to move it</Text></View> : null}
    </View>
  );
};

export const OfferDesignEditorScreen: React.FC<Props> = ({ route, navigation }) => {
  const { accessToken } = useApp();
  const { businessId, designMode } = route.params;
  const [business, setBusiness] = useState<Business | null>(null);
  const [templates, setTemplates] = useState<OfferCardTemplate[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [cardDesign, setCardDesign] = useState<OfferCardDesign>(() => designMode === 'custom' ? makeBlankDesign() : DEFAULT_OFFER_CARD_DESIGN);
  const [activeTool, setActiveTool] = useState<EditorTool>(designMode === 'custom' ? 'text' : 'templates');
  const [templateCategory, setTemplateCategory] = useState('All');
  const templateScrollRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [editingText, setEditingText] = useState<EditableTextKey | null>(null);
  const [movingText, setMovingText] = useState<EditableTextKey | null>(null);
  const [textOffsets, setTextOffsets] = useState<TextOffsets>({ title: { x: 0, y: 0 }, description: { x: 0, y: 0 } });
  const [posterTextValues, setPosterTextValues] = useState<Record<string, string>>({});
  const [stickers, setStickers] = useState<OfferSticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedTextElementId, setSelectedTextElementId] = useState<string>('$title');
  const [avatarOffset, setAvatarOffset] = useState<TextOffset>({ x: 0, y: 0 });
  const [avatarScale, setAvatarScale] = useState(1);
  const [avatarSelected, setAvatarSelected] = useState(false);
  const continueInFlightRef = useRef(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useFocusEffect(useCallback(() => {
    continueInFlightRef.current = false;
    setLoading(false);
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => parent?.setOptions({ tabBarStyle: undefined });
  }, [navigation]));

  useEffect(() => {
    if (!accessToken) return;
    listMyBusinesses(accessToken).then((response) => {
      const item = response.data.find((candidate) => candidate._id === businessId) || null;
      setBusiness(item);
      if (item) {
        setCategory(item.category);
      }
    }).catch(() => Alert.alert('Business unavailable', 'Please return and select a valid business profile.'));
  }, [accessToken, businessId]);

  useEffect(() => {
    if (designMode !== 'templates') return;
    listOfferTemplates().then((response) => {
      const nextTemplates = Array.isArray(response.data) ? response.data.map(toOfferCardTemplate) : [];
      setTemplates(nextTemplates);
      if (nextTemplates[0]) setCardDesign((current) => current.templateId === DEFAULT_OFFER_CARD_DESIGN.templateId ? ({ ...current, templateId: nextTemplates[0].id, templateVersion: nextTemplates[0].version, templateSource: 'admin', previewUrl: nextTemplates[0].previewUrl, canvas: nextTemplates[0].canvas, dynamicFields: nextTemplates[0].dynamicFields || {}, avatarId: nextTemplates[0].defaultAvatarId || current.avatarId, primaryColor: nextTemplates[0].primaryColor, secondaryColor: nextTemplates[0].secondaryColor, layout: nextTemplates[0].layout }) : current);
    }).catch(() => {});
  }, [designMode]);

  useEffect(() => {
    listTemplateStickers().then((response) => setStickers(response.data || [])).catch(() => setStickers([]));
  }, []);

  const allTemplates = useMemo(() => designMode === 'templates' ? [...templates, ...OFFER_CARD_TEMPLATES] : [], [designMode, templates]);
  const templateCategories = useMemo(() => ['All', ...Array.from(new Set(allTemplates.map((template) => template.category).filter(Boolean) as string[]))], [allTemplates]);
  const visibleTemplates = useMemo(() => templateCategory === 'All' ? allTemplates : allTemplates.filter((template) => template.category?.toLowerCase() === templateCategory.toLowerCase()), [allTemplates, templateCategory]);
  const selectTemplateCategory = (category: string) => {
    setTemplateCategory(category);
    templateScrollRef.current?.scrollTo({ x: 0, animated: false });
  };
  const activeTemplate = allTemplates.find((template) => template.id === cardDesign.templateId);
  const templateValues = useMemo<Record<string, unknown>>(() => {
    const defaultValues = Object.fromEntries((activeTemplate?.editableFields || []).map((field) => [field.key, field.defaultValue || '']));
    const customValues = Object.fromEntries(Object.entries(cardDesign.customizations || {}).map(([key, value]) => [key, value]));
    return {
      ...(activeTemplate?.dynamicFields || {}),
      ...defaultValues,
      ...(cardDesign.dynamicFields || {}),
      ...customValues,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(category ? { category } : {}),
      business,
      businessName: business?.name || customValues.businessName || '',
      ...(imageUrls[0] ? { imageUrls: imageUrls[0] } : {}),
    };
  }, [activeTemplate, business, cardDesign.customizations, cardDesign.dynamicFields, category, description, imageUrls, title]);
  const textEditorLayers = useMemo(() => {
    const canvasLayers = cardDesign.canvas?.elements.filter((element) => element.editable !== false && isTextElement(element)).map((element) => ({
      id: element.id,
      label: (element.field || element.key || element.content || element.text || 'Text').replace(/([a-z])([A-Z])/g, '$1 $2'),
    })) || [];
    return canvasLayers.length ? canvasLayers : [{ id: '$title', label: 'Title' }, { id: '$description', label: 'Description' }];
  }, [cardDesign.canvas]);
  const selectedTextElement = cardDesign.canvas?.elements.find((element) => element.id === selectedTextElementId);
  const selectedShapeElement = cardDesign.canvas?.elements.find((element) => element.id === selectedShapeId && isShapeElement(element));
  const selectedTextKind: EditableTextKey = selectedTextElement
    ? ['title', 'description', 'category'].includes(selectedTextElement.field || selectedTextElement.key || '')
      ? (selectedTextElement.field || selectedTextElement.key || '')
      : `poster:${selectedTextElement.id}`
    : selectedTextElementId === '$description' ? 'description' : 'title';
  const selectedCanvasText = selectedTextElement
    ? posterTextValues[selectedTextElement.id] !== undefined
      ? resolveDynamicValue(posterTextValues[selectedTextElement.id], templateValues)
      : resolveTemplateElementValue(selectedTextElement.content ?? selectedTextElement.text ?? '', selectedTextElement.field || selectedTextElement.key, templateValues)
    : '';
  const selectedTextValue = selectedTextKind === 'title'
    ? title || selectedCanvasText
    : selectedTextKind === 'description'
      ? description || selectedCanvasText
      : selectedTextKind === 'category'
        ? category || selectedCanvasText
        : selectedCanvasText;
  const selectedTextPrefix = selectedTextElementId === '$description' ? 'description' : 'title';
  const selectedTextSettings = {
    fontSize: selectedTextElement?.fontSize || (selectedTextPrefix === 'description' ? cardDesign.descriptionFontSize || 16 : cardDesign.titleFontSize || 30),
    fontWeight: selectedTextElement?.fontWeight || String(cardDesign.customizations?.[`${selectedTextPrefix}FontWeight`] || (selectedTextPrefix === 'title' ? cardDesign.fontWeight : '600') || '700'),
    fontStyle: selectedTextElement?.fontStyle || String(cardDesign.customizations?.[`${selectedTextPrefix}FontStyle`] || cardDesign.fontStyle || 'normal'),
    textAlign: selectedTextElement?.textAlign || String(cardDesign.customizations?.[`${selectedTextPrefix}TextAlign`] || cardDesign.textAlign || 'left'),
    color: selectedTextElement?.color || String(cardDesign.customizations?.[`${selectedTextPrefix}Color`] || '#FFFFFF'),
    letterSpacing: selectedTextElement?.letterSpacing ?? Number(cardDesign.customizations?.[`${selectedTextPrefix}LetterSpacing`] || 0),
    textDecorationLine: selectedTextElement?.textDecorationLine || String(cardDesign.customizations?.[`${selectedTextPrefix}TextDecoration`] || 'none'),
    textTransform: selectedTextElement?.textTransform || String(cardDesign.customizations?.[`${selectedTextPrefix}TextTransform`] || 'none'),
  };

  useEffect(() => {
    if (!textEditorLayers.some((layer) => layer.id === selectedTextElementId)) setSelectedTextElementId(textEditorLayers[0]?.id || '$title');
  }, [selectedTextElementId, textEditorLayers]);

  const changeCanvasText = useCallback((kind: EditableTextKey, value: string) => {
    if (kind === 'title') setTitle(value);
    else if (kind === 'description') setDescription(value);
    else if (kind === 'category') setCategory(value);
    else if (kind.startsWith('poster:')) {
      const elementId = kind.slice('poster:'.length);
      setPosterTextValues((current) => ({ ...current, [elementId]: value }));
      setCardDesign((current) => current.canvas ? ({ ...current, canvas: { ...current.canvas, elements: current.canvas.elements.map((element) => element.id === elementId ? { ...element, text: value, content: value } : element) } }) : current);
    }
  }, []);
  const changeTextOffset = useCallback((kind: EditableTextKey, offset: TextOffset) => {
    setTextOffsets((current) => ({ ...current, [kind]: offset }));
  }, []);
  const moveCanvasElement = useCallback((id: string, delta: TextOffset) => {
    setCardDesign((current) => current.canvas ? ({
      ...current,
      canvas: {
        ...current.canvas,
        elements: current.canvas.elements.map((element) => element.id === id ? {
          ...element,
          x: Math.max(0, Math.min(current.canvas!.width - element.width, element.x + delta.x)),
          y: Math.max(0, Math.min(current.canvas!.height - element.height, element.y + delta.y)),
          position: {
            x: Math.max(0, Math.min(current.canvas!.width - element.width, element.x + delta.x)),
            y: Math.max(0, Math.min(current.canvas!.height - element.height, element.y + delta.y)),
          },
        } : element),
      },
    }) : current);
  }, []);
  const resizeCanvasElement = useCallback((id: string, factor: number) => {
    setCardDesign((current) => current.canvas ? ({
      ...current,
      canvas: {
        ...current.canvas,
        elements: current.canvas.elements.map((element) => {
          if (element.id !== id) return element;
          const nextWidth = Math.max(80, Math.min(current.canvas!.width, Math.round(element.width * factor)));
          const nextHeight = Math.max(80, Math.min(current.canvas!.height, Math.round(element.height * factor)));
          const nextX = Math.max(0, Math.min(current.canvas!.width - nextWidth, element.x - (nextWidth - element.width) / 2));
          const nextY = Math.max(0, Math.min(current.canvas!.height - nextHeight, element.y - (nextHeight - element.height) / 2));
          return {
            ...element,
            x: nextX,
            y: nextY,
            width: nextWidth,
            height: nextHeight,
            position: { x: nextX, y: nextY },
            size: { width: nextWidth, height: nextHeight },
            ...(element.fontSize ? { fontSize: Math.max(8, Math.min(400, Math.round(element.fontSize * factor))) } : {}),
          };
        }),
      },
    }) : current);
  }, []);
  const rotateCanvasElement = useCallback((id: string, delta: number) => {
    setCardDesign((current) => current.canvas ? ({
      ...current,
      canvas: { ...current.canvas, elements: current.canvas.elements.map((element) => element.id === id ? { ...element, rotation: ((Number(element.rotation) || 0) + delta + 360) % 360 } : element) },
    }) : current);
  }, []);
  const deleteCanvasElement = useCallback((id: string) => {
    setCardDesign((current) => current.canvas ? ({ ...current, canvas: { ...current.canvas, elements: current.canvas.elements.filter((element) => element.id !== id) } }) : current);
    setSelectedStickerId((current) => current === id ? null : current);
    setSelectedImageId((current) => current === id ? null : current);
    setSelectedShapeId((current) => current === id ? null : current);
  }, []);
  const updateSelectedTextStyle = useCallback((patch: Partial<Pick<OfferTemplateElement, 'fontSize' | 'fontWeight' | 'fontStyle' | 'textAlign' | 'color' | 'letterSpacing' | 'textDecorationLine' | 'textTransform'>>) => {
    setCardDesign((current) => {
      if (current.canvas && !selectedTextElementId.startsWith('$')) {
        return { ...current, canvas: { ...current.canvas, elements: current.canvas.elements.map((element) => element.id === selectedTextElementId ? { ...element, ...patch } : element) } };
      }
      const prefix = selectedTextElementId === '$description' ? 'description' : 'title';
      const nextCustomizations = { ...(current.customizations || {}) };
      if (patch.fontWeight !== undefined) nextCustomizations[`${prefix}FontWeight`] = patch.fontWeight;
      if (patch.fontStyle !== undefined) nextCustomizations[`${prefix}FontStyle`] = patch.fontStyle;
      if (patch.textAlign !== undefined) nextCustomizations[`${prefix}TextAlign`] = patch.textAlign;
      if (patch.color !== undefined) nextCustomizations[`${prefix}Color`] = patch.color;
      if (patch.letterSpacing !== undefined) nextCustomizations[`${prefix}LetterSpacing`] = patch.letterSpacing;
      if (patch.textDecorationLine !== undefined) nextCustomizations[`${prefix}TextDecoration`] = patch.textDecorationLine;
      if (patch.textTransform !== undefined) nextCustomizations[`${prefix}TextTransform`] = patch.textTransform;
      return {
        ...current,
        customizations: nextCustomizations,
        ...(patch.fontSize !== undefined ? prefix === 'description' ? { descriptionFontSize: Math.round(patch.fontSize) } : { titleFontSize: Math.round(patch.fontSize) } : {}),
        ...(prefix === 'title' && patch.fontWeight !== undefined ? { fontWeight: patch.fontWeight as OfferCardDesign['fontWeight'] } : {}),
        ...(prefix === 'title' && patch.fontStyle !== undefined ? { fontStyle: patch.fontStyle } : {}),
        ...(prefix === 'title' && patch.textAlign !== undefined ? { textAlign: patch.textAlign } : {}),
      };
    });
  }, [selectedTextElementId]);
  const addTextLayer = useCallback(() => {
    const id = `custom-text-${Date.now()}`;
    setCardDesign((current) => {
      const canvas = current.canvas || makeCanvasFromDesign(current);
      const zIndex = Math.max(...canvas.elements.map((element) => element.zIndex || 0), 0) + 1;
      const element: OfferTemplateElement = {
        id, type: 'text', text: 'New text', content: 'New text', x: Math.round(canvas.width * 0.1), y: Math.round(canvas.height * 0.22),
        width: Math.round(canvas.width * 0.8), height: Math.round(canvas.height * 0.1), zIndex, color: '#FFFFFF', fontSize: 58,
        fontWeight: '700', textAlign: 'center', textAlignVertical: 'center', editable: true,
      };
      return { ...current, canvas: { ...canvas, elements: [...canvas.elements, element] } };
    });
    setSelectedTextElementId(id);
    setPosterTextValues((current) => ({ ...current, [id]: 'New text' }));
  }, []);
  const addShapeLayer = useCallback((type: 'rectangle' | 'circle') => {
    const id = `custom-shape-${Date.now()}`;
    setCardDesign((current) => {
      const canvas = current.canvas || makeCanvasFromDesign(current);
      const size = Math.round(Math.min(canvas.width, canvas.height) * 0.24);
      const element: OfferTemplateElement = {
        id,
        type,
        x: Math.round((canvas.width - size) / 2),
        y: Math.round((canvas.height - size) / 2),
        width: size,
        height: type === 'circle' ? size : Math.round(size * 0.72),
        zIndex: Math.max(...canvas.elements.map((item) => item.zIndex || 0), 0) + 1,
        editable: true,
        backgroundColor: '#FFC107',
        borderColor: '#FFFFFF',
        borderWidth: 0,
        borderRadius: type === 'circle' ? size / 2 : 24,
        opacity: 1,
      };
      return { ...current, canvas: { ...canvas, elements: [...canvas.elements, element] } };
    });
    setSelectedShapeId(id);
    setSelectedImageId(null);
    setSelectedStickerId(null);
  }, []);
  const updateSelectedShape = useCallback((patch: Partial<Pick<OfferTemplateElement, 'backgroundColor' | 'borderColor' | 'borderWidth' | 'borderRadius' | 'opacity'>>) => {
    if (!selectedShapeId) return;
    setCardDesign((current) => current.canvas ? ({
      ...current,
      canvas: { ...current.canvas, elements: current.canvas.elements.map((element) => element.id === selectedShapeId ? { ...element, ...patch } : element) },
    }) : current);
  }, [selectedShapeId]);
  const moveAvatar = useCallback((delta: TextOffset) => {
    setAvatarOffset((current) => {
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      setCardDesign((design) => ({ ...design, customizations: { ...(design.customizations || {}), avatarOffsetX: next.x, avatarOffsetY: next.y } }));
      return next;
    });
  }, []);
  const resizeAvatar = useCallback((factor: number) => {
    setAvatarScale((current) => {
      const next = Math.max(0.55, Math.min(2.2, current * factor));
      setCardDesign((design) => ({ ...design, customizations: { ...(design.customizations || {}), avatarScale: next } }));
      return next;
    });
  }, []);
  const toggleMoveText = useCallback((kind: EditableTextKey) => {
    setMovingText((current) => current === kind ? null : kind);
  }, []);

  const templateCopy = useCallback((field: string) => {
    const element = cardDesign.canvas?.elements
      .slice()
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .find((item) => (item.field || item.key) === field);
    const copy = element?.content || element?.text || '';
    return copy === 'Add text' ? '' : copy;
  }, [cardDesign.canvas]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission needed', 'Allow photo access to add an offer image.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8, base64: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const image = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
    if (!image) return;
    setImageUrls([image]);
    if (cardDesign.templateId === 'custom') {
      setCardDesign((current) => {
        const canvas = current.canvas || makeBlankCanvas();
        const existing = canvas.elements.find((element) => element.id === 'blank-upload-image' || element.field === 'imageUrls');
        const imageElement: OfferTemplateElement = {
          id: 'blank-upload-image', type: 'image', field: 'imageUrls', imageUrl: image,
          x: 120, y: 420, width: 840, height: 500, zIndex: 3, editable: true, resizeMode: 'contain',
        };
        const elements = existing
          ? canvas.elements.map((element) => element.id === existing.id ? { ...element, imageUrl: image } : element)
          : [...canvas.elements, imageElement];
        return { ...current, canvas: { ...canvas, backgroundColor: '#FFFFFF', background: { type: 'solid', color: '#FFFFFF' }, elements } };
      });
    }
  };

  const addStickerToCanvas = (sticker: OfferSticker) => {
    const stickerId = `sticker-${sticker._id}-${Date.now()}`;
    setCardDesign((current) => {
      const canvas = current.canvas || makeCanvasFromDesign(current);
      const stickerCount = canvas.elements.filter((element) => element.id.startsWith('sticker-')).length;
      const size = Math.max(140, Math.min(280, Math.round(Math.min(canvas.width, canvas.height) * 0.2)));
      const offset = (stickerCount % 4) * 24;
      const base = {
        id: stickerId,
        x: Math.max(0, Math.round((canvas.width - size) / 2 + offset)),
        y: Math.max(0, Math.round((canvas.height - size) / 2 + offset)),
        width: size,
        height: size,
        zIndex: Math.max(...canvas.elements.map((element) => element.zIndex || 0), 0) + 1,
        editable: true,
      };
      const element: OfferTemplateElement = sticker.kind === 'image' && sticker.imageUrl
        ? { ...base, type: 'image', imageUrl: sticker.imageUrl, src: sticker.imageUrl, resizeMode: 'contain' }
        : { ...base, type: 'badge', text: sticker.emoji || '★', content: sticker.emoji || '★', color: '#111827', backgroundColor: 'transparent', fontSize: Math.round(size * 0.62), textAlign: 'center', textAlignVertical: 'center' };
      return { ...current, canvas: { ...canvas, elements: [...canvas.elements, element] } };
    });
    setSelectedStickerId(stickerId);
    setSelectedImageId(null);
  };

  const selectBlankAvatar = (avatarId: string) => {
    if (cardDesign.templateId !== 'custom') {
      Alert.alert('Start blank to add avatars', 'Choose Start blank first, then add an avatar to your canvas.');
      return;
    }
    setCardDesign((current) => ({ ...current, avatarId }));
    setAvatarSelected(true);
  };

  const continueToDetails = () => {
    if (continueInFlightRef.current) return;
    const nextTitle = title.trim() || templateCopy('title') || activeTemplate?.name || 'Special offer';
    const nextDescription = description.trim() || templateCopy('description') || 'Freshly prepared just for you.';
    const nextCategory = category.trim() || activeTemplate?.category || business?.category || 'Food';
    if (!business) return Alert.alert('Business unavailable', 'Please return and select a valid business profile.');
    setTitle(nextTitle);
    setDescription(nextDescription);
    setCategory(nextCategory);
    continueInFlightRef.current = true;
    setLoading(true);
    navigation.navigate('CreateOffer', {
      businessId,
      designMode,
    initialDesign: {
        ...cardDesign,
        customizations: {
          ...(cardDesign.customizations || {}),
          title: nextTitle,
          description: nextDescription,
          category: nextCategory,
          titleOffsetX: textOffsets.title.x,
          titleOffsetY: textOffsets.title.y,
          descriptionOffsetX: textOffsets.description.x,
          descriptionOffsetY: textOffsets.description.y,
          posterTextValues: JSON.stringify(posterTextValues),
          posterTextOffsets: JSON.stringify(Object.fromEntries(Object.entries(textOffsets).filter(([key]) => key.startsWith('poster:')))),
          avatarOffsetX: avatarOffset.x,
          avatarOffsetY: avatarOffset.y,
          avatarScale,
        },
      },
      initialTitle: nextTitle,
      initialDescription: nextDescription,
      initialCategory: nextCategory,
      initialImageUrls: imageUrls,
    });
  };

  const selectTemplate = (template: OfferCardTemplate) => {
    Keyboard.dismiss();
    setPosterTextValues({});
    setTextOffsets({ title: { x: 0, y: 0 }, description: { x: 0, y: 0 } });
    setEditingText(null);
    setMovingText(null);
    setSelectedStickerId(null);
    setSelectedImageId(null);
    setAvatarSelected(false);
    setSelectedTextElementId(template.canvas?.elements.find((element) => element.editable !== false && isTextElement(element))?.id || '$title');
    setAvatarOffset({ x: 0, y: 0 });
    setCardDesign((current) => ({ ...current, templateId: template.id, templateVersion: template.version, templateSource: template.source || 'system', previewUrl: template.previewUrl, canvas: template.canvas, dynamicFields: template.dynamicFields || {}, avatarId: template.id === 'custom' ? '' : (template.defaultAvatarId || current.avatarId), primaryColor: template.primaryColor, secondaryColor: template.secondaryColor, layout: template.layout }));
  };

  const selectBlankTemplate = () => {
    Keyboard.dismiss();
    setPosterTextValues({});
    setTextOffsets({ title: { x: 0, y: 0 }, description: { x: 0, y: 0 } });
    setEditingText(null);
    setMovingText(null);
    setSelectedStickerId(null);
    setSelectedImageId(null);
    setAvatarSelected(false);
    setSelectedTextElementId('blank-add-text');
    setAvatarOffset({ x: 0, y: 0 });
    setAvatarScale(1);
    setImageUrls([]);
    setCardDesign((current) => ({ ...current, ...makeBlankDesign() }));
  };

  const renderTextPanel = () => {
    const minimumFontSize = selectedTextElement ? 12 : selectedTextPrefix === 'description' ? 11 : 16;
    const maximumFontSize = selectedTextElement ? 200 : selectedTextPrefix === 'description' ? 28 : 56;
    return <View>
      <View style={styles.panelHeadingRow}><View style={styles.flex}><Text style={styles.panelTitle}>Text editor</Text><Text style={styles.panelHint}>Select a layer, edit its copy and style it independently.</Text></View><Pressable onPress={addTextLayer} style={styles.compactAction}><MaterialCommunityIcons name="format-text-variant-outline" size={16} color={theme.colors.primary} /><Text style={styles.compactActionText}>Add text</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layerPicker}>{textEditorLayers.map((layer) => <Pressable key={layer.id} onPress={() => setSelectedTextElementId(layer.id)} style={[styles.layerChip, selectedTextElementId === layer.id && styles.layerChipActive]}><Text numberOfLines={1} style={[styles.layerChipText, selectedTextElementId === layer.id && styles.layerChipTextActive]}>{layer.label}</Text></Pressable>)}</ScrollView>
      <TextInput value={selectedTextValue} onChangeText={(value) => changeCanvasText(selectedTextKind, value)} multiline placeholder="Type your text" placeholderTextColor={theme.colors.textMuted} style={[styles.textInput, styles.editorTextInput]} />
      <View style={styles.controlLabelRow}><Text style={styles.inputLabel}>Font size</Text><Text style={styles.controlValue}>{Math.round(selectedTextSettings.fontSize)} px</Text></View>
      <Slider style={styles.fullSlider} minimumValue={minimumFontSize} maximumValue={maximumFontSize} step={1} value={selectedTextSettings.fontSize} onValueChange={(value) => updateSelectedTextStyle({ fontSize: value })} minimumTrackTintColor={theme.colors.primary} maximumTrackTintColor={theme.colors.border} thumbTintColor={theme.colors.primary} />
      <Text style={styles.inputLabel}>Weight</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>{FONT_WEIGHT_OPTIONS.map((option) => <Pressable key={option.value} onPress={() => updateSelectedTextStyle({ fontWeight: option.value })} style={[styles.choice, selectedTextSettings.fontWeight === option.value && styles.choiceActive]}><Text style={[styles.choiceText, { fontWeight: option.value }]}>{option.label}</Text></Pressable>)}</ScrollView>
      <Text style={styles.inputLabel}>Style</Text><View style={styles.choiceRow}>
        <Pressable onPress={() => updateSelectedTextStyle({ fontStyle: selectedTextSettings.fontStyle === 'italic' ? 'normal' : 'italic' })} style={[styles.choice, selectedTextSettings.fontStyle === 'italic' && styles.choiceActive]}><MaterialCommunityIcons name="format-italic" size={18} color={theme.colors.textSecondary} /><Text style={styles.choiceText}>Italic</Text></Pressable>
        <Pressable onPress={() => updateSelectedTextStyle({ textDecorationLine: selectedTextSettings.textDecorationLine === 'underline' ? 'none' : 'underline' })} style={[styles.choice, selectedTextSettings.textDecorationLine === 'underline' && styles.choiceActive]}><MaterialCommunityIcons name="format-underline" size={18} color={theme.colors.textSecondary} /><Text style={styles.choiceText}>Underline</Text></Pressable>
        <Pressable onPress={() => updateSelectedTextStyle({ textTransform: selectedTextSettings.textTransform === 'uppercase' ? 'none' : 'uppercase' })} style={[styles.choice, selectedTextSettings.textTransform === 'uppercase' && styles.choiceActive]}><MaterialCommunityIcons name="format-letter-case-upper" size={18} color={theme.colors.textSecondary} /><Text style={styles.choiceText}>Uppercase</Text></Pressable>
      </View>
      <Text style={styles.inputLabel}>Alignment</Text><View style={styles.choiceRow}>{(['left', 'center', 'right'] as const).map((align) => <Pressable key={align} onPress={() => updateSelectedTextStyle({ textAlign: align })} style={[styles.iconChoice, selectedTextSettings.textAlign === align && styles.choiceActive]}><MaterialCommunityIcons name={`format-align-${align}` as React.ComponentProps<typeof MaterialCommunityIcons>['name']} size={19} color={selectedTextSettings.textAlign === align ? theme.colors.primary : theme.colors.textSecondary} /></Pressable>)}</View>
      <Text style={styles.inputLabel}>Text color</Text><View style={styles.textColorRow}>{TEXT_COLOR_OPTIONS.map((color) => <Pressable key={color} onPress={() => updateSelectedTextStyle({ color })} style={[styles.textColorChoice, { backgroundColor: color }, selectedTextSettings.color.toUpperCase() === color && styles.textColorChoiceActive]}><MaterialCommunityIcons name="check" size={14} color={color === '#FFFFFF' || color === '#FFC107' ? '#111827' : '#FFFFFF'} style={{ opacity: selectedTextSettings.color.toUpperCase() === color ? 1 : 0 }} /></Pressable>)}</View>
      <View style={styles.controlLabelRow}><Text style={styles.inputLabel}>Letter spacing</Text><Text style={styles.controlValue}>{selectedTextSettings.letterSpacing.toFixed(1)}</Text></View>
      <Slider style={styles.fullSlider} minimumValue={-2} maximumValue={20} step={0.5} value={selectedTextSettings.letterSpacing} onValueChange={(value) => updateSelectedTextStyle({ letterSpacing: value })} minimumTrackTintColor={theme.colors.primary} maximumTrackTintColor={theme.colors.border} thumbTintColor={theme.colors.primary} />
    </View>;
  };

  const renderStickerPanel = () => <View>
    <Text style={styles.panelTitle}>Stickers & avatars</Text><Text style={styles.panelHint}>Images and stickers move with one finger. Use two fingers to resize or rotate.</Text>
    <Text style={styles.inputLabel}>Your avatars</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickerScroll}>{OFFER_AVATARS.map((avatarOption) => <Pressable key={avatarOption.id} onPress={() => selectBlankAvatar(avatarOption.id)} style={[styles.avatarChoice, cardDesign.avatarId === avatarOption.id && styles.avatarChoiceActive]}><OfferAvatarSprite avatar={avatarOption} size={54} /><Text numberOfLines={1} style={styles.stickerName}>{avatarOption.name.replace('Avatar ', '#')}</Text></Pressable>)}</ScrollView>
    <Text style={styles.inputLabel}>Admin stickers</Text>{stickers.length ? <View style={styles.stickerGrid}>{stickers.map((sticker) => <Pressable key={sticker._id} onPress={() => addStickerToCanvas(sticker)} style={styles.stickerTile}>{sticker.kind === 'image' && sticker.imageUrl ? <Image source={{ uri: sticker.imageUrl }} style={styles.stickerImage} resizeMode="contain" /> : <Text style={styles.stickerEmoji}>{sticker.emoji || '★'}</Text>}<Text numberOfLines={1} style={styles.stickerName}>{sticker.name}</Text></Pressable>)}</View> : <View style={styles.emptySticker}><MaterialCommunityIcons name="sticker-outline" size={22} color={theme.colors.textMuted} /><Text style={styles.panelHint}>Admin stickers will appear here.</Text></View>}
  </View>;

  const renderShapePanel = () => <View>
    <Text style={styles.panelTitle}>Shapes</Text>
    <Text style={styles.panelHint}>Add a shape, drag its area on the canvas, resize it, and customize the look.</Text>
    <View style={styles.choiceRow}>
      <Pressable onPress={() => addShapeLayer('rectangle')} style={styles.shapeAddButton}><MaterialCommunityIcons name="rectangle-outline" size={19} color={theme.colors.primary} /><Text style={styles.choiceText}>Rectangle</Text></Pressable>
      <Pressable onPress={() => addShapeLayer('circle')} style={styles.shapeAddButton}><MaterialCommunityIcons name="circle-outline" size={19} color={theme.colors.primary} /><Text style={styles.choiceText}>Circle</Text></Pressable>
    </View>
    {selectedShapeElement ? <View>
      <Text style={styles.inputLabel}>Fill color</Text>
      <View style={styles.textColorRow}>{TEXT_COLOR_OPTIONS.map((color) => <Pressable key={color} onPress={() => updateSelectedShape({ backgroundColor: color })} style={[styles.textColorChoice, { backgroundColor: color }, selectedShapeElement.backgroundColor?.toUpperCase() === color && styles.textColorChoiceActive]}><MaterialCommunityIcons name="check" size={14} color={color === '#FFFFFF' || color === '#FFC107' ? '#111827' : '#FFFFFF'} style={{ opacity: selectedShapeElement.backgroundColor?.toUpperCase() === color ? 1 : 0 }} /></Pressable>)}</View>
      <View style={styles.controlLabelRow}><Text style={styles.inputLabel}>Border width</Text><Text style={styles.controlValue}>{Math.round(selectedShapeElement.borderWidth || 0)} px</Text></View>
      <Slider style={styles.fullSlider} minimumValue={0} maximumValue={30} step={1} value={selectedShapeElement.borderWidth || 0} onValueChange={(value) => updateSelectedShape({ borderWidth: value })} minimumTrackTintColor={theme.colors.primary} maximumTrackTintColor={theme.colors.border} thumbTintColor={theme.colors.primary} />
      <View style={styles.controlLabelRow}><Text style={styles.inputLabel}>Roundness</Text><Text style={styles.controlValue}>{Math.round(selectedShapeElement.borderRadius || 0)} px</Text></View>
      <Slider style={styles.fullSlider} minimumValue={0} maximumValue={Math.min(500, Math.max(80, selectedShapeElement.width / 2))} step={1} value={Math.min(selectedShapeElement.borderRadius || 0, Math.max(80, selectedShapeElement.width / 2))} onValueChange={(value) => updateSelectedShape({ borderRadius: value })} minimumTrackTintColor={theme.colors.primary} maximumTrackTintColor={theme.colors.border} thumbTintColor={theme.colors.primary} />
      <View style={styles.controlLabelRow}><Text style={styles.inputLabel}>Opacity</Text><Text style={styles.controlValue}>{Math.round((selectedShapeElement.opacity ?? 1) * 100)}%</Text></View>
      <Slider style={styles.fullSlider} minimumValue={0.2} maximumValue={1} step={0.05} value={selectedShapeElement.opacity ?? 1} onValueChange={(value) => updateSelectedShape({ opacity: value })} minimumTrackTintColor={theme.colors.primary} maximumTrackTintColor={theme.colors.border} thumbTintColor={theme.colors.primary} />
    </View> : null}
  </View>;

  const renderToolPanel = () => {
    if (activeTool === 'templates') return <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>{templateCategories.map((item) => <Pressable key={item} onPress={() => selectTemplateCategory(item)} style={[styles.filterChip, templateCategory === item && styles.filterChipActive]}><Text style={[styles.filterChipText, templateCategory === item && styles.filterChipTextActive]}>{item}</Text></Pressable>)}</ScrollView>
      <ScrollView ref={templateScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroll}>
        <Pressable onPress={selectBlankTemplate} style={[styles.templateCard, cardDesign.templateId === BLANK_TEMPLATE.id && styles.templateCardActive]}>
          <View style={[styles.templateThumb, styles.blankTemplateThumb]}><MaterialCommunityIcons name="tune-variant" size={23} color={theme.colors.primary} /></View>
          <Text numberOfLines={2} style={styles.templateCardName}>{BLANK_TEMPLATE.name}</Text>
          {cardDesign.templateId === BLANK_TEMPLATE.id ? <View style={styles.templateCheck}><MaterialCommunityIcons name="check" size={13} color={theme.colors.textInverse} /></View> : null}
        </Pressable>
        {visibleTemplates.map((template) => <Pressable key={template.id} onPress={() => selectTemplate(template)} style={[styles.templateCard, cardDesign.templateId === template.id && styles.templateCardActive]}><TemplateThumbnail template={template} /><Text numberOfLines={2} style={styles.templateCardName}>{template.name}</Text>{cardDesign.templateId === template.id ? <View style={styles.templateCheck}><MaterialCommunityIcons name="check" size={13} color={theme.colors.textInverse} /></View> : null}</Pressable>)}
      </ScrollView>
    </View>;
    if (activeTool === 'uploads') return <View><Text style={styles.panelTitle}>Uploads</Text><Text style={styles.panelHint}>Use a product, shop or service image in your design.</Text>{imageUrls[0] ? <View style={styles.panelImageWrap}><Image source={{ uri: imageUrls[0] }} style={styles.panelImage} /><Pressable onPress={pickImage} style={styles.panelImageButton}><MaterialCommunityIcons name="image-edit-outline" size={17} color={theme.colors.textInverse} /><Text style={styles.panelImageButtonText}>Replace image</Text></Pressable><Pressable onPress={() => setImageUrls([])} style={styles.removeImage}><MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.colors.danger} /></Pressable></View> : <Pressable onPress={pickImage} style={styles.uploadBox}><MaterialCommunityIcons name="cloud-upload-outline" size={30} color={theme.colors.primary} /><Text style={styles.uploadTitle}>Upload from phone</Text><Text style={styles.panelHint}>JPG, PNG or WEBP</Text></Pressable>}</View>;
    if (activeTool === 'brand') return <View><Text style={styles.panelTitle}>Brand colors</Text><Text style={styles.panelHint}>Pick a bright palette for your offer card.</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>{OFFER_CARD_COLORS.map(([primaryColor, secondaryColor]) => <Pressable key={primaryColor} onPress={() => setCardDesign((current) => ({ ...current, primaryColor, secondaryColor }))} style={[styles.colorTile, cardDesign.primaryColor === primaryColor && styles.colorTileActive]}><LinearGradient colors={[primaryColor, secondaryColor]} style={styles.colorSwatch} /></Pressable>)}</ScrollView></View>;
    if (activeTool === 'stickers') return renderStickerPanel();
    if (activeTool === 'shapes') return renderShapePanel();
    if (activeTool === 'text') return renderTextPanel();
    return null;
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']} backgroundColor="#F5F5F7">
      <LinearGradient colors={[theme.colors.primaryBright, theme.colors.primary, theme.colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topBar}>
        <Pressable onPress={navigation.goBack} style={styles.topIcon}><MaterialCommunityIcons name="arrow-left" size={23} color="#FFFFFF" /></Pressable>
        <View style={styles.topTitleWrap}><Text style={styles.topTitle}>Design offer</Text><Text style={styles.topSubtitle}>{business?.name || 'Your business'}</Text></View>
        <Pressable onPress={continueToDetails} disabled={loading} style={styles.topContinue}><Text style={styles.topContinueText}>{loading ? 'Saving…' : 'Continue'}</Text><MaterialCommunityIcons name="arrow-right" size={17} color={theme.colors.primaryDark} /></Pressable>
      </LinearGradient>
      <View style={styles.editorBody}><View style={styles.projectHeader}><View><Text style={styles.projectTitle}>Design offer</Text><Text style={styles.projectSubtitle}>{business?.name || 'Your business'}</Text></View><View style={styles.saved}><MaterialCommunityIcons name="cloud-check-outline" size={16} color={theme.colors.success} /><Text style={styles.savedText}>Saved</Text></View></View><CanvasPreview business={business} template={activeTemplate} design={cardDesign} title={title} description={description} category={category} imageUrl={imageUrls[0]} textValues={posterTextValues} editingText={editingText} movingText={movingText} textOffsets={textOffsets} onEditText={setEditingText} onToggleMove={toggleMoveText} onChangeText={changeCanvasText} onOffsetChange={changeTextOffset} onMoveElement={moveCanvasElement} onResizeElement={resizeCanvasElement} onRotateElement={rotateCanvasElement} onDeleteElement={deleteCanvasElement} selectedStickerId={selectedStickerId} onSelectSticker={(id) => { setSelectedStickerId(id); if (id) { setSelectedImageId(null); setSelectedShapeId(null); } }} selectedImageId={selectedImageId} onSelectImage={(id) => { setSelectedImageId(id); if (id) { setSelectedStickerId(null); setSelectedShapeId(null); } }} selectedShapeId={selectedShapeId} onSelectShape={(id) => { setSelectedShapeId(id); if (id) { setSelectedStickerId(null); setSelectedImageId(null); } }} onSelectTextElement={setSelectedTextElementId} avatarOffset={avatarOffset} onMoveAvatar={moveAvatar} avatarScale={avatarScale} avatarSelected={avatarSelected} onSelectAvatar={() => { setAvatarSelected(true); setSelectedImageId(null); setSelectedShapeId(null); setSelectedStickerId(null); }} onResizeAvatar={resizeAvatar} /><View style={styles.pageDots}><View style={styles.pageDotActive} /><View style={styles.pageDot} /></View></View>
       {!keyboardVisible ? <View style={styles.panel}><ScrollView style={styles.panelContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{renderToolPanel()}</ScrollView></View> : null}
       {!keyboardVisible ? <View style={styles.bottomToolsBar}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomTools}>
         {TOOLS.map((tool) => <Pressable key={tool.id} onPress={() => { Keyboard.dismiss(); setEditingText(null); setMovingText(null); setActiveTool(tool.id); }} style={[styles.bottomTool, activeTool === tool.id && styles.bottomToolActive]}>
           <MaterialCommunityIcons name={tool.icon} size={22} color={activeTool === tool.id ? theme.colors.primary : theme.colors.textSecondary} />
           <Text style={[styles.bottomToolLabel, activeTool === tool.id && styles.bottomToolLabelActive]}>{tool.label}</Text>
           {tool.id === 'brand' ? <Text style={styles.proBadge}>PRO</Text> : null}
         </Pressable>)}
       </ScrollView></View> : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  topBar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7 }, topIcon: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' }, topTitleWrap: { flex: 1, paddingHorizontal: 3 }, topTitle: { ...theme.typography.bodyBold, color: theme.colors.textInverse }, topSubtitle: { ...theme.typography.tiny, color: 'rgba(255,255,255,0.78)', marginTop: 1 }, topContinue: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 18, backgroundColor: theme.colors.surface, paddingHorizontal: 13 }, topContinueText: { ...theme.typography.caption, color: theme.colors.primaryDark, fontWeight: '900' },
  editorBody: { flex: 1, minHeight: 0 }, projectHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 4 }, projectTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, projectSubtitle: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 2 }, saved: { flexDirection: 'row', alignItems: 'center', gap: 4 }, savedText: { ...theme.typography.tiny, color: theme.colors.success, fontWeight: '800' },
  canvasStage: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: CANVAS_STAGE_HORIZONTAL_PADDING, paddingVertical: CANVAS_STAGE_VERTICAL_PADDING }, canvasPaper: { backgroundColor: '#FFFFFF', padding: CANVAS_FRAME_PADDING, shadowColor: '#556070', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 }, canvasPaperMeasuring: { width: 1, height: 1, opacity: 0 }, canvasCard: { flex: 1, borderRadius: 3, overflow: 'hidden', position: 'relative' }, blankAvatarOverlay: { position: 'absolute', right: 12, bottom: 12, zIndex: 20 }, avatarResizeControls: { position: 'absolute', right: 0, top: -36, flexDirection: 'row', gap: 5, padding: 3, borderRadius: 10, backgroundColor: 'rgba(17,24,39,0.88)' }, avatarResizeButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)' }, blankTemplateThumb: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D5D8DE' }, canvasImage: { ...StyleSheet.absoluteFill, opacity: 0.48 }, canvasImageFallback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }, canvasShade: { ...StyleSheet.absoluteFill }, canvasTop: { position: 'absolute', top: 16, left: 16, right: 16, zIndex: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, canvasCategory: { maxWidth: '65%', color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }, canvasBadge: { borderRadius: 99, backgroundColor: '#FFFFFF', paddingHorizontal: 9, paddingVertical: 5 }, canvasBadgeText: { color: theme.colors.accent, fontSize: 9, fontWeight: '900' }, canvasCopy: { position: 'absolute', left: 17, bottom: 22, width: '62%', zIndex: 4 }, canvasCopyLeft: { left: '38%', width: '57%' }, canvasCopyBottom: { width: '88%', bottom: 19 }, canvasCopyCenter: { left: '4%', width: '92%', alignItems: 'center' }, canvasMovableText: { alignSelf: 'stretch', position: 'relative' }, canvasTextTouch: { width: '100%', borderWidth: 1, borderColor: 'transparent', borderRadius: 5 }, canvasTextSelected: { borderColor: 'rgba(255,255,255,0.82)', borderStyle: 'dashed', paddingHorizontal: 4, marginHorizontal: -4 }, canvasMoveHandle: { position: 'absolute', right: -12, top: -12, width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.colors.primary, elevation: 3, zIndex: 8 }, canvasMoveHandleActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryDark }, canvasTextInput: { minWidth: 120, padding: 0, includeFontPadding: false }, canvasTitle: { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.22)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }, canvasDescription: { color: 'rgba(255,255,255,0.95)', marginTop: 5, lineHeight: 20, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }, posterText: { includeFontPadding: false }, canvasPrice: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 12 }, canvasAvatar: { position: 'absolute', right: -15, bottom: -8, width: 175, height: 210, resizeMode: 'contain', zIndex: 3 }, canvasAvatarLeft: { left: -18, right: undefined }, canvasAvatarCenter: { left: '50%', right: undefined, marginLeft: -87 }, moveHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: theme.colors.primaryLight }, moveHintText: { ...theme.typography.tiny, color: theme.colors.primaryDark, fontWeight: '800' }, pageDots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 9 }, pageDotActive: { width: 18, height: 7, borderRadius: 5, backgroundColor: '#9EA4AD' }, pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D6D9DE' }, stickerScroll: { gap: 8, paddingVertical: 9 }, avatarChoice: { width: 68, alignItems: 'center', padding: 4, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' }, avatarChoiceActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }, stickerName: { ...theme.typography.tiny, color: theme.colors.textSecondary, marginTop: 3, textAlign: 'center', maxWidth: 78 }, stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 7 }, stickerTile: { width: 76, minHeight: 76, alignItems: 'center', justifyContent: 'center', padding: 5, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background }, stickerImage: { width: 48, height: 48 }, stickerEmoji: { fontSize: 40, lineHeight: 48 }, emptySticker: { minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  panel: { maxHeight: 320, minHeight: 150, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }, panelContent: { flex: 1 }, panelTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, panelHint: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 }, categoryScroll: { flexDirection: 'row', gap: 6, paddingVertical: 5 }, filterChip: { flexShrink: 0, borderRadius: 99, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 8, paddingVertical: 3 }, filterChipActive: { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary }, filterChipText: { ...theme.typography.tiny, color: theme.colors.textSecondary, fontWeight: '800' }, filterChipTextActive: { color: theme.colors.primaryDark }, templateScroll: { flexDirection: 'row', gap: 7, paddingBottom: 1 }, templateCard: { width: 80, position: 'relative', padding: 3, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background }, templateCardActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }, templateThumb: { width: '100%', height: TEMPLATE_THUMB_HEIGHT, borderRadius: 7, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, templateCanvasThumb: { backgroundColor: theme.colors.surfaceAlt }, templateCardName: { ...theme.typography.tiny, color: theme.colors.text, marginTop: 3, textAlign: 'center', fontWeight: '800', minHeight: 22 }, templateCheck: { position: 'absolute', right: 5, top: 5, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary }, disabled: { opacity: 0.55 },
  panelImageWrap: { height: 104, marginTop: 9, borderRadius: 13, overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt }, panelImage: { width: '100%', height: '100%' }, panelImageButton: { position: 'absolute', left: 9, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.64)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 }, panelImageButtonText: { ...theme.typography.tiny, color: theme.colors.textInverse, fontWeight: '800' }, removeImage: { position: 'absolute', right: 9, top: 8, width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface }, uploadBox: { minHeight: 98, marginTop: 9, borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, uploadTitle: { ...theme.typography.bodyBold, color: theme.colors.primary, marginTop: 4 },
  colorScroll: { gap: 10, paddingVertical: 14 }, colorTile: { width: 40, height: 40, borderRadius: 20, padding: 3, borderWidth: 2, borderColor: 'transparent' }, colorTileActive: { borderColor: theme.colors.text }, colorSwatch: { flex: 1, borderRadius: 99 }, inputLabel: { ...theme.typography.tiny, color: theme.colors.textSecondary, fontWeight: '800', marginTop: 8, marginBottom: 4 }, textInput: { minHeight: 39, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, color: theme.colors.text, fontSize: 14, backgroundColor: theme.colors.background }, multiline: { minHeight: 47, textAlignVertical: 'top' }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, choice: { minHeight: 33, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, paddingHorizontal: 9, justifyContent: 'center' }, choiceActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }, choiceText: { ...theme.typography.tiny, color: theme.colors.textSecondary, fontWeight: '800' },
  flex: { flex: 1 }, panelHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, compactAction: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }, compactActionText: { ...theme.typography.tiny, color: theme.colors.primaryDark, fontWeight: '900' }, shapeAddButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 9, paddingHorizontal: 11, backgroundColor: theme.colors.primaryLight },
  layerPicker: { gap: 7, paddingVertical: 9 }, layerChip: { maxWidth: 130, minHeight: 32, justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background, paddingHorizontal: 10 }, layerChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }, layerChipText: { ...theme.typography.tiny, color: theme.colors.textSecondary, textTransform: 'capitalize' }, layerChipTextActive: { color: theme.colors.primaryDark, fontWeight: '900' }, editorTextInput: { minHeight: 52, textAlignVertical: 'top' },
  controlLabelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, controlValue: { ...theme.typography.tiny, color: theme.colors.primary, fontWeight: '900', marginBottom: 4 }, sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, slider: { flex: 1, height: 34 }, fullSlider: { width: '100%', height: 34 }, stepButton: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background }, rotationHint: { flex: 1, textAlign: 'center', color: theme.colors.textMuted, fontSize: 10, lineHeight: 13 }, iconChoice: { width: 44, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9 }, textColorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, textColorChoice: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CBD0D8' }, textColorChoiceActive: { borderWidth: 3, borderColor: theme.colors.primary },
  selectedStickerBar: { minHeight: 54, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 7 }, selectedStickerTitle: { ...theme.typography.caption, color: theme.colors.primaryDark, fontWeight: '900' }, stickerEditButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, stickerDeleteButton: { borderColor: '#F8B4B4' }, optionalLabel: { color: theme.colors.textMuted, fontWeight: '600' },
  selectedElementFrame: { zIndex: 1000, borderWidth: 1.5, borderColor: '#FFFFFF', borderStyle: 'dashed' }, canvasElementControl: { position: 'absolute', top: 4, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,24,39,0.88)', borderWidth: 1, borderColor: '#FFFFFF' }, canvasElementControlLeft: { left: 4 }, canvasElementControlRight: { right: 4 }, canvasElementControlBottomLeft: { left: 4, top: undefined, bottom: 4 }, canvasElementControlBottomRight: { right: 4, top: undefined, bottom: 4 }, canvasElementDelete: { left: '50%', marginLeft: -14, top: undefined, bottom: 4, backgroundColor: 'rgba(185,28,28,0.9)' },
  bottomToolsBar: { backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 2, paddingHorizontal: 8, paddingBottom: 4 }, bottomTools: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 0 }, bottomTool: { flex: 1, minWidth: 0, maxWidth: 76, alignItems: 'center', justifyContent: 'center', position: 'relative', paddingVertical: 2 }, bottomToolActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary }, bottomToolLabel: { ...theme.typography.tiny, color: theme.colors.textSecondary, fontSize: 9, lineHeight: 11, marginTop: 2, fontWeight: '700' }, bottomToolLabelActive: { color: theme.colors.primary }, proBadge: { position: 'absolute', top: -3, right: 4, color: '#F0A51D', fontSize: 7, fontWeight: '900' },
});

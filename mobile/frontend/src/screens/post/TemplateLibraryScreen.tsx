import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listMyOffers, listOfferTemplates } from '../../services/api';
import { readOfferDesignLibrary, recordOfferTemplateUsage, type OfferDesignCreation, type OfferDesignHistoryItem } from '../../services/offerDesignStorage';
import { OFFER_CARD_TEMPLATES, resolveOfferFontFamily, resolveOfferLineHeight, resolveTemplateElementValue, toOfferCardTemplate, type OfferCardDesign, type OfferCardTemplate, type OfferTemplateCanvas, type OfferTemplateElement } from '../../config/offerCardDesigner';
import type { OfferTemplate } from '../../types/hyperlocal';
import type { PostStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<PostStackParamList, 'TemplateLibrary'>;

type LibraryItem = {
  id: string;
  name: string;
  category?: string;
  previewUrl?: string;
  source?: 'admin' | 'system' | 'custom';
  template?: OfferCardTemplate;
  design?: OfferCardDesign;
  title?: string;
  description?: string;
  imageUrls?: string[];
};

const asTemplateItem = (template: OfferCardTemplate): LibraryItem => ({
  id: template.id,
  name: template.name,
  category: template.category,
  previewUrl: template.previewUrl,
  source: template.source || 'admin',
  template,
});

const LIB_THUMB_WIDTH = 118;
const LIB_THUMB_HEIGHT = 158;

const libGradientStops = (colors: string[] | undefined, first: string, second: string): [string, string, ...string[]] => {
  const stops = colors?.filter(Boolean) || [];
  return [stops[0] || first, stops[1] || second, ...stops.slice(2)];
};

const libRotation = (rotation?: number) => (
  typeof rotation === 'number' && Number.isFinite(rotation) && rotation !== 0
    ? [{ rotate: `${rotation}deg` }]
    : []
);

const libLineCount = (element: OfferTemplateElement) => Math.max(2, element.numberOfLines || 1);

// Canvas preview for library cards. Admin templates often have no previewUrl
// but do have a canvas — without this every card falls back to the palette icon.
const LibraryCanvasThumb: React.FC<{ template?: OfferCardTemplate; design?: OfferCardDesign }> = ({ template, design }) => {
  const poster: OfferTemplateCanvas | undefined = template?.canvas || design?.canvas;
  if (!poster || !poster.width || !poster.height || !Array.isArray(poster.elements)) return null;
  const primary = template?.primaryColor || design?.primaryColor || '#4F9FE8';
  const secondary = template?.secondaryColor || design?.secondaryColor || '#2167BD';
  const values = (template?.dynamicFields || design?.dynamicFields || {}) as Record<string, unknown>;
  const scale = Math.min(LIB_THUMB_WIDTH / poster.width, LIB_THUMB_HEIGHT / poster.height);
  const renderElement = (element: OfferTemplateElement) => {
    const frame = {
      position: 'absolute' as const,
      left: element.x * scale,
      top: element.y * scale,
      width: element.width * scale,
      height: element.height * scale,
      zIndex: element.zIndex ?? 2,
      opacity: element.opacity ?? 1,
      transform: libRotation(element.rotation),
      borderRadius: (element.borderRadius || 0) * scale,
      borderWidth: (element.borderWidth || 0) * scale,
      borderColor: element.borderColor || 'transparent',
      borderStyle: element.borderStyle || 'solid',
    } as const;
    if (element.visible === false) return null;
    if (element.type === 'image') {
      const uri = element.imageUrl || element.src;
      if (!uri) return null;
      return <Image key={element.id} source={{ uri }} style={frame} resizeMode={element.resizeMode === 'stretch' ? 'stretch' : element.resizeMode || 'cover'} />;
    }
    if (element.type === 'shape' || element.type === 'rectangle' || element.type === 'circle' || element.type === 'divider' || element.type === 'line' || element.type === 'group') {
      return <View key={element.id} style={[frame, { backgroundColor: element.backgroundColor || element.color || 'transparent', borderRadius: element.type === 'circle' ? 9999 : frame.borderRadius }]} />;
    }
    if (element.avatarId) {
      return <View key={element.id} style={[frame, { backgroundColor: element.backgroundColor || 'rgba(255,255,255,0.35)', borderRadius: 9999 }]} />;
    }
    const baseFontSize = element.fontSize || 42;
    const text = resolveTemplateElementValue(element.text || element.content || '', element.field || element.key, values);
    if (!text) return null;
    return <Text key={element.id} numberOfLines={libLineCount(element)} adjustsFontSizeToFit minimumFontScale={0.55} allowFontScaling={false} style={[frame, {
      backgroundColor: element.backgroundColor || (element.type === 'button' || element.type === 'badge' ? '#FFC400' : undefined),
      color: element.color || '#FFFFFF',
      fontSize: Math.max(1, baseFontSize * scale),
      lineHeight: Math.max(1, resolveOfferLineHeight(baseFontSize, element.lineHeight) * scale),
      fontWeight: (element.fontWeight || '700') as '400' | '500' | '600' | '700' | '800' | '900',
      fontFamily: resolveOfferFontFamily(element.fontFamily),
      fontStyle: element.fontStyle || 'normal',
      textAlign: element.textAlign || 'center',
      textAlignVertical: element.textAlignVertical || 'center',
    }]}>{text}</Text>;
  };
  return (
    <View style={{ width: LIB_THUMB_WIDTH, height: LIB_THUMB_HEIGHT, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: poster.backgroundColor || primary }}>
      <View style={{ width: poster.width * scale, height: poster.height * scale, overflow: 'hidden', backgroundColor: poster.backgroundColor || primary }}>
        {poster.background?.type === 'gradient' || poster.background?.type === 'linear-gradient' ? <LinearGradient colors={libGradientStops(poster.background.colors, poster.background.from || primary, poster.background.to || secondary)} style={StyleSheet.absoluteFill} /> : null}
        {(poster.backgroundImageUrl || poster.background?.imageUrl) ? <Image source={{ uri: poster.backgroundImageUrl || poster.background?.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        {poster.overlay?.color ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: poster.overlay.color, opacity: poster.overlay.opacity ?? 0.25 }]} /> : null}
        {poster.elements.slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(renderElement)}
      </View>
    </View>
  );
};

const TemplateCard: React.FC<{ item: LibraryItem; onPress: () => void }> = ({ item, onPress }) => {
  const [previewFailed, setPreviewFailed] = useState(false);
  const showPreview = Boolean(item.previewUrl) && !previewFailed;
  const hasCanvas = Boolean(item.template?.canvas || item.design?.canvas);
  const fallbackColors: [string, string] = [
    item.template?.primaryColor || item.design?.primaryColor || theme.colors.primaryLight,
    item.template?.secondaryColor || item.design?.secondaryColor || theme.colors.surfaceAlt,
  ];
  return (
  <Pressable accessibilityRole="button" accessibilityLabel={`Use ${item.name}`} onPress={onPress} style={styles.card}>
    <View style={styles.thumbnail}>
      {showPreview ? <Image source={{ uri: item.previewUrl }} style={styles.thumbnailImage} resizeMode="cover" onError={() => setPreviewFailed(true)} /> : hasCanvas ? (
        <LibraryCanvasThumb template={item.template} design={item.design} />
      ) : (
        <LinearGradient colors={fallbackColors} style={styles.thumbnailFallback}>
          <MaterialCommunityIcons name={item.source === 'custom' ? 'account-edit-outline' : 'palette-outline'} size={26} color={theme.colors.primaryDark} />
          <Text numberOfLines={2} style={styles.fallbackText}>{item.name}</Text>
        </LinearGradient>
      )}
    </View>
    <Text numberOfLines={2} style={styles.cardName}>{item.name}</Text>
    {item.category ? <Text numberOfLines={1} style={styles.cardCategory}>{item.category}</Text> : null}
  </Pressable>
  );
};

const TemplateSection: React.FC<{
  title: string;
  items: LibraryItem[];
  expanded: boolean;
  onToggle: () => void;
  onSelect: (item: LibraryItem) => void;
}> = ({ title, items, expanded, onToggle, onSelect }) => {
  if (!items.length) return <View style={styles.emptySection}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.emptyText}>Nothing here yet.</Text></View>;
  const visible = expanded ? items : items.slice(0, 4);
  return <View style={styles.section}>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{items.length > 4 ? <Pressable onPress={onToggle} hitSlop={8}><Text style={styles.seeAll}>{expanded ? 'Show less' : 'See all'}</Text></Pressable> : null}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {visible.map((item) => <TemplateCard key={`${title}-${item.id}`} item={item} onPress={() => onSelect(item)} />)}
    </ScrollView>
  </View>;
};

export const TemplateLibraryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { accessToken, currentUser } = useApp();
  const { businessId } = route.params;
  const [templates, setTemplates] = useState<OfferCardTemplate[]>([]);
  const [history, setHistory] = useState<OfferDesignHistoryItem[]>([]);
  const [creations, setCreations] = useState<OfferDesignCreation[]>([]);
  const [publishedCreations, setPublishedCreations] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [templateResponse, library, offersResponse] = await Promise.allSettled([
        listOfferTemplates(),
        readOfferDesignLibrary(currentUser?.id),
        accessToken ? listMyOffers(accessToken) : Promise.resolve({ data: [] as any[] }),
      ]);
      const nextTemplates = templateResponse.status === 'fulfilled' && Array.isArray(templateResponse.value.data)
        ? templateResponse.value.data.filter(Boolean).map((template: OfferTemplate) => toOfferCardTemplate(template))
        : [];
      setTemplates(nextTemplates);
      if (templateResponse.status === 'rejected' || offersResponse.status === 'rejected') setError('Some designs could not be loaded. Please retry.');
      setHistory(library.status === 'fulfilled' ? library.value.history : []);
      setCreations(library.status === 'fulfilled' ? library.value.creations : []);
      const published = (offersResponse.status === 'fulfilled' ? offersResponse.value.data : []).filter((offer) => Boolean(offer.cardDesign)).map((offer) => {
        const design = offer.cardDesign as OfferCardDesign;
        return {
          id: `published-${offer._id}`,
          name: offer.title || 'Published offer',
          category: offer.category,
          previewUrl: design.previewUrl || offer.imageUrls?.[0],
          source: 'custom' as const,
          design,
          title: offer.title,
          description: offer.description,
          imageUrls: offer.imageUrls,
        };
      });
      setPublishedCreations(published);
    } catch {
      setError('Templates could not be loaded. Please try again.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, currentUser?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const templateMap = useMemo(() => new Map([...OFFER_CARD_TEMPLATES, ...templates].map((template) => [template.id, template])), [templates]);
  const newItems = useMemo(() => {
    const adminItems = templates.filter((template) => template.source === 'admin').map(asTemplateItem);
    if (adminItems.length) return adminItems;
    return OFFER_CARD_TEMPLATES.map(asTemplateItem);
  }, [templates]);
  const historyItems = useMemo(() => history.map((item) => {
    const template = templateMap.get(item.templateId);
    return template ? asTemplateItem(template) : { id: item.templateId, name: item.name, category: item.category, previewUrl: item.previewUrl, source: item.source };
  }), [history, templateMap]);
  const creationItems = useMemo(() => {
    const local = creations.map((item) => ({ id: item.id, name: item.name, category: item.category, previewUrl: item.previewUrl, source: 'custom' as const, design: item.design, title: item.title, description: item.description, imageUrls: item.imageUrls }));
    const ids = new Set(local.map((item) => item.id));
    return [...local, ...publishedCreations.filter((item) => !ids.has(item.id))];
  }, [creations, publishedCreations]);

  const openEditor = async (item: LibraryItem) => {
    if (!item.template && !item.design && item.id !== 'blank') {
      Alert.alert('Template unavailable', 'This template is no longer available. Choose another template or a saved creation.');
      return;
    }
    if (item.template) await recordOfferTemplateUsage(currentUser?.id, item.template).catch(() => undefined);
    setSelectedItem(null);
    navigation.navigate('OfferDesignEditor', {
      businessId,
      designMode: item.source === 'custom' ? 'custom' : 'templates',
      initialTemplateId: item.template?.id || item.design?.templateId || item.id,
      initialDesign: item.design,
      initialTitle: item.title,
      initialDescription: item.description,
      initialCategory: item.category,
      initialImageUrls: item.imageUrls,
    });
  };
  const select = (item: LibraryItem) => setSelectedItem(item);

  return <ScreenContainer edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
    <View style={styles.topBar}>
      <Pressable onPress={navigation.goBack} style={styles.backButton}><MaterialCommunityIcons name="arrow-left" size={23} color={theme.colors.text} /></Pressable>
      <View style={styles.flex}><Text style={styles.title}>Choose a template</Text><Text style={styles.subtitle}>Start with a layout, then make it yours.</Text></View>
    </View>
    {loading ? <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.emptyText}>Loading templates…</Text></View> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {error ? <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.danger} /><Text style={styles.errorText}>{error}</Text><Pressable onPress={load}><Text style={styles.retry}>Retry</Text></Pressable></View> : null}
      <View style={styles.blankSection}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Blank</Text></View><TemplateCard item={{ id: 'blank', name: 'Blank template', source: 'custom' }} onPress={() => select({ id: 'blank', name: 'Blank template', source: 'custom' })} /></View>
      <TemplateSection title="New" items={newItems} expanded={Boolean(expanded.New)} onToggle={() => setExpanded((value) => ({ ...value, New: !value.New }))} onSelect={select} />
      <TemplateSection title="History" items={historyItems} expanded={Boolean(expanded.History)} onToggle={() => setExpanded((value) => ({ ...value, History: !value.History }))} onSelect={select} />
      <TemplateSection title="Your creations" items={creationItems} expanded={Boolean(expanded.Creations)} onToggle={() => setExpanded((value) => ({ ...value, Creations: !value.Creations }))} onSelect={select} />
    </ScrollView>}
    <Modal transparent animationType="slide" visible={Boolean(selectedItem)} onRequestClose={() => setSelectedItem(null)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setSelectedItem(null)}>
        <View style={styles.actionSheet} onStartShouldSetResponder={() => true}>
          <View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>{selectedItem?.name || 'Template'}</Text><Text style={styles.sheetSubtitle}>{selectedItem?.category || 'Offer template'}</Text>
          <Pressable onPress={() => selectedItem && openEditor(selectedItem)} style={styles.primarySheetAction}><MaterialCommunityIcons name="check-circle-outline" size={20} color={theme.colors.textInverse} /><Text style={styles.primarySheetText}>Use this template</Text></Pressable>
          <Pressable onPress={() => Alert.alert('Preview', 'This template will open in the editor so you can preview and adjust it.')} style={styles.sheetAction}><MaterialCommunityIcons name="magnify" size={20} color={theme.colors.primary} /><Text style={styles.sheetActionText}>Preview</Text></Pressable>
          <Pressable onPress={() => Alert.alert(selectedItem?.name || 'Template', selectedItem?.category ? 'Category: ' + selectedItem.category : 'Ready to customize in the editor.')} style={styles.sheetAction}><MaterialCommunityIcons name="information-outline" size={20} color={theme.colors.primary} /><Text style={styles.sheetActionText}>View details</Text></Pressable>
          <Pressable onPress={() => setSelectedItem(null)} style={styles.sheetAction}><MaterialCommunityIcons name="close-circle-outline" size={20} color={theme.colors.textSecondary} /><Text style={styles.sheetActionText}>Cancel</Text></Pressable>
        </View>
      </Pressable>
    </Modal>
  </ScreenContainer>;
};

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.background }, flex: { flex: 1 }, topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }, backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, title: { ...theme.typography.h2, color: theme.colors.text }, subtitle: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 }, content: { padding: 16, paddingBottom: 30, gap: 20 }, section: { gap: 10 }, blankSection: { gap: 10 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { ...theme.typography.bodyBold, color: theme.colors.text }, seeAll: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '900' }, row: { gap: 10, paddingRight: 12 }, card: { width: 118, paddingBottom: 2 }, thumbnail: { width: 118, height: 158, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, thumbnailImage: { width: '100%', height: '100%' }, thumbnailFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10 }, fallbackText: { ...theme.typography.tiny, color: theme.colors.primaryDark, fontWeight: '900', textAlign: 'center', marginTop: 7 }, cardName: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '800', marginTop: 7 }, cardCategory: { ...theme.typography.tiny, color: theme.colors.textMuted, marginTop: 2 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }, emptySection: { gap: 8 }, emptyText: { ...theme.typography.caption, color: theme.colors.textMuted }, error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#FEF2F2' }, errorText: { flex: 1, ...theme.typography.caption, color: theme.colors.danger }, retry: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '900' }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.35)' }, actionSheet: { padding: 16, paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.colors.surface }, sheetHandle: { width: 38, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: theme.colors.border, marginBottom: 14 }, sheetTitle: { ...theme.typography.h3, color: theme.colors.text }, sheetSubtitle: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2, marginBottom: 14 }, primarySheetAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: theme.colors.primary, marginBottom: 8 }, primarySheetText: { ...theme.typography.bodyBold, color: theme.colors.textInverse }, sheetAction: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 }, sheetActionText: { ...theme.typography.body, color: theme.colors.text },
});

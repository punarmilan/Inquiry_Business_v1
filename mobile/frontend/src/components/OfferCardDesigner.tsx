import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  findOfferAvatar,
  OFFER_AVATARS,
  OFFER_CARD_COLORS,
  OFFER_CARD_TEMPLATES,
  type OfferCardDesign,
  type OfferCardTemplate,
  type OfferCardLayout,
} from '../config/offerCardDesigner';
import { OfferAvatarSprite } from './OfferAvatarSprite';
import { theme } from '../theme';

type Props = {
  design: OfferCardDesign;
  onChange: (design: OfferCardDesign) => void;
  title: string;
  description: string;
  price: string;
  category: string;
  templates?: OfferCardTemplate[];
  mode?: 'custom' | 'templates';
};

const LAYOUT_OPTIONS: Array<{ id: OfferCardLayout; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }> = [
  { id: 'right', label: 'Photo right', icon: 'format-align-left' },
  { id: 'left', label: 'Photo left', icon: 'format-align-right' },
  { id: 'bottom', label: 'Photo bottom', icon: 'dock-bottom' },
  { id: 'center', label: 'Centered', icon: 'format-align-center' },
];

const FONT_SIZE_OPTIONS = [
  { value: 24, label: 'Small' },
  { value: 30, label: 'Medium' },
  { value: 36, label: 'Large' },
] as const;
const DESCRIPTION_SIZE_OPTIONS = [
  { value: 12, label: 'Body small' },
  { value: 16, label: 'Body medium' },
  { value: 20, label: 'Body large' },
] as const;
const FONT_WEIGHT_OPTIONS = [
  { value: '600' as const, label: 'Regular' },
  { value: '700' as const, label: 'Bold' },
  { value: '900' as const, label: 'Extra bold' },
];
const FONT_STYLE_OPTIONS = [
  { value: 'normal' as const, label: 'Normal' },
  { value: 'italic' as const, label: 'Italic' },
];
const TEXT_ALIGN_OPTIONS = [
  { value: 'left' as const, label: 'Left', icon: 'format-align-left' as const },
  { value: 'center' as const, label: 'Center', icon: 'format-align-center' as const },
  { value: 'right' as const, label: 'Right', icon: 'format-align-right' as const },
];

const AVATAR_SIZES: Record<OfferCardLayout, number> = { right: 208, left: 208, bottom: 178, center: 148 };

export const OfferCardDesigner: React.FC<Props> = ({ design, onChange, title, description, price, category, templates, mode = 'templates' }) => {
  const [templateCategory, setTemplateCategory] = useState('All');
  const systemTemplates = OFFER_CARD_TEMPLATES;
  const allTemplates = mode === 'custom' ? [] : (templates?.length ? [...templates, ...systemTemplates] : systemTemplates);
  const templateCategories = useMemo(() => ['All', ...Array.from(new Set(allTemplates.map((template) => template.category).filter(Boolean) as string[]))], [allTemplates]);
  const availableTemplates = useMemo(() => {
    if (templateCategory === 'All' || !allTemplates.length) return allTemplates;
    return allTemplates.filter((template) => !template.category || template.category.toLowerCase() === templateCategory.toLowerCase());
  }, [allTemplates, templateCategory]);
  const customTemplate: OfferCardTemplate = {
    id: 'custom', name: 'My custom card', primaryColor: design.primaryColor, secondaryColor: design.secondaryColor, layout: design.layout,
    allowColorChange: true, allowLayoutChange: true, allowAvatarChange: true, source: 'system',
  };
  const selectedTemplate = design.templateId === 'custom'
    ? customTemplate
    : availableTemplates.find((template) => template.id === design.templateId) || availableTemplates[0] || OFFER_CARD_TEMPLATES[0];
  const selectedAvatar = findOfferAvatar(design.avatarId);
  const copyStyles: Record<OfferCardLayout, object> = {
    right: styles.previewCopyRight,
    left: styles.previewCopyLeft,
    bottom: styles.previewCopyBottom,
    center: styles.previewCopyCenter,
  };
  const avatarStyles: Record<OfferCardLayout, object> = {
    right: styles.previewAvatarRight,
    left: styles.previewAvatarLeft,
    bottom: styles.previewAvatarBottom,
    center: styles.previewAvatarCenter,
  };

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.heading}>Design your offer card</Text>
          <Text style={styles.subheading}>{mode === 'custom' ? 'Build your own card with the controls below.' : templates?.length ? 'Choose an app template, then customize every part of it.' : 'Choose a bundled app template or customize the card yourself.'}</Text>
        </View>
        <View style={styles.count}><Text style={styles.countText}>{availableTemplates.length} templates</Text></View>
      </View>

      {mode === 'templates' && templateCategories.length > 1 ? <View style={styles.categoryRow}>{templateCategories.map((item) => <Pressable key={item} onPress={() => setTemplateCategory(item)} style={[styles.categoryChip, templateCategory === item && styles.categoryChipSelected]}><Text style={[styles.categoryChipText, templateCategory === item && styles.categoryChipTextSelected]}>{item}</Text></Pressable>)}</View> : null}
      <LinearGradient colors={[design.primaryColor, design.secondaryColor]} style={styles.preview}>
        <View style={styles.previewShade} />
        <View style={styles.previewTop}>
          <Text style={styles.previewCategory}>{(category || 'LOCAL OFFER').toUpperCase()}</Text>
          <View style={styles.previewBadge}><Text style={styles.previewBadgeText}>LIVE</Text></View>
        </View>
        <View style={[styles.previewCopy, copyStyles[design.layout]]}>
          <Text style={[styles.previewTitle, { fontSize: design.titleFontSize || 30, lineHeight: (design.titleFontSize || 30) + 4, fontWeight: design.fontWeight || '900', fontStyle: design.fontStyle || 'normal', textAlign: design.textAlign || 'left' }]} numberOfLines={2}>{title || 'Your offer title'}</Text>
          <Text style={[styles.previewDescription, { fontSize: design.descriptionFontSize || 16, fontStyle: design.fontStyle || 'normal', textAlign: design.textAlign || 'left' }]} numberOfLines={2}>{description || 'Your custom offer message appears here.'}</Text>
          <Text style={styles.previewPrice}>{price ? `\u20B9${Number(price).toLocaleString('en-IN')}` : 'Add offer price'}</Text>
        </View>
        <OfferAvatarSprite avatar={selectedAvatar} size={AVATAR_SIZES[design.layout]} style={[styles.previewAvatar, avatarStyles[design.layout]]} />
      </LinearGradient>

      {mode === 'templates' ? <>
        <Text style={styles.label}>Choose an app template</Text>
        <View style={styles.templateGrid}>
        <Pressable
          onPress={() => onChange({ ...design, templateId: 'custom', templateSource: 'custom', templateVersion: undefined, previewUrl: undefined, canvas: undefined, dynamicFields: {} })}
          style={[styles.templateTile, design.templateId === 'custom' && styles.templateTileSelected]}
        >
          <View style={[styles.customSwatch, { backgroundColor: design.primaryColor }]}>
            <MaterialCommunityIcons name="tune-variant" size={18} color={theme.colors.textInverse} />
          </View>
          <Text numberOfLines={1} style={[styles.templateName, design.templateId === 'custom' && styles.templateNameSelected]}>Custom card</Text>
        </Pressable>
        {availableTemplates.map((template) => {
          const selected = design.templateId === template.id;
          return (
            <Pressable
              key={template.id}
              onPress={() => onChange({
                ...design,
                templateId: template.id,
                templateVersion: template.version,
                templateSource: template.source || 'system',
                previewUrl: template.previewUrl,
                canvas: template.canvas,
                dynamicFields: template.dynamicFields || {},
                avatarId: template.defaultAvatarId || design.avatarId,
                primaryColor: template.primaryColor,
                secondaryColor: template.secondaryColor,
                layout: template.layout,
              })}
              style={[styles.templateTile, selected && styles.templateTileSelected]}
            >
              {template.previewUrl ? (
                <View style={styles.templateSwatch}>
                  <Image source={{ uri: template.previewUrl }} style={styles.templateImage} />
                  {selected ? <View style={styles.templateImageCheck}><MaterialCommunityIcons name="check" size={18} color={theme.colors.textInverse} /></View> : null}
                </View>
              ) : (
                <LinearGradient colors={[template.primaryColor, template.secondaryColor]} style={styles.templateSwatch}>
                  {selected ? <MaterialCommunityIcons name="check" size={18} color={theme.colors.textInverse} /> : null}
                </LinearGradient>
              )}
              <Text numberOfLines={1} style={[styles.templateName, selected && styles.templateNameSelected]}>{template.name}</Text>
            </Pressable>
          );
        })}
        </View>
      </> : <View style={styles.customModeCard}><MaterialCommunityIcons name="tune-variant" size={21} color={theme.colors.primary} /><View style={styles.customModeCopy}><Text style={styles.customModeTitle}>Custom Design</Text><Text style={styles.customModeText}>This card is yours—choose the layout, avatar and colors below.</Text></View></View>}

      {selectedTemplate.editableFields?.length ? (
        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <MaterialCommunityIcons name="layers-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.rulesTitle}>Template fields</Text>
          </View>
          <Text style={styles.rulesHint}>This is a starting template. Every field can be customized before posting.</Text>
          <View style={styles.rulesWrap}>
            {selectedTemplate.editableFields.map((field) => (
              <View key={field.key} style={[styles.ruleChip, styles.ruleChipEditable]}>
                <MaterialCommunityIcons name="pencil-outline" size={13} color={theme.colors.primaryDark} />
                <Text style={styles.ruleText}>{field.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.label}>Typography</Text>
      <Text style={styles.controlHint}>Set the title size, weight and alignment for your card.</Text>
      <View style={styles.optionRow}>{FONT_SIZE_OPTIONS.map((option) => <Pressable key={option.value} onPress={() => onChange({ ...design, titleFontSize: option.value })} style={[styles.optionTile, (design.titleFontSize || 30) === option.value && styles.optionTileSelected]}><Text style={[styles.optionText, (design.titleFontSize || 30) === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}</View>
      <View style={styles.optionRow}>{DESCRIPTION_SIZE_OPTIONS.map((option) => <Pressable key={option.value} onPress={() => onChange({ ...design, descriptionFontSize: option.value })} style={[styles.optionTile, (design.descriptionFontSize || 16) === option.value && styles.optionTileSelected]}><Text style={[styles.optionText, (design.descriptionFontSize || 16) === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}</View>
      <View style={styles.optionRow}>{FONT_WEIGHT_OPTIONS.map((option) => <Pressable key={option.value} onPress={() => onChange({ ...design, fontWeight: option.value })} style={[styles.optionTile, (design.fontWeight || '900') === option.value && styles.optionTileSelected]}><Text style={[styles.optionText, (design.fontWeight || '900') === option.value && styles.optionTextSelected, { fontWeight: option.value }]}>{option.label}</Text></Pressable>)}</View>
      <View style={styles.optionRow}>{FONT_STYLE_OPTIONS.map((option) => <Pressable key={option.value} onPress={() => onChange({ ...design, fontStyle: option.value })} style={[styles.optionTile, (design.fontStyle || 'normal') === option.value && styles.optionTileSelected]}><Text style={[styles.optionText, (design.fontStyle || 'normal') === option.value && styles.optionTextSelected, { fontStyle: option.value }]}>{option.label}</Text></Pressable>)}</View>
      <View style={styles.optionRow}>{TEXT_ALIGN_OPTIONS.map((option) => <Pressable key={option.value} onPress={() => onChange({ ...design, textAlign: option.value })} style={[styles.alignTile, (design.textAlign || 'left') === option.value && styles.optionTileSelected]}><MaterialCommunityIcons name={option.icon} size={18} color={(design.textAlign || 'left') === option.value ? theme.colors.primary : theme.colors.textSecondary} /><Text style={[styles.optionText, (design.textAlign || 'left') === option.value && styles.optionTextSelected]}>{option.label}</Text></Pressable>)}</View>

      <Text style={styles.label}>Choose a layout</Text>
      <View style={styles.layoutGrid}>
        {LAYOUT_OPTIONS.map((option) => {
          const selected = design.layout === option.id;
          return (
            <Pressable key={option.id} onPress={() => onChange({ ...design, layout: option.id })} style={[styles.layoutTile, selected && styles.layoutTileSelected]}>
              <MaterialCommunityIcons name={option.icon} size={21} color={selected ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={[styles.layoutName, selected && styles.layoutNameSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Choose an avatar</Text>
      <View style={styles.avatarGrid}>
        {OFFER_AVATARS.map((avatar) => {
          const selected = design.avatarId === avatar.id;
          return (
            <Pressable key={avatar.id} onPress={() => onChange({ ...design, avatarId: avatar.id })} style={[styles.avatarTile, selected && styles.avatarTileSelected]}>
              <OfferAvatarSprite avatar={avatar} size={56} />
              {selected ? <View style={styles.avatarCheck}><MaterialCommunityIcons name="check" size={12} color={theme.colors.textInverse} /></View> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Choose card color</Text>
      <View style={styles.colorRow}>
        {OFFER_CARD_COLORS.map(([primaryColor, secondaryColor]) => {
          const selected = design.primaryColor === primaryColor && design.secondaryColor === secondaryColor;
          return (
            <Pressable key={primaryColor} onPress={() => onChange({ ...design, primaryColor, secondaryColor })} style={[styles.colorTile, selected && styles.colorTileSelected]}>
              <LinearGradient colors={[primaryColor, secondaryColor]} style={styles.colorSwatch} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 11 },
  heading: { ...theme.typography.bodyBold, color: theme.colors.text },
  subheading: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3, maxWidth: 245 },
  count: { backgroundColor: theme.colors.primaryLight, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 },
  countText: { ...theme.typography.tiny, color: theme.colors.primaryDark, fontWeight: '900' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  categoryChip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: theme.colors.surface },
  categoryChipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  categoryChipText: { ...theme.typography.tiny, color: theme.colors.textSecondary, fontWeight: '800' },
  categoryChipTextSelected: { color: theme.colors.primaryDark },
  customModeCard: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: theme.colors.primaryLight, borderRadius: 14, padding: 13, marginBottom: 16 },
  customModeCopy: { flex: 1 },
  customModeTitle: { ...theme.typography.bodyBold, color: theme.colors.primaryDark },
  customModeText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  preview: { height: 252, overflow: 'hidden', borderRadius: 28, padding: 16, marginBottom: 18 },
  previewShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(55, 18, 52, 0.08)' },
  previewTop: { zIndex: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewCategory: { fontSize: 10, letterSpacing: 0.9, color: theme.colors.textInverse, fontWeight: '900' },
  previewBadge: { backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  previewBadgeText: { fontSize: 9, fontWeight: '900', color: '#6A285B' },
  previewCopy: { zIndex: 3 },
  previewCopyRight: { width: '52%', marginTop: 27 },
  previewCopyLeft: { width: '52%', marginLeft: 'auto', marginTop: 27 },
  previewCopyBottom: { width: '61%', marginTop: 23 },
  previewCopyCenter: { width: '100%', marginTop: 20, paddingHorizontal: 14, alignItems: 'center' },
  previewTitle: { fontSize: 23, lineHeight: 27, fontWeight: '900', color: theme.colors.textInverse },
  previewDescription: { marginTop: 6, fontSize: 13, lineHeight: 17, color: 'rgba(255,255,255,0.94)', fontWeight: '600' },
  previewPrice: { marginTop: 14, fontSize: 17, color: theme.colors.textInverse, fontWeight: '900' },
  previewAvatar: { position: 'absolute', zIndex: 2 },
  previewAvatarRight: { right: -13, bottom: -2 },
  previewAvatarLeft: { left: -13, bottom: -2 },
  previewAvatarBottom: { right: -2, bottom: -2 },
  previewAvatarCenter: { left: '50%', bottom: -2, marginLeft: -74 },
  label: { ...theme.typography.bodyBold, color: theme.colors.text, marginBottom: 9, marginTop: 4 },
  controlHint: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: 8, marginTop: -5 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 9 },
  optionTile: { minHeight: 38, minWidth: 88, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 11, paddingHorizontal: 11, backgroundColor: theme.colors.surface },
  alignTile: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 11, paddingHorizontal: 11, backgroundColor: theme.colors.surface },
  optionTileSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  optionText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '800' },
  optionTextSelected: { color: theme.colors.primaryDark },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  templateTile: { width: '23%', alignItems: 'center', padding: 4, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  templateTileSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  templateSwatch: { width: '100%', height: 37, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  templateImage: { ...StyleSheet.absoluteFill, borderRadius: 7 },
  templateImageCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  customSwatch: { width: '100%', height: 37, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  templateName: { width: '100%', fontSize: 8, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4, fontWeight: '700' },
  templateNameSelected: { color: theme.colors.primaryDark },
  layoutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  layoutTile: { width: '48%', minHeight: 56, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surface },
  layoutTileSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  layoutName: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '800' },
  layoutNameSelected: { color: theme.colors.primaryDark },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  avatarTile: { width: 58, height: 58, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
  avatarTileSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  avatarCheck: { position: 'absolute', right: 2, bottom: 2, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorTile: { width: 34, height: 34, padding: 3, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
  colorTileSelected: { borderColor: theme.colors.text },
  colorSwatch: { flex: 1, borderRadius: 99 },
  disabledTile: { opacity: 0.55 },
  rulesCard: { backgroundColor: theme.colors.primaryLight, borderRadius: 14, padding: 12, marginBottom: 16 },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rulesTitle: { ...theme.typography.bodyBold, color: theme.colors.primaryDark },
  rulesHint: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 4 },
  rulesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  ruleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 },
  ruleChipEditable: { backgroundColor: 'rgba(255,255,255,0.8)' },
  ruleChipLocked: { backgroundColor: 'rgba(255,255,255,0.45)' },
  ruleText: { ...theme.typography.tiny, color: theme.colors.primaryDark, fontWeight: '800' },
  ruleTextLocked: { color: theme.colors.textMuted },
});

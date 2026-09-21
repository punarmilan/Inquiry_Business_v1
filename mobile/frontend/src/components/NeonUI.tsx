import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, createThemedStyles, getThemeMode } from '../theme';

export type NeonIcon = keyof typeof MaterialCommunityIcons.glyphMap;

// The whole neon system is one geometry with two palettes: every radius, inset
// and font size below is shared, and only the colors come from the theme. That
// is what keeps light and dark pixel-identical in layout.

// ---------------------------------------------------------------------------
// City skyline masthead
//
// One artwork (assets/bg.png — the night skyline from the design) backs both
// modes. Dark shows it nearly as-is; light lays a near-opaque pale wash over it
// so it reads as a soft daylight haze. Geometry is identical either way.
const SKYLINE = require('../../assets/bg.png');

export const SkylineMasthead: React.FC<{ height?: number; style?: StyleProp<ViewStyle> }> = ({ height = 230, style }) => (
  <View pointerEvents="none" style={[styles.masthead, { height }, style]}>
    {getThemeMode() === 'light' ? (
      <>
        <Image source={SKYLINE} style={{ position: 'absolute', top: 0, width: '100%', aspectRatio: 941 / 1672 }} resizeMode="cover" />
        <View style={styles.mastheadScrim} />
        <LinearGradient colors={['transparent', theme.colors.background]} style={styles.skylineFade} />
      </>
    ) : (
      <View style={styles.darkMasthead} />
    )}
  </View>
);

// ---------------------------------------------------------------------------
// Cards and buttons

export const GlowCard: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: string;
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}> = ({ children, style, tone, padded = true, onPress, accessibilityLabel }) => {
  const body = (
    <>
      <LinearGradient colors={[theme.colors.cardFillStart, theme.colors.cardFillEnd]} style={StyleSheet.absoluteFill} />
      {children}
    </>
  );
  const cardStyle = [styles.card, padded && styles.cardPadded, tone ? { borderColor: tone, shadowColor: tone } : null, style];
  if (!onPress) return <View style={cardStyle}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
};

export const GlowButton: React.FC<{
  label: string;
  onPress: () => void;
  icon?: NeonIcon;
  variant?: 'filled' | 'outline';
  style?: StyleProp<ViewStyle>;
}> = ({ label, onPress, icon, variant = 'filled', style }) => {
  const filled = variant === 'filled';
  const ink = filled ? (getThemeMode() === 'dark' ? '#00161B' : '#FFFFFF') : theme.colors.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.button, filled ? styles.buttonFilled : styles.buttonOutline, pressed && styles.pressed, style]}>
      {icon ? <MaterialCommunityIcons name={icon} size={19} color={ink} /> : null}
      <Text numberOfLines={1} style={[styles.buttonLabel, { color: ink }]}>{label}</Text>
    </Pressable>
  );
};

export const NeonCircleButton: React.FC<{
  icon: NeonIcon;
  onPress: () => void;
  label: string;
  size?: number;
  badge?: number;
}> = ({ icon, onPress, label, size = 46, badge = 0 }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.circle, { width: size, height: size, borderRadius: size / 2 }, pressed && styles.pressed]}>
    <MaterialCommunityIcons name={icon} size={Math.round(size * 0.5)} color={theme.colors.primary} />
    {badge > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
  </Pressable>
);

export const SegmentedTabs: React.FC<{
  options: string[];
  value: string;
  onChange: (option: string) => void;
}> = ({ options, value, onChange }) => (
  <View style={styles.segment}>
    {options.map((option) => {
      const active = option === value;
      return (
        <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onChange(option)} style={[styles.segmentItem, active && styles.segmentItemActive]}>
          <Text numberOfLines={1} style={[styles.segmentText, active && styles.segmentTextActive]}>{option}</Text>
        </Pressable>
      );
    })}
  </View>
);

export const SectionHeading: React.FC<{ title: string; accent?: string; subtitle?: string; icon?: NeonIcon; iconColor?: string; action?: { label: string; onPress: () => void } }> = ({ title, accent, subtitle, icon, iconColor, action }) => (
  <View style={styles.headingRow}>
    {icon ? <MaterialCommunityIcons name={icon} size={23} color={iconColor || theme.colors.accent} style={styles.headingIcon} /> : null}
    <View style={styles.headingCopy}>
      <Text style={styles.heading}>{title}{accent ? <Text style={styles.headingAccent}> {accent}</Text> : null}</Text>
      {subtitle ? <Text style={styles.headingSub}>{subtitle}</Text> : null}
    </View>
    {action ? (
      <Pressable accessibilityRole="button" onPress={action.onPress} style={({ pressed }) => [styles.headingAction, pressed && styles.pressed]}>
        <Text style={styles.headingActionText}>{action.label}</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.primary} />
      </Pressable>
    ) : null}
  </View>
);

const styles = createThemedStyles((c) => ({
  masthead: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  darkMasthead: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
  mastheadScrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.mastheadScrim },
  skylineFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },

  card: { borderRadius: 20, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.surface, boxShadow: `0 0 14px ${c.cardGlow}`, overflow: 'hidden', shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardPadded: { padding: 16 },
  pressed: { opacity: 0.75 },

  button: { minHeight: 50, paddingHorizontal: 22, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonFilled: { backgroundColor: c.primary, shadowColor: c.primaryGlow, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  buttonOutline: { borderWidth: 1.5, borderColor: c.primary, backgroundColor: 'transparent' },
  buttonLabel: { fontSize: 16, fontWeight: '800', flexShrink: 1 },

  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.cardBorder, backgroundColor: c.surface, shadowColor: c.cardGlow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.background },
  badgeText: { fontSize: 10, lineHeight: 13, fontWeight: '900', color: '#FFFFFF' },

  segment: { flexDirection: 'row', alignItems: 'center', padding: 4, borderRadius: 26, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.surfaceAlt },
  segmentItem: { flex: 1, minHeight: 42, paddingHorizontal: 6, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  segmentItemActive: { backgroundColor: c.primary, shadowColor: c.primaryGlow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  segmentText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
  segmentTextActive: { color: getThemeMode() === 'dark' ? '#00161B' : '#FFFFFF', fontWeight: '800' },

  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headingIcon: { marginRight: -2 },
  headingCopy: { flex: 1, minWidth: 0 },
  heading: { fontSize: 19, lineHeight: 24, fontWeight: '900', color: c.text },
  headingAccent: { color: c.primary },
  headingSub: { fontSize: 12.5, lineHeight: 17, color: c.textSecondary, marginTop: 1 },
  headingAction: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: c.primary, flexDirection: 'row', alignItems: 'center', gap: 2 },
  headingActionText: { fontSize: 13, fontWeight: '800', color: c.primary },
}));

import type { UIBlock, UIBlockStyle } from '../types/dynamicUI';
export { default as uiVisual } from './uiVisual.json';
export const needsVisualRenderer = (block: UIBlock) => Boolean(block.style) || block.type === 'image' || block.type === 'icon' || (block.type === 'heroBanner' && Boolean(block.props.imageAssetId));
export const blockAssetId = (block: UIBlock): string | undefined => block.type === 'image' || block.type === 'lottie' || block.type === 'homeCard' ? block.props.assetId : block.type === 'heroBanner' ? block.props.imageAssetId : undefined;
export const visualText = (style?: UIBlockStyle, platform = 'android') => ({
  ...(style?.fontSize !== undefined ? { fontSize: style.fontSize, lineHeight: Math.ceil(style.fontSize * 1.4) } : {}),
  ...(style?.textAlign ? { textAlign: style.textAlign } : {}),
  ...(style?.fontWeight ? { fontWeight: style.fontWeight } : {}),
  ...(style?.fontFamily && style.fontFamily !== 'default' ? { fontFamily: platform === 'ios' ? style.fontFamily === 'serif' ? 'Georgia' : 'Menlo' : style.fontFamily } : {}),
  ...(style?.letterSpacing !== undefined ? { letterSpacing: style.letterSpacing } : {}),
});
// React Native lineHeight is pixels; browser numeric lineHeight is a multiplier.
export const visualWebText = (style?: UIBlockStyle) => {
  const text = visualText(style);
  return { ...text, ...(text.lineHeight !== undefined ? { lineHeight: `${text.lineHeight}px` } : {}) };
};

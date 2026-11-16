import React from 'react';
import { ScrollView, View } from 'react-native';
import { useUIConfig } from '../hooks/useUIConfig';
import { ComponentRegistry, type UIActions, type UIBusinessData } from './ComponentRegistry';
import { parseUIBlock } from '../utils/dynamicUI';
import type { UIBlock, UIPageKey, UISlot } from '../types/dynamicUI';

class BlockBoundary extends React.Component<{ resetKey: string; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: Readonly<{ resetKey: string }>) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() { return this.state.failed ? null : this.props.children; }
}
export type DynamicRendererProps = {
  pageKey: UIPageKey; slot: UISlot; actions?: UIActions; data?: UIBusinessData;
  bounded?: boolean;
  /** Local business/permission policy only. The v1 contract has no visibility field. */
  isVisible?: (block: UIBlock) => boolean;
};
export const DynamicRenderer: React.FC<DynamicRendererProps> = ({ pageKey, slot, actions = {}, data = {}, isVisible, bounded }) => {
  const { state, locale } = useUIConfig();
  const config = state.config;
  if (!config.enabled || config.useNativeFallback) return null;
  const blocks = config.base.pages[pageKey]?.slots[slot];
  if (!Array.isArray(blocks)) return null;
  const seen = new Set<string>();
  const content = <>{blocks.slice(0, 40).map((value) => {
    const block = parseUIBlock(value, pageKey);
    if (!block || block.hidden || block.type === 'homeCard' || seen.has(block.id)) return null;
    seen.add(block.id);
    try { if (isVisible && !isVisible(block)) return null; } catch { return null; }
    const Component = ComponentRegistry[block.type];
    if (!Component) return null;
    return <BlockBoundary key={`${pageKey}:${slot}:${block.id}`} resetKey={`${config.releaseId}:${config.generation}:${config.campaign?.id || ''}:${config.campaign?.version || 0}`}>
      {block.style ? <View style={{ width: `${block.style.widthPercent || 100}%`, alignSelf: block.style.alignment === 'right' ? 'flex-end' : block.style.alignment === 'center' ? 'center' : 'flex-start',
        padding: block.style.padding, marginBottom: block.style.marginBottom, borderRadius: block.style.borderRadius, backgroundColor: block.style.backgroundColor, overflow: 'hidden' }}>
        <Component block={block} locale={locale} actions={actions} data={data} />
      </View> : <Component block={block} locale={locale} actions={actions} data={data} />}
    </BlockBoundary>;
  })}</>;
  return bounded && blocks.length ? <ScrollView nestedScrollEnabled style={{ maxHeight: 120 }} contentContainerStyle={{ width: '100%' }} keyboardShouldPersistTaps="handled">{content}</ScrollView> : content;
};

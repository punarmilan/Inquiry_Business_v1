import type { UIBlock, UIPage, UISlot } from '../../../../mobile/frontend/src/types/dynamicUI';
import { needsVisualRenderer } from '../../../../mobile/frontend/src/utils/uiVisual';

export const pageBlocks = (page: UIPage) => [...page.slots.beforeContent, ...page.slots.afterContent];
export function newUIBlock(type: UIBlock['type'], assetId?: string): UIBlock {
  const id = `block_${crypto.randomUUID()}`;
  switch (type) {
    case 'homeCard': return { id, type, props: { placement: 'promo', title: { en: 'New local promotion' }, subtitle: { en: 'Discover something nearby.' }, buttonLabel: { en: 'Explore' }, homeAction: 'offers', media: 'bundled', bundled: 'offers' }, style: { color: '#08152F', backgroundColor: '#D3F2E1', borderRadius: 20 } };
    case 'image': return { id, type, props: { assetId: '', alt: { en: 'Banner image' }, height: 180, fit: 'cover' } };
    case 'icon': return { id, type, props: { name: 'Gift', size: 40, label: { en: 'Discover something special' } }, style: { alignment: 'center', textAlign: 'center' } };
    case 'illustration': return { id, type, props: { image: 'welcome', alt: { en: 'Welcome to InquiryExperts' }, height: 160, fit: 'contain' } };
    case 'text': return { id, type, props: { text: { en: 'Discover local offers' }, variant: 'heading' } };
    case 'heroBanner': return { id, type, props: { title: { en: 'Explore your neighbourhood' }, subtitle: { en: 'Discover offers from local businesses.' } } };
    case 'offerRail': return { id, type, props: { source: 'nearby', variant: 'standard', limit: 6 } };
    case 'actionLink': return { id, type, props: { label: { en: 'View all offers' }, action: 'offers.openAll' } };
    case 'spacer': return { id, type, props: { height: 16 } };
    case 'lottie':
      if (!assetId) throw new Error('Upload and enable an animation in Animation Studio first.');
      return { id, type, props: { assetId, fallback: { en: 'Explore local offers' }, speed: 1, loop: false, loopCount: 1, width: 160, height: 120, alignment: 'center' } };
  }
}
export function addUIBlock(page: UIPage, slot: UISlot, block: UIBlock): UIPage {
  if (pageBlocks(page).length >= 40) throw new Error('A page supports at most 40 optional blocks.');
  if (block.type === 'lottie' && pageBlocks(page).some((item) => item.type === 'lottie')) throw new Error('Only one animation is supported per page.');
  const next = structuredClone(page); next.rendererVersion = Math.max(page.rendererVersion, block.type === 'homeCard' ? block.props.homeAction === 'link' ? 6 : 5 : needsVisualRenderer(block) ? 4 : page.key === 'offersHome' && block.type !== 'illustration' ? 2 : 3) as UIPage['rendererVersion']; next.slots[slot].push(block); return next;
}
export function moveUIBlock(page: UIPage, id: string, slot: UISlot, targetId?: string): UIPage {
  const original = pageBlocks(page).find((block) => block.id === id);
  if (!original || targetId === id) return page;
  const index = targetId ? page.slots[slot].findIndex((block) => block.id === targetId) : page.slots[slot].length;
  if (index < 0) return page;
  const next = structuredClone(page); next.rendererVersion = Math.max(page.rendererVersion, page.key === 'offersHome' ? 2 : 3) as UIPage['rendererVersion'];
  for (const key of ['beforeContent', 'afterContent'] as const) next.slots[key] = next.slots[key].filter((block) => block.id !== id);
  next.slots[slot].splice(Math.min(index, next.slots[slot].length), 0, original);
  return next;
}
export function updateUIBlock(page: UIPage, block: UIBlock): UIPage {
  const next = structuredClone(page); next.rendererVersion = Math.max(page.rendererVersion, block.type === 'homeCard' ? block.props.homeAction === 'link' ? 6 : 5 : needsVisualRenderer(block) ? 4 : page.key === 'offersHome' ? 2 : 3) as UIPage['rendererVersion'];
  for (const slot of ['beforeContent', 'afterContent'] as const) next.slots[slot] = next.slots[slot].map((item) => item.id === block.id ? block : item);
  return next;
}
export function removeUIBlock(page: UIPage, id: string): UIPage {
  const next = structuredClone(page); next.rendererVersion = Math.max(page.rendererVersion, page.key === 'offersHome' ? 2 : 3) as UIPage['rendererVersion'];
  for (const slot of ['beforeContent', 'afterContent'] as const) next.slots[slot] = next.slots[slot].filter((block) => block.id !== id);
  return next;
}

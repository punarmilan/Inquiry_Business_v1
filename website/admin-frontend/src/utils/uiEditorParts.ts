import type { UIHomeCard, UIPage } from '../../../../mobile/frontend/src/types/dynamicUI';

/** Each editor changes its own controls while retaining the other editor's work. */
export function dynamicPage(page: UIPage): UIPage {
  return { ...page, slots: {
    beforeContent: page.slots.beforeContent.filter(block => block.type !== 'homeCard'),
    afterContent: page.slots.afterContent.filter(block => block.type !== 'homeCard'),
  } };
}

export function mergeDynamicPage(original: UIPage, edited: UIPage): UIPage {
  const next = structuredClone(edited);
  next.rendererVersion = Math.max(original.rendererVersion, edited.rendererVersion) as UIPage['rendererVersion'];
  for (const slot of ['beforeContent', 'afterContent'] as const) {
    next.slots[slot] = [...edited.slots[slot].filter(block => block.type !== 'homeCard'), ...original.slots[slot].filter(block => block.type === 'homeCard')];
  }
  if (next.slots.beforeContent.length + next.slots.afterContent.length > 40) throw new Error('The home screen supports at most 40 controls and extra sections together.');
  return next;
}

export function replaceHomeCards(original: UIPage, cards: UIHomeCard[]): UIPage {
  const next = structuredClone(original);
  for (const slot of ['beforeContent', 'afterContent'] as const) next.slots[slot] = next.slots[slot].filter(block => block.type !== 'homeCard');
  const ids = new Set([...next.slots.beforeContent, ...next.slots.afterContent].map(block => block.id));
  for (const card of cards) {
    if (ids.has(card.id)) throw new Error('A home control has the same identifier as another section. Duplicate it with a new identifier before saving.');
    ids.add(card.id);
  }
  if (ids.size > 40) throw new Error('Remove an extra section before adding more home controls. The shared limit is 40.');
  next.slots.beforeContent.push(...structuredClone(cards));
  next.rendererVersion = Math.max(original.rendererVersion, original.homeHeader || cards.some(card => card.props.homeAction === 'link') ? 6 : 5) as UIPage['rendererVersion'];
  return next;
}

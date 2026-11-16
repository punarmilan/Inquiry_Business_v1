import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { UIImageUpload } from '@/components/hyperlocal/UIImageUpload';
import { UIBlockInspector } from '@/components/hyperlocal/UIBlockInspector';
import { UIHomeCardPreview } from '@/components/hyperlocal/UIHomeCardPreview';
import { UIReleaseControls } from '@/components/hyperlocal/UIReleaseControls';
import { UIHomeHeaderControls } from '@/components/hyperlocal/UIHomeHeaderControls';
import { UIHomeHeaderPreview } from '@/components/hyperlocal/UIHomeHeaderPreview';
import { DEFAULT_HOME_HEADER } from '../../../../../mobile/frontend/src/utils/uiHomeHeader';
import { useUIWorkspace } from '@/hooks/useUIWorkspace';
import { newUIBlock } from '@/utils/uiPageBuilder';
import { replaceHomeCards } from '@/utils/uiEditorParts';
import { cn } from '@/lib/utils';
import { defaultHomeCards, homeCards } from '../../../../../mobile/frontend/src/utils/uiHome';
import type { UIHomeCard, UIPage, UIHomeHeader } from '../../../../../mobile/frontend/src/types/dynamicUI';

const groups: Array<{ label: string; placements: UIHomeCard['props']['placement'][] }> = [
  { label: 'Carousel cards', placements: ['promo'] },
  { label: 'Home banners', placements: ['aboveTrending', 'belowTrending'] },
  { label: 'Trending appearance', placements: ['trending'] },
  { label: 'Individual offer artwork', placements: ['offer'] },
];
const placementName = (card: UIHomeCard) => ({ promo: 'Carousel card', aboveTrending: 'Top banner', belowTrending: 'Bottom banner', trending: 'Trending appearance', offer: 'Offer artwork' })[card.props.placement];

export function HomeCardsPage() {
  const w = useUIWorkspace('page', 'offersHome');
  const page = w.config as UIPage;
  const storedCards = homeCards(page);
  const configured = storedCards.length > 0;
  const cards = configured ? storedCards : defaultHomeCards().map(card => {
    const occupied = new Set([...page.slots.beforeContent, ...page.slots.afterContent].map(block => block.id));
    while (occupied.has(card.id)) card.id += '_home';
    return card;
  });
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const selected = cards.find(card => card.id === selectedId) || cards[0];
  const commit = (next: UIHomeCard[]) => {
    try { w.setConfig(replaceHomeCards(page, next)); setMessage(''); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update home content.'); }
  };
  const change = (card: UIHomeCard) => commit(cards.map(item => item.id === card.id ? card : item));
  const header = page.homeHeader || DEFAULT_HOME_HEADER;
  const changeHeader = (homeHeader: UIHomeHeader) => {
    try { w.setConfig({ ...replaceHomeCards(page, cards), homeHeader, rendererVersion: 6 }); setMessage(''); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not change header style.'); }
  };
  const selectCard = (id: string) => {
    setSelectedId(id);
  };
  const restore = (placement: 'aboveTrending' | 'belowTrending' | 'trending') => {
    const card = defaultHomeCards().find(card => card.props.placement === placement)!;
    if ([...page.slots.beforeContent, ...page.slots.afterContent].some(block => block.id === card.id)) card.id = `home_${crypto.randomUUID()}`;
    commit([...cards, card]); selectCard(card.id);
  };
  const add = (placement: 'promo' | 'offer') => {
    const card = newUIBlock('homeCard') as UIHomeCard;
    card.props.placement = placement;
    if (placement === 'offer') { card.props.offerId = ''; card.props.media = 'none'; card.props.title = { en: 'Offer artwork' }; }
    commit([...cards, card]); setSelectedId(card.id);
  };
  const move = (direction: -1 | 1) => {
    if (!selected) return;
    const promos = cards.filter(card => card.props.placement === 'promo');
    const index = promos.findIndex(card => card.id === selected.id);
    const target = promos[index + direction];
    if (!target) return;
    const next = [...cards], a = next.indexOf(selected), b = next.indexOf(target);
    [next[a], next[b]] = [next[b], next[a]]; commit(next);
  };
  const promoIndex = cards.filter(card => card.props.placement === 'promo').findIndex(card => card.id === selected?.id);
  const extraSections = [...page.slots.beforeContent, ...page.slots.afterContent].filter(block => block.type !== 'homeCard').length;

  return <div className="space-y-4">
    <header className="space-y-3 border-b bg-background pb-4 lg:sticky lg:top-[72px] lg:z-20 lg:pt-2">
      <div><h1 className="text-2xl font-bold tracking-tight">Home cards & banners</h1><p className="mt-1 text-sm text-muted-foreground">Choose a header style or edit a card, then publish to app.</p></div>
      <UIReleaseControls workspace={w} compact publicationDisabled={!configured} />
    </header>
    {!w.ready ? <div role={w.error ? 'alert' : 'status'} className="min-h-40 rounded-xl border bg-card p-5"><p>{w.error || 'Loading home content...'}</p>{w.error && <Button className="mt-3" variant="outline" onClick={() => void w.reload()}>Try again</Button>}</div> : <>
      {message && <p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{message}</p>}
      <UIHomeHeaderControls settings={header} disabled={w.busy} onChange={changeHeader} />
      <UIHomeHeaderPreview cards={cards} settings={header} onSelect={setSelectedId} />
      <label className="block max-w-lg space-y-2 text-sm font-semibold">Card or banner
        <select disabled={w.busy} value={selected?.id || ''} onChange={e => selectCard(e.target.value)} className="h-11 w-full rounded-lg border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {groups.map(group => <optgroup key={group.label} label={group.label}>{cards.filter(card => group.placements.includes(card.props.placement)).map(card => <option key={card.id} value={card.id}>{card.props.placement === 'aboveTrending' || card.props.placement === 'belowTrending' ? placementName(card) : card.props.title.en}{card.hidden ? ' (hidden)' : ''}</option>)}</optgroup>)}
        </select>
      </label>
      {selected && <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.85fr)]">
          <fieldset disabled={w.busy} aria-label="Home content properties" className="order-2 min-w-0 rounded-2xl border bg-card p-5 lg:order-1">
            <legend className="px-1 font-semibold">Edit text</legend>
            <UIBlockInspector key={selected.id} block={selected} pageKey="offersHome" assets={w.assets} onRegisterAsset={w.registerAsset} fixedHomePlacement simpleHome onChange={block => { if (block.type === 'homeCard') change(block); }} />
          </fieldset>
          <section aria-label="Selected home preview" className="order-1 min-w-0 space-y-3 rounded-2xl border bg-card p-5 lg:order-2">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{placementName(selected)} preview</h2><span className="text-xs text-muted-foreground">{selected.hidden ? 'Hidden in app' : 'Visible in app'}</span></div>
            <div data-home-preview={selected.id} className={cn('mx-auto w-full max-w-md', selected.hidden && 'opacity-50')}><UIHomeCardPreview card={selected} /></div>
            <UIImageUpload key={selected.id} compact disabled={w.busy} onUploaded={asset => { w.registerAsset(asset); change({ ...selected, props: { ...selected.props, media: 'image', assetId: asset._id } }); }} />
            <p className="text-xs text-muted-foreground">Changes appear here first. Publish to update the app.</p>
          </section>
      </div>}
      <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Manage cards & order</summary><fieldset disabled={w.busy} className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={cards.filter(card => card.props.placement === 'promo').length >= 8} onClick={() => add('promo')}><Plus />Add carousel card</Button>
        <Button variant="outline" size="sm" disabled={cards.filter(card => card.props.placement === 'offer').length >= 12} onClick={() => add('offer')}><Plus />Add offer artwork</Button>
        {(['aboveTrending', 'belowTrending', 'trending'] as const).filter(placement => !cards.some(card => card.props.placement === placement)).map(placement => <Button key={placement} variant="outline" size="sm" onClick={() => restore(placement)}>Add {placement === 'aboveTrending' ? 'top banner' : placement === 'belowTrending' ? 'bottom banner' : 'trending appearance'}</Button>)}
        {selected?.props.placement === 'promo' && <><Button variant="outline" size="sm" disabled={promoIndex <= 0} onClick={() => move(-1)}><ArrowUp />Move earlier</Button><Button variant="outline" size="sm" disabled={promoIndex >= cards.filter(card => card.props.placement === 'promo').length - 1} onClick={() => move(1)}><ArrowDown />Move later</Button></>}
        {selected && (selected.props.placement === 'promo' || selected.props.placement === 'offer') && <Button variant="outline" size="sm" onClick={() => commit(cards.filter(card => card.id !== selected.id))}><Trash />Remove this {selected.props.placement === 'promo' ? 'card' : 'artwork'}</Button>}
      </fieldset></details>
      <p className="text-xs leading-5 text-muted-foreground">Publishing applies the whole saved home-screen draft, including its {extraSections} Dynamic UI section{extraSections === 1 ? '' : 's'}. <Link to="/ui/pages/offersHome" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">Layout & advanced draft tools (new tab)</Link> · <Link to="/home-showcase" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">Trending posters (new tab)</Link></p>
    </>}
  </div>;
}

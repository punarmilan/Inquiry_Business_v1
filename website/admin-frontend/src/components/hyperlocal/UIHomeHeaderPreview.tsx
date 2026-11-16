import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CalendarBlank, CaretLeft, CaretRight, House, PlusSquare, Wrench } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { UIHomeCardPreview } from './UIHomeCardPreview';
import type { UIHomeCard, UIHomeHeader } from '../../../../../mobile/frontend/src/types/dynamicUI';
import { homeHeaderGeometry } from '../../../../../mobile/frontend/src/utils/homeHeaderGeometry';
import { HOME_HEADER_PRESETS } from '../../../../../mobile/frontend/src/utils/uiHomeHeader';
import { HOME_SHORTCUTS } from '../../../../../mobile/frontend/src/utils/homeShortcuts';
import { translations } from '../../../../../mobile/frontend/src/i18n/translations';

const shortcutIcons = { offers: House, post: PlusSquare, events: CalendarBlank, services: Wrench };

export function UIHomeHeaderPreview({ cards, settings, onSelect }: { cards: UIHomeCard[]; settings: UIHomeHeader; onSelect: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null), previousIndex = useRef(0);
  const [width, setWidth] = useState(375), [index, setIndex] = useState(0), [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false), [visible, setVisible] = useState(true);
  const [ended, setEnded] = useState<{ key: string; result: 'finished' | 'failed' } | null>(null);
  const promos = cards.filter(card => card.props.placement === 'promo' && !card.hidden);
  const identities = promos.map(card => card.id).join(',');
  const current = promos[index % promos.length];
  const playKey = `${settings.style}:${index}:${current?.id}:${current?.props.assetId}:${current?.props.speed}:${current?.props.loopCount}`;
  const waits = current?.props.media === 'lottie' && Boolean(current.props.assetId);
  const result = ended?.key === playKey ? ended.result : null;
  const g = homeHeaderGeometry(width, settings, promos.length);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width)); observer.observe(host.current);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReduceMotion(motion.matches), visibility = () => setVisible(!document.hidden);
    changed(); visibility(); motion.addEventListener('change', changed); document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); motion.removeEventListener('change', changed); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => { setIndex(0); setEnded(null); }, [identities, settings.style]);
  useLayoutEffect(() => {
    const previous = previousIndex.current; previousIndex.current = index;
    if (!rail.current || previous === index || reduceMotion) return;
    const direction = index === (previous + 1) % promos.length ? 1 : -1;
    const target = settings.style === 'accordion' ? rail.current.firstElementChild : rail.current;
    const frames = settings.style === 'accordion' ? [{ transform: 'scale(0.85)' }, { transform: 'scale(1)' }]
      : settings.transition === 'fade' ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ transform: `translateX(${g.origin + direction * g.stride}px)` }, { transform: `translateX(${g.origin}px)` }];
    const animation = target?.animate(frames, { duration: settings.style === 'accordion' ? 650 : 380, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [index, reduceMotion, settings.style, settings.transition, promos.length, g.origin, g.stride]);
  useEffect(() => {
    if (!settings.autoPlay || paused || !visible || reduceMotion || promos.length < 2 || (waits && !result)) return;
    const timer = setTimeout(() => setIndex(value => (value + 1) % promos.length), waits && result === 'finished' ? 350 : settings.intervalSeconds * 1000);
    return () => clearTimeout(timer);
  }, [settings.autoPlay, settings.intervalSeconds, paused, visible, reduceMotion, promos.length, index, waits, result]);
  const next = (delta: number) => { setIndex(value => (value + delta + promos.length) % promos.length); setEnded(null); };
  const renderCard = (card: UIHomeCard, active: boolean, cardWidth: number, height: number, key: string) => <button type="button" key={key} aria-label={`Select ${card.props.title.en} in header preview`} onClick={() => onSelect(card.id)}
    className="shrink-0 overflow-hidden rounded-3xl border-[3px] border-white text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    style={{ width: cardWidth, height, transform: active ? undefined : 'scale(0.9)' }}>
    <UIHomeCardPreview key={`${key}:${active ? playKey : card.id}`} card={card} template={settings.style} previewHeight={height} compact={!active && settings.style === 'accordion'} active={active}
      autoPlay={active && !paused && visible && !reduceMotion} onPlaybackEnd={active ? result => setEnded({ key: playKey, result }) : undefined} />
  </button>;
  return <section aria-label="Full header preview" className="space-y-3 rounded-2xl border bg-muted/30 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">App header preview</h2><span className="text-xs text-muted-foreground">{HOME_HEADER_PRESETS.find(preset => preset.id === settings.style)?.name}</span></div>
    <div ref={host} className="mx-auto w-full max-w-[420px]">
      {!promos.length ? <p className="p-6 text-center text-sm text-muted-foreground">No visible header cards. Enable a card to preview this style.</p> : <>
        <div className="relative overflow-hidden" data-header-style={settings.style} style={{ width: g.viewport, height: g.height + (settings.style === 'accordion' ? 6 : 0), marginInline: 14 }}>
          {settings.style === 'accordion' ? <div ref={rail} className="flex items-center gap-[3px]">{Array.from({ length: Math.min(4, promos.length) }, (_, offset) => {
            const card = promos[(index + offset) % promos.length], count = Math.min(4, promos.length);
            const available = g.viewport - 3 * (count - 1), big = available * (count === 1 ? 1 : count === 2 ? 0.62 : count === 3 ? 0.5 : 0.44);
            return renderCard(card, offset === 0, offset === 0 ? big : (available - big) / (count - 1), offset === 0 ? g.height : g.height * 0.85, String(offset));
          })}</div> : <div ref={rail} className="flex items-center" style={{ gap: g.gap, width: g.stride * 4, transform: `translateX(${g.origin}px)` }}>{(promos.length === 1 ? [0] : [-1, 0, 1, 2]).map(offset => renderCard(promos[(index + offset + promos.length) % promos.length], offset === 0, g.cardWidth, g.height, String(offset)))}</div>}
          {settings.showArrows && promos.length > 1 && <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between"><Button type="button" size="icon" variant="outline" className="pointer-events-auto h-8 w-8 rounded-full" aria-label="Previous header card" onClick={() => next(-1)}><CaretLeft /></Button><Button type="button" size="icon" variant="outline" className="pointer-events-auto h-8 w-8 rounded-full" aria-label="Next header card" onClick={() => next(1)}><CaretRight /></Button></div>}
        </div>
        {settings.showDots && <div className="flex h-[18px] items-center justify-center gap-2">{promos.map((card, position) => <button type="button" key={card.id} aria-label={`Show header card ${position + 1}`} aria-pressed={position === index} onClick={() => { setIndex(position); setEnded(null); }} className={`h-3 w-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${position === index ? 'bg-primary' : 'bg-border hover:bg-primary/40'}`} />)}</div>}
      </>}
      <div role="group" aria-label="Service shortcuts" className="mx-3.5 grid grid-cols-4 gap-2 pb-1.5 text-foreground">
        {HOME_SHORTCUTS.map(item => {
          const Icon = shortcutIcons[item.key];
          return <div key={item.key} className="flex min-h-16 min-w-0 flex-col items-center gap-1.5 px-0.5 py-1.5 text-center text-[11px] font-semibold leading-4">
            <Icon aria-hidden="true" size={28} weight="regular" className="shrink-0" />
            <span>{translations.en[item.labelKey]}</span>
          </div>;
        })}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Tap a preview card to edit its content.</p><Button type="button" size="sm" variant="ghost" onClick={() => { setEnded(null); setPaused(value => !value); }}>{paused ? 'Play header preview' : 'Pause header preview'}</Button></div>
  </section>;
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowArcLeft,
  ArrowArcRight,
  Copy,
  DotsSixVertical,
  GridFour,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DesignStudioShell } from '@/components/hyperlocal/DesignStudioShell';
import { UIPhonePreview } from '@/components/hyperlocal/UIPhonePreview';
import { UIBlockInspector } from '@/components/hyperlocal/UIBlockInspector';
import { UIReleaseControls } from '@/components/hyperlocal/UIReleaseControls';
import { homePlacementLabel } from '../../../../../mobile/frontend/src/utils/uiHome';
import { dynamicPage, mergeDynamicPage } from '@/utils/uiEditorParts';
import { useUIWorkspace } from '@/hooks/useUIWorkspace';
import { presentationFields } from '../../../../../mobile/frontend/src/utils/dynamicUI';
import { UI_PAGE_KEYS, type UIPageKey } from '../../../../../mobile/frontend/src/types/dynamicUI';
import { addUIBlock, moveUIBlock, newUIBlock, pageBlocks, removeUIBlock, updateUIBlock } from '@/utils/uiPageBuilder';
import type { UIBlock, UIPage, UISlot } from '../../../../../mobile/frontend/src/types/dynamicUI';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function UIPageBuilderPage() {
  const [pageKey, setPageKey] = useState<UIPageKey>('offersHome');
  return <UIPageWorkspace key={pageKey} pageKey={pageKey} onPageChange={setPageKey} />;
}

function UIPageWorkspace({
  pageKey,
  onPageChange,
}: {
  pageKey: UIPageKey;
  onPageChange: (key: UIPageKey) => void;
}) {
  const w = useUIWorkspace('page', pageKey);
  const fullPage = w.config as UIPage;
  const page = dynamicPage(fullPage);
  const setPage = (next: UIPage) => w.setConfig(mergeDynamicPage(fullPage, next));
  const [selectedId, setSelectedId] = useState('');
  const [slot, setSlot] = useState<UISlot>('beforeContent');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [message, setMessage] = useState('');
  const [dragTarget, setDragTarget] = useState('');
  const [historyTick, setHistoryTick] = useState(0);
  const [deviceWidth, setDeviceWidth] = useState(375);
  const [pendingScreen, setPendingScreen] = useState<UIPageKey | null>(null);

  const past = useRef<UIPage[]>([]);
  const future = useRef<UIPage[]>([]);
  const drag = useRef<{ id: string; slot: UISlot; target?: string; x: number; y: number; moved: boolean } | null>(null);

  const selected = pageBlocks(page).find((block) => block.id === selectedId);

  useEffect(() => {
    past.current = [];
    future.current = [];
    setHistoryTick((tick) => tick + 1);
    setSelectedId('');
  }, [w.draft?._id, w.head?._id]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (w.dirty && past.current.length) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [w.dirty]);

  const commit = (next: UIPage) => {
    if (JSON.stringify(next) === JSON.stringify(page)) return;
    past.current.push(structuredClone(page));
    if (past.current.length > 40) past.current.shift();
    future.current = [];
    setPage(next);
    setHistoryTick(historyTick + 1);
    setMessage('');
  };

  const add = (type: UIBlock['type'], source?: 'nearby' | 'showcase') => {
    try {
      const assetId = Object.values(w.assets).find((asset) => type === 'image' ? asset.kind === 'image' : asset.kind !== 'image')?.id;
      const block = newUIBlock(type, assetId);
      if (block.type === 'image' && assetId) block.props.assetId = assetId;
      if (block.type === 'offerRail' && source) block.props.source = source;
      commit(addUIBlock(page, slot, block));
      setSelectedId(block.id);
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  const step = (block: UIBlock, currentSlot: UISlot, offset: number) => {
    const index = page.slots[currentSlot].findIndex((item) => item.id === block.id);
    const target = page.slots[currentSlot][index + offset];
    if (target) commit(moveUIBlock(page, block.id, currentSlot, target.id));
  };

  const library: [string, UIBlock['type'], ('nearby' | 'showcase')?][] = [
    ['Hero banner', 'heroBanner'],
    ['Image', 'image'],
    ['Icon', 'icon'],
    ['Text', 'text'],
    ['Nearby offers', 'offerRail', 'nearby'],
    ['Selected trending offers', 'offerRail', 'showcase'],
    ['Action link', 'actionLink'],
    ['Lottie animation', 'lottie'],
    ['Spacer', 'spacer'],
    ['Bundled illustration', 'illustration'],
  ];

  const totalSections = page.slots.beforeContent.length + page.slots.afterContent.length;

  return (
    <DesignStudioShell
      title="Dynamic UI editor"
      description="Choose a screen, add extra sections and arrange their layout. Select a section in the preview to edit its properties."
      activeTab="layout"
    >
      <div className="space-y-6">
        {pageKey === 'offersHome' && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <p className="max-w-2xl text-sm text-muted-foreground">This editor manages extra sections and screen layout. Existing carousel cards and the two home banners have a separate editor.</p>
          <Link to="/home-content" target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open Home cards & banners (new tab) →</Link>
        </div>}
        {/* Top Control Bar: Screen Selector, History (Undo/Redo), Slot Picker, Preview Mode */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-foreground">
              <span>Screen</span>
              <select
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={pageKey}
                disabled={w.busy}
                onChange={(e) => {
                  if (past.current.length && w.dirty) setPendingScreen(e.target.value as UIPageKey);
                  else onPageChange(e.target.value as UIPageKey);
                }}
              >
                {UI_PAGE_KEYS.map((key) => (
                  <option value={key} key={key}>
                    {key.replace(/([A-Z])/g, ' $1')}
                  </option>
                ))}
              </select>
            </label>

            <div className="hidden sm:block h-5 w-px bg-border" />

            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Add to</span>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as UISlot)}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="beforeContent">Before content</option>
                <option value="afterContent">After content</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled={w.busy || !w.ready} onClick={() => void w.save()}>Save draft</Button>
            <Button size="sm" disabled={w.busy || !w.ready} onClick={() => document.getElementById('ui-publication')?.scrollIntoView({ block: 'start' })}>Review & publish</Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl text-xs font-medium"
              disabled={w.busy || !past.current.length}
              onClick={() => {
                const previous = past.current.pop();
                if (previous) {
                  future.current.push(structuredClone(page));
                  setPage(previous);
                  setHistoryTick(historyTick + 1);
                }
              }}
            >
              {ArrowArcLeft && <ArrowArcLeft className="h-3.5 w-3.5" />}
              Undo
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl text-xs font-medium"
              disabled={w.busy || !future.current.length}
              onClick={() => {
                const next = future.current.pop();
                if (next) {
                  past.current.push(structuredClone(page));
                  setPage(next);
                  setHistoryTick(historyTick + 1);
                }
              }}
            >
              {ArrowArcRight && <ArrowArcRight className="h-3.5 w-3.5" />}
              Redo
            </Button>

            <div className="h-5 w-px bg-border" />

            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Width</span><select className="h-9 rounded-xl border bg-background px-2 text-xs" value={deviceWidth} onChange={(e) => setDeviceWidth(Number(e.target.value))}><option value={320}>320 px</option><option value={375}>375 px</option><option value={414}>414 px</option></select>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Preview</span>
              <select
                className="h-9 rounded-xl border border-input bg-background px-2.5 text-xs font-semibold text-foreground outline-none"
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        </div>

        {message && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {message}
          </div>
        )}

        {/* 3-Panel Layout: Left Library, Center Canvas, Right Inspector */}
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[210px_minmax(0,1fr)_300px]">
          {/* Panel 1 (Left): Component Library */}
          <fieldset
            disabled={w.busy || !w.ready}
            className="order-2 rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-4 xl:order-1"
          >
            <div>
              <h2 className="text-sm font-bold text-foreground">Component library</h2>
              <p className="text-[11px] text-muted-foreground">
                Tap to insert into {slot === 'beforeContent' ? 'top' : 'bottom'} slot
              </p>
            </div>

            <div className="space-y-1.5">
              {library
                .filter(
                  ([, type]) =>
                    (type !== 'homeCard' || pageKey === 'offersHome') &&
                    (type !== 'offerRail' || pageKey === 'offersHome') &&
                    (type !== 'actionLink' || pageKey === 'offersHome')
                )
                .map(([label, type, source]) => (
                  <Button
                    className="w-full justify-start rounded-xl text-xs font-medium h-9 gap-2 transition-all hover:border-primary/50"
                    variant="outline"
                    key={label}
                    disabled={
                      type === 'lottie' &&
                      (!Object.values(w.assets).some((asset) => asset.kind !== 'image') ||
                        pageBlocks(page).some((block) => block.type === 'lottie'))
                    }
                    onClick={() => add(type, source)}
                  >
                    {Plus && <Plus className="h-3.5 w-3.5 text-primary" />}
                    Add {label}
                  </Button>
                ))}
            </div>

            <div className="rounded-xl bg-muted/40 p-3 space-y-2 border border-border/50">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Forms, business actions, prices, filters and navigation are protected native components. Remote sections cannot remove them.
              </p>
              <div className="pt-1 border-t border-border/40 space-y-1 text-xs">
                <Link className="block font-medium text-primary hover:underline" to="/home-showcase" target="_blank" rel="noreferrer">
                  Choose trending offer records →
                </Link>
                <Link className="block font-medium text-primary hover:underline" to="/ui/animations" target="_blank" rel="noreferrer">
                  Manage animations →
                </Link>
                <Link className="block font-medium text-primary hover:underline" to="/ui/themes" target="_blank" rel="noreferrer">
                  Edit global theme →
                </Link>
              </div>
            </div>
          </fieldset>

          {/* Panel 2 (Center): Canvas Sections & Visual Flow */}
          <div className="order-1 flex min-w-0 flex-col gap-5 xl:order-2">
            <section className="order-2 rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">Layers and section order</h2>
                  <p className="text-xs text-muted-foreground">
                    Drag a handle, use its arrow keys, or use Up/Down. Select a section to edit its properties.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {totalSections} {totalSections === 1 ? 'block' : 'blocks'}
                </span>
              </div>

              {/* Slot 1: Before Content */}
              {(['beforeContent', 'afterContent'] as const).map((key) => {
                const isBefore = key === 'beforeContent';
                const blocks = page.slots[key];

                return (
                  <div key={key} className="space-y-2.5">
                    <div
                      data-ui-slot={key}
                      className={cn(
                        'min-h-24 space-y-2 rounded-xl border-2 border-dashed p-3.5 transition-colors',
                        dragTarget === key
                          ? 'border-primary bg-primary/5'
                          : 'border-border/80 bg-muted/20 hover:border-border'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {isBefore ? 'Before protected content' : 'After protected content'}
                        </h3>
                        <span className="text-[11px] font-semibold text-muted-foreground/70">
                          {blocks.length} {blocks.length === 1 ? 'section' : 'sections'}
                        </span>
                      </div>

                      {!blocks.length && (
                        <div className="py-5 text-center text-xs text-muted-foreground">
                          Empty optional slot. Use the library on the left to add blocks here.
                        </div>
                      )}

                      {blocks.map((block, index) => {
                        const isBlockSelected = selectedId === block.id;

                        return (
                          <div
                            key={block.id}
                            data-ui-block-id={block.id}
                            className={cn(
                              'group flex items-center gap-2 rounded-xl border p-2.5 transition-all text-xs',
                              isBlockSelected || dragTarget === block.id
                                ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                                : 'border-border/70 bg-card hover:border-primary/40'
                            )}
                          >
                            {/* Drag Handle button */}
                            <button
                              type="button"
                              aria-label={`Drag ${block.type} section ${index + 1}`}
                              disabled={w.busy}
                              className="touch-none rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  step(block, key, e.key === 'ArrowUp' ? -1 : 1);
                                }
                              }}
                              onPointerDown={(e) => {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                drag.current = { id: block.id, slot: key, x: e.clientX, y: e.clientY, moved: false };
                              }}
                              onPointerMove={(e) => {
                                if (!drag.current) return;
                                if (Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) < 6) return;
                                const node = document.elementFromPoint(e.clientX, e.clientY);
                                const targetSlot = node?.closest<HTMLElement>('[data-ui-slot]')?.dataset.uiSlot as UISlot | undefined;
                                const target = node?.closest<HTMLElement>('[data-ui-block-id]')?.dataset.uiBlockId;
                                if (targetSlot) {
                                  drag.current = { ...drag.current, slot: targetSlot, target, moved: true };
                                  setDragTarget(target || targetSlot);
                                }
                              }}
                              onPointerUp={(e) => {
                                if (drag.current?.moved) commit(moveUIBlock(page, drag.current.id, drag.current.slot, drag.current.target));
                                drag.current = null;
                                setDragTarget('');
                                e.currentTarget.releasePointerCapture(e.pointerId);
                              }}
                              onPointerCancel={() => {
                                drag.current = null;
                                setDragTarget('');
                              }}
                            >
                              <DotsSixVertical size={18} />
                            </button>

                            {/* Section Label & Selector */}
                            <button
                              type="button"
                              className="min-w-0 flex-1 truncate text-left font-semibold text-foreground focus-visible:outline-none"
                              onClick={() => setSelectedId(block.id)}
                            >
                              <span>{block.type === 'homeCard' ? `${block.props.title.en} · ${homePlacementLabel[block.props.placement]}` : block.type}</span>
                              {block.hidden ? (
                                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  Hidden
                                </span>
                              ) : null}
                            </button>

                            {/* Up / Down reorder buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Move ${block.type} up`}
                                disabled={w.busy || index === 0}
                                onClick={() => step(block, key, -1)}
                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                Up
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Move ${block.type} down`}
                                disabled={w.busy || index === blocks.length - 1}
                                onClick={() => step(block, key, 1)}
                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                Down
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Visual Marker for Protected Native Screen between slots */}
                    {isBefore && (
                      <div className="flex items-center gap-3 py-2 px-4 rounded-xl bg-muted/40 border border-border/60 text-xs font-semibold text-muted-foreground">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Protected native screen content ({pageKey})</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Native Screen Presentation Settings */}
            <fieldset
              disabled={w.busy || !w.ready}
              className="order-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4"
            >
              <legend className="px-2 text-sm font-semibold text-foreground">
                Native screen presentation
              </legend>
              <p className="text-xs text-muted-foreground">
                Visual options only. Forms, business status, prices, filtering and trusted navigation remain native.
              </p>

              <div className="space-y-4">
                {Object.entries(presentationFields(pageKey)).map(([field, choices]) => {
                  const value = page.presentation?.[field];
                  const update = (next: typeof value) => {
                    const presentation = { ...page.presentation };
                    if (next === undefined) delete presentation[field];
                    else presentation[field] = next;
                    commit({ ...page, rendererVersion: Math.max(page.rendererVersion, 3) as UIPage['rendererVersion'], presentation });
                  };

                  return choices ? (
                    <label className="block text-xs font-semibold text-foreground" key={field}>
                      <span>{field.replace(/([A-Z])/g, ' $1')}</span>
                      <select
                        className="mt-1 block h-9 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        value={typeof value === 'string' ? value : 'default'}
                        onChange={(e) => update(e.target.value === 'default' ? undefined : e.target.value)}
                      >
                        {(!choices.includes('default') ? ['default', ...choices] : choices).map((choice) => (
                          <option key={choice}>{choice}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div key={field} className="grid gap-3 sm:grid-cols-2">
                      {(['en', 'hi'] as const).map((locale) => (
                        <label key={locale} className="text-xs font-semibold text-foreground">
                          <span>{field.replace(/([A-Z])/g, ' $1')} ({locale})</span>
                          <Input
                            maxLength={500}
                            className="mt-1 h-9 rounded-xl text-xs"
                            value={typeof value === 'object' ? value[locale] || '' : ''}
                            onChange={(e) => {
                              const next = { en: '', ...(typeof value === 'object' ? value : {}), [locale]: e.target.value };
                              if (!next.hi) delete next.hi;
                              update(!next.en && !next.hi ? undefined : next);
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </fieldset>

            {/* Embedded Live Phone Preview */}
            <div className="order-1 rounded-2xl border border-border/80 bg-muted/60 p-4 shadow-inner space-y-3" style={{ backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Mobile canvas · {pageKey}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary capitalize">
                  {mode}
                </span>
              </div>
              <div className="flex justify-center py-2">
                <UIPhonePreview theme={w.base.theme} page={page} mode={mode} selectedId={selectedId} deviceWidth={deviceWidth}
                  onSelect={w.busy || !w.ready ? undefined : (id) => { setSelectedId(id); setSlot(page.slots.beforeContent.some((block) => block.id === id) ? 'beforeContent' : 'afterContent'); }}
                  onMove={w.busy || !w.ready ? undefined : (id, destination, target) => commit(moveUIBlock(page, id, destination, target))} />
              </div>
            </div>
          </div>

          {/* Panel 3 (Right): Selected Component Properties Inspector */}
          <fieldset
            disabled={w.busy || !w.ready}
            className="order-3 min-w-0 space-y-5 rounded-2xl border border-border/80 bg-card p-4 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto"
          >
            {selected ? (
              <>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Section Properties
                  </h3>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground capitalize">
                    {selected.type}
                  </span>
                </div>

                <UIBlockInspector
                  pageKey={pageKey}
                  block={selected}
                  occupiedHomePlacements={pageBlocks(page).filter(block => block.type === 'homeCard' && block.id !== selected.id).map(block => block.type === 'homeCard' ? block.props.placement : '')}
                  assets={w.assets}
                  onRegisterAsset={w.registerAsset}
                  onChange={(block) => commit(updateUIBlock(page, block))}
                />

                <div className="border-t border-border/60 pt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs gap-1.5"
                      disabled={selected.type === 'lottie' || (selected.type === 'homeCard' && selected.props.placement !== 'promo')}
                      onClick={() => {
                        try {
                          const block = { ...structuredClone(selected), id: `block_${crypto.randomUUID()}` };
                          commit(addUIBlock(page, slot, block));
                          setSelectedId(block.id);
                        } catch (e) {
                          setMessage((e as Error).message);
                        }
                      }}
                    >
                      {Copy && <Copy className="h-3.5 w-3.5" />}
                      Duplicate
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 rounded-lg text-xs gap-1.5"
                      onClick={() => {
                        commit(removeUIBlock(page, selected.id));
                        setSelectedId('');
                      }}
                    >
                      {Trash && <Trash className="h-3.5 w-3.5" />}
                      Delete section
                    </Button>
                  </div>

                  <label className="block text-xs font-semibold text-foreground">
                    <span>Move to slot</span>
                    <select
                      value={page.slots.beforeContent.some((block) => block.id === selected.id) ? 'beforeContent' : 'afterContent'}
                      onChange={(e) => commit(moveUIBlock(page, selected.id, e.target.value as UISlot))}
                      className="mt-1.5 block h-9 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground outline-none"
                    >
                      <option value="beforeContent">Before content</option>
                      <option value="afterContent">After content</option>
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <div className="py-12 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  {GridFour && <GridFour size={20} />}
                </div>
                <h4 className="text-xs font-bold text-foreground">No Section Selected</h4>
                <p className="text-[11px] leading-relaxed text-muted-foreground px-2">
                  Select a canvas section to change its properties, localizations, or styling.
                </p>
              </div>
            )}
          </fieldset>
        </div>

        {/* Release Controls Bar */}
        <div id="ui-publication" className="scroll-mt-4"><UIReleaseControls workspace={w} /></div>
      </div>
      <Dialog open={pendingScreen !== null} onOpenChange={(open) => { if (!open) setPendingScreen(null); }}><DialogContent><DialogHeader><DialogTitle>Switch screen with unsaved changes?</DialogTitle><DialogDescription>Save your draft first, or discard the local edits before switching screens.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPendingScreen(null)}>Keep editing</Button><Button variant="destructive" onClick={() => { if (pendingScreen) onPageChange(pendingScreen); setPendingScreen(null); }}>Discard and switch</Button></div></DialogContent></Dialog>
    </DesignStudioShell>
  );
}

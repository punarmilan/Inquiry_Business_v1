import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Archive,
  FloppyDisk,
  Sparkle,
  UploadSimple,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DesignStudioShell } from '@/components/hyperlocal/DesignStudioShell';
import { UIAnimationPreview } from '@/components/hyperlocal/UIAnimationPreview';
import { UIReleaseControls } from '@/components/hyperlocal/UIReleaseControls';
import { useUIWorkspace } from '@/hooks/useUIWorkspace';
import { archiveUIAsset, listUIAssets, uiError, updateUIAsset, uploadUIAsset } from '@/api/ui';
import type { UIAnimationAsset } from '@/api/ui';
import type { UIBlock, UIPage, UISlot } from '../../../../../mobile/frontend/src/types/dynamicUI';
import { cn } from '@/lib/utils';
import { UI_ANIMATION_MAX_BYTES } from '../../../../../mobile/frontend/src/utils/uiAnimationLimits';

export function AnimationStudioPage() {
  const w = useUIWorkspace('page', 'offersHome');
  const [assets, setAssets] = useState<UIAnimationAsset[]>([]);
  const [selected, setSelected] = useState<UIAnimationAsset | null>(null);
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [slot, setSlot] = useState<UISlot>('beforeContent');
  const [speed, setSpeed] = useState(1);
  const [loopCount, setLoopCount] = useState(1);
  const [width, setWidth] = useState(160);
  const [height, setHeight] = useState(120);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [fallback, setFallback] = useState('Explore local offers');

  const load = async () => {
    const all: UIAnimationAsset[] = [];
    let page = 1,
      pages = 1;
    do {
      const result = await listUIAssets(page++);
      all.push(...result.data.filter((asset) => asset.kind !== 'image'));
      pages = result.pagination.pages;
    } while (page <= pages);
    setAssets(all);
  };

  const run = async (work: () => Promise<unknown>, onError = setError) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      onError(uiError(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void run(load);
  }, []);

  const select = (asset: UIAnimationAsset) => {
    setSelected(asset);
    setName(asset.name);
    setEnabled(asset.enabled);
  };

  const assign = () => {
    if (!selected || !selected.enabled) return;
    w.registerAsset(selected);
    const page = structuredClone(w.config as UIPage);
    page.rendererVersion = Math.max(page.rendererVersion, 2) as UIPage['rendererVersion'];
    for (const key of ['beforeContent', 'afterContent'] as const) {
      page.slots[key] = page.slots[key].filter((block) => block.type !== 'lottie');
    }
    const block: UIBlock = {
      id: `animation_${crypto.randomUUID()}`,
      type: 'lottie',
      props: {
        assetId: selected._id,
        fallback: { en: fallback },
        speed,
        loop: loopCount > 1,
        loopCount,
        width,
        height,
        alignment,
      },
    };
    page.slots[slot].push(block);
    w.setConfig(page);
    toast.success('Animation assigned to the local draft. Save and publish below.');
  };

  return (
    <DesignStudioShell
      title="Animations"
      description="Upload self-contained vector JSON. Assign one optional decoration to the Offers homepage."
      activeTab="animation"
    >
      <div className="space-y-6">
        {/* Spec Information Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Vector Lottie Standard
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">Max 10 MB · 60 fps · 30 seconds · 100 layers</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Maximum 10 MB, 2048 px, 60 fps, 30 seconds and 100 vector layers. Expressions, effects, text, images, audio, fonts, archives and external resources are rejected. Original bytes are immutable; upload a new asset to replace them.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        {/* 2-Column Layout: Left Library & Upload, Right Selected Asset Workspace */}
        <div className="grid items-start gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Left Column: Upload Dropzone & Asset Library */}
          <section className="space-y-5">
            {/* Upload Zone */}
            <div className="rounded-2xl border-2 border-dashed border-border/80 bg-card p-5 text-center transition-colors hover:border-primary/50 shadow-sm space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {UploadSimple && <UploadSimple className="h-5 w-5" />}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-foreground cursor-pointer">
                  <span>Upload Lottie JSON</span>
                  <Input
                    type="file"
                    accept=".json,application/json"
                    disabled={busy}
                    aria-invalid={Boolean(uploadError)}
                    aria-describedby={`animation-upload-help${uploadError ? ' animation-upload-error' : ''}`}
                    aria-busy={uploading}
                    className="mt-2 h-9 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setUploadError('');
                      setUploading(true);
                      void run(async () => {
                        if (!/\.json$/i.test(file.name)) {
                          throw new Error('Choose a .json Lottie file. Archives such as .lottie and .zip are not supported.');
                        }
                        if (file.size > UI_ANIMATION_MAX_BYTES) {
                          throw new Error(`This file is ${(file.size / (1024 * 1024)).toFixed(2)} MB. The limit is 10 MB. Export a smaller vector Lottie JSON file.`);
                        }
                        if (file.size === 0) {
                          throw new Error('This file is empty. Export the Lottie animation again.');
                        }
                        // File.type depends on browser/OS file associations. Parse the
                        // bytes instead; the API validates the vector Lottie structure.
                        const text = await file.text();
                        let animation: unknown;
                        try {
                          animation = JSON.parse(text.replace(/^\uFEFF/, ''));
                        } catch {
                          throw new Error('This file contains invalid JSON. Export a Lottie JSON file and try again.');
                        }
                        const asset = await uploadUIAsset(
                          file.name.replace(/\.json$/i, '').slice(0, 120),
                          animation
                        );
                        await load();
                        select(asset);
                        w.registerAsset(asset);
                        toast.success('Animation uploaded privately. Publish an assigned page to expose it to the app.');
                      }, setUploadError).finally(() => setUploading(false));
                    }}
                  />
                </label>
                <p id="animation-upload-help" className="text-[11px] text-muted-foreground">
                  Vector Lottie .json files, up to 10 MB
                </p>
                {uploading && <p role="status" className="text-[11px] text-muted-foreground">Uploading animation…</p>}
                {uploadError && <p id="animation-upload-error" role="alert" className="text-[11px] text-destructive">{uploadError}</p>}
              </div>
            </div>

            {/* Asset Library List */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Animation library
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {assets.length} {assets.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              {!assets.length && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No animations uploaded yet.
                </p>
              )}

              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {assets.map((asset) => {
                  const isSelected = selected?._id === asset._id;

                  return (
                    <button
                      type="button"
                      disabled={busy}
                      key={asset._id}
                      onClick={() => select(asset)}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                          : 'border-border/70 bg-card hover:border-primary/40'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="block truncate text-xs font-semibold text-foreground">
                          {asset.name}
                        </strong>
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[9px] font-bold shrink-0',
                            asset.enabled
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {asset.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {asset.width} × {asset.height} · {Math.ceil(asset.size / 1024)} KB
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Right Column: Selected Asset Workspace & Assignment */}
          {selected ? (
            <fieldset
              disabled={busy || w.busy}
              className="space-y-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
            >
              {/* Asset Details & Live Lottie Preview */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="border-b border-border/60 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                      Asset Details
                    </h3>
                  </div>

                  <label className="block text-xs font-semibold text-foreground">
                    <span>Name</span>
                    <Input
                      value={name}
                      maxLength={120}
                      className="mt-1.5 h-9 rounded-xl text-xs"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                      onChange={(e) => setEnabled(e.target.checked)}
                    />
                    <span>Enabled for app delivery</span>
                  </label>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 gap-1.5 rounded-xl text-xs font-semibold"
                      onClick={() =>
                        void run(async () => {
                          const asset = await updateUIAsset(selected, name, enabled);
                          select(asset);
                          await load();
                        })
                      }
                    >
                      {FloppyDisk && <FloppyDisk className="h-3.5 w-3.5" />}
                      Save asset
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        void run(async () => {
                          await archiveUIAsset(selected);
                          setSelected(null);
                          await load();
                        })
                      }
                    >
                      {Archive && <Archive className="h-3.5 w-3.5" />}
                      Archive unused
                    </Button>
                  </div>

                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Referenced assets are retained for drafts and rollback. Disabling an active asset makes its release fall back to the native UI on refresh.
                  </p>
                </div>

                {/* Live Animation Preview Box */}
                <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/20 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Lottie Vector Playback
                  </span>
                  <div className="flex items-center justify-center p-3 rounded-xl bg-card border shadow-xs min-h-[160px] w-full">
                    <UIAnimationPreview
                      key={selected._id + ':' + selected.assetVersion}
                      assetId={selected._id}
                      speed={speed}
                      loop={loopCount > 1}
                      loopCount={loopCount}
                    />
                  </div>
                  <span className="mt-2 text-[10px] text-muted-foreground">
                    Speed: {speed}x · Plays: {loopCount}
                  </span>
                </div>
              </div>

              {/* Assignment Controls */}
              <div className="border-t border-border/60 pt-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Assign to Offers homepage
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Configure placement and playback parameters for the Offers screen
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="space-y-1.5 text-xs font-semibold text-foreground">
                    <span>Slot</span>
                    <select
                      className="block h-9 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={slot}
                      onChange={(e) => setSlot(e.target.value as UISlot)}
                    >
                      <option value="beforeContent">Before content</option>
                      <option value="afterContent">After content</option>
                    </select>
                  </label>

                  <label className="space-y-1.5 text-xs font-semibold text-foreground">
                    <span>Speed</span>
                    <Input
                      type="number"
                      min={0.25}
                      max={2}
                      step={0.25}
                      className="h-9 rounded-xl text-xs"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-semibold text-foreground">
                    <span>Plays (1–3)</span>
                    <Input
                      type="number"
                      min={1}
                      max={3}
                      className="h-9 rounded-xl text-xs"
                      value={loopCount}
                      onChange={(e) => setLoopCount(Number(e.target.value))}
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-semibold text-foreground">
                    <span>Width (32–320)</span>
                    <Input
                      type="number"
                      min={32}
                      max={320}
                      className="h-9 rounded-xl text-xs"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-semibold text-foreground">
                    <span>Height (32–320)</span>
                    <Input
                      type="number"
                      min={32}
                      max={320}
                      className="h-9 rounded-xl text-xs"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-semibold text-foreground">
                    <span>Alignment</span>
                    <select
                      className="block h-9 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={alignment}
                      onChange={(e) => setAlignment(e.target.value as typeof alignment)}
                    >
                      {['left', 'center', 'right'].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-xs font-semibold text-foreground">
                  <span>Static fallback text</span>
                  <Input
                    value={fallback}
                    maxLength={500}
                    className="mt-1.5 h-9 rounded-xl text-xs"
                    onChange={(e) => setFallback(e.target.value)}
                  />
                  <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                    Rendered natively if client devices are offline, low battery, or motion is disabled.
                  </span>
                </label>

                <Button
                  type="button"
                  disabled={!w.ready || !selected.enabled || !fallback}
                  onClick={assign}
                  className="h-10 rounded-xl px-5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Assign animation to draft
                </Button>
              </div>
            </fieldset>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-card p-12 text-center shadow-sm space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                {Sparkle && <Sparkle className="h-6 w-6" />}
              </div>
              <h3 className="text-sm font-bold text-foreground">No Animation Selected</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Select an animation from the library on the left to preview playback, edit settings, or assign it to the Offers homepage.
              </p>
            </div>
          )}
        </div>

        {/* Release Controls Bar */}
        <UIReleaseControls workspace={w} />
      </div>
    </DesignStudioShell>
  );
}

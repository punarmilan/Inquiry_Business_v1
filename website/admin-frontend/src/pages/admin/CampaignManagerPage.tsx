import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DesignStudioShell } from '@/components/hyperlocal/DesignStudioShell';
import { UIPhonePreview } from '@/components/hyperlocal/UIPhonePreview';
import { listCities, type CityRecord } from '@/api/hyperlocal';
import {
  getUICampaign,
  listUICampaigns,
  listUIAssets,
  listUIReleases,
  previewUICampaign,
  saveUICampaign,
  uiError,
  type UICampaign,
  type UICampaignInput,
  type UIAnimationAsset,
  type UIRelease,
} from '@/api/ui';
import { campaignInstant, campaignLocalTime, campaignPresets } from '@/utils/uiCampaignPresets';
import { cn } from '@/lib/utils';

// Self-contained SVGs to ensure 100% CJS test runner compatibility
const SvgPlus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 256 256" fill="currentColor">
    <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
  </svg>
);

const SvgFloppy = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 256 256" fill="currentColor">
    <path d="M219.31,72,184,36.69A15.86,15.86,0,0,0,172.69,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V83.31A15.86,15.86,0,0,0,219.31,72ZM160,48V80H96V48ZM208,208H48V48H80V88a8,8,0,0,0,8,8h72a8,8,0,0,0,8-8V51.31L208,91.31Z" />
  </svg>
);

const SvgShield = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 256 256" fill="currentColor">
    <path d="M208,40H48A16,16,0,0,0,32,56v56c0,82.88,80.79,114.54,92.51,118.66a12,12,0,0,0,6.98,0C143.21,226.54,224,194.88,224,112V56A16,16,0,0,0,208,40Zm0,72c0,69.57-67.11,98.67-80,103.74C115.11,210.67,48,181.57,48,112V56H208Z" />
  </svg>
);

const SvgWarning = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 256 256" fill="currentColor">
    <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z" />
  </svg>
);

const SvgClockwise = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 256 256" fill="currentColor">
    <path d="M224,128a96,96,0,0,1-94.71,96H128a95.38,95.38,0,0,1-67.28-27.72l-.7-.7L48,207.51a8,8,0,0,1-13.66-5.65V152a8,8,0,0,1,8-8H92.16a8,8,0,0,1,5.65,13.66l-18.4,18.4a79.8,79.8,0,0,0,54.3,23.94h.8A80,80,0,1,0,57.17,98.11a8,8,0,1,1-13.86-8A96,96,0,1,1,224,128Z" />
  </svg>
);

const SvgCalendar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 256 256" fill="currentColor">
    <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z" />
  </svg>
);

const blank = (): UICampaignInput => ({
  identifier: '',
  name: '',
  festival: 'custom',
  releaseId: '',
  animationAssetId: null,
  startsAt: '',
  endsAt: '',
  timezone: 'Asia/Kolkata',
  cityIds: [],
  priority: 0,
  state: 'draft',
  enabled: true,
  reason: '',
});

const selectClass =
  'mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20';

const displayTime = (date: string) =>
  new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

async function allPages<T>(fetchPage: (page: number) => Promise<{ data: T[]; pagination: { pages: number } }>) {
  const rows: T[] = [];
  let page = 1,
    pages = 1;
  do {
    const result = await fetchPage(page++);
    rows.push(...result.data);
    pages = result.pagination.pages;
  } while (page <= pages);
  return rows;
}

export function CampaignManagerPage() {
  const [input, setInput] = useState(blank);
  const [selected, setSelected] = useState<UICampaign | null>(null);
  const [campaigns, setCampaigns] = useState<UICampaign[]>([]);
  const [releases, setReleases] = useState<UIRelease[]>([]);
  const [assets, setAssets] = useState<UIAnimationAsset[]>([]);
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewUICampaign>> | null>(null);
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const change = <K extends keyof UICampaignInput>(key: K, value: UICampaignInput[K]) => {
    setInput((old) => ({ ...old, [key]: value }));
    setPreview(null);
    setNotice('');
  };

  const load = async (current = page) => {
    const result = await listUICampaigns(current);
    setCampaigns(result.data);
    setPages(result.pagination.pages);
  };

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (e) {
      setError(uiError(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void run(async () => {
      const [releaseRows, assetRows, cityRows] = await Promise.all([
        allPages(listUIReleases),
        allPages(listUIAssets),
        listCities(),
      ]);
      if (mounted) {
        setReleases(releaseRows);
        setAssets(assetRows.filter((asset) => asset.enabled && !asset.archived && asset.kind !== 'image'));
        setCities(cityRows.filter((city) => city.isActive));
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void load(page).catch((e) => setError(uiError(e)));
    const timer = setInterval(() => {
      void load(page).catch(() => undefined);
    }, 30_000);
    return () => clearInterval(timer);
  }, [page]);

  const edit = async (id: string) => {
    const row = await getUICampaign(id);
    setSelected(row);
    setPreview(null);
    const {
      identifier,
      name,
      festival,
      releaseId,
      animationAssetId,
      startsAt,
      endsAt,
      timezone,
      cityIds,
      priority,
      state,
      enabled,
    } = row;
    setInput({
      identifier,
      name,
      festival,
      releaseId,
      animationAssetId,
      startsAt,
      endsAt,
      timezone,
      cityIds,
      priority,
      state,
      enabled,
      expectedVersion: row.version,
      reason: '',
    });
  };

  const save = (state: UICampaignInput['state'], enabled: boolean) =>
    run(async () => {
      const result = await saveUICampaign(selected?._id || null, { ...input, state, enabled });
      setSelected(result);
      setInput((old) => ({ ...old, state, enabled, expectedVersion: result.version, reason: '' }));
      await load();
      setNotice(
        state === 'scheduled'
          ? 'Campaign scheduled. The server will activate and expire it automatically.'
          : state === 'disabled'
          ? 'Campaign disabled.'
          : 'Draft saved; its schedule is inactive.'
      );
    });

  return (
    <DesignStudioShell
      title="Scheduled campaigns"
      description="Schedule published app experiences by city. All dates use Asia/Kolkata (IST)."
      activeTab="schedule"
    >
      <div className="space-y-6">
        {/* Guidance Notice */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-1.5">
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Publish and validate your design in the studios first, then select that release here. Higher priority wins overlapping schedules; equal priorities are rejected. Your current published default returns when a campaign ends.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {notice}
          </div>
        )}

        {/* 2-Column Layout: Left Structured Form, Right Interactive Preview */}
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* Left: 3-Step Campaign Builder Form */}
          <form
            className="min-w-0 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void save('scheduled', true);
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <h2 className="text-sm font-bold text-foreground">
                {selected ? `Edit ${selected.name}` : 'Create campaign'}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs font-medium gap-1.5"
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setInput(blank());
                  setPreview(null);
                  setError('');
                  setNotice('');
                }}
              >
                <SvgPlus className="h-3.5 w-3.5" />
                New campaign
              </Button>
            </div>

            <fieldset disabled={busy || !ready} className="space-y-6">
              {/* Step 1: Festival & Design Release */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="border-b border-border/60 pb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Step 1 of 3
                  </span>
                  <h3 className="text-sm font-bold text-foreground">
                    Festival & Design Release
                  </h3>
                </div>

                <label className="block text-xs font-semibold text-foreground">
                  <span>Festival template</span>
                  <select
                    className={selectClass}
                    value={input.festival}
                    onChange={(e) => {
                      const festival = e.target.value as UICampaignInput['festival'];
                      setInput((old) => ({
                        ...old,
                        festival,
                        name: festival === 'custom' ? old.name : campaignPresets[festival].name,
                      }));
                      setPreview(null);
                    }}
                  >
                    {Object.entries(campaignPresets).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="text-[11px] text-muted-foreground">
                  The {campaignPresets[input.festival].themePreset} palette is available in App colors. Templates supply no dates or assumed assets.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-foreground">
                    <span>Campaign name</span>
                    <Input
                      required
                      maxLength={120}
                      className="mt-1.5 h-10 rounded-xl text-xs"
                      value={input.name}
                      onChange={(e) => change('name', e.target.value)}
                    />
                  </label>

                  <label className="block text-xs font-semibold text-foreground">
                    <span>Identifier</span>
                    <Input
                      required
                      pattern="[a-z0-9][a-z0-9-]{2,79}"
                      className="mt-1.5 h-10 rounded-xl text-xs font-mono"
                      value={input.identifier}
                      placeholder="diwali-local-offers"
                      onChange={(e) => change('identifier', e.target.value)}
                    />
                    <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                      3–80 lowercase letters, numbers or hyphens.
                    </span>
                  </label>
                </div>

                <label className="block text-xs font-semibold text-foreground">
                  <span>Published theme and layout</span>
                  <select
                    required
                    className={selectClass}
                    value={input.releaseId}
                    onChange={(e) => change('releaseId', e.target.value)}
                  >
                    <option value="">Select a validated release</option>
                    {releases.map((release) => (
                      <option key={release._id} value={release._id}>
                        Generation {release.generation} · {release.reason}
                      </option>
                    ))}
                  </select>
                </label>

                {!releases.length && ready && (
                  <p className="text-xs text-muted-foreground">
                    Publish a theme or page in the studios to create your first release.
                  </p>
                )}

                <label className="block text-xs font-semibold text-foreground">
                  <span>Offers homepage animation</span>
                  <select
                    className={selectClass}
                    value={input.animationAssetId || ''}
                    onChange={(e) => change('animationAssetId', e.target.value || null)}
                  >
                    <option value="">Keep the release animation</option>
                    {assets.map((asset) => (
                      <option key={asset._id} value={asset._id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                    A selected asset replaces the release animation for this campaign only.
                  </span>
                </label>
              </div>

              {/* Step 2: Schedule & Target Cities */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="border-b border-border/60 pb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Step 2 of 3
                  </span>
                  <h3 className="text-sm font-bold text-foreground">
                    Schedule & Geo-Targeting
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-foreground">
                    <span>Start (IST)</span>
                    <Input
                      required
                      type="datetime-local"
                      className="mt-1.5 h-10 rounded-xl text-xs"
                      value={campaignLocalTime(input.startsAt)}
                      onChange={(e) => change('startsAt', campaignInstant(e.target.value))}
                    />
                  </label>

                  <label className="block text-xs font-semibold text-foreground">
                    <span>End (IST)</span>
                    <Input
                      required
                      type="datetime-local"
                      className="mt-1.5 h-10 rounded-xl text-xs"
                      value={campaignLocalTime(input.endsAt)}
                      onChange={(e) => change('endsAt', campaignInstant(e.target.value))}
                    />
                  </label>
                </div>

                {/* Target Cities multi-select */}
                <fieldset className="space-y-3 rounded-xl border border-border/70 p-3.5 bg-muted/20">
                  <legend className="text-xs font-bold text-foreground px-1">
                    Target cities
                  </legend>

                  <label className="flex min-h-8 items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!input.cityIds.length}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                      onChange={(e) => {
                        if (e.target.checked) change('cityIds', []);
                      }}
                    />
                    <span>All cities, including users without a selected city</span>
                  </label>

                  <div className="grid max-h-48 gap-1.5 overflow-auto sm:grid-cols-2 pt-1 border-t border-border/50">
                    {cities.map((city) => (
                      <label
                        key={city._id}
                        className="flex min-h-8 items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/50 rounded-lg px-2"
                      >
                        <input
                          type="checkbox"
                          checked={input.cityIds.includes(city._id)}
                          className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary/20"
                          onChange={(e) =>
                            change(
                              'cityIds',
                              e.target.checked
                                ? [...input.cityIds, city._id]
                                : input.cityIds.filter((id) => id !== city._id)
                            )
                          }
                        />
                        <span className="truncate">
                          {city.name}, {city.state}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Select cities to restrict the campaign. An empty selection targets all cities.
                  </p>
                </fieldset>

                <label className="block max-w-48 text-xs font-semibold text-foreground">
                  <span>Priority (0–1000)</span>
                  <Input
                    required
                    type="number"
                    min={0}
                    max={1000}
                    className="mt-1.5 h-10 rounded-xl text-xs font-bold"
                    value={input.priority}
                    onChange={(e) => change('priority', Number(e.target.value))}
                  />
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    Higher numbers win overlapping time windows.
                  </span>
                </label>
              </div>

              {/* Step 3: Review, Audit & Publication */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="border-b border-border/60 pb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Step 3 of 3
                  </span>
                  <h3 className="text-sm font-bold text-foreground">
                    Audit & Publish Schedule
                  </h3>
                </div>

                <label className="block text-xs font-semibold text-foreground">
                  <span>Audit reason</span>
                  <Input
                    required
                    minLength={3}
                    maxLength={500}
                    className="mt-1.5 h-10 rounded-xl text-xs"
                    value={input.reason}
                    placeholder="Describe this schedule or change (required)"
                    onChange={(e) => change('reason', e.target.value)}
                  />
                </label>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <Button
                    type="submit"
                    className="h-10 rounded-xl px-5 text-xs font-semibold bg-gradient-to-r from-[#16b3a6] to-[#0d8781] text-white shadow-md shadow-teal-500/10 hover:from-[#139c91] hover:to-[#0a726d]"
                  >
                    {busy ? 'Saving…' : 'Schedule campaign'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl text-xs font-medium gap-1.5"
                    onClick={() => void save('draft', true)}
                  >
                    <SvgFloppy className="h-3.5 w-3.5" />
                    Save draft
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl text-xs font-medium gap-1.5"
                    onClick={() =>
                      void run(async () => {
                        setPreview(await previewUICampaign(input));
                      })
                    }
                  >
                    <SvgShield className="h-3.5 w-3.5 text-primary" />
                    Validate and preview
                  </Button>

                  {selected && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl text-xs text-amber-600 dark:text-amber-400"
                        onClick={() => void save('disabled', false)}
                      >
                        Disable
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl text-xs text-destructive"
                        onClick={() => void save('draft', true)}
                      >
                        Cancel schedule
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Audit History details */}
            {selected?.audit?.length ? (
              <details className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm text-xs">
                <summary className="cursor-pointer font-bold text-foreground">
                  Audit history · version {selected.version}
                </summary>
                <ol className="mt-3 space-y-2 divide-y divide-border/50">
                  {selected.audit
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <li key={entry.version} className="pt-2 text-muted-foreground">
                        <span className="font-semibold text-foreground">{displayTime(entry.at)}</span> · {entry.reason} · Admin {entry.actor}
                      </li>
                    ))}
                </ol>
              </details>
            ) : null}
          </form>

          {/* Right Column: Interactive Phone Preview & Conflict Check */}
          <aside className="xl:sticky xl:top-6 space-y-4">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Preview mode
                </span>
                <select
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              {preview ? (
                <>
                  <div className="flex justify-center py-2">
                    <UIPhonePreview
                      theme={preview.base.theme}
                      page={preview.base.pages.offersHome}
                      mode={mode}
                    />
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    This is the campaign’s appearance when it wins its eligible schedule.
                  </p>

                  {preview.conflicts.filter((row) => row.id !== selected?._id).length > 0 && (
                    <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                        <SvgWarning className="h-4 w-4" />
                        <h3>Overlapping schedules</h3>
                      </div>
                      {preview.conflicts
                        .filter((row) => row.id !== selected?._id)
                        .map((row) => (
                          <p key={row.id} className="text-amber-800 dark:text-amber-300">
                            {row.name} · priority {row.priority}
                            {row.priority === input.priority
                              ? ' · choose a different priority'
                              : row.priority > input.priority
                              ? ' · takes precedence'
                              : ' · yields to this campaign'}
                          </p>
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <SvgCalendar className="h-5 w-5" />
                  </div>
                  <p className="font-semibold text-foreground">Live Preview Idle</p>
                  <p>
                    Select a release, configure dates and choose <strong>Validate and preview</strong> to inspect the campaign.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Schedule List & Management Table */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Campaign schedule</h2>
              <p className="text-xs text-muted-foreground">
                All dates and activations evaluated in Asia/Kolkata (IST)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-xl text-xs"
              disabled={busy}
              onClick={() => void run(() => load())}
            >
              <SvgClockwise className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
              Refresh status
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Campaign status and schedules in Asia/Kolkata</caption>
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  {['Campaign', 'Status', 'Schedule (IST)', 'Target', 'Priority', ''].map((title) => (
                    <th key={title} scope="col" className="px-3.5 py-3 font-semibold">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {campaigns.map((row) => (
                  <tr key={row._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3.5 py-3.5">
                      <p className="font-bold text-foreground">{row.name}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{row.identifier}</p>
                    </td>
                    <td className="px-3.5 py-3.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
                          row.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : row.status === 'scheduled'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <p className="font-medium text-foreground">{displayTime(row.startsAt)}</p>
                      <p className="text-[11px] text-muted-foreground">to {displayTime(row.endsAt)}</p>
                    </td>
                    <td className="px-3.5 py-3.5 max-w-[200px] truncate">
                      {row.cityIds.length
                        ? row.cityIds
                            .map((id) => cities.find((city) => city._id === id)?.name || id)
                            .join(', ')
                        : 'All cities'}
                    </td>
                    <td className="px-3.5 py-3.5 font-bold">{row.priority}</td>
                    <td className="px-3.5 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        aria-label={`Edit ${row.name}`}
                        onClick={() => void run(() => edit(row._id))}
                        className="h-8 rounded-lg text-xs"
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!campaigns.length && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No campaigns yet. Create a draft above to prepare your first festival.
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              Page {page} of {Math.max(1, pages)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || busy}
                onClick={() => setPage((value) => value - 1)}
                className="h-8 rounded-lg text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages || busy}
                onClick={() => setPage((value) => value + 1)}
                className="h-8 rounded-lg text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      </div>
    </DesignStudioShell>
  );
}

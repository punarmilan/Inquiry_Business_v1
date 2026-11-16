import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getUIConfig, listUIConfigs, listUIReleases, publishUIDraft, rollbackUIRelease, saveUIConfig, uiError, validateUIConfig, validateUIDraft, listUIAssets } from '../api/ui';
import type { UIConfig, UIRelease, UIRevision } from '../api/ui';
import type { UIPageKey } from '../../../../mobile/frontend/src/types/dynamicUI';
import { emptyBase, validateUIEditor } from '../utils/uiConfigSchema';

export function useUIWorkspace(kind: UIConfig['kind'], key: string) {
  const [base, setBase] = useState(emptyBase);
  const [assets, setAssets] = useState<import('../../../../mobile/frontend/src/types/dynamicUI').UIRuntime['assets']>({});
  const [head, setHead] = useState<UIRelease | null>(null);
  const [drafts, setDrafts] = useState<UIRevision[]>([]);
  const [draft, setDraft] = useState<UIRevision | null>(null);
  const [config, setConfig] = useState<UIConfig>(() => kind === 'theme' ? emptyBase().theme : emptyBase().pages[key as UIPageKey]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [releases, setReleases] = useState<UIRelease[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const run = async (work: () => Promise<unknown>, message?: string) => {
    setBusy(true); setError('');
    try { await work(); if (message) toast.success(message); } catch (e) { setError(uiError(e)); } finally { setBusy(false); }
  };
  const load = useCallback(async () => {
    const library: typeof assets = {};
    let assetPage = 1;
    let assetPages = 1;
    do {
      const result = await listUIAssets(assetPage++); assetPages = result.pagination.pages;
      for (const asset of result.data) if (asset.enabled) library[asset._id] = { id: asset._id, sha256: asset.sha256, width: asset.width, height: asset.height, fps: asset.fps, duration: asset.duration, size: asset.size, ...(asset.kind === 'image' ? { kind: 'image', mimeType: asset.mimeType } : {}) };
    } while (assetPage <= assetPages);
    const published = await listUIReleases();
    const latest = published.data[0] || null;
    const next = emptyBase();
    if (latest) {
      const ids = [...Object.values(latest.pageRevisionIds), ...(latest.themeRevisionId ? [latest.themeRevisionId] : [])];
      const revisions = await Promise.all(ids.map(getUIConfig));
      for (const item of revisions) {
        if (item.config.kind === 'theme') next.theme = item.config;
        else next.pages[item.config.key] = item.config;
      }
    }
    const all: UIRevision[] = [];
    let page = 1;
    let pages = 1;
    do { const result = await listUIConfigs(kind, page++); all.push(...result.data); pages = result.pagination.pages; } while (page <= pages);
    const matching = all.filter((item) => item.key === key);
    const selected = matching[0] ? await getUIConfig(matching[0]._id) : null;
    setAssets(library); setBase(next); setHead(latest); setReleases(published.data); setHistoryPage(1); setHistoryPages(published.pagination.pages || 1);
    setDrafts(matching); setDraft(selected); setConfig(structuredClone(selected?.config || (kind === 'theme' ? next.theme : next.pages[key as UIPageKey]))); setReady(true);
  }, [kind, key]);
  useEffect(() => { void run(load); }, [load]);
  const dirty = !draft || JSON.stringify(config) !== JSON.stringify(draft.config);
  const hasUnsavedChanges = ready && JSON.stringify(config) !== JSON.stringify(draft?.config || (kind === 'theme' ? base.theme : base.pages[key as UIPageKey]));
  const persist = async () => {
    validateUIEditor(config, base, assets);
    await validateUIConfig(config);
    const saved = await saveUIConfig(config, draft, kind === 'theme' ? head?.themeRevisionId || undefined : head?.pageRevisionIds[key]);
    setDraft(saved); setDrafts((items) => [saved, ...items.filter((item) => item._id !== saved._id)]);
    return saved;
  };
  return { base, assets, head, draft, drafts, config, setConfig, busy, ready, error, reason, setReason, dirty, hasUnsavedChanges, releases, historyPage, historyPages,
    registerAsset: (asset: import('../api/ui').UIAnimationAsset) => setAssets((current) => ({ ...current, [asset._id]: { id: asset._id, sha256: asset.sha256, width: asset.width, height: asset.height, fps: asset.fps, duration: asset.duration, size: asset.size, ...(asset.kind === 'image' ? { kind: 'image', mimeType: asset.mimeType } : {}) } })),
    reload: () => run(load),
    selectDraft: (id: string) => run(async () => { const selected = await getUIConfig(id); setDraft(selected); setConfig(structuredClone(selected.config)); }),
    newDraft: () => { setDraft(null); setConfig(structuredClone(kind === 'theme' ? base.theme : base.pages[key as UIPageKey])); setError(''); },
    save: () => run(persist, 'Draft saved. Live UI is unchanged.'),
    validate: () => run(async () => { validateUIEditor(config, base, assets); await validateUIConfig(config); }, 'Draft structure and preview contrast are valid.'),
    publish: (publicationReason = reason) => run(async () => {
      if (publicationReason.trim().length < 3) throw new Error('Enter a publication reason of at least 3 characters.');
      const saved = dirty ? await persist() : draft!;
      const validated = await validateUIDraft(saved);
      if (validated.generation !== (head?.generation || 0)) throw new Error('The published release changed. Your draft is saved; reload before publishing.');
      await publishUIDraft(saved, head?.generation || 0, publicationReason.trim()); await load();
    }, 'Published. Mobile will receive this release on its next successful refresh.'),
    history: (page: number) => run(async () => { const result = await listUIReleases(page); setReleases(result.data); setHistoryPage(page); setHistoryPages(result.pagination.pages || 1); }),
    rollback: (id: string) => run(async () => {
      if (reason.trim().length < 3) throw new Error('Enter a rollback reason of at least 3 characters.');
      await rollbackUIRelease(id, head?.generation || 0, reason.trim()); await load();
    }, 'Previous release restored as a new generation.'),
  };
}
export type UIWorkspace = ReturnType<typeof useUIWorkspace>;

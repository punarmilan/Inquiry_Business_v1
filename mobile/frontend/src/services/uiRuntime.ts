import type { UILocale, UIRuntime, UIRuntimeFetchOptions, UIRuntimeHTTPResponse } from '../types/dynamicUI';
import { UI_MAX_BYTES } from '../types/dynamicUI';
import { defaultUIRuntime, jsonBytes, parseUIRuntime } from '../utils/dynamicUI';

type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown>; removeItem(key: string): Promise<unknown> };
export type UIConfigState = { config: UIRuntime; source: 'default' | 'cache' | 'network'; loading: boolean; error: string | null; etag: string | null };
type CacheRecord = { version: 1; scope: string; locale: UILocale; runtime: UIRuntime; etag: string | null; receivedAt: number; expiresAt: number;
  highestGeneration: number; highestReleaseId: string | null };
type Options = { scope: string; locale: UILocale; cityId?: string; storage: Storage; fetchRuntime(options: UIRuntimeFetchOptions): Promise<UIRuntimeHTTPResponse>; now?: () => number };
const lifetime = (runtime: UIRuntime) => Date.parse(runtime.validUntil) - Date.parse(runtime.serverTime);
const validETag = (value: unknown): value is string => typeof value === 'string' && /^(?:W\/)?"[^"\r\n]{1,256}"$/.test(value);

/** One store per app root: concurrent subscribers share requests and serialized cache writes. */
export function createUIRuntimeStore(options: Options) {
  const now = options.now || Date.now;
  const fetchRuntime = async (request: UIRuntimeFetchOptions) => options.fetchRuntime({ ...request, cityId: options.cityId });
  const cacheKey = `inquiryexperts_ui_runtime_v1:${encodeURIComponent(options.scope)}`;
  let locale = options.locale;
  let state: UIConfigState = { config: defaultUIRuntime(now()), source: 'default', loading: false, error: null, etag: null };
  let record: CacheRecord | null = null;
  let highestGeneration = 0;
  let highestReleaseId: string | null = null;
  let clockAnchor: { server: number; local: number } | null = null;
  let active = false;
  let epoch = 0;
  let sequence = 0;
  let starting: Promise<UIConfigState> | null = null;
  let pending: { locale: UILocale; promise: Promise<UIConfigState>; controller: AbortController } | null = null;
  let writes = Promise.resolve();
  const listeners = new Set<() => void>();
  const emit = (next: UIConfigState) => { state = next; listeners.forEach((listener) => listener()); };
  const current = (ticket: number) => active && ticket === sequence;
  const enqueue = (operation: () => Promise<unknown>) => { writes = writes.then(operation).then(() => undefined).catch(() => undefined); };
  const fresh = () => !!record && now() >= record.receivedAt - 300_000 && now() < record.expiresAt;
  const expire = () => {
    if (record && !fresh()) {
      record = null;
      emit({ ...state, config: defaultUIRuntime(now()), source: 'default', etag: null });
    }
  };
  const persist = (value: CacheRecord, ticket: number) => enqueue(async () => {
    if (current(ticket)) await options.storage.setItem(cacheKey, JSON.stringify(value));
  });
  const restore = async (restoreEpoch: number) => {
    // Locale hydration or an early refresh may race the storage read. A cache
    // can still fill empty state, but must never replace an accepted response.
    const canRestore = () => active && epoch === restoreEpoch && !record && highestGeneration === 0 && state.source === 'default';
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = await Promise.race([options.storage.getItem(cacheKey), new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 500); })]);
      if (!raw || !canRestore()) return;
      if (jsonBytes(raw) > UI_MAX_BYTES + 4096) throw new Error('Invalid cache size');
      const saved = JSON.parse(raw) as CacheRecord;
      const runtime = parseUIRuntime(saved.runtime);
      if (saved.version !== 1 || saved.scope !== options.scope || !['en', 'hi'].includes(saved.locale)
        || !(saved.etag === null || validETag(saved.etag)) || !Number.isSafeInteger(saved.receivedAt) || saved.receivedAt < 0
        || saved.expiresAt !== saved.receivedAt + lifetime(runtime) || saved.receivedAt > now() + 300_000
        || !Number.isSafeInteger(saved.highestGeneration) || saved.highestGeneration < runtime.generation
        || !(saved.highestReleaseId === null || /^[a-fA-F0-9]{24}$/.test(saved.highestReleaseId))) throw new Error('Invalid cache record');
      record = { ...saved, runtime };
      highestGeneration = saved.highestGeneration;
      highestReleaseId = saved.highestReleaseId;
      clockAnchor = { server: Date.parse(runtime.serverTime), local: saved.receivedAt };
      if (saved.expiresAt <= now()) {
        record = null;
        enqueue(async () => { if (active && epoch === restoreEpoch && !record) await options.storage.removeItem(cacheKey); });
        return;
      }
      emit({ config: runtime, source: 'cache', loading: state.loading, error: state.error, etag: saved.locale === locale ? saved.etag : null });
    } catch {
      enqueue(async () => { if (canRestore()) await options.storage.removeItem(cacheKey); });
    } finally { if (timer) clearTimeout(timer); }
  };
  const refresh = (): Promise<UIConfigState> => {
    if (!active) return start();
    if (pending?.locale === locale) return pending.promise;
    expire();
    const ticket = ++sequence;
    const requestLocale = locale;
    const controller = new AbortController();
    const requestStartedAt = now();
    emit({ ...state, loading: true, error: null });
    const promise = (async () => {
      try {
        const cached = fresh() && record?.locale === requestLocale ? record : null;
        let response = await fetchRuntime({ locale: requestLocale, etag: cached?.etag || undefined, signal: controller.signal });
        if (!current(ticket)) return state;
        if (response.status === 304 && !cached?.etag) {
          response = await fetchRuntime({ locale: requestLocale, signal: controller.signal });
          if (!current(ticket)) return state;
        }
        let runtime: UIRuntime;
        let receivedAt = now();
        let expiresAt: number;
        if (response.status === 304) {
          if (!cached) throw new Error('UI response has no matching cache');
          const date = response.serverDate ? Date.parse(response.serverDate) : NaN;
          if (Number.isFinite(date)) {
            const time = Math.max(date, Date.parse(cached.runtime.serverTime));
            const boundary = cached.runtime.nextTransitionAt ? Date.parse(cached.runtime.nextTransitionAt) : Infinity;
            runtime = parseUIRuntime({ ...cached.runtime, serverTime: new Date(time).toISOString(), refreshAfter: new Date(Math.min(time + 60_000, boundary)).toISOString(),
              validUntil: new Date(Math.min(time + lifetime(cached.runtime), boundary)).toISOString() });
            expiresAt = receivedAt + lifetime(runtime);
            if (boundary !== Infinity) {
              expiresAt = Math.min(expiresAt, cached.expiresAt);
              receivedAt = expiresAt - lifetime(runtime);
            }
          } else { runtime = cached.runtime; receivedAt = cached.receivedAt; expiresAt = cached.expiresAt; }
        } else {
          runtime = parseUIRuntime(response.body);
          // Charge transport/proxy age to the lease, including slow boundary requests.
          const date = response.serverDate ? Date.parse(response.serverDate) : NaN;
          const age = Number.isFinite(response.serverAgeMs) ? Math.max(0, response.serverAgeMs!) : 0;
          receivedAt = requestStartedAt - age - (Number.isFinite(date) ? Math.max(0, date - Date.parse(runtime.serverTime)) : 0);
          expiresAt = receivedAt + lifetime(runtime);
        }
        // Preserve the observed server clock through expiry and offline restarts.
        // A replayed 200 must never give an old campaign a fresh lifetime.
        if (runtime.nextTransitionAt && clockAnchor) {
          const estimatedServerNow = clockAnchor.server + Math.max(0, now() - clockAnchor.local);
          expiresAt = Math.min(expiresAt, now() + Date.parse(runtime.validUntil) - estimatedServerNow);
          receivedAt = expiresAt - lifetime(runtime);
        }
        if (expiresAt <= now()) throw new Error('Expired UI response');
        if ((runtime.generation < highestGeneration && !(runtime.generation === 0 && runtime.useNativeFallback))
          || (runtime.generation === highestGeneration && runtime.generation > 0 && highestReleaseId && runtime.releaseId !== highestReleaseId)) {
          throw new Error('Stale UI release');
        }
        if (runtime.generation > highestGeneration) { highestGeneration = runtime.generation; highestReleaseId = runtime.releaseId; }
        clockAnchor = { server: Date.parse(runtime.serverTime), local: receivedAt };
        const etag = validETag(response.etag) ? response.etag : response.status === 304 ? cached!.etag : null;
        record = { version: 1, scope: options.scope, locale: requestLocale, runtime, etag, receivedAt, expiresAt, highestGeneration, highestReleaseId };
        emit({ config: runtime, source: 'network', loading: false, error: null, etag });
        persist(record, ticket);
      } catch {
        if (current(ticket)) { expire(); emit({ ...state, loading: false, error: 'Dynamic UI is unavailable; using safe local configuration.' }); }
      } finally { if (current(ticket)) pending = null; }
      return state;
    })();
    pending = { locale: requestLocale, controller, promise };
    return promise;
  };
  const start = (): Promise<UIConfigState> => {
    if (active) return starting || refresh();
    active = true;
    const restoreEpoch = ++epoch;
    starting = restore(restoreEpoch).then(() => active && epoch === restoreEpoch ? refresh() : state).finally(() => {
      if (epoch === restoreEpoch) starting = null;
    });
    return starting;
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start, refresh, expire,
    nextRefreshDelay: () => {
      if (!record) return 60_000;
      const due = record.receivedAt + Date.parse(record.runtime.refreshAfter) - Date.parse(record.runtime.serverTime) - now();
      return Math.max(1, Math.min(record.expiresAt - now(), due > 0 ? due : 60_000));
    },
    setLocale: (next: UILocale) => {
      if (next === locale) return Promise.resolve(state);
      locale = next;
      sequence += 1;
      pending?.controller.abort(); pending = null;
      emit({ ...state, etag: null });
      return refresh();
    },
    stop: () => { active = false; epoch += 1; sequence += 1; pending?.controller.abort(); pending = null; starting = null; },
    flushCache: () => writes,
  };
}

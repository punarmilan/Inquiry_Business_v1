import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnimationObject } from 'lottie-react-native';
import { API_BASE_URL, LOCALHOST_API_BASE_URL, isLanDevHost } from './api';
import { parseUIAnimation } from '../utils/uiAnimation';
import { jsonBytes } from '../utils/dynamicUI';
import { UI_RENDERER_VERSION, type UIAssetMetadata } from '../types/dynamicUI';
import { getUICity } from './uiCampaignLocation';
import { UI_ANIMATION_CACHE_MAX_BYTES, UI_ANIMATION_RESPONSE_MAX_BYTES, UI_ANIMATION_TIMEOUT_MS } from '../utils/uiAnimationLimits';

const key = `inquiryexperts_lottie_v2:${encodeURIComponent(API_BASE_URL)}`;
const requests = new Map<string, Promise<AnimationObject>>();
let newestWrite = 0;
let writes = Promise.resolve();
export function loadUIAnimation(asset: UIAssetMetadata): Promise<AnimationObject> {
  const identity = `${asset.id}:${asset.sha256}`;
  if (requests.has(identity)) return requests.get(identity)!;
  const promise = (async () => {
    let storageTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = await Promise.race([AsyncStorage.getItem(key), new Promise<null>((resolve) => { storageTimer = setTimeout(() => resolve(null), 500); })]);
      if (raw && jsonBytes(raw) <= UI_ANIMATION_CACHE_MAX_BYTES) {
        const cache = JSON.parse(raw);
        if (cache.id === asset.id && cache.sha256 === asset.sha256) return parseUIAnimation(cache.animation);
      }
    } catch { /* A missing or corrupt asset cache must not break the screen. */ }
    finally { if (storageTimer) clearTimeout(storageTimer); }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const fetchAsset = async () => {
        const cityId = getUICity();
        const query = `?campaignVersion=1&rendererVersion=${UI_RENDERER_VERSION}${cityId ? `&cityId=${encodeURIComponent(cityId)}` : ''}`;
        let response: Response;
        try { response = await fetch(`${API_BASE_URL}/ui/assets/${asset.id}${query}`, { signal: controller.signal }); }
        catch (error) {
          if (!isLanDevHost || controller.signal.aborted) throw error;
          response = await fetch(`${LOCALHOST_API_BASE_URL}/ui/assets/${asset.id}${query}`, { signal: controller.signal });
        }
        if (response.status !== 200 || Number(response.headers.get('Content-Length')) > UI_ANIMATION_RESPONSE_MAX_BYTES) throw new Error('Animation unavailable');
        const raw = await response.text();
        if (jsonBytes(raw) > UI_ANIMATION_RESPONSE_MAX_BYTES) throw new Error('Animation too large');
        const payload = JSON.parse(raw);
        if (payload.success !== true || payload.asset?.id !== asset.id || payload.asset?.sha256 !== asset.sha256) throw new Error('Animation identity mismatch');
        return parseUIAnimation(payload.asset.animation);
      };
      const animation = await Promise.race([fetchAsset(), new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('Animation timed out')); }, UI_ANIMATION_TIMEOUT_MS);
      })]);
      const ticket = ++newestWrite;
      const cached = JSON.stringify({ id: asset.id, sha256: asset.sha256, animation });
      if (jsonBytes(cached) <= UI_ANIMATION_CACHE_MAX_BYTES) {
        writes = writes.then(async () => { if (ticket === newestWrite) await AsyncStorage.setItem(key, cached); }).catch(() => undefined);
      }
      return animation;
    } finally { if (timer) clearTimeout(timer); }
  })().finally(() => requests.delete(identity));
  requests.set(identity, promise);
  return promise;
}

// Keep the upload API's MAX_ANIMATION_BYTES in sync; parity is tested.
export const UI_ANIMATION_MAX_BYTES = 10 * 1024 * 1024;
export const UI_ANIMATION_RESPONSE_MAX_BYTES = UI_ANIMATION_MAX_BYTES + 4096;
// AsyncStorage v2 on Android cannot reliably read a single entry above 2 MB.
// Larger animations play from the network and retain the static offline fallback.
export const UI_ANIMATION_CACHE_MAX_BYTES = 2 * 1024 * 1024 - 4096;
export const UI_ANIMATION_TIMEOUT_MS = 30_000;

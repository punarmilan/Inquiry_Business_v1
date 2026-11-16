// Mirrors the location already selected by the hyperlocal flow; performs no GPS work.
let cityId: string | undefined;
let revision = 0;
const listeners = new Set<() => void>();
export const getUICity = () => cityId;
export const getUICityRevision = () => revision;
export const subscribeUICity = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const setUICity = (value: string | undefined) => {
  revision += 1;
  const next = value && /^[a-fA-F0-9]{24}$/.test(value) ? value : undefined;
  if (next !== cityId) { cityId = next; listeners.forEach((listener) => listener()); }
};

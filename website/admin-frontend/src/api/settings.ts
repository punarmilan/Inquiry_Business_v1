import client from './client';
import type { Setting } from '@/types';

export const fetchSettings = async () => {
  const { data } = await client.get<{ success: true; settings: Setting[] }>('/settings');
  return data.settings;
};

export const upsertSetting = async (key: string, type: Setting['type'], value: unknown) => {
  const { data } = await client.put<{ success: true; setting: Setting }>(`/settings/${key}`, { type, value });
  return data.setting;
};

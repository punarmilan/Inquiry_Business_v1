import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as settingsApi from '@/api/settings';
import type { Setting } from '@/types';

export const useSettingsList = () =>
  useQuery({ queryKey: ['settings'], queryFn: settingsApi.fetchSettings });

export const useUpsertSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, type, value }: { key: string; type: Setting['type']; value: unknown }) =>
      settingsApi.upsertSetting(key, type, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
};

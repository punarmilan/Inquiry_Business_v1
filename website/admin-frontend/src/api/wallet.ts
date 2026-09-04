import client from './client';
import type { Paginated, WalletTransaction } from '@/types';

export interface WithdrawalFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export const fetchWithdrawals = async (filters: WithdrawalFilters) => {
  const { data } = await client.get<{ success: true } & Paginated<WalletTransaction>>('/wallet/withdrawals', {
    params: filters,
  });
  return data;
};

export const approveWithdrawal = async (id: string) => {
  const { data } = await client.put<{ success: true; transaction: WalletTransaction }>(
    `/wallet/withdrawals/${id}/approve`
  );
  return data.transaction;
};

export const rejectWithdrawal = async ({ id, reason }: { id: string; reason: string }) => {
  const { data } = await client.put<{ success: true; transaction: WalletTransaction }>(
    `/wallet/withdrawals/${id}/reject`,
    { reason }
  );
  return data.transaction;
};

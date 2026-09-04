import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as walletApi from '@/api/wallet';
import type { WithdrawalFilters } from '@/api/wallet';

export const useWithdrawalsList = (filters: WithdrawalFilters) =>
  useQuery({ queryKey: ['withdrawals', filters], queryFn: () => walletApi.fetchWithdrawals(filters) });

export const useApproveWithdrawal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: walletApi.approveWithdrawal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['withdrawals'] }),
  });
};

export const useRejectWithdrawal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: walletApi.rejectWithdrawal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['withdrawals'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

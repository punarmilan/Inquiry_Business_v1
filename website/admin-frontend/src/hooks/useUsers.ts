import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '@/api/users';
import type { UserFilters } from '@/api/users';

export const useUsersList = (filters: UserFilters) =>
  useQuery({ queryKey: ['users', filters], queryFn: () => usersApi.fetchUsers(filters) });

export const useUserDetail = (id: string) =>
  useQuery({ queryKey: ['users', id], queryFn: () => usersApi.fetchUserDetail(id), enabled: !!id });

export const useBlockUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.blockUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUnblockUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.unblockUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useVerifyUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.verifyUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useApproveKyc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.approveKyc,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useRejectKyc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.rejectKyc,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useApproveWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.approveWallet,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useRejectWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.rejectWallet,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useApproveAccountTypeChange = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.approveAccountTypeChange,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useRejectAccountTypeChange = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.rejectAccountTypeChange,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

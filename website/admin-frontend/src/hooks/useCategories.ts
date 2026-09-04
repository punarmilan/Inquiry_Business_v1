import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as categoriesApi from '@/api/categories';
import type { CreateCategoryPayload } from '@/api/categories';

export const useCategoriesList = () =>
  useQuery({ queryKey: ['categories'], queryFn: categoriesApi.fetchCategories });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => categoriesApi.createCategory(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateCategoryPayload> }) =>
      categoriesApi.updateCategory(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useToggleCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.toggleCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

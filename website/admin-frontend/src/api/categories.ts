import client from './client';
import type { Category } from '@/types';

export const fetchCategories = async () => {
  const { data } = await client.get<{ success: true; categories: Category[] }>('/categories');
  return data.categories;
};

export interface CreateCategoryPayload {
  name: string;
  key: string;
  groupKey: 'labor' | 'skilled-workers' | 'professional' | 'home-services';
  icon?: string;
  color?: string;
  kycDocumentLabel?: string;
  sortOrder?: number;
}

export const createCategory = async (payload: CreateCategoryPayload) => {
  const { data } = await client.post<{ success: true; category: Category }>('/categories', payload);
  return data.category;
};

export const updateCategory = async (id: string, payload: Partial<CreateCategoryPayload>) => {
  const { data } = await client.put<{ success: true; category: Category }>(`/categories/${id}`, payload);
  return data.category;
};

export const toggleCategory = async (id: string) => {
  const { data } = await client.patch<{ success: true; category: Category }>(`/categories/${id}/toggle`);
  return data.category;
};

export const deleteCategory = async (id: string) => {
  await client.delete(`/categories/${id}`);
};

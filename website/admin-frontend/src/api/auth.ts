import client from './client';
import type { Admin } from '@/types';

export interface LoginResponse {
  success: true;
  admin: Admin;
  accessToken: string;
  refreshToken: string;
}

export const login = async (email: string, password: string) => {
  const { data } = await client.post<LoginResponse>('/auth/login', { email: email.trim().toLowerCase(), password });
  return data;
};

export const me = async () => {
  const { data } = await client.get<{ success: true; admin: Admin }>('/auth/me');
  return data.admin;
};

export const logout = async (refreshToken: string) => {
  await client.post('/auth/logout', { refreshToken });
};

import axios from 'axios';

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

let accessToken: string | null = null;
let refreshInFlight: Promise<RefreshResponse> | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

const refreshAccessToken = async (refreshToken: string): Promise<RefreshResponse> => {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post<{ success: true } & RefreshResponse>(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
        refreshToken,
      })
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        localStorage.setItem('admin_refresh_token', data.refreshToken);
        return data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('admin_refresh_token');
      if (refreshToken) {
        try {
          const data = await refreshAccessToken(refreshToken);
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return client(original);
        } catch {
          localStorage.removeItem('admin_refresh_token');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;

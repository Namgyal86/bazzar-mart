import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

// In dev: empty baseURL → Next.js rewrites route /api/v1/* to the api-monolith
// In prod: set NEXT_PUBLIC_API_BASE_URL to your CDN/load-balancer (e.g. https://api.bazzar.com)
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true, // send bz_access / bz_refresh cookies on every request
});

// No Bearer injection — middleware reads bz_access cookie and injects it server-side

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthEndpoint =
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/register');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        if (res.status !== 200) throw new Error('Refresh failed');
        return apiClient(original);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('auth_redirect_reason', 'session_expired');
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data?.error;
    if (Array.isArray(apiError)) {
      return apiError.map((e: any) => e.message ?? String(e)).join('; ');
    }
    if (apiError) return String(apiError);
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

import { apiClient } from './client';

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload {
  firstName: string; lastName: string; email: string;
  phone: string; password: string; referralCode?: string;
}
export interface AuthResponse {
  user: { id: string; email: string; firstName: string; lastName: string; role: string; profilePhotoUrl?: string; referralCode?: string; sellerId?: string };
  accessToken: string;
  refreshToken: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export const oauthUrls = {
  google:   `${API_BASE}/api/v1/auth/google`,
  facebook: `${API_BASE}/api/v1/auth/facebook`,
};

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post<{ success: true; data: AuthResponse }>('/api/v1/auth/login', data),

  register: (data: RegisterPayload) =>
    apiClient.post<{ success: true; data: AuthResponse }>('/api/v1/auth/register', data),

  logout: (refreshToken: string) =>
    apiClient.post('/api/v1/auth/logout', { refreshToken }),

  refresh: (refreshToken: string) =>
    apiClient.post<{ success: true; data: { accessToken: string; refreshToken: string } }>(
      '/api/v1/auth/token/refresh', { refreshToken }
    ),
};

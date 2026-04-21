import { apiClient } from './client';
import axios from 'axios';

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload {
  firstName: string; lastName: string; email: string;
  phone: string; password: string; referralCode?: string; role?: string;
}
export interface AuthUser {
  id: string; email: string; firstName: string; lastName: string; role: string;
  profilePhotoUrl?: string; referralCode?: string; sellerId?: string;
}

// Tokens no longer returned to client — they live in HttpOnly cookies
export interface AuthResponse { user: AuthUser }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export const oauthUrls = {
  google:   `${API_BASE}/api/v1/auth/google`,
  facebook: `${API_BASE}/api/v1/auth/facebook`,
};

// authClient uses relative URLs so requests always hit the Next.js server,
// not the CDN/load-balancer, regardless of NEXT_PUBLIC_API_BASE_URL.
const authClient = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export const authApi = {
  login: (data: LoginPayload) =>
    authClient.post<{ success: true; data: AuthResponse }>('/api/auth/login', data),

  register: (data: RegisterPayload) =>
    authClient.post<{ success: true; data: AuthResponse }>('/api/auth/register', data),

  logout: () =>
    authClient.post('/api/auth/logout'),
};

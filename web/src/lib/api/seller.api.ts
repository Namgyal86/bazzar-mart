import { apiClient } from './client';

export interface SellerProfile {
  _id: string; userId: string; storeName: string; storeSlug: string;
  description?: string; logo?: string; banner?: string; phone?: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  totalSales: number; totalOrders: number; rating: number;
}

export interface SellerDashboard {
  revenue: number; orders: number; products: number; customers: number;
  recentOrders: any[]; topProducts: any[];
}

export const sellerApi = {
  apply: (data: { storeName: string; description?: string; phone: string }) =>
    apiClient.post<{ success: true; data: SellerProfile }>('/api/v1/seller/apply', data),

  getProfile: () =>
    apiClient.get<{ success: true; data: SellerProfile }>('/api/v1/seller/profile'),

  updateProfile: (data: Partial<SellerProfile>) =>
    apiClient.put<{ success: true; data: SellerProfile }>('/api/v1/seller/profile', data),

  getDashboard: () =>
    apiClient.get<{ success: true; data: SellerDashboard }>('/api/v1/seller/dashboard'),

  getOrders: (params?: Record<string, string | number>) =>
    apiClient.get('/api/v1/seller/orders', { params }),

  getProducts: (params?: Record<string, string | number>) =>
    apiClient.get('/api/v1/seller/products', { params }),

  // Admin
  listSellers: (params?: Record<string, string | number>) =>
    apiClient.get('/api/v1/seller/admin/list', { params }),

  approveSeller: (id: string) =>
    apiClient.post(`/api/v1/seller/admin/${id}/approve`),

  suspendSeller: (id: string, reason: string) =>
    apiClient.post(`/api/v1/seller/admin/${id}/suspend`, { reason }),
};

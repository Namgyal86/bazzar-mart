import { apiClient } from './client';

export interface Address {
  _id: string; label: string; fullName: string; phone: string;
  addressLine1: string; addressLine2?: string; city: string;
  district: string; province: string; postalCode?: string; isDefault: boolean;
}

export const userApi = {
  getMe: () =>
    apiClient.get('/api/v1/users/me'),

  updateMe: (data: { firstName?: string; lastName?: string; phone?: string; profilePhotoUrl?: string }) =>
    apiClient.put('/api/v1/users/me', data),

  getAddresses: () =>
    apiClient.get<{ success: true; data: Address[] }>('/api/v1/users/me/addresses'),

  addAddress: (data: Omit<Address, '_id'>) =>
    apiClient.post<{ success: true; data: Address }>('/api/v1/users/me/addresses', data),

  updateAddress: (id: string, data: Omit<Address, '_id'>) =>
    apiClient.put<{ success: true; data: Address }>(`/api/v1/users/me/addresses/${id}`, data),

  deleteAddress: (id: string) =>
    apiClient.delete(`/api/v1/users/me/addresses/${id}`),
};

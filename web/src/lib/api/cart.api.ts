import { apiClient } from './client';
import { CartItem } from '@/store/cart.store';

export interface CartResponse {
  userId: string;
  items: CartItem[];
  updatedAt: string;
}

export const cartApi = {
  get: () =>
    apiClient.get<{ success: true; data: CartResponse }>('/api/v1/cart'),

  addItem: (productId: string, quantity: number, variantId?: string) =>
    apiClient.post<{ success: true; data: CartResponse }>('/api/v1/cart/items', {
      productId, quantity, variantId,
    }),

  updateItem: (productId: string, quantity: number) =>
    apiClient.put<{ success: true; data: CartResponse }>(`/api/v1/cart/items/${productId}`, { quantity }),

  removeItem: (productId: string) =>
    apiClient.delete<{ success: true; data: CartResponse }>(`/api/v1/cart/items/${productId}`),

  clear: () =>
    apiClient.delete('/api/v1/cart'),
};

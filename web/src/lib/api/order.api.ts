import { apiClient } from './client';

export interface OrderItem {
  productId: string; productName: string; productImage?: string;
  sellerName: string; quantity: number; unitPrice: number; totalPrice: number;
}

export interface ShippingAddress {
  fullName: string; phone: string; addressLine1: string;
  addressLine2?: string; city: string; district: string; province: string; postalCode?: string;
}

export interface Order {
  _id: string; orderNumber: string; status: string;
  items: OrderItem[]; shippingAddress: ShippingAddress;
  subtotal: number; shippingFee: number; discount: number; total: number;
  paymentMethod: string; paymentStatus: string;
  trackingNumber?: string; estimatedDelivery?: string;
  createdAt: string;
}

export interface CreateOrderPayload {
  items: {
    productId: string;
    productName: string;
    productImage?: string;
    sellerId: string;
    sellerName: string;
    unitPrice: number;
    quantity: number;
  }[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  couponCode?: string;
}

export const orderApi = {
  create: (data: CreateOrderPayload) =>
    apiClient.post<{ success: true; data: Order }>('/api/v1/orders', data),

  // Response: { success, data: Order[], meta: { total, page, limit } }
  list: (params?: Record<string, string | number>) =>
    apiClient.get<{ success: true; data: Order[]; meta: { total: number; page: number; limit: number } }>('/api/v1/orders', { params }),

  getById: (id: string) =>
    apiClient.get<{ success: true; data: Order }>(`/api/v1/orders/${id}`),

  listAll: (params?: Record<string, string | number>) =>
    apiClient.get<{ success: true; data: Order[]; meta: any }>('/api/v1/orders/all', { params }),

  cancel: (id: string, reason?: string) =>
    apiClient.post(`/api/v1/orders/${id}/cancel`, { reason }),

  // Seller/Admin — route is PUT (not PATCH)
  updateStatus: (id: string, status: string, note?: string) =>
    apiClient.put(`/api/v1/orders/${id}/status`, { status, note }),
};

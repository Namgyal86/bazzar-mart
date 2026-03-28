import { apiClient } from './client';

export const paymentApi = {
  initiate: (orderId: string, gateway: string, amount?: number, returnUrl?: string) =>
    apiClient.post('/api/v1/payments/initiate', { orderId, gateway, amount, returnUrl }),

  verify: (payload: Record<string, any>) =>
    apiClient.post('/api/v1/payments/verify', payload),

  verifyKhalti: (pidx: string, orderId: string) =>
    apiClient.post('/api/v1/payments/khalti/verify', { pidx, orderId, gateway: 'KHALTI' }),

  verifyEsewa: (payload: Record<string, string>) =>
    apiClient.post('/api/v1/payments/esewa/verify', payload),

  getByOrder: (orderId: string) =>
    apiClient.get(`/api/v1/payments/order/${orderId}`),
};

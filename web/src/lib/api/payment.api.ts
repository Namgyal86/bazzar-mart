import { apiClient } from './client';

export const paymentApi = {
  initiate: (orderId: string, gateway: string) =>
    apiClient.post<{ success: true; data: { paymentUrl?: string; formData?: Record<string, string> } }>(
      '/api/v1/payments/initiate', { orderId, gateway }
    ),

  verifyKhalti: (token: string, amount: number, orderId: string) =>
    apiClient.post('/api/v1/payments/khalti/verify', { token, amount, orderId }),

  verifyEsewa: (payload: Record<string, string>) =>
    apiClient.post('/api/v1/payments/esewa/verify', payload),
};

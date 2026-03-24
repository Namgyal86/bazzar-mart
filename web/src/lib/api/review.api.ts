import { apiClient } from './client';

export interface Review {
  _id: string; productId: string; userId: string;
  userName: string; rating: number; comment: string;
  images?: string[]; helpful: number; createdAt: string;
}

export const reviewApi = {
  list: (productId: string, params?: Record<string, string | number>) =>
    apiClient.get<{ success: true; data: { reviews: Review[]; avgRating: number; total: number } }>(
      `/api/v1/reviews/${productId}`, { params }
    ),

  create: (productId: string, data: { rating: number; title?: string; body?: string; comment?: string; images?: string[]; productName?: string }) =>
    apiClient.post<{ success: true; data: Review }>(`/api/v1/reviews/${productId}`, {
      rating: data.rating,
      title: data.title,
      body: data.body ?? data.comment,
      images: data.images,
      productName: data.productName,
    }),

  markHelpful: (reviewId: string) =>
    apiClient.post(`/api/v1/reviews/${reviewId}/helpful`),
};

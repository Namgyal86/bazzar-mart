import { apiClient } from './client';

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number;
  images: string[];
  category: string | { _id: string; name: string; slug: string };
  sellerId: string;
  sellerName: string;
  seller?: { _id: string; storeName: string };
  rating: number;
  reviewCount: number;
  stock: number;
  sku: string;
  tags?: string[];
  isFeatured?: boolean;
  badge?: string;
}

export interface ProductListResponse {
  success: true;
  data: Product[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface Category {
  _id: string; name: string; slug: string; image?: string; productCount?: number;
}

export interface Banner {
  _id: string; title: string; subtitle: string; description: string;
  cta: string; ctaLink: string; image: string;
  accentColor: string; eyebrow: string; badge: string;
  order: number; isActive: boolean;
}

export const bannerApi = {
  list: () => apiClient.get<{ success: true; data: Banner[] }>('/api/v1/banners'),
  listAll: () => apiClient.get<{ success: true; data: Banner[] }>('/api/v1/banners/all'),
  create: (data: Partial<Banner>) => apiClient.post<{ success: true; data: Banner }>('/api/v1/banners', data),
  update: (id: string, data: Partial<Banner>) => apiClient.put<{ success: true; data: Banner }>(`/api/v1/banners/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/banners/${id}`),
};

export const productApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<ProductListResponse>('/api/v1/products', { params }),

  getById: (id: string) =>
    apiClient.get<{ success: true; data: Product }>(`/api/v1/products/${id}`),

  getBySlug: (slug: string) =>
    apiClient.get<{ success: true; data: Product }>(`/api/v1/products/slug/${slug}`),

  getFeatured: () =>
    apiClient.get<{ success: true; data: Product[] }>('/api/v1/products/featured'),

  search: (q: string, params?: Record<string, string | number>) =>
    apiClient.get<ProductListResponse>('/api/v1/products', { params: { search: q, limit: 40, ...params } }),

  listCategories: () =>
    apiClient.get<{ success: true; data: Category[] }>('/api/v1/categories'),

  // Seller operations
  create: (data: FormData) =>
    apiClient.post<{ success: true; data: Product }>('/api/v1/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: Partial<Product>) =>
    apiClient.put<{ success: true; data: Product }>(`/api/v1/products/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/api/v1/products/${id}`),
};

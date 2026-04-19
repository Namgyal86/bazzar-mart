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
  _id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
  isActive: boolean;
  showInNav: boolean;
  sortOrder: number;
  parentCategory?: string;
  productCount?: number;
}

export interface CategoryWithSubs extends Category {
  subcategories: Category[];
}

export const categoryApi = {
  list: () =>
    apiClient.get<{ success: true; data: Category[] }>('/api/v1/categories'),
  withSubs: () =>
    apiClient.get<{ success: true; data: CategoryWithSubs[] }>('/api/v1/categories/with-subs'),
  listAll: () =>
    apiClient.get<{ success: true; data: Category[] }>('/api/v1/categories/admin/all'),
  create: (data: Partial<Category>) =>
    apiClient.post<{ success: true; data: Category }>('/api/v1/categories', data),
  update: (id: string, data: Partial<Category>) =>
    apiClient.put<{ success: true; data: Category }>(`/api/v1/categories/${id}`, data),
  delete: (id: string) =>
    apiClient.delete(`/api/v1/categories/${id}`),
};

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

  getFeatured: () =>
    apiClient.get<{ success: true; data: Product[] }>('/api/v1/products/featured'),

  search: (q: string, params?: Record<string, string | number>) =>
    apiClient.get<ProductListResponse>('/api/v1/products', { params: { search: q, limit: 40, ...params } }),

  listCategories: () =>
    apiClient.get<{ success: true; data: Category[] }>('/api/v1/categories'),

  // Seller/Admin operations
  create: (data: FormData) =>
    apiClient.post<{ success: true; data: Product }>('/api/v1/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  createJson: (data: Record<string, unknown>) =>
    apiClient.post<{ success: true; data: Product }>('/api/v1/products', data),

  update: (id: string, data: Partial<Product>) =>
    apiClient.put<{ success: true; data: Product }>(`/api/v1/products/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/api/v1/products/${id}`),
};

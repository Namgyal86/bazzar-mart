import { apiClient } from './client';

export interface SearchProduct {
  productId: string;
  name: string;
  slug: string;
  brand: string;
  basePrice: number;
  salePrice?: number;
  currency: string;
  averageRating: number;
  reviewCount: number;
  stock: number;
  imageUrl: string;
  categoryId: string;
  sellerId: string;
  isFeatured: boolean;
}

export interface SearchFacets {
  categories: { key: string; count: number }[];
  brands: { key: string; count: number }[];
  priceRange: { min: number; max: number };
  ratings: { key: number; count: number }[];
}

export interface SearchResult {
  hits: SearchProduct[];
  facets: SearchFacets;
  total: number;
  page: number;
  limit: number;
}

export interface SearchSuggestion {
  name: string;
  imageUrl?: string;
  productId: string;
}

export interface SearchParams {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  seller?: string;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  page?: number;
  limit?: number;
  featured?: boolean;
}

export const searchApi = {
  searchProducts: (params: SearchParams) =>
    apiClient.get<{ success: true; data: SearchResult }>('/api/v1/search/products', { params }),

  getSuggestions: (q: string) =>
    apiClient.get<{ success: true; data: SearchSuggestion[] }>('/api/v1/search/suggestions', {
      params: { q },
    }),

  getSimilar: (productId: string) =>
    apiClient.get<{ success: true; data: SearchProduct[] }>(
      `/api/v1/search/similar/${productId}`,
    ),
};

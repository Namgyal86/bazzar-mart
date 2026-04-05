# Search Module — Specification

> **Merged into monolith** (2026-04-05): `search-service` is now a module inside
> `services/api-monolith/src/modules/search/`.
> Elasticsearch replaced with **direct MongoDB queries** on the shared `products` collection.
> No separate database or Kafka consumers needed.

> Module: `search` | Location: `src/modules/search/`
> Was: `search-service` | Port: **8009**

---

## 1. Overview

The Search Service provides **full-text product search** with faceted filtering, autocomplete suggestions, and relevance ranking using Elasticsearch. It is a **read-only consumer** — it never modifies product data. It listens to Kafka events from the Product Service to keep its index in sync.

---

## 2. Elasticsearch Index Schema

```typescript
// Index: products
// One document per product

{
  "mappings": {
    "properties": {
      "productId":      { "type": "keyword" },
      "sellerId":       { "type": "keyword" },
      "categoryId":     { "type": "keyword" },
      "categoryPath":   { "type": "keyword" },      // ["Electronics", "Phones"]
      "name":           { "type": "text", "analyzer": "standard",
                          "fields": { "keyword": { "type": "keyword" } } },
      "description":    { "type": "text", "analyzer": "standard" },
      "brand":          { "type": "keyword" },
      "tags":           { "type": "keyword" },
      "basePrice":      { "type": "scaled_float", "scaling_factor": 100 },
      "salePrice":      { "type": "scaled_float", "scaling_factor": 100 },
      "currency":       { "type": "keyword" },
      "averageRating":  { "type": "float" },
      "reviewCount":    { "type": "integer" },
      "stock":          { "type": "integer" },
      "isActive":       { "type": "boolean" },
      "isFeatured":     { "type": "boolean" },
      "imageUrl":       { "type": "keyword", "index": false },
      "slug":           { "type": "keyword" },
      "createdAt":      { "type": "date" },
      "updatedAt":      { "type": "date" }
    }
  },
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "nepali_standard": {        // Future: add Nepali language analyzer
          "type": "standard"
        }
      }
    }
  }
}

// Suggestions index (for autocomplete)
// Index: product_suggestions
{
  "mappings": {
    "properties": {
      "suggest": {
        "type": "completion",
        "analyzer": "simple",
        "contexts": [
          { "name": "category", "type": "category" }
        ]
      },
      "name":       { "type": "keyword" },
      "imageUrl":   { "type": "keyword", "index": false }
    }
  }
}
```

---

## 3. API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/products` | None | Full-text search with filters |
| GET | `/search/suggestions` | None | Autocomplete (real-time, debounced) |
| GET | `/search/similar/:productId` | None | More-like-this recommendations |
| POST | `/admin/search/reindex` | ADMIN | Trigger full re-index from Product Service |
| GET | `/admin/search/stats` | ADMIN | Index stats (document count, size) |

**`GET /search/products` query params:**
```
?q=running shoes           # Full-text query (required or optional)
?category=uuid
?brand=Nike
?minPrice=500&maxPrice=5000
?rating=4                  # Minimum average rating
?inStock=true
?seller=uuid
?sort=relevance|price_asc|price_desc|rating|newest|popular
?page=1&limit=20
?featured=true
```

**Response includes facets** (for filter sidebar in Flutter/web):
```json
{
  "success": true,
  "data": {
    "hits": [ ...products ],
    "facets": {
      "categories": [{ "key": "Electronics", "count": 142 }],
      "brands":     [{ "key": "Samsung", "count": 28 }],
      "priceRange": { "min": 100, "max": 150000 },
      "ratings":    [{ "key": 4, "count": 89 }, { "key": 5, "count": 45 }]
    },
    "total": 287,
    "page": 1,
    "limit": 20
  }
}
```

---

## 4. Search Query Builder

```typescript
// services/search.service.ts

export class SearchService {
  async searchProducts(params: SearchParams): Promise<SearchResult> {
    const { q, category, brand, minPrice, maxPrice, rating, inStock,
            seller, sort, page = 1, limit = 20 } = params;

    const must: any[] = [{ term: { isActive: true } }];
    const filter: any[] = [];

    if (q) must.push({ multi_match: { query: q, fields: ['name^3', 'description', 'brand^2', 'tags^2'], fuzziness: 'AUTO' } });
    if (category) filter.push({ term: { categoryId: category } });
    if (brand) filter.push({ term: { brand } });
    if (seller) filter.push({ term: { sellerId: seller } });
    if (minPrice || maxPrice) filter.push({ range: { basePrice: { gte: minPrice, lte: maxPrice } } });
    if (rating) filter.push({ range: { averageRating: { gte: rating } } });
    if (inStock) filter.push({ range: { stock: { gt: 0 } } });

    const sortConfig = this.buildSort(sort, !!q);

    const result = await this.es.search({
      index: 'products',
      body: {
        query: { bool: { must, filter } },
        sort: sortConfig,
        from: (page - 1) * limit,
        size: limit,
        aggs: {
          categories: { terms: { field: 'categoryPath', size: 20 } },
          brands:     { terms: { field: 'brand', size: 20 } },
          priceRange: { stats: { field: 'basePrice' } },
          ratings:    { terms: { field: 'averageRating', size: 5 } },
        },
      },
    });

    return this.formatResult(result, page, limit);
  }

  private buildSort(sort: string, hasQuery: boolean) {
    const map: Record<string, any> = {
      relevance:  hasQuery ? ['_score'] : [{ createdAt: 'desc' }],
      price_asc:  [{ basePrice: 'asc' }],
      price_desc: [{ basePrice: 'desc' }],
      rating:     [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
      newest:     [{ createdAt: 'desc' }],
      popular:    [{ reviewCount: 'desc' }, { averageRating: 'desc' }],
    };
    return map[sort] ?? map['relevance'];
  }
}
```

---

## 5. Search Implementation (MongoDB)

> Elasticsearch index sync is no longer needed — queries run directly on the `products`
> collection using MongoDB regex and index queries. The `PRODUCT_CREATED` internalBus event
> is handled by the recommendations module (trendingproducts seed).

## 5a. Old Kafka Consumers (Index Sync — superseded)

```typescript
// kafka/consumers/productIndexer.consumer.ts

// Listens to: product.created, product.updated, product.deleted,
//             review.posted (update averageRating), inventory.updated (update stock)

async function handleProductCreated(msg: ProductCreatedEvent) {
  await esClient.index({ index: 'products', id: msg.productId, document: toSearchDoc(msg) });
  await esClient.index({ index: 'product_suggestions', id: msg.productId, document: {
    suggest: { input: [msg.name, msg.brand], weight: 10 },
    name: msg.name,
    imageUrl: msg.imageUrl,
  }});
}

async function handleReviewPosted(msg: ReviewPostedEvent) {
  // Recalculate averageRating and update ES document
  await esClient.update({
    index: 'products', id: msg.productId,
    body: { doc: { averageRating: msg.newAverageRating, reviewCount: msg.newReviewCount } }
  });
}

async function handleInventoryUpdated(msg: InventoryUpdatedEvent) {
  await esClient.update({ index: 'products', id: msg.productId,
    body: { doc: { stock: msg.newStock } }
  });
}
```

---

## 6. Flutter Integration

```dart
// Autocomplete — debounced 300ms
final suggestions = await _api.get('/search/suggestions', params: {'q': query});

// Search results with facets
final results = await _api.get('/search/products', params: {
  'q': searchQuery,
  'category': selectedCategory,
  'minPrice': minPrice,
  'maxPrice': maxPrice,
  'sort': 'relevance',
  'page': currentPage,
});

// Render facet chips for brand/category filtering
```

---

## 7. Agent Build Checklist

- [ ] Elasticsearch index creation scripts (`products`, `product_suggestions`)
- [ ] `SearchService` with full query builder (must/filter/aggs)
- [ ] Autocomplete using `completion` suggester with category context
- [ ] More-like-this endpoint using ES MLT query
- [ ] Kafka consumers: `product.created`, `product.updated`, `product.deleted`, `review.posted`, `inventory.updated`
- [ ] Admin reindex endpoint (fetches all products from Product Service via paginated REST, bulk-indexes)
- [ ] All API endpoints with pagination
- [ ] Unit tests for query builder

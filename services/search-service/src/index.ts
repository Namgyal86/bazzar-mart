import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 8009;
const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002';

app.use(helmet()); app.use(cors({ origin: '*', credentials: true })); app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'search-service' }));

// Shared helper: proxy a product search and normalise to SearchResult shape
async function proxyProductSearch(query: Record<string, any>, res: express.Response) {
  const { q, category, brand, minPrice, maxPrice, page = 1, limit = 20, sort, featured, inStock, seller: sellerId, rating } = query;

  const params = new URLSearchParams();
  if (q)         params.set('search',   String(q));
  if (category)  params.set('category', String(category));
  if (brand)     params.set('brand',    String(brand));
  if (minPrice)  params.set('minPrice', String(minPrice));
  if (maxPrice)  params.set('maxPrice', String(maxPrice));
  if (page)      params.set('page',     String(page));
  if (limit)     params.set('limit',    String(limit));
  if (sort)      params.set('sort',     String(sort));
  if (featured)  params.set('featured', String(featured));
  if (inStock)   params.set('inStock',  String(inStock));
  if (sellerId)  params.set('sellerId', String(sellerId));
  if (rating)    params.set('rating',   String(rating));

  const resp = await axios.get(`${PRODUCT_SERVICE}/api/v1/products?${params}`);
  const products: any[] = resp.data?.data || [];
  const meta = resp.data?.meta || {};

  // Normalise to SearchResult shape expected by frontend
  const hits = products.map((p: any) => ({
    productId:     p._id,
    name:          p.name,
    slug:          p.slug,
    brand:         p.brand || '',
    basePrice:     p.basePrice || p.price || 0,
    salePrice:     p.salePrice,
    currency:      'NPR',
    averageRating: p.rating || p.averageRating || 0,
    reviewCount:   p.reviewCount || 0,
    stock:         p.stock ?? p.stockQuantity ?? 0,
    imageUrl:      p.images?.[0] || p.imageUrl || '',
    categoryId:    p.categoryId || p.category?._id || '',
    sellerId:      p.sellerId || '',
    isFeatured:    p.isFeatured || false,
  }));

  return res.json({
    success: true,
    data: {
      hits,
      facets: { categories: [], brands: [], priceRange: { min: 0, max: 100000 }, ratings: [] },
      total:  meta.total || hits.length,
      page:   Number(page),
      limit:  Number(limit),
    },
    meta,
  });
}

// Main search route (legacy / direct)
app.get('/api/v1/search', async (req: express.Request, res: express.Response) => {
  try {
    if (!req.query.q) return res.json({ success: true, data: { hits: [], total: 0, page: 1, limit: 20, facets: { categories: [], brands: [], priceRange: { min: 0, max: 100000 }, ratings: [] } } });
    await proxyProductSearch(req.query, res);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// /search/products — used by searchApi.searchProducts()
app.get('/api/v1/search/products', async (req: express.Request, res: express.Response) => {
  try {
    await proxyProductSearch(req.query, res);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// /search/suggestions — typeahead suggestions
app.get('/api/v1/search/suggestions', async (req: express.Request, res: express.Response) => {
  try {
    const { q, limit = 8 } = req.query;
    if (!q) return res.json({ success: true, data: [] });
    const params = new URLSearchParams({ search: String(q), limit: String(limit) });
    const resp = await axios.get(`${PRODUCT_SERVICE}/api/v1/products?${params}`);
    const suggestions = (resp.data?.data || []).map((p: any) => ({
      name:      p.name,
      imageUrl:  p.images?.[0] || p.imageUrl || '',
      productId: p._id,
    }));
    res.json({ success: true, data: suggestions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// /search/similar/:productId — items similar to a given product
app.get('/api/v1/search/similar/:productId', async (req: express.Request, res: express.Response) => {
  try {
    // Fetch the product to get its category, then query same category
    let category = '';
    try {
      const p = await axios.get(`${PRODUCT_SERVICE}/api/v1/products/${req.params.productId}`);
      category = p.data?.data?.categoryId || p.data?.data?.category?._id || '';
    } catch {}
    const params = new URLSearchParams({ limit: '8', ...(category ? { category } : {}) });
    const resp = await axios.get(`${PRODUCT_SERVICE}/api/v1/products?${params}`);
    const products = (resp.data?.data || [])
      .filter((p: any) => String(p._id) !== req.params.productId)
      .slice(0, 8)
      .map((p: any) => ({
        productId:     p._id,
        name:          p.name,
        slug:          p.slug,
        brand:         p.brand || '',
        basePrice:     p.basePrice || p.price || 0,
        salePrice:     p.salePrice,
        currency:      'NPR',
        averageRating: p.rating || p.averageRating || 0,
        reviewCount:   p.reviewCount || 0,
        stock:         p.stock ?? p.stockQuantity ?? 0,
        imageUrl:      p.images?.[0] || p.imageUrl || '',
        categoryId:    p.categoryId || p.category?._id || '',
        sellerId:      p.sellerId || '',
        isFeatured:    p.isFeatured || false,
      }));
    res.json({ success: true, data: products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Search Service on port ${PORT}`));

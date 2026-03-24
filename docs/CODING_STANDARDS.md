# Coding Standards

> These are non-negotiable rules. Violations will be rejected in code review.

---

## 1. Python / Django

### General
- Python 3.12+ — use all modern features (match statements, `|` union types, etc.)
- **Type hints everywhere** — every function parameter and return type
- **Docstrings everywhere** — every class and public method
- Follow **PEP 8** — enforced by `ruff`
- Max line length: **100 characters**

### Architecture Rules
```python
# ✅ CORRECT: Business logic in service layer
class OrderService:
    def place_order(self, user_id: str, cart_id: str, address_id: str) -> Order:
        """Place a new order from the user's cart."""
        cart = self.cart_repository.get(cart_id)
        self._validate_stock(cart.items)
        order = self.order_repository.create(user_id, cart, address_id)
        self.kafka.publish('order.created', {'order_id': str(order.id)})
        return order

# ❌ WRONG: Logic in view
class OrderView(APIView):
    def post(self, request):
        cart = Cart.objects.get(user=request.user)  # No DB in views
        for item in cart.items.all():
            if item.product.stock < item.quantity:  # No business logic in views
                return Response({'error': 'Out of stock'}, status=400)
```

### Naming Conventions
| Entity | Convention | Example |
|--------|-----------|---------|
| Classes | PascalCase | `ProductService`, `OrderRepository` |
| Functions/methods | snake_case | `get_product_by_id`, `reserve_stock` |
| Constants | UPPER_SNAKE_CASE | `MAX_CART_ITEMS`, `DEFAULT_PAGE_SIZE` |
| Private methods | leading underscore | `_validate_stock`, `_calculate_total` |
| Django models | singular PascalCase | `Product`, `Order`, `OrderItem` |
| URL names | kebab-case | `product-detail`, `order-list` |

### Django-Specific Rules
- Always use `select_for_update()` when reading data you intend to update in the same transaction
- Use `update_fields=[...]` on `save()` to avoid full-row updates
- Never use `filter().update()` without understanding it bypasses signals
- Always add database indexes for fields used in `WHERE`, `ORDER BY`, `JOIN`
- Use `annotate()` instead of Python loops for aggregations
- Never use `len()` on a queryset — use `.count()`
- Prefetch related objects: use `select_related()` (FK) and `prefetch_related()` (M2M)

### Error Handling
```python
# ✅ CORRECT: Raise domain exceptions, catch at view level
# service.py
def get_product(self, product_id: str) -> Product:
    try:
        return self.repository.get_by_id(product_id)
    except ProductNotFoundError:
        raise  # Let it bubble up

# views.py
def get(self, request, product_id):
    try:
        product = self.service.get_product(product_id)
        return Response({"success": True, "data": ProductSerializer(product).data})
    except ProductNotFoundError as e:
        return Response({"success": False, "error": str(e), "code": e.error_code}, status=404)
    except Exception as e:
        logger.exception("Unexpected error in ProductDetailView")
        return Response({"success": False, "error": "Internal server error"}, status=500)
```

---

## 2. TypeScript / Next.js

### General
- **TypeScript strict mode** — `"strict": true` in tsconfig
- No `any` types — use `unknown` and narrow properly
- No `// @ts-ignore` comments — fix the type error instead
- Use `const` by default, `let` only when reassignment is needed

### Component Rules
```typescript
// ✅ CORRECT: Typed props, explicit return type
interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{product.name}</h3>
      <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
    </div>
  );
};

// ❌ WRONG: Untyped props
export const ProductCard = ({ product, onAddToCart }: any) => { ... }
```

### API Calls
- All API calls go through typed client functions in `lib/api/`
- Use TanStack Query for all server state (no `useEffect` + `fetch` patterns)
- Always handle loading, error, and empty states in UI

```typescript
// lib/api/products.ts
export const getProduct = async (id: string): Promise<Product> => {
  const { data } = await axios.get<ApiResponse<Product>>(`/products/${id}/`);
  if (!data.success) throw new Error(data.error);
  return data.data;
};

// Component usage
const { data: product, isLoading, error } = useQuery({
  queryKey: ['product', id],
  queryFn: () => getProduct(id),
});
```

### Storefront Designer Rules
- Storefront design state lives **exclusively in Zustand** (`useStorefrontStore`)
- Components **never mutate state directly** — always call store actions
- **Autosave must be debounced** (2000ms) — never save on every keystroke
- **Publish is async** — always show loading state, handle errors gracefully
- All design operations must be **undoable** (maintain a history stack in Zustand)

---

## 3. API Design

- All endpoints versioned: `/api/v1/...`
- Use plural nouns for resource names: `/products/`, `/orders/`
- Use nested routes for sub-resources: `/products/{id}/reviews/`
- Use HTTP verbs correctly: `GET` (read), `POST` (create), `PUT` (replace), `PATCH` (partial update), `DELETE` (delete)
- Return 201 for creation, 200 for updates, 204 for deletes
- Always paginate list endpoints: `?page=1&page_size=20`
- Include `X-Request-Id` header in all responses (for tracing)

**Standard pagination response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 847,
    "total_pages": 43
  }
}
```

---

## 4. Testing

### Backend (pytest)
- Every **service method** must have a unit test
- Every **API endpoint** must have an integration test
- Mock external dependencies (Kafka, Redis, other services) in unit tests
- Use factories (factory_boy) for test data — no raw fixtures
- Minimum coverage: **80%** per service

```python
# tests/unit/services/test_product_service.py
from unittest.mock import MagicMock, patch
import pytest
from apps.products.services.product_service import ProductService

class TestProductService:
    def setup_method(self):
        self.repository = MagicMock()
        self.kafka = MagicMock()
        self.cache = MagicMock()
        self.service = ProductService(self.repository, self.kafka, self.cache)

    def test_get_product_returns_cached_data(self):
        self.cache.get.return_value = {"id": "123", "name": "Test"}
        result = self.service.get_product("123")
        assert result["name"] == "Test"
        self.repository.get_by_id.assert_not_called()

    def test_reserve_stock_raises_when_insufficient(self):
        mock_product = MagicMock(stock=5)
        self.repository.get_by_id.return_value = mock_product
        with pytest.raises(InsufficientStockError):
            self.service.reserve_stock("123", quantity=10)
```

### Frontend (Vitest + Testing Library)
- Test user interactions, not implementation details
- Mock API calls in tests
- Test all edge states: loading, error, empty

---

## 5. Security Checklist (per endpoint)

- [ ] JWT authentication enforced (where required)
- [ ] Role authorization enforced (BUYER vs SELLER vs ADMIN)
- [ ] Input validated with DRF serializer
- [ ] Object-level permission: user can only access their own data
- [ ] Rate limiting applied at API Gateway
- [ ] No sensitive data in logs (mask email, phone, payment info)
- [ ] No stack traces in production error responses
- [ ] SQL injection protected (ORM only, no raw queries unless parameterized)

---

## 6. Logging

Use **structured logging** (JSON format) via `structlog`:

```python
import structlog
log = structlog.get_logger()

# In service methods:
log.info("order_placed", order_id=str(order.id), user_id=str(user_id), total=str(order.total_amount))
log.error("payment_failed", order_id=str(order_id), reason=failure_reason)
```

Never log: passwords, payment card numbers, JWT tokens, PII without masking.

---

## 7. Git Workflow

- Branch naming: `feature/`, `fix/`, `chore/`, `docs/`
- Commit messages: `feat: add storefront publish endpoint`
- PR must pass: all tests, linting, type checks
- Squash commits before merging to main

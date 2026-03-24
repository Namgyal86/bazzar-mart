# Django Production Architecture

> Every microservice follows this exact pattern. No exceptions.

---

## 1. Service Folder Structure (Reference Implementation)

```
{service-name}-service/
├── src/
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── base.py          # Common settings
│   │   │   ├── development.py   # DEBUG=True, local DBs
│   │   │   └── production.py    # Kubernetes env vars
│   │   ├── urls.py              # Root URL config
│   │   ├── asgi.py              # For WebSocket / async support
│   │   └── wsgi.py
│   │
│   ├── apps/
│   │   └── {domain}/            # e.g. "products", "orders", "designer"
│   │       ├── __init__.py
│   │       ├── admin.py
│   │       ├── apps.py
│   │       │
│   │       ├── models/          # Django ORM models (data shape only)
│   │       │   ├── __init__.py
│   │       │   └── {entity}.py  # e.g. product.py, order.py
│   │       │
│   │       ├── services/        # ← ALL business logic lives here
│   │       │   ├── __init__.py
│   │       │   └── {entity}_service.py
│   │       │
│   │       ├── repositories/    # ← ALL DB queries live here
│   │       │   ├── __init__.py
│   │       │   └── {entity}_repository.py
│   │       │
│   │       ├── api/
│   │       │   ├── __init__.py
│   │       │   ├── views.py     # Thin views: validate → call service → respond
│   │       │   ├── serializers.py
│   │       │   ├── urls.py
│   │       │   └── permissions.py
│   │       │
│   │       └── tasks/
│   │           ├── __init__.py
│   │           └── {entity}_tasks.py  # Celery async tasks
│   │
│   ├── infrastructure/
│   │   ├── redis/
│   │   │   └── client.py
│   │   ├── kafka/
│   │   │   ├── producer.py
│   │   │   └── consumer.py
│   │   ├── s3/
│   │   │   └── client.py
│   │   └── external_services/
│   │       └── {service}_client.py    # REST clients for other microservices
│   │
│   └── shared/
│       ├── exceptions.py        # Custom exception classes
│       ├── pagination.py
│       ├── validators.py
│       └── utils.py
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── repositories/
│   └── integration/
│       └── api/
│
├── Dockerfile
├── docker-compose.yml           # For local dev only
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── manage.py
├── pytest.ini
└── .env.example
```

---

## 2. Layer Responsibilities

### 2.1 Models Layer (`models/`)
- **Purpose:** Define the data shape (Django ORM models)
- **Rules:**
  - No business logic in models
  - No methods that call other services
  - Only define fields, Meta, and `__str__`
  - Use `UUIDField` as primary key everywhere
  - Always include `created_at` and `updated_at`

```python
# models/product.py
import uuid
from django.db import models

class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller_id = models.UUIDField(db_index=True)  # FK to Seller Service (no join)
    name = models.CharField(max_length=500)
    description = models.TextField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        indexes = [
            models.Index(fields=['seller_id']),
            models.Index(fields=['is_active', 'created_at']),
        ]

    def __str__(self) -> str:
        return self.name
```

### 2.2 Repository Layer (`repositories/`)
- **Purpose:** All database queries, nothing else
- **Rules:**
  - No business logic
  - Returns model instances or typed dicts — never raw querysets to service layer
  - Must handle `DoesNotExist` and raise domain exceptions
  - All writes must be wrapped in `transaction.atomic()` where appropriate

```python
# repositories/product_repository.py
from django.db import transaction
from apps.products.models.product import Product
from shared.exceptions import ProductNotFoundError

class ProductRepository:
    def get_by_id(self, product_id: str) -> Product:
        try:
            return Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            raise ProductNotFoundError(f"Product {product_id} not found")

    def list_by_seller(self, seller_id: str, page: int, page_size: int) -> list[Product]:
        offset = (page - 1) * page_size
        return list(
            Product.objects.filter(seller_id=seller_id, is_active=True)
            .order_by('-created_at')[offset:offset + page_size]
        )

    @transaction.atomic
    def update_stock(self, product_id: str, delta: int) -> Product:
        product = Product.objects.select_for_update().get(id=product_id)
        product.stock = max(0, product.stock + delta)
        product.save(update_fields=['stock', 'updated_at'])
        return product
```

### 2.3 Service Layer (`services/`)
- **Purpose:** All business logic
- **Rules:**
  - Depends on repositories — never on models directly
  - May call other microservices via infrastructure clients
  - May publish Kafka events
  - May read/write Redis cache
  - Must raise domain-specific exceptions (not HTTP exceptions)

```python
# services/product_service.py
from apps.products.repositories.product_repository import ProductRepository
from infrastructure.kafka.producer import KafkaProducer
from infrastructure.redis.client import RedisClient
from shared.exceptions import InsufficientStockError

class ProductService:
    def __init__(
        self,
        repository: ProductRepository,
        kafka: KafkaProducer,
        cache: RedisClient,
    ):
        self.repository = repository
        self.kafka = kafka
        self.cache = cache

    def get_product(self, product_id: str) -> dict:
        cache_key = f"product:{product_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        product = self.repository.get_by_id(product_id)
        data = self._serialize(product)
        self.cache.set(cache_key, data, ttl=120)
        return data

    def reserve_stock(self, product_id: str, quantity: int) -> None:
        product = self.repository.get_by_id(product_id)
        if product.stock < quantity:
            raise InsufficientStockError(
                f"Only {product.stock} units available for product {product_id}"
            )
        self.repository.update_stock(product_id, delta=-quantity)
        self.kafka.publish('inventory.updated', {
            'product_id': str(product_id),
            'new_stock': product.stock - quantity,
        })
```

### 2.4 API Layer (`api/`)
- **Purpose:** Handle HTTP — validate input, call service, return response
- **Rules:**
  - Views must be **thin** — no business logic
  - Use DRF serializers for input validation
  - Catch domain exceptions and map to HTTP status codes
  - All responses use the standard envelope

```python
# api/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.products.services.product_service import ProductService
from shared.exceptions import ProductNotFoundError, InsufficientStockError

class ProductDetailView(APIView):
    def __init__(self, service: ProductService, **kwargs):
        super().__init__(**kwargs)
        self.service = service

    def get(self, request, product_id: str):
        try:
            product = self.service.get_product(product_id)
            return Response({"success": True, "data": product})
        except ProductNotFoundError as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
```

---

## 3. Standard Response Envelope

**Every API response** must follow this structure:

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }   // for lists
}

// Error
{
  "success": false,
  "error": "Human-readable error message",
  "code": "PRODUCT_NOT_FOUND"            // Machine-readable error code
}
```

---

## 4. Exception Hierarchy

```python
# shared/exceptions.py

class DomainException(Exception):
    """Base for all domain exceptions"""
    http_status: int = 500
    error_code: str = "INTERNAL_ERROR"

class NotFoundError(DomainException):
    http_status = 404
    error_code = "NOT_FOUND"

class ProductNotFoundError(NotFoundError):
    error_code = "PRODUCT_NOT_FOUND"

class InsufficientStockError(DomainException):
    http_status = 409
    error_code = "INSUFFICIENT_STOCK"

class AuthorizationError(DomainException):
    http_status = 403
    error_code = "FORBIDDEN"

class ValidationError(DomainException):
    http_status = 400
    error_code = "VALIDATION_ERROR"
```

---

## 5. Celery Async Tasks

Heavy operations run as Celery tasks:

```python
# tasks/product_tasks.py
from celery import shared_task

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_product_images(self, product_id: str, image_urls: list[str]):
    """Resize images, generate thumbnails, upload to S3, update product record."""
    try:
        # ... image processing logic ...
    except Exception as exc:
        raise self.retry(exc=exc)

@shared_task
def sync_product_to_elasticsearch(product_id: str):
    """Index or update product in Elasticsearch search index."""
    ...
```

---

## 6. Health & Metrics Endpoints

Every service must expose:

```python
# api/health.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection

class HealthView(APIView):
    permission_classes = []

    def get(self, request):
        checks = {
            "database": self._check_db(),
            "redis": self._check_redis(),
            "kafka": self._check_kafka(),
        }
        all_healthy = all(checks.values())
        return Response(
            {"status": "healthy" if all_healthy else "degraded", "checks": checks},
            status=200 if all_healthy else 503
        )
```

Routes: `GET /health/` and `GET /metrics/` (Prometheus format)

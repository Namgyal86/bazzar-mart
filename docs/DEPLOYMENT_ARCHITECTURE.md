# Deployment Architecture

---

## 1. Overview

All services run in **AWS EKS (Kubernetes)**. External infrastructure (PostgreSQL, Redis, Kafka, Elasticsearch) runs as managed AWS services. The frontend is deployed to **Vercel** for edge-optimized Next.js delivery.

---

## 2. Environment Strategy

| Environment | Purpose | Infra |
|-------------|---------|-------|
| `local` | Developer workstation | Docker Compose |
| `staging` | QA / integration testing | EKS (smaller instances) |
| `production` | Live platform | EKS (production instances) |

---

## 3. Kubernetes Cluster Layout

```
EKS Cluster: ecommerce-platform
│
├── Namespace: services
│   ├── Deployment: user-service          (2-10 replicas, HPA)
│   ├── Deployment: product-service       (2-10 replicas, HPA)
│   ├── Deployment: cart-service          (2-5 replicas)
│   ├── Deployment: order-service         (2-8 replicas, HPA)
│   ├── Deployment: payment-service       (2-4 replicas)
│   ├── Deployment: review-service        (2-4 replicas)
│   ├── Deployment: seller-service        (2-4 replicas)
│   ├── Deployment: notification-service  (2-4 replicas)
│   ├── Deployment: search-service        (2-4 replicas)
│   ├── Deployment: recommendation-engine (1-3 replicas)
│   └── Deployment: storefront-designer   (2-4 replicas) ← NEW
│
├── Namespace: infrastructure
│   ├── Deployment: kong-api-gateway
│   └── Deployment: nginx-ingress
│
└── Namespace: workers
    ├── Deployment: bullmq-worker-notifications
    ├── Deployment: bullmq-worker-recommendation
    └── Deployment: bullmq-worker-storefront  (async Handlebars rendering)
```

---

## 4. Kubernetes Manifest Pattern (per service)

Each service has these manifests in `infrastructure/k8s/{service-name}/`:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
  namespace: services
spec:
  replicas: 2
  selector:
    matchLabels:
      app: product-service
  template:
    metadata:
      labels:
        app: product-service
    spec:
      containers:
        - name: product-service
          image: your-registry/product-service:latest
          ports:
            - containerPort: 8002
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: product-service-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: shared-secrets
                  key: redis-url
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health/
              port: 8002
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health/
              port: 8002
            initialDelaySeconds: 5
            periodSeconds: 10

---
# hpa.yaml (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: product-service-hpa
  namespace: services
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: product-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: product-service
  namespace: services
spec:
  selector:
    app: product-service
  ports:
    - port: 8002
      targetPort: 8002
```

---

## 5. External Managed Services (AWS)

| Service | AWS Product / Technology | Config |
|---------|--------------------------|--------|
| MongoDB (per microservice) | MongoDB Atlas | One cluster per service, automated backups |
| Redis | ElastiCache Redis 7 | Cluster mode, 2 shards — BullMQ + cache + sessions |
| Kafka | Amazon MSK | 3 brokers, replication factor 3 |
| Elasticsearch | Amazon OpenSearch 8 | 3 data nodes (search-service only) |
| Object Storage | S3 | Separate buckets: media, storefronts, backups |
| CDN | CloudFront | Distribution per environment |
| Secrets | AWS Secrets Manager | Rotated every 30 days |

---

## 6. Docker Compose (Local Development)

```yaml
# docker-compose.yml (root of monorepo)
version: '3.9'

services:
  # Infrastructure
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7
    ports: ["6379:6379"]

  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    ports: ["9092:9092"]
    depends_on: [zookeeper]

  elasticsearch:
    image: elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports: ["9200:9200"]

  # Services
  user-service:
    build: ./services/user-service
    ports: ["8001:8001"]
    environment:
      MONGO_URI: mongodb://mongodb:27017/user_db
      REDIS_URL: redis://redis:6379
      KAFKA_BROKERS: kafka:9092
    depends_on: [mongodb, redis, kafka]

  product-service:
    build: ./services/product-service
    ports: ["8002:8002"]
    environment:
      MONGO_URI: mongodb://mongodb:27017/product_db
      REDIS_URL: redis://redis:6379
      KAFKA_BROKERS: kafka:9092
    depends_on: [mongodb, redis, kafka, elasticsearch]

  storefront-designer-service:
    build: ./services/storefront-designer-service
    ports: ["8011:8011"]
    environment:
      MONGO_URI: mongodb://mongodb:27017/storefront_db
      REDIS_URL: redis://redis:6379
      KAFKA_BROKERS: kafka:9092
      AWS_S3_BUCKET: local-storefronts
      CLOUDFRONT_URL: http://localhost:9000
    depends_on: [mongodb, redis, kafka]

  # Frontend
  web:
    build: ./web
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://localhost:8080

volumes:
  mongo-data:
```

---

## 7. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml

name: Build and Deploy

on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          cd services/${{ matrix.service }}
          pip install -r requirements/development.txt
          pytest tests/ -v --cov

  build-and-push:
    needs: test
    steps:
      - name: Build Docker image
        run: docker build -t $ECR_REGISTRY/$SERVICE:$GITHUB_SHA .
      - name: Push to ECR
        run: docker push $ECR_REGISTRY/$SERVICE:$GITHUB_SHA

  deploy:
    needs: build-and-push
    steps:
      - name: Deploy to EKS
        run: |
          kubectl set image deployment/$SERVICE $SERVICE=$ECR_REGISTRY/$SERVICE:$GITHUB_SHA
          kubectl rollout status deployment/$SERVICE
```

---

## 8. Storefront Static Hosting (S3 + CloudFront)

```
S3 Bucket: platform-storefronts-prod
└── storefronts/
    ├── my-fashion-store/
    │   └── index.html          ← Published storefront
    ├── tech-gadgets-hub/
    │   └── index.html
    └── ...

CloudFront Distribution:
  Origin: S3 bucket (platform-storefronts-prod)
  Path Pattern: /store/*
  Cache Policy: CachingOptimized
  Invalidation: on STOREFRONT_PUBLISHED event
```

**CloudFront invalidation triggered by Storefront Designer on publish:**
```python
import boto3

cloudfront = boto3.client('cloudfront')
cloudfront.create_invalidation(
    DistributionId='EXXXXXXXXXXXXX',
    InvalidationBatch={
        'Paths': {
            'Quantity': 1,
            'Items': [f'/store/{seller_slug}/*']
        },
        'CallerReference': str(uuid.uuid4())
    }
)
```

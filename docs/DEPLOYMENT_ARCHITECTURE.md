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
│   ├── Deployment: api-monolith          (3-20 replicas, HPA)  ← all 13 modules
│   ├── Deployment: delivery-service      (2-6 replicas, HPA)
│   └── Deployment: notification-service  (2-4 replicas)
│
├── Namespace: infrastructure
│   ├── Deployment: kong-api-gateway
│   └── Deployment: nginx-ingress
│
└── Namespace: workers
    └── Deployment: bullmq-worker-notifications
```

---

## 4. Kubernetes Manifest Pattern (api-monolith)

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-monolith
  namespace: services
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-monolith
  template:
    metadata:
      labels:
        app: api-monolith
    spec:
      containers:
        - name: api-monolith
          image: your-registry/api-monolith:latest
          ports:
            - containerPort: 8100
          env:
            - name: MONGO_URI
              valueFrom:
                secretKeyRef:
                  name: monolith-secrets
                  key: mongo-uri
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: shared-secrets
                  key: redis-url
            - name: KAFKA_BROKERS
              valueFrom:
                secretKeyRef:
                  name: shared-secrets
                  key: kafka-brokers
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8100
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /health
              port: 8100
            initialDelaySeconds: 5
            periodSeconds: 10

---
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-monolith-hpa
  namespace: services
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-monolith
  minReplicas: 3
  maxReplicas: 20
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
  name: api-monolith
  namespace: services
spec:
  selector:
    app: api-monolith
  ports:
    - port: 8100
      targetPort: 8100
```

---

## 5. External Managed Services (AWS)

| Service | AWS Product / Technology | Config |
|---------|--------------------------|--------|
| MongoDB (monolith) | MongoDB Atlas | Single `bazzar_monolith` cluster, automated backups |
| MongoDB (delivery) | MongoDB Atlas | Separate `delivery_db` cluster |
| Redis | ElastiCache Redis 7 | Cart store + rate limit counters |
| Kafka | Amazon MSK | 3 brokers, replication factor 3 — external events only |
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

  # Services
  api-monolith:
    build: ./services/api-monolith
    ports: ["8100:8100"]
    environment:
      MONGO_URI: mongodb://mongodb:27017/bazzar_monolith
      REDIS_URL: redis://redis:6379
      KAFKA_BROKERS: kafka:9092
      JWT_ACCESS_SECRET: dev_access_secret
      JWT_REFRESH_SECRET: dev_refresh_secret
    depends_on: [mongodb, redis, kafka]

  delivery-service:
    build: ./services/delivery-service
    ports: ["8013:8013"]
    environment:
      MONGO_URI: mongodb://mongodb:27017/delivery_db
      REDIS_URL: redis://redis:6379
      KAFKA_BROKERS: kafka:9092
    depends_on: [mongodb, redis, kafka]

  notification-service:
    build: ./services/notification-service
    ports: ["8008:8008"]
    environment:
      KAFKA_BROKERS: kafka:9092
    depends_on: [kafka]

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

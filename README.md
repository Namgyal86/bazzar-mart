# Bazzar — Nepal's Modern E-Commerce Platform

A full-stack microservices e-commerce platform built with Next.js 14, TypeScript, Express, MongoDB, and Redis.

---

## Architecture

```
Frontend (Next.js 14)  ←→  14 Microservices  ←→  MongoDB + Redis
       :3000                  :8001–8014
```

| Service | Port | Description |
|---------|------|-------------|
| user-service | 8001 | Auth, JWT, user profiles, addresses |
| product-service | 8002 | Products, categories, search |
| cart-service | 8003 | Redis-backed shopping cart |
| order-service | 8004 | Orders, status tracking |
| payment-service | 8005 | Khalti, eSewa, COD integration |
| review-service | 8006 | Product reviews & ratings |
| seller-service | 8007 | Seller profiles & dashboard |
| notification-service | 8008 | In-app notifications |
| search-service | 8009 | Full-text product search |
| recommendation-service | 8010 | Personalized recommendations |
| storefront-designer-service | 8011 | Custom seller storefronts |
| referral-service | 8012 | Referral codes & wallet credits |
| delivery-service | 8013 | Real-time GPS tracking (Socket.io) |
| analytics-service | 8014 | Platform analytics & admin stats |

---

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud)

### 1. Install Dependencies

```bash
# Frontend
cd web && npm install

# All services at once (Windows)
start-services.bat

# All services at once (Mac/Linux)
chmod +x start-services.sh && ./start-services.sh
```

### 2. Environment Setup

```bash
# Root .env is already configured for local development
# Copy it to any service manually if needed:
cp .env services/user-service/.env

# Frontend env
cp web/.env.local web/.env.local  # already exists
```

### 3. Start Everything Manually

**Terminal 1 — Frontend:**
```bash
cd web && npm run dev
# http://localhost:3000
```

**Terminal 2+ — Services:**
```bash
cd services/user-service && npm run dev      # :8001
cd services/product-service && npm run dev   # :8002
cd services/cart-service && npm run dev      # :8003
# ... etc for each service
```

---

## Docker (Recommended)

```bash
# Start everything with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f user-service

# Stop everything
docker-compose down
```

Requires Docker Desktop. MongoDB and Redis are included in the compose file.

---

## API Routes

All requests go through the Next.js rewrite layer in development:

| Frontend calls | Routes to |
|----------------|-----------|
| `/api/v1/auth/*` | user-service:8001 |
| `/api/v1/users/*` | user-service:8001 |
| `/api/v1/products/*` | product-service:8002 |
| `/api/v1/categories/*` | product-service:8002 |
| `/api/v1/cart/*` | cart-service:8003 |
| `/api/v1/orders/*` | order-service:8004 |
| `/api/v1/payments/*` | payment-service:8005 |
| `/api/v1/reviews/*` | review-service:8006 |
| `/api/v1/seller/*` | seller-service:8007 |
| `/api/v1/notifications/*` | notification-service:8008 |
| `/api/v1/search/*` | search-service:8009 |
| `/api/v1/recommendations/*` | recommendation-service:8010 |
| `/api/v1/referrals/*` | referral-service:8012 |
| `/api/v1/delivery/*` | delivery-service:8013 |
| `/api/v1/analytics/*` | analytics-service:8014 |

---

## Key Features

- **Modern UI** — Glassmorphism, scroll animations, real product images
- **Auth** — JWT access tokens (15m) + refresh tokens (30d) with rotation
- **Cart** — Redis-backed, synced to backend when logged in
- **Orders** — Full lifecycle: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
- **Payments** — Khalti & eSewa digital wallets + Cash on Delivery
- **Seller Portal** — Dashboard with charts, product management, order tracking
- **Admin Panel** — Platform analytics, seller approval, order management
- **Real-time** — Socket.io delivery tracking on the map
- **Referrals** — Rs. 200 credit for referrer + new user on first order

---

## Test Accounts

After running the backend, register at `/auth/register`.

For the seller dashboard: register and apply at `/sellers/register`.

**Coupon code for checkout:** `BAZZAR10` (10% discount)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| Backend | Express.js, TypeScript, Mongoose |
| Database | MongoDB (separate DB per service) |
| Cache | Redis (cart storage) |
| Auth | JWT (access + refresh tokens) |
| Real-time | Socket.io (delivery tracking) |
| Charts | Recharts |
| Deployment | Docker, docker-compose |

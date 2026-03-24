# Product Requirements Document (PRD)

> Version: 2.0 | Status: Final

---

## 1. Platform Goal

Build a **multi-vendor e-commerce marketplace** with Amazon-like capabilities, plus a **"Build Your Own Storefront" (BYOS)** feature that lets sellers design and publish custom storefront pages through a no-code drag-and-drop interface.

---

## 2. User Roles

| Role | Description |
|------|-------------|
| `BUYER` | Browses products, places orders, writes reviews |
| `SELLER` | Lists products, manages inventory, designs storefront |
| `ADMIN` | Platform administration, moderation, analytics |
| `GUEST` | Browse-only, no cart or checkout |

---

## 3. Buyer Features

### 3.1 Authentication
- Register with email/password or OAuth (Google, Facebook)
- Email verification on signup
- JWT-based login; refresh token flow
- Password reset via email OTP
- 2FA via TOTP (optional)

### 3.2 Profile & Account
- View/edit personal info (name, phone, profile photo)
- Manage multiple delivery addresses
- View order history with status tracking
- Download invoices as PDF
- Manage wishlist
- View referral code and referral rewards balance

### 3.3 Shopping & Checkout
- Browse products by category, brand, seller
- Full-text search with filters (price, rating, availability)
- Product detail page with variants (size, color, etc.)
- Add to cart / save for later
- Apply coupon codes and referral discounts
- Multi-step checkout (address → payment → review → confirm)
- Multiple payment methods: card, wallet, UPI, COD
- Real-time stock validation at checkout
- Order tracking with status updates

### 3.4 Reviews
- Rate and review purchased products (verified purchase only)
- Upload review photos
- Mark reviews as helpful / report reviews

---

## 4. Seller Features

### 4.1 Seller Registration
- Business registration form (name, GSTIN, bank details)
- KYC document upload
- Admin approval workflow
- Seller dashboard access after approval

### 4.2 Product Management
- Add/edit/delete product listings
- Product variants (size, color, material) with individual SKUs
- Bulk CSV import for products
- Inventory management with low-stock alerts
- Price management including discounts and flash sales

### 4.3 Order Management
- View and process incoming orders
- Mark orders as packed/shipped
- Upload tracking numbers
- Handle return/refund requests

### 4.4 Analytics Dashboard
- Revenue over time (daily, weekly, monthly)
- Top-performing products
- Conversion rate per listing
- Customer demographics (age, location)

### 4.5 🆕 Storefront Designer (BYOS)
- Drag-and-drop page builder to design a custom seller storefront
- Choose from pre-built layout templates (Minimal, Bold, Fashion, Tech)
- Add/remove/reorder page sections (Hero Banner, Featured Products, About, Testimonials, etc.)
- Customize colors, fonts, logos, button styles
- Live preview before publishing
- One-click publish to `platform.com/store/<seller-slug>`
- Version history — roll back to any previous published design
- Mobile-responsive preview mode

> Full technical spec: see `BYOS_STOREFRONT_DESIGNER.md`

---

## 5. Admin Features

- User and seller management (ban, approve, verify)
- Product moderation (approve/reject listings)
- Review moderation (flag, remove)
- Platform-wide analytics (GMV, DAU, conversion, retention)
- Coupon and promotion management
- Payout management for sellers
- System health monitoring dashboard

---

## 6. Notification System

| Event | Channel |
|-------|---------|
| Order placed | Email + SMS |
| Order shipped | Email + Push |
| Order delivered | Email + Push |
| Payment failed | Email + SMS |
| Product back in stock | Email + Push |
| Review posted | Email |
| Seller payout processed | Email + SMS |
| Referral reward earned | Push |
| Referral reward revoked | Email + Push |
| Credits expiring in 7 days | Push + Email |

---

## 7. Referral System

> Full specification is in `REFERRAL_SYSTEM.md`. Summary:

- Every buyer gets a unique referral code (e.g. `JOHN2024XK`)
- Sharing the code gives **both** referrer and referee **$10 credit** when the referee completes their first order (min. $25)
- Credits are stored in a per-user wallet and expire after 90 days
- Credits can be applied at checkout (max $20 per order)
- Anti-abuse: one reward per verified phone/email identity; self-referral blocked
- All reward rules (amounts, expiry, limits) are stored in a config table — editable by admin without redeployment

---

## 8. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Uptime | 99.9% |
| API response time (p95) | < 300ms |
| Page load time | < 2 seconds |
| Concurrent users | 100,000+ |
| Search latency (p95) | < 100ms |
| Image delivery | Via CDN, < 50ms |
| Data backup | Daily automated, 30-day retention |
| GDPR compliance | Full data export + right to erasure |

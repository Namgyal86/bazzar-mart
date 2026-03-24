# Referral System — Full Specification

> This is a **standalone service** (`referral-service`, port 8012).
> Read `SYSTEM_ARCHITECTURE.md` and `DATABASE_SCHEMA.md` first.

---

## 1. Feature Overview

The Referral System lets buyers invite friends to join the platform. When a referred friend signs up **and completes their first order**, both the referrer and the referee receive **credit rewards** that can be applied to future purchases.

The system is designed to:
- Be **anti-abuse** (one reward per verified phone/email, not per account)
- Be **transparent** (users can track all their referrals and credit history)
- Be **non-blocking** (referral logic never slows down checkout)
- **Expire credits** to create urgency and reduce long-term liability

---

## 2. Referral Lifecycle

```
Step 1: SHARE
  Referrer shares their unique code or link
  e.g. https://platform.com/invite/JOHN2024

Step 2: SIGNUP
  Referee opens the link → lands on signup page with code pre-filled
  Referee completes registration → account created (status: PENDING_FIRST_ORDER)

Step 3: FIRST ORDER
  Referee places and pays for their first order (min. order value applies)
  Order Service publishes ORDER_PAID event to Kafka

Step 4: REWARD ISSUED
  Referral Service consumes ORDER_PAID
  Checks: is this user's first completed order? is there a valid pending referral?
  Issues credit to BOTH referrer and referee
  Publishes REFERRAL_REWARD_ISSUED event → Notification Service sends alerts

Step 5: CREDIT APPLIED
  At checkout, buyer can choose to apply available referral credits
  Credits are deducted from order total (up to a configured max per order)

Step 6: EXPIRY
  Credits not used within 90 days are automatically expired by a Celery beat task
```

---

## 3. Business Rules

| Rule | Value / Behavior |
|------|-----------------|
| Referrer reward | $10 credit per successful referral |
| Referee reward | $10 credit on first order |
| Minimum first-order value | $25 (referee must spend at least this) |
| Max credit per order | $20 (cannot cover full order with credits alone) |
| Credit expiry | 90 days from issuance date |
| Max referrals per user | 50 lifetime (anti-spam cap) |
| One reward per identity | One phone number OR email can only redeem once |
| Self-referral | Blocked (same device fingerprint / IP heuristic + email match) |
| Fraudulent orders | If referee's order is refunded/cancelled, referrer credit is revoked |
| Credit currency | Platform credits (not cash) — cannot be withdrawn |

> **Note:** All rule values (reward amounts, minimums, expiry days) must be stored in a config table, not hardcoded, so they can be changed without a deployment.

---

## 4. Database Schema (referral_db — PostgreSQL)

```sql
-- Configurable system-level rules (editable by admin, never hardcoded)
CREATE TABLE referral_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,       -- e.g. 'referrer_reward_amount'
    value TEXT NOT NULL,                     -- e.g. '10.00'
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data (insert on first deploy):
INSERT INTO referral_config (key, value, description) VALUES
  ('referrer_reward_amount',   '10.00', 'USD credit given to referrer on success'),
  ('referee_reward_amount',    '10.00', 'USD credit given to referee on first order'),
  ('min_first_order_value',    '25.00', 'Minimum order value for referral to qualify'),
  ('max_credit_per_order',     '20.00', 'Max referral credit that can be used per order'),
  ('credit_expiry_days',       '90',    'Days until unused credit expires'),
  ('max_referrals_per_user',   '50',    'Lifetime referral cap per referrer');


-- One record per referral attempt (referrer → referee)
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL,              -- user_id of the person who shared
    referee_id UUID,                        -- user_id of the person who signed up (set on registration)
    referee_email VARCHAR(255),             -- captured at signup before user_id exists
    referee_phone VARCHAR(20),
    code VARCHAR(20) NOT NULL,              -- the referral code used
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    -- PENDING → SIGNED_UP → COMPLETED → REWARDED | EXPIRED | REVOKED
    first_order_id UUID,                    -- set when referee completes first order
    first_order_value DECIMAL(12,2),
    rewarded_at TIMESTAMPTZ,
    expiry_date DATE,                       -- set when referral is created (signup date + N days)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit wallet: one balance entry per user
CREATE TABLE referral_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_earned DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_spent DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_expired DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full audit trail for every credit movement
CREATE TABLE referral_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    wallet_id UUID NOT NULL REFERENCES referral_wallets(id),
    referral_id UUID REFERENCES referrals(id),
    transaction_type VARCHAR(30) NOT NULL,
    -- EARNED_AS_REFERRER | EARNED_AS_REFEREE | SPENT | EXPIRED | REVOKED
    amount DECIMAL(12,2) NOT NULL,          -- positive = credit, negative = debit
    balance_after DECIMAL(12,2) NOT NULL,   -- wallet balance snapshot after this tx
    order_id UUID,                          -- set when SPENT or when first order triggers EARNED
    description TEXT,
    expires_at TIMESTAMPTZ,                 -- only set for EARNED transactions
    is_expired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anti-abuse: track identity fingerprints that have already claimed referee reward
CREATE TABLE referral_identity_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_hash TEXT UNIQUE,                 -- SHA-256 hash of email (never store plain)
    phone_hash TEXT UNIQUE,                 -- SHA-256 hash of phone
    user_id UUID NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_referrals_referrer_id    ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee_id     ON referrals(referee_id);
CREATE INDEX idx_referrals_code           ON referrals(code);
CREATE INDEX idx_referrals_status         ON referrals(status);
CREATE INDEX idx_referral_credit_tx_user  ON referral_credit_transactions(user_id);
CREATE INDEX idx_referral_credit_tx_expiry ON referral_credit_transactions(expires_at)
    WHERE is_expired = FALSE;
```

---

## 5. Service Structure

```
referral-service/
├── src/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   └── urls.py
│   │
│   ├── apps/
│   │   └── referrals/
│   │       ├── models/
│   │       │   ├── referral.py
│   │       │   ├── wallet.py
│   │       │   └── config.py
│   │       │
│   │       ├── services/
│   │       │   ├── referral_service.py       # Core referral logic
│   │       │   ├── wallet_service.py         # Credit balance management
│   │       │   ├── reward_service.py         # Issue / revoke rewards
│   │       │   ├── config_service.py         # Read referral_config table
│   │       │   └── anti_abuse_service.py     # Fraud / duplicate detection
│   │       │
│   │       ├── repositories/
│   │       │   ├── referral_repository.py
│   │       │   └── wallet_repository.py
│   │       │
│   │       ├── api/
│   │       │   ├── views.py
│   │       │   ├── serializers.py
│   │       │   └── urls.py
│   │       │
│   │       └── tasks/
│   │           └── expiry_tasks.py           # Celery beat: daily credit expiry
│   │
│   └── infrastructure/
│       ├── kafka/
│       │   ├── producer.py
│       │   └── consumers/
│       │       ├── order_paid_consumer.py    # Triggers reward on first order
│       │       └── order_refunded_consumer.py # Revokes credit on refund
```

---

## 6. API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/referrals/my-code/` | JWT | Get own referral code + shareable link |
| GET | `/referrals/dashboard/` | JWT | Stats: total referrals, pending, rewarded |
| GET | `/referrals/history/` | JWT | List all referrals made by this user |
| GET | `/referrals/wallet/` | JWT | Current credit balance + transaction history |
| POST | `/referrals/apply/` | JWT | Apply credits to current cart (returns adjusted total) |
| GET | `/referrals/validate/{code}/` | None | Check if a referral code is valid (used at signup) |
| GET | `/admin/referrals/` | ADMIN | Platform-wide referral stats |
| PATCH | `/admin/referrals/{id}/revoke/` | ADMIN | Manually revoke a referral reward |
| GET | `/admin/referral-config/` | ADMIN | View all config rules |
| PATCH | `/admin/referral-config/{key}/` | ADMIN | Update a config rule (e.g. change reward amount) |

**`GET /referrals/my-code/` response:**
```json
{
  "success": true,
  "data": {
    "code": "JOHN2024",
    "share_url": "https://platform.com/invite/JOHN2024",
    "share_message": "Join me on Platform and get $10 off your first order! Use my code JOHN2024",
    "referral_count": 7,
    "pending_count": 2,
    "rewarded_count": 5,
    "total_earned": "50.00"
  }
}
```

**`GET /referrals/wallet/` response:**
```json
{
  "success": true,
  "data": {
    "balance": "20.00",
    "total_earned": "50.00",
    "total_spent": "20.00",
    "total_expired": "10.00",
    "transactions": [
      {
        "id": "uuid",
        "type": "EARNED_AS_REFERRER",
        "amount": "10.00",
        "balance_after": "20.00",
        "description": "Friend Jane signed up and placed their first order",
        "expires_at": "2026-06-14T00:00:00Z",
        "created_at": "2026-03-17T10:00:00Z"
      }
    ]
  }
}
```

---

## 7. Core Service Logic

### 7.1 ReferralService

```python
# services/referral_service.py

class ReferralService:
    """Manages the referral lifecycle from code generation to reward eligibility."""

    def get_or_create_referral_code(self, user_id: str) -> str:
        """
        Returns the user's existing referral code, or generates a new one.
        Code format: first 4 chars of name (uppercased) + 4-digit year + 2 random chars
        Example: JOHN2024XK
        Must be unique — retry with different random chars if collision.
        """

    def register_referee(self, referral_code: str, referee_email: str, referee_phone: str) -> Referral:
        """
        Called when a new user signs up via a referral link.
        Steps:
        1. Validate code exists and referrer is active
        2. Run anti-abuse checks (email_hash + phone_hash not in referral_identity_claims)
        3. Check referrer has not exceeded max_referrals_per_user
        4. Create Referral record (status=SIGNED_UP)
        5. Store hashes in referral_identity_claims
        Raises: InvalidReferralCodeError, AbuseDetectedError, ReferralLimitExceededError
        """

    def complete_referral(self, referee_user_id: str, order_id: str, order_value: Decimal) -> None:
        """
        Called by Kafka consumer when ORDER_PAID fires for this user.
        Steps:
        1. Check: does this user have a SIGNED_UP referral? (i.e. referred user)
        2. Check: is this their FIRST completed order? (query order_db count via REST)
        3. Check: order_value >= min_first_order_value from config
        4. If all pass → call RewardService.issue_rewards(referral)
        5. Update referral status → REWARDED
        6. Publish REFERRAL_REWARD_ISSUED to Kafka
        """

    def get_user_dashboard(self, user_id: str) -> dict:
        """Returns referral stats and history for the dashboard."""

    def revoke_referral(self, referral_id: str, reason: str) -> None:
        """
        Called by Kafka consumer when ORDER_REFUNDED fires for a referee's first order.
        Also callable by ADMIN manually.
        Steps:
        1. Find referral record
        2. Call RewardService.revoke_rewards(referral_id)
        3. Update referral status → REVOKED
        4. Publish REFERRAL_REVOKED to Kafka → Notification Service alerts both users
        """
```

### 7.2 WalletService

```python
# services/wallet_service.py

class WalletService:
    """Manages credit balance for a user. All mutations are atomic."""

    def get_balance(self, user_id: str) -> Decimal:
        """Returns current available (non-expired) balance."""

    def credit(self, user_id: str, amount: Decimal, referral_id: str,
               transaction_type: str, expires_at: datetime) -> CreditTransaction:
        """
        Add credits to wallet. Always uses SELECT FOR UPDATE on wallet row.
        Creates a CreditTransaction record.
        """

    def debit(self, user_id: str, amount: Decimal, order_id: str) -> CreditTransaction:
        """
        Deduct credits at checkout. 
        Validates: amount <= balance, amount <= max_credit_per_order config.
        Uses SELECT FOR UPDATE to prevent double-spend race conditions.
        Raises: InsufficientCreditsError, ExceedsMaxPerOrderError
        """

    def expire_credits(self) -> int:
        """
        Called daily by Celery beat task.
        Finds all CreditTransaction rows where expires_at <= NOW() and is_expired=FALSE.
        For each: marks is_expired=TRUE, creates a negative EXPIRED transaction,
        deducts from wallet balance.
        Returns count of expired transactions.
        """

    def revoke_credits(self, referral_id: str) -> None:
        """Reverse all EARNED credits tied to a specific referral_id."""
```

### 7.3 AntiAbuseService

```python
# services/anti_abuse_service.py

import hashlib

class AntiAbuseService:
    """
    Detects duplicate identity claims and self-referral attempts.
    Never stores raw PII — only SHA-256 hashes.
    """

    def _hash(self, value: str) -> str:
        return hashlib.sha256(value.strip().lower().encode()).hexdigest()

    def check_identity_not_claimed(self, email: str, phone: str) -> None:
        """
        Raises AbuseDetectedError if this email or phone has already
        claimed a referee reward on any account.
        """
        email_hash = self._hash(email)
        phone_hash = self._hash(phone) if phone else None
        if self.repository.identity_claimed(email_hash, phone_hash):
            raise AbuseDetectedError("This identity has already claimed a referral reward.")

    def check_not_self_referral(self, referrer_id: str, referee_email: str) -> None:
        """
        Calls User Service to get referrer's email.
        Raises SelfReferralError if referrer and referee have same email.
        """
```

---

## 8. Kafka Integration

### Events Consumed by Referral Service

| Topic | When | Action |
|-------|------|--------|
| `order.paid` | A payment succeeds | Check if this is referee's first order → issue rewards |
| `order.refunded` | An order is refunded | Check if this was a qualifying first order → revoke rewards |
| `user.registered` | New user signs up | Attach referee_id to pending Referral record if code used |

### Events Published by Referral Service

| Topic | When | Consumers |
|-------|------|-----------|
| `referral.reward_issued` | Both rewards successfully credited | Notification Svc (sends "You earned $10!" to both users) |
| `referral.reward_revoked` | Credits reversed after refund/fraud | Notification Svc (sends alert to both users) |
| `referral.credit_expired` | Daily expiry run completes | Notification Svc (sends "Your credits are expiring soon" warnings — 7 days before) |

### Consumer Implementation

```python
# infrastructure/kafka/consumers/order_paid_consumer.py

from confluent_kafka import Consumer

class OrderPaidConsumer:
    """
    Listens to order.paid topic.
    For each message, checks if the paying user is a referred user
    whose referral is still SIGNED_UP (i.e. hasn't been rewarded yet).
    """

    def handle(self, message: dict) -> None:
        user_id = message['user_id']
        order_id = message['order_id']
        order_value = Decimal(message['total_amount'])

        try:
            self.referral_service.complete_referral(user_id, order_id, order_value)
        except NoReferralFoundError:
            pass  # Normal — most orders are not from referrals
        except Exception as e:
            logger.error("referral_completion_failed", user_id=user_id, error=str(e))
            # Do NOT re-raise — referral failure must never block order completion
```

> **Critical rule:** Referral processing must **never throw an exception that blocks the order flow**. Wrap all referral Kafka consumers in try/except and log failures silently.

---

## 9. Checkout Integration (Order Service)

The Order Service must call Referral Service at checkout to apply credits:

```python
# In Order Service → services/order_service.py

def calculate_order_total(self, cart: Cart, coupon_code: str | None,
                           use_referral_credits: bool, user_id: str) -> OrderTotal:
    subtotal = self._calculate_subtotal(cart)
    discount = self._apply_coupon(coupon_code, subtotal)
    referral_deduction = Decimal('0')

    if use_referral_credits:
        available = self.referral_client.get_balance(user_id)   # REST call to Referral Svc
        config = self.referral_client.get_config()
        max_per_order = Decimal(config['max_credit_per_order'])
        referral_deduction = min(available, max_per_order, subtotal - discount)

    total = subtotal - discount - referral_deduction + self._calculate_shipping() + self._calculate_tax()
    return OrderTotal(
        subtotal=subtotal,
        discount=discount,
        referral_deduction=referral_deduction,
        total=max(total, Decimal('0'))  # Never negative
    )

def confirm_order(self, order_id: str) -> None:
    """After payment succeeds, debit the referral credits that were reserved."""
    order = self.order_repository.get(order_id)
    if order.referral_deduction > 0:
        self.referral_client.debit_credits(order.user_id, order.referral_deduction, order_id)
```

---

## 10. Frontend — Referral UI

### 10.1 Pages & Components

**Buyer Dashboard — Referral Tab (`/dashboard/referrals`)**

```
┌─────────────────────────────────────────────────────────┐
│  Your Referral Program                                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Your Code:  JOHN2024XK       [Copy] [Share ▼]  │   │
│  │  Link: platform.com/invite/JOHN2024XK            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  💰 Credit Balance: $20.00                              │
│  📊 7 Referrals Sent · 5 Rewarded · 2 Pending          │
│                                                         │
│  ─────────────────────────────────────────────          │
│  How it works:                                          │
│  1. Share your code with friends                        │
│  2. They sign up and place their first order ($25+)     │
│  3. You BOTH get $10 credit!                            │
│  ─────────────────────────────────────────────          │
│                                                         │
│  Recent Referrals                  Credit History       │
│  ────────────────                  ──────────────       │
│  Jane D.  ✅ Rewarded  +$10        [Earned] +$10        │
│  Bob K.   ⏳ Pending               [Earned] +$10        │
│  Sam P.   ✅ Rewarded  +$10        [Spent]  -$10        │
└─────────────────────────────────────────────────────────┘
```

**Checkout — Credits Toggle**
```
┌──────────────────────────────────────────────┐
│  Payment Summary                              │
│                                               │
│  Subtotal:           $85.00                   │
│  Shipping:           $5.00                    │
│  Discount (SAVE10):  -$8.50                   │
│                                               │
│  ☑ Apply referral credits  (-$20.00)          │
│    You have $20.00 available                  │
│                                               │
│  Total:              $61.50                   │
└──────────────────────────────────────────────┘
```

**Signup Page — Referral Code Field**
```
Already have a referral code?
[ JOHN2024XK        ] ✅ Valid code — you'll get $10 off your first order!
```

### 10.2 Share Options (Web Share API)

```typescript
const shareReferral = async (code: string, shareUrl: string) => {
  const text = `Join me on Platform and get $10 off your first order! Use my code ${code}`;

  if (navigator.share) {
    await navigator.share({ title: 'Join Platform', text, url: shareUrl });
  } else {
    // Fallback: show share buttons
    // WhatsApp: https://wa.me/?text=...
    // Copy to clipboard
  }
};
```

---

## 11. Admin Panel Features

- View all referrals platform-wide (filterable by status, date, referrer)
- View top referrers leaderboard
- Manually revoke a referral (with reason)
- Edit referral config values (reward amounts, min order, expiry days) live — no deployment needed
- View fraud/abuse flags (users whose referrals were rejected by AntiAbuseService)
- Export referral data as CSV

---

## 12. What the Coding Agent Must Build

### Backend Tasks
- [ ] `referral-service` Django project with full clean architecture
- [ ] PostgreSQL models: `Referral`, `ReferralWallet`, `ReferralCreditTransaction`, `ReferralIdentityClaim`, `ReferralConfig`
- [ ] `ReferralService` with full lifecycle management
- [ ] `WalletService` with atomic credit/debit using `SELECT FOR UPDATE`
- [ ] `RewardService` — issue and revoke rewards
- [ ] `ConfigService` — read rules from `referral_config` table (with Redis cache, 5-min TTL)
- [ ] `AntiAbuseService` — identity hash checking, self-referral detection
- [ ] All 10 API endpoints with auth and role enforcement
- [ ] Kafka consumer for `order.paid` → trigger `complete_referral`
- [ ] Kafka consumer for `order.refunded` → trigger `revoke_referral`
- [ ] Kafka consumer for `user.registered` → attach referee to referral record
- [ ] Kafka producers for `referral.reward_issued`, `referral.reward_revoked`, `referral.credit_expired`
- [ ] Celery beat task: daily credit expiry job (`expire_credits`)
- [ ] Celery beat task: 7-day-before-expiry warning emails
- [ ] REST client in Order Service to call Referral Service for balance + debit
- [ ] Unit tests for all service methods (especially WalletService atomic operations)
- [ ] Integration tests for the full referral lifecycle

### Frontend Tasks
- [ ] Referral dashboard tab in Buyer account (`/dashboard/referrals`)
- [ ] Referral code display + copy button + native share (Web Share API)
- [ ] Share buttons (WhatsApp, copy link)
- [ ] Referral history table (pending / rewarded / revoked)
- [ ] Credit wallet balance card with transaction history
- [ ] Checkout: referral credits toggle with live total recalculation
- [ ] Signup page: referral code input field with live validation (calls `GET /referrals/validate/{code}/`)
- [ ] Admin panel: referral management page with revoke action and config editor

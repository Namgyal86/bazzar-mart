# Payment Module — Specification

> **Merged into monolith** (2026-04-05): `payment-service` is now a module inside
> `services/api-monolith/src/modules/payments/`.
> Payments collection lives in the shared `bazzar_monolith` database.

> Module: `payments` | Location: `src/modules/payments/`
> Was: `payment-service` | Port: **8005**

---

## 1. Overview

The Payment Service is the **single source of truth** for all money movement on the platform. It integrates with **three Nepal-specific digital wallets** (Khalti, eSewa, Fonepay) and international card gateways. It handles initiation, verification, webhooks, refunds, and payout disbursement to sellers.

**Supported Payment Methods:**

| Method | Gateway | Currency | Users |
|--------|---------|----------|-------|
| Khalti Wallet | Khalti Digital Wallet | NPR | Nepal |
| eSewa Wallet | eSewa Pvt. Ltd. | NPR | Nepal |
| Fonepay QR / Wallet | Fonepay Network | NPR | Nepal |
| Credit / Debit Card | Stripe | USD / multi | International |
| UPI | Razorpay | INR | India |
| Cash on Delivery | — (internal) | NPR/USD | All |

---

## 2. Payment Lifecycle

```
Buyer selects payment method at checkout
              │
              ▼
POST /payments/initiate
              │
    ┌─────────┴──────────────────────────────┐
    │                                        │
Khalti / eSewa / Fonepay              Stripe / Razorpay
    │                                        │
initiate() → returns                  createPaymentIntent()
payment URL / QR code                 → returns client_secret
    │                                        │
Buyer redirected to                   Flutter Stripe SDK
gateway page / scans QR               handles card entry
    │                                        │
    └────────────┬───────────────────────────┘
                 │
        Gateway calls webhook
        POST /payments/webhook/:gateway
                 │
                 ▼
        verify() → confirm authenticity
                 │
         ┌───────┴───────┐
         │               │
      SUCCESS          FAILED
         │               │
  Publish                Publish
  payment.success        payment.failed
  to Kafka               to Kafka
         │
  Order Service confirms order
  Seller Service queues payout
```

---

## 3. MongoDB Schema (payment_db)

```typescript
// payments collection
{
  _id: ObjectId,
  orderId: String,             // unique — one payment attempt per order
  userId: String,
  amount: Number,              // in smallest unit (paisa for NPR, cents for USD)
  currency: 'NPR' | 'USD' | 'INR',
  method: 'KHALTI' | 'ESEWA' | 'FONEPAY' | 'CARD' | 'UPI' | 'COD',
  gateway: 'KHALTI' | 'ESEWA' | 'FONEPAY' | 'STRIPE' | 'RAZORPAY' | 'INTERNAL',

  // Gateway-specific IDs (populated after initiation)
  gatewayPaymentId: String,    // e.g. Khalti pidx, eSewa transaction_uuid
  gatewayOrderId: String,
  gatewayToken: String,        // Khalti token, eSewa token

  status: 'PENDING' | 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'EXPIRED',

  // Only set on success
  verifiedAt: Date,
  gatewayResponse: Object,     // Full raw response from gateway (for audit)

  // COD specific
  isCOD: Boolean,
  codCollectedAt: Date,

  failureReason: String,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
Indexes: { orderId: 1 (unique) }, { userId: 1 }, { status: 1 }

// refunds collection
{
  _id: ObjectId,
  paymentId: String,
  orderId: String,
  userId: String,
  amount: Number,
  reason: String,
  requestedBy: String,         // userId of ADMIN or BUYER
  gatewayRefundId: String,
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  completedAt: Date,
  createdAt: Date
}

// paymentAuditLog collection (immutable — never update, only insert)
{
  _id: ObjectId,
  paymentId: String,
  event: String,               // 'INITIATED' | 'WEBHOOK_RECEIVED' | 'VERIFIED' | 'FAILED' | 'REFUNDED'
  gatewayName: String,
  rawPayload: Object,          // Full webhook/API payload — for dispute resolution
  ipAddress: String,
  createdAt: Date
}
// No TTL — keep forever for compliance
```

---

## 4. API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/initiate` | BUYER | Start payment → returns gateway URL / QR / client_secret |
| POST | `/payments/webhook/khalti` | HMAC sig | Khalti payment notification |
| POST | `/payments/webhook/esewa` | eSewa sig | eSewa payment notification |
| POST | `/payments/webhook/fonepay` | Fonepay sig | Fonepay payment notification |
| POST | `/payments/webhook/stripe` | Stripe sig | Stripe payment notification |
| POST | `/payments/webhook/razorpay` | Razorpay sig | Razorpay payment notification |
| GET | `/payments/verify/khalti` | None | Khalti redirect verification (return URL) |
| GET | `/payments/verify/esewa` | None | eSewa redirect verification (return URL) |
| GET | `/payments/:id` | JWT | Payment status for order |
| POST | `/payments/:id/refund` | ADMIN | Issue refund |
| GET | `/admin/payments` | ADMIN | All payments (filter: gateway, status, date) |
| GET | `/admin/payments/stats` | ADMIN | Revenue by gateway, method, period |

---

## 5. Gateway Integrations

### 5.1 Khalti

**Docs:** https://docs.khalti.com/khalti-epayment/

Khalti uses an **ePay API** (server-to-server initiation + redirect flow).

```typescript
// services/gateways/khalti.gateway.ts

const KHALTI_BASE_URL = 'https://a.khalti.com/api/v2';   // Live
// Test: 'https://dev.khalti.com/api/v2'

export class KhaltiGateway {
  private headers = {
    Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  /**
   * Step 1: Initiate payment — returns pidx and payment_url
   * Buyer is redirected to payment_url to complete payment on Khalti.
   */
  async initiate(payload: KhaltiInitiatePayload): Promise<KhaltiInitiateResponse> {
    // payload shape:
    // {
    //   return_url: 'https://platform.com/payment/verify/khalti',
    //   website_url: 'https://platform.com',
    //   amount: 1000,           // in paisa (1 NPR = 100 paisa)
    //   purchase_order_id: orderId,
    //   purchase_order_name: 'Order #12345',
    //   customer_info: { name, email, phone }
    // }
    const res = await axios.post(`${KHALTI_BASE_URL}/epayment/initiate/`, payload, { headers: this.headers });
    // Returns: { pidx, payment_url, expires_at, expires_in }
    return res.data;
  }

  /**
   * Step 2: Verify payment after buyer returns from Khalti
   * Called when buyer is redirected back to return_url with ?pidx=...
   */
  async verify(pidx: string): Promise<KhaltiVerifyResponse> {
    const res = await axios.post(
      `${KHALTI_BASE_URL}/epayment/lookup/`,
      { pidx },
      { headers: this.headers }
    );
    // Returns: { pidx, total_amount, status, transaction_id, fee, refunded }
    // status === 'Completed' means SUCCESS
    return res.data;
  }

  /**
   * Step 3 (optional): Webhook — Khalti may POST to your webhook URL.
   * Always VERIFY using lookup() — never trust webhook payload alone.
   */
  verifyWebhookSignature(payload: string, receivedSig: string): boolean {
    const expected = crypto
      .createHmac('sha256', process.env.KHALTI_WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSig));
  }
}

// Khalti status map → internal status
const KHALTI_STATUS_MAP: Record<string, string> = {
  Completed: 'SUCCESS',
  Pending: 'PENDING',
  Initiated: 'INITIATED',
  Refunded: 'REFUNDED',
  Expired: 'EXPIRED',
  'User canceled': 'FAILED',
  Partially_Refunded: 'PARTIALLY_REFUNDED',
};
```

**Flutter integration (buyer_app):**
```dart
// Open Khalti payment URL in in-app WebView or external browser
// Then listen for deep link redirect back to app with ?pidx=...

final url = paymentInitResponse['data']['paymentUrl'];
await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);

// Handle return deep link in go_router:
// Route: /payment/verify?gateway=khalti&pidx=xxx&status=Completed
```

---

### 5.2 eSewa

**Docs:** https://developer.esewa.com.np/

eSewa uses a **form POST redirect** flow with HMAC-SHA256 signature verification.

```typescript
// services/gateways/esewa.gateway.ts

const ESEWA_BASE_URL = 'https://epay.esewa.com.np/api/v1';   // Live
// Test: 'https://uat.esewa.com.np/api/v1'

export class ESewaGateway {
  private readonly productCode = process.env.ESEWA_PRODUCT_CODE!;   // e.g. 'EPAYTEST'
  private readonly secretKey = process.env.ESEWA_SECRET_KEY!;

  /**
   * Step 1: Generate signed payment form fields.
   * The frontend POSTs these fields to eSewa's form endpoint.
   * eSewa redirects buyer to their payment page.
   */
  generateFormFields(params: ESewaFormParams): ESewaFormFields {
    const { amount, taxAmount = 0, productId, orderId } = params;
    const totalAmount = amount + taxAmount;

    // HMAC-SHA256 signature: "total_amount,transaction_uuid,product_code"
    const message = `total_amount=${totalAmount},transaction_uuid=${orderId},product_code=${this.productCode}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');

    return {
      amount: amount.toString(),
      tax_amount: taxAmount.toString(),
      total_amount: totalAmount.toString(),
      transaction_uuid: orderId,
      product_code: this.productCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: `${process.env.APP_BASE_URL}/payment/verify/esewa`,
      failure_url: `${process.env.APP_BASE_URL}/payment/failed`,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
      // POST these to: https://epay.esewa.com.np/api/v1/desktop/payments/init-payment (form POST)
    };
  }

  /**
   * Step 2: Verify payment after eSewa redirects back.
   * eSewa returns a base64-encoded JSON in ?data= query param.
   */
  async verifyPayment(encodedData: string): Promise<ESewaVerifyResponse> {
    const decoded = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf-8'));
    // decoded contains: transaction_code, status, total_amount, transaction_uuid,
    //                   product_code, signed_field_names, signature

    // Re-verify signature
    const message = decoded.signed_field_names
      .split(',')
      .map((f: string) => `${f}=${decoded[f]}`)
      .join(',');
    const expectedSig = crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');

    if (expectedSig !== decoded.signature) {
      throw new Error('eSewa signature verification failed');
    }

    // Server-side status check
    const res = await axios.get(`${ESEWA_BASE_URL}/transaction/status/`, {
      params: {
        product_code: this.productCode,
        total_amount: decoded.total_amount,
        transaction_uuid: decoded.transaction_uuid,
      },
    });
    // Returns: { product_code, transaction_uuid, total_amount, status, ref_id }
    return res.data;
  }
}

const ESEWA_STATUS_MAP: Record<string, string> = {
  COMPLETE: 'SUCCESS',
  PENDING: 'PENDING',
  FULL_REFUND: 'REFUNDED',
  PARTIAL_REFUND: 'PARTIALLY_REFUNDED',
  AMBIGUOUS: 'FAILED',
  NOT_FOUND: 'FAILED',
  CANCELED: 'FAILED',
};
```

**Flutter integration (buyer_app):**
```dart
// eSewa uses a form POST — open their hosted page via URL with query params,
// or use the official esewa_flutter_sdk package:

// pubspec.yaml: esewa_flutter_sdk: ^2.0.0

final config = ESewaConfig.live(     // or .dev() for testing
  clientId: Env.esewaProductCode,
  secretId: Env.esewaSecretKey,
);
final payment = ESewaPayment(
  productId: orderId,
  productName: 'Order #$orderNumber',
  productPrice: amount.toString(),
  callbackUrl: 'https://platform.com/payment/verify/esewa',
);
await ESewaFlutter.open(context, config: config, payment: payment,
  onPaymentSuccess: (result) { /* verify on backend */ },
  onPaymentFailure: (result) { /* show error */ },
  onPaymentCancelled: (result) { /* handle cancel */ },
);
```

---

### 5.3 Fonepay

**Docs:** https://developer.fonepay.com/

Fonepay uses QR code scanning or deep-link redirect. Primarily a **bank network** — supports 45+ Nepali banks.

```typescript
// services/gateways/fonepay.gateway.ts

const FONEPAY_BASE_URL = 'https://dev.fonepay.com/api/merchant';  // Live: fonepay.com
// Note: Fonepay requires merchant registration through a partner bank.

export class FonepayGateway {
  private readonly merchantCode = process.env.FONEPAY_MERCHANT_CODE!;
  private readonly secretKey = process.env.FONEPAY_SECRET_KEY!;
  private readonly username = process.env.FONEPAY_USERNAME!;
  private readonly password = process.env.FONEPAY_PASSWORD!;

  /**
   * Step 1: Initiate payment — returns QR code URL and PRN (Payment Reference Number)
   */
  async initiate(params: FonepayInitiateParams): Promise<FonepayInitiateResponse> {
    const { amount, orderId, remarks } = params;

    // Fonepay signature: MD5 hash of concatenated values
    const signatureString = `${this.merchantCode},${amount},${orderId},${remarks1},${remarks2},${this.secretKey}`;
    const dv = crypto.createHash('md5').update(signatureString).digest('hex').toUpperCase();

    const res = await axios.post(`${FONEPAY_BASE_URL}/merchantbankpayment`, {
      PID: this.merchantCode,
      MD: 'P',                    // Payment mode: P = payment
      AMT: amount.toFixed(2),
      CRN: 'NPR',
      DT: new Date().toLocaleDateString('en-GB'),   // DD/MM/YYYY
      R1: orderId,
      R2: remarks || 'Platform Order',
      DV: dv,
      PRN: orderId,               // Payment Reference Number (your unique ID)
      RU: `${process.env.APP_BASE_URL}/payment/verify/fonepay`,   // Return URL
    });

    return res.data;
    // Returns: { PRN, QR_MESSAGE (base64 QR), payment_url, ... }
  }

  /**
   * Step 2: Verify payment using PRN after redirect
   */
  async verify(prn: string, bankRefNo: string, successStatus: string): Promise<FonepayVerifyResponse> {
    const signatureString = `${prn},${successStatus},${bankRefNo},${this.username},${this.password}`;
    const dv = crypto.createHash('md5').update(signatureString).digest('hex').toUpperCase();

    const res = await axios.get(`${FONEPAY_BASE_URL}/merchantbankpayment/verify`, {
      params: { PRN: prn, BID: bankRefNo, UID: successStatus, DV: dv },
    });
    // Returns: { success: true/false, PRN, merchantcode, amount, ... }
    return res.data;
  }
}
```

**Flutter integration (buyer_app):**
```dart
// Fonepay: display QR or redirect to payment URL
// Option 1: QR in app (buyer scans with their bank app)
// Option 2: open_fonepay deep link for direct Fonepay app launch

// Show QR widget:
QrImageView(
  data: fonepayQrData,     // QR_MESSAGE from initiate response
  version: QrVersions.auto,
  size: 250.0,
)

// OR redirect:
await launchUrl(Uri.parse(fonepayPaymentUrl));
```

---

### 5.4 Stripe (International Cards)

```typescript
// services/gateways/stripe.gateway.ts
import Stripe from 'stripe';

export class StripeGateway {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

  async createPaymentIntent(amount: number, currency: string, orderId: string) {
    return this.stripe.paymentIntents.create({
      amount,                      // in cents / smallest currency unit
      currency,
      metadata: { orderId },
      automatic_payment_methods: { enabled: true },
    });
    // Returns { client_secret } — sent to Flutter Stripe SDK
  }

  verifyWebhook(payload: Buffer, sig: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  }
}
```

---

## 6. PaymentService — Unified Orchestrator

```typescript
// services/payment.service.ts

export class PaymentService {
  constructor(
    private repo: PaymentRepository,
    private khalti: KhaltiGateway,
    private esewa: ESewaGateway,
    private fonepay: FonepayGateway,
    private stripe: StripeGateway,
    private kafka: KafkaProducer,
    private auditLogger: AuditLogger,
  ) {}

  async initiatePayment(orderId: string, userId: string, method: PaymentMethod, amount: number): Promise<InitiateResult> {
    // Idempotency: return existing if PENDING payment already exists for this order
    const existing = await this.repo.findByOrderId(orderId);
    if (existing && existing.status === 'INITIATED') return this.resumePayment(existing);

    const payment = await this.repo.create({ orderId, userId, amount, method, status: 'INITIATED' });
    await this.auditLogger.log(payment._id, 'INITIATED', method, {});

    switch (method) {
      case 'KHALTI': {
        const res = await this.khalti.initiate({ amount: amount * 100, purchase_order_id: orderId, ... });
        await this.repo.update(payment._id, { gatewayPaymentId: res.pidx });
        return { type: 'REDIRECT', url: res.payment_url, paymentId: payment._id };
      }
      case 'ESEWA': {
        const fields = this.esewa.generateFormFields({ amount, orderId });
        return { type: 'FORM_POST', fields, paymentId: payment._id };
      }
      case 'FONEPAY': {
        const res = await this.fonepay.initiate({ amount, orderId });
        return { type: 'QR', qrData: res.QR_MESSAGE, paymentUrl: res.payment_url, paymentId: payment._id };
      }
      case 'CARD': {
        const intent = await this.stripe.createPaymentIntent(amount, 'usd', orderId);
        return { type: 'STRIPE_INTENT', clientSecret: intent.client_secret, paymentId: payment._id };
      }
      case 'COD': {
        await this.repo.update(payment._id, { status: 'SUCCESS', isCOD: true });
        await this.publishSuccess(payment._id, orderId, userId, amount, 'COD');
        return { type: 'COD_CONFIRMED', paymentId: payment._id };
      }
    }
  }

  async verifyKhalti(pidx: string): Promise<void> {
    const verifyRes = await this.khalti.verify(pidx);
    const payment = await this.repo.findByGatewayId(pidx);
    await this.auditLogger.log(payment._id, 'VERIFIED', 'KHALTI', verifyRes);

    if (verifyRes.status === 'Completed') {
      await this.repo.update(payment._id, {
        status: 'SUCCESS',
        gatewayToken: verifyRes.transaction_id,
        gatewayResponse: verifyRes,
        verifiedAt: new Date(),
      });
      await this.publishSuccess(payment._id, payment.orderId, payment.userId, payment.amount, 'KHALTI');
    } else {
      await this.handleFailure(payment._id, payment.orderId, verifyRes.status);
    }
  }

  async verifyESewa(encodedData: string): Promise<void> {
    const verifyRes = await this.esewa.verifyPayment(encodedData);
    const payment = await this.repo.findByOrderId(verifyRes.transaction_uuid);
    await this.auditLogger.log(payment._id, 'VERIFIED', 'ESEWA', verifyRes);

    if (verifyRes.status === 'COMPLETE') {
      await this.repo.update(payment._id, { status: 'SUCCESS', gatewayResponse: verifyRes, verifiedAt: new Date() });
      await this.publishSuccess(payment._id, payment.orderId, payment.userId, payment.amount, 'ESEWA');
    } else {
      await this.handleFailure(payment._id, payment.orderId, verifyRes.status);
    }
  }

  private async publishSuccess(paymentId: string, orderId: string, userId: string, amount: number, gateway: string) {
    await this.kafka.publish('payment.success', { paymentId, orderId, userId, amount, gateway });
  }

  private async handleFailure(paymentId: string, orderId: string, reason: string) {
    await this.repo.update(paymentId, { status: 'FAILED', failureReason: reason });
    await this.kafka.publish('payment.failed', { paymentId, orderId, reason });
  }
}
```

---

## 7. Webhook Security — All Gateways

| Gateway | Verification Method |
|---------|-------------------|
| **Khalti** | HMAC-SHA256 on raw body using `KHALTI_WEBHOOK_SECRET` |
| **eSewa** | HMAC-SHA256 signature on `signed_field_names` fields |
| **Fonepay** | MD5 hash of PRN + status + bankRefNo + credentials |
| **Stripe** | `stripe.webhooks.constructEvent()` with signing secret |
| **Razorpay** | HMAC-SHA256 of `orderId|paymentId` with secret |

**Rule:** Always verify server-side after any gateway redirect or webhook — never trust the redirect params alone.

---

## 8. Refund Logic

```typescript
async processRefund(paymentId: string, amount: number, reason: string): Promise<void> {
  const payment = await this.repo.findById(paymentId);
  if (payment.status !== 'SUCCESS') throw new ConflictError('Can only refund successful payments');

  switch (payment.gateway) {
    case 'KHALTI':
      // Khalti refund API: POST /epayment/refund/ with { pidx, amount (paisa) }
      await this.khalti.refund(payment.gatewayPaymentId, amount * 100);
      break;
    case 'ESEWA':
      // eSewa: refunds via merchant dashboard only — no API (as of 2025)
      // Log for manual processing
      await this.flagForManualRefund(paymentId, amount, 'ESEWA_MANUAL');
      break;
    case 'FONEPAY':
      // Fonepay: refund via reverse transaction API
      await this.fonepay.refund(payment.gatewayPaymentId, amount);
      break;
    case 'CARD':
      await this.stripe.createRefund(payment.gatewayPaymentId, amount);
      break;
  }

  await this.repo.createRefund({ paymentId, amount, reason, status: 'PROCESSING' });
  await this.kafka.publish('payment.refunded', { paymentId, orderId: payment.orderId, amount });
}
```

---

## 9. Environment Variables

```env
# Khalti
KHALTI_SECRET_KEY=live_secret_key_xxxxxxxxxxxxxxxxxxxxxxxx
KHALTI_WEBHOOK_SECRET=webhook_secret_xxx
KHALTI_BASE_URL=https://a.khalti.com/api/v2

# eSewa
ESEWA_PRODUCT_CODE=EPAYTEST       # Live: your merchant code from eSewa
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q  # From eSewa merchant dashboard
ESEWA_BASE_URL=https://epay.esewa.com.np/api/v1

# Fonepay
FONEPAY_MERCHANT_CODE=MERCHANTCODE
FONEPAY_SECRET_KEY=fonepay_secret
FONEPAY_USERNAME=fonepay_username
FONEPAY_PASSWORD=fonepay_password
FONEPAY_BASE_URL=https://fonepay.com/api/merchant

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxx

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=razorpay_secret
```

---

## 10. Flutter Payment Flow (buyer_app)

```dart
// lib/features/payment/payment_repository.dart

class PaymentRepository {
  final ApiClient _api;

  Future<PaymentInitiateResult> initiatePayment({
    required String orderId,
    required String method,   // 'KHALTI' | 'ESEWA' | 'FONEPAY' | 'CARD' | 'COD'
    required double amount,
  }) async {
    final res = await _api.post('/payments/initiate', data: {
      'orderId': orderId,
      'method': method,
      'amount': amount,
    });
    return PaymentInitiateResult.fromJson(res['data']);
  }
}

// lib/features/payment/payment_screen.dart
// Show appropriate UI per method type:

switch (result.type) {
  case 'REDIRECT':              // Khalti, Fonepay
    await launchUrl(Uri.parse(result.url!));
    // Listen for deep link return
  case 'FORM_POST':             // eSewa
    await ESewaFlutter.open(context, fields: result.fields!);
  case 'QR':                    // Fonepay QR
    showQRDialog(context, result.qrData!);
  case 'STRIPE_INTENT':         // Card
    await _handleStripePayment(result.clientSecret!);
  case 'COD_CONFIRMED':
    _navigateToOrderSuccess();
}
```

---

## 11. What the Coding Agent Must Build

- [ ] `payment-service` Node.js/Express/TypeScript project
- [ ] MongoDB models: `Payment`, `Refund`, `PaymentAuditLog`
- [ ] `KhaltiGateway` — initiate, verify (lookup), webhook verify, refund
- [ ] `ESewaGateway` — form field generation, signature, redirect verify, status check
- [ ] `FonepayGateway` — initiate (QR + URL), MD5 verify, reverse refund
- [ ] `StripeGateway` — PaymentIntent, webhook, refund
- [ ] `RazorpayGateway` — order create, webhook verify, refund
- [ ] `PaymentService` — unified orchestrator (all 5 gateways + COD)
- [ ] `AuditLogger` — immutable log of every gateway event
- [ ] All API endpoints including 5 webhook receivers
- [ ] Webhook signature verification middleware (per gateway)
- [ ] Idempotency guard (no duplicate charges for same orderId)
- [ ] Kafka producers: `payment.success`, `payment.failed`, `payment.refunded`
- [ ] Flutter: `PaymentRepository`, `PaymentScreen` with method-specific UI
- [ ] Flutter: deep link handling for Khalti / eSewa redirect return
- [ ] Unit tests for each gateway's verify() and signature checks
- [ ] Integration tests for full initiate → webhook → publish flow

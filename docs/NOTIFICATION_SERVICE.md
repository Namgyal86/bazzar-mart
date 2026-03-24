# Notification Service — Full Specification

> Service: `notification-service` | Port: **8008**
> Database: MongoDB `notification_db`
> This service is a **pure Kafka consumer** — it never receives HTTP calls from other services directly.

---

## 1. Overview

The Notification Service listens to Kafka events and dispatches **Email**, **SMS**, and **FCM Push** notifications to the correct users. It maintains delivery logs and respects user notification preferences.

**Channels:**
| Channel | Provider |
|---------|---------|
| Email | SendGrid (primary) / Nodemailer (fallback) |
| SMS | Sparrow SMS (Nepal) / Twilio (international) |
| Push | Firebase Cloud Messaging (FCM) — all 4 Flutter apps |

---

## 2. MongoDB Schema (notification_db)

```typescript
// notificationLogs collection
{
  _id: ObjectId,
  userId: String,
  channel: 'EMAIL' | 'SMS' | 'PUSH',
  eventType: String,              // e.g. 'ORDER_CONFIRMED', 'DELIVERY_ASSIGNED'
  recipient: String,              // email, phone, or FCM token
  subject: String,                // Email only
  body: String,
  templateId: String,             // Which template was used
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED',
  errorMessage: String,
  externalMessageId: String,      // SendGrid/Twilio message ID for tracking
  sentAt: Date,
  createdAt: Date
}
Indexes: { userId: 1 }, { eventType: 1 }, { status: 1, createdAt: -1 }
TTL index: { createdAt: 1 } expireAfterSeconds: 7776000  // 90 days

// userNotificationPreferences collection
{
  _id: ObjectId,
  userId: String,                 // unique
  emailEnabled: Boolean,          // default true
  smsEnabled: Boolean,            // default true
  pushEnabled: Boolean,           // default true
  // Per-event overrides
  preferences: {
    ORDER_CONFIRMED:   { email: true, sms: true, push: true },
    DELIVERY_ASSIGNED: { email: false, sms: true, push: true },
    REFERRAL_REWARD:   { email: true, sms: false, push: true },
    // ... etc
  },
  updatedAt: Date
}
```

---

## 3. Kafka Events → Notification Map

| Kafka Topic | eventType | EMAIL | SMS | PUSH | Recipients |
|-------------|-----------|-------|-----|------|------------|
| `user.registered` | USER_REGISTERED | ✅ Welcome | ❌ | ✅ | Buyer |
| `order.created` | ORDER_CREATED | ✅ | ✅ | ✅ | Buyer |
| `order.confirmed` | ORDER_CONFIRMED | ✅ | ✅ | ✅ | Buyer |
| `order.status_changed` | ORDER_SHIPPED | ✅ | ❌ | ✅ | Buyer |
| `order.status_changed` | ORDER_DELIVERED | ✅ | ✅ | ✅ | Buyer |
| `payment.success` | PAYMENT_SUCCESS | ✅ Receipt | ❌ | ✅ | Buyer |
| `payment.failed` | PAYMENT_FAILED | ✅ | ✅ | ✅ | Buyer |
| `delivery.assigned` | DELIVERY_ASSIGNED | ❌ | ✅ | ✅ | Buyer |
| `delivery.picked_up` | DELIVERY_PICKED_UP | ❌ | ❌ | ✅ | Buyer |
| `delivery.completed` | DELIVERY_COMPLETED | ✅ | ✅ | ✅ | Buyer |
| `delivery.failed` | DELIVERY_FAILED | ✅ | ✅ | ✅ | Buyer |
| `delivery.new_assignment` | NEW_DELIVERY_TASK | ❌ | ❌ | ✅ | Delivery Agent |
| `seller.approved` | SELLER_APPROVED | ✅ | ✅ | ✅ | Seller |
| `seller.payout_processed` | PAYOUT_PROCESSED | ✅ | ✅ | ❌ | Seller |
| `referral.reward_issued` | REFERRAL_REWARD | ✅ | ❌ | ✅ | Buyer (both) |
| `referral.credit_expired` | CREDIT_EXPIRING | ✅ | ❌ | ✅ | Buyer |
| `inventory.updated` | BACK_IN_STOCK | ✅ | ❌ | ✅ | Wishlist users |
| `review.posted` | REVIEW_POSTED | ✅ | ❌ | ❌ | Seller |

---

## 4. Service Implementation

```typescript
// services/notification.service.ts

export class NotificationService {
  constructor(
    private email: EmailProvider,
    private sms: SMSProvider,
    private push: FCMProvider,
    private repo: NotificationRepository,
    private prefRepo: PreferenceRepository,
  ) {}

  async dispatch(event: NotificationEvent): Promise<void> {
    const prefs = await this.prefRepo.getOrDefault(event.userId);
    const tasks: Promise<void>[] = [];

    if (event.channels.email && prefs.emailEnabled && prefs.preferences[event.type]?.email !== false) {
      tasks.push(this.sendEmail(event, prefs));
    }
    if (event.channels.sms && prefs.smsEnabled && prefs.preferences[event.type]?.sms !== false) {
      tasks.push(this.sendSMS(event, prefs));
    }
    if (event.channels.push && prefs.pushEnabled && prefs.preferences[event.type]?.push !== false) {
      tasks.push(this.sendPush(event));
    }

    await Promise.allSettled(tasks);   // Never fail — one channel error shouldn't block others
  }
}
```

---

## 5. Providers

### Email — SendGrid
```typescript
// providers/email.provider.ts
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

await sgMail.send({
  to: recipient,
  from: { email: 'noreply@platform.com', name: 'Platform' },
  templateId: process.env[`SENDGRID_TEMPLATE_${eventType}`],
  dynamicTemplateData: templateData,    // Filled per event
});
```

### SMS — Sparrow SMS (Nepal)
```typescript
// providers/sms.provider.ts — Sparrow SMS for Nepali numbers
// Docs: https://doc.sparrowsms.com

await axios.post('https://api.sparrowsms.com/v2/sms/', {
  token: process.env.SPARROW_SMS_TOKEN,
  identity: process.env.SPARROW_IDENTITY,   // Sender name
  to: phoneNumber,                          // +977XXXXXXXXXX
  text: message,
}, { headers: { 'Content-Type': 'application/json' } });

// Fallback: Twilio for international numbers
```

### Push — Firebase Cloud Messaging
```typescript
// providers/fcm.provider.ts
import admin from 'firebase-admin';

await admin.messaging().send({
  token: fcmToken,                    // From user's device (stored in user_db)
  notification: { title, body },
  data: { orderId, type: eventType }, // Deep link payload for Flutter app
  android: { priority: 'high' },
  apns: { payload: { aps: { sound: 'default' } } },
});
```

---

## 6. API Endpoints (user-facing only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | JWT | Paginated notification list |
| PATCH | `/notifications/:id/read` | JWT | Mark read |
| PATCH | `/notifications/read-all` | JWT | Mark all read |
| GET | `/notifications/preferences` | JWT | Get preferences |
| PUT | `/notifications/preferences` | JWT | Update preferences |

---

## 7. Agent Build Checklist

- [ ] `notification-service` Node.js project (consumer only — no routes except user prefs)
- [ ] MongoDB models: `NotificationLog`, `UserNotificationPreferences`
- [ ] `NotificationService` dispatcher with preference checking
- [ ] `EmailProvider` — SendGrid with dynamic templates per eventType
- [ ] `SMSProvider` — Sparrow SMS (Nepal) + Twilio fallback
- [ ] `FCMProvider` — Firebase Admin SDK
- [ ] Kafka consumers for all 18 event types listed above
- [ ] BullMQ retry queue — failed notifications retry 3x with exponential backoff
- [ ] User preferences API endpoints
- [ ] SendGrid template IDs for every event (defined in env vars)
- [ ] Unit tests for dispatcher preference logic

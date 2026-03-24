# Delivery Service — Full Specification

> Service: `delivery-service` | Port: **8013**
> Actor: **Delivery Guy** (role: `DELIVERY` in JWT)
> This is a new actor and service. Read `NODE_ARCHITECTURE.md` first for code patterns.

---

## 1. Overview

The Delivery Service manages the complete last-mile delivery lifecycle:
- Assigning deliveries to available delivery agents
- Real-time GPS tracking via Socket.io (streamed from delivery app)
- Delivery status updates (picked up → in transit → delivered / failed)
- Proof of delivery (photo upload)
- Delivery agent management (onboarding, ratings, earnings)

---

## 2. Delivery Lifecycle

```
ORDER_CONFIRMED (Kafka)
        │
        ▼
Delivery Service creates DeliveryTask (status: PENDING)
        │
        ▼
Assignment Engine → finds nearest available agent
        │
   ┌────┴────────────────────────┐
   │  Auto-assign (if available) │  OR  │ Manual accept by agent │
   └────────────────────────────┘       └────────────────────────┘
        │
        ▼
Status: ASSIGNED → Agent notified via FCM push + Socket.io
        │
        ▼
Agent picks up from seller/warehouse
Status: PICKED_UP → Buyer notified
        │
        ▼
Agent en route — GPS streamed every 5s via Socket.io
Status: IN_TRANSIT → Live map shown to buyer
        │
   ┌────┴─────────────────────────┐
   │  Delivered (photo proof)      │  OR  │ Failed (reason) │
   └───────────────────────────────┘       └─────────────────┘
        │
        ▼
Status: DELIVERED
Kafka → ORDER_DELIVERED → Order Service updates order
Kafka → DELIVERY_COMPLETED → Notification Svc alerts buyer
        │
        ▼
Agent earnings recorded, rating prompt sent to buyer
```

---

## 3. MongoDB Schema (delivery_db)

```typescript
// models/deliveryAgent.model.ts
interface IDeliveryAgent {
  _id: ObjectId;
  userId: string;            // FK → User Service (role: DELIVERY)
  name: string;
  phone: string;
  profilePhotoUrl?: string;
  vehicleType: 'BIKE' | 'SCOOTER' | 'CAR' | 'VAN';
  vehicleNumber: string;
  licenseNumber: string;
  status: 'OFFLINE' | 'AVAILABLE' | 'ON_DELIVERY';
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number];   // [lng, lat]
    updatedAt: Date;
  };
  rating: number;            // Average, e.g. 4.7
  totalDeliveries: number;
  totalEarnings: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Index for geo-based nearest-agent query
DeliveryAgentSchema.index({ currentLocation: '2dsphere' });
DeliveryAgentSchema.index({ status: 1 });

// models/deliveryTask.model.ts
interface IDeliveryTask {
  _id: ObjectId;
  orderId: string;           // FK → Order Service
  buyerId: string;
  sellerId: string;
  agentId?: string;          // Set when assigned
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  pickupAddress: IAddress;
  deliveryAddress: IAddress;
  deliveryInstructions?: string;
  estimatedDistance: number; // km
  estimatedDuration: number; // minutes
  assignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  proofOfDeliveryUrl?: string;  // S3 URL of photo
  agentEarning: number;
  buyerRating?: number;        // 1–5, submitted after delivery
  createdAt: Date;
  updatedAt: Date;
}

// models/locationHistory.model.ts  (time-series — consider TTL index)
interface ILocationHistory {
  _id: ObjectId;
  deliveryTaskId: string;
  agentId: string;
  coordinates: [number, number];
  timestamp: Date;
}
// TTL index: delete after 30 days
LocationHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// models/agentEarning.model.ts
interface IAgentEarning {
  _id: ObjectId;
  agentId: string;
  deliveryTaskId: string;
  orderId: string;
  amount: number;
  status: 'PENDING' | 'PAID';
  paidAt?: Date;
  createdAt: Date;
}
```

---

## 4. API Endpoints

### 4.1 Delivery Agent Auth & Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/delivery/auth/register` | None | Agent self-registration (pending admin approval) |
| POST | `/delivery/auth/login` | None | Login → returns JWT with role: DELIVERY |
| GET | `/delivery/me` | DELIVERY | Get own profile |
| PATCH | `/delivery/me` | DELIVERY | Update profile (vehicle, photo) |
| PATCH | `/delivery/me/status` | DELIVERY | Go ONLINE / OFFLINE |
| GET | `/delivery/me/earnings` | DELIVERY | Earnings history + total |
| GET | `/delivery/me/history` | DELIVERY | Past delivery tasks |

### 4.2 Delivery Task Management (Agent)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/delivery/tasks/active` | DELIVERY | Get currently assigned task |
| POST | `/delivery/tasks/:id/accept` | DELIVERY | Accept a pending task |
| POST | `/delivery/tasks/:id/reject` | DELIVERY | Reject a task (reassigns to another agent) |
| POST | `/delivery/tasks/:id/pickup` | DELIVERY | Mark as picked up from seller |
| POST | `/delivery/tasks/:id/deliver` | DELIVERY | Mark as delivered (+ photo upload) |
| POST | `/delivery/tasks/:id/fail` | DELIVERY | Mark delivery failed (with reason) |

### 4.3 Buyer — Track Delivery

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/delivery/track/:orderId` | BUYER (JWT) | Get delivery status + agent info |
| POST | `/delivery/:taskId/rate` | BUYER (JWT) | Rate the delivery agent (1–5) |

### 4.4 Admin — Delivery Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/delivery/agents` | ADMIN | List all agents (filter by status, city) |
| GET | `/admin/delivery/agents/:id` | ADMIN | Agent detail + stats |
| PATCH | `/admin/delivery/agents/:id/verify` | ADMIN | Approve / suspend agent |
| GET | `/admin/delivery/tasks` | ADMIN | All delivery tasks (filter by status/date) |
| POST | `/admin/delivery/tasks/:id/reassign` | ADMIN | Manually reassign a task |
| GET | `/admin/delivery/earnings` | ADMIN | Payout management |
| POST | `/admin/delivery/earnings/payout` | ADMIN | Trigger batch payout |

---

## 5. Real-time — Socket.io Events

The Delivery Service runs a Socket.io server **alongside** the Express HTTP server on the same port.

### 5.1 Connection & Rooms

```typescript
// Rooms strategy:
// - Delivery agent joins room:  `agent:{agentId}`
// - Buyer joins room:           `order:{orderId}`
// - Admin joins room:           `admin:dashboard`

io.use(authenticateSocket);   // Verify JWT on every connection

io.on('connection', (socket) => {
  const { role, sub: userId } = socket.user;

  if (role === 'DELIVERY') {
    socket.join(`agent:${userId}`);
  } else if (role === 'BUYER') {
    // Buyer joins order room when they open tracking page
    socket.on('track:join', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });
  } else if (role === 'ADMIN') {
    socket.join('admin:dashboard');
  }
});
```

### 5.2 Events Reference

| Direction | Event Name | Payload | Description |
|-----------|-----------|---------|-------------|
| Agent → Server | `delivery:location_update` | `{ deliveryTaskId, lat, lng, timestamp }` | Agent streams GPS every 5s |
| Server → Buyer | `delivery:location_broadcast` | `{ lat, lng, estimatedArrival, timestamp }` | Forward agent GPS to buyer |
| Server → Agent | `delivery:new_assignment` | `{ taskId, pickupAddress, deliveryAddress, orderSummary }` | Push new task to agent |
| Agent → Server | `delivery:status_update` | `{ taskId, status }` | PICKED_UP / IN_TRANSIT update |
| Server → Buyer | `delivery:status_changed` | `{ status, message, timestamp }` | Notify buyer of status change |
| Server → Admin | `delivery:agent_online` | `{ agentId, location }` | Agent comes online |
| Server → Admin | `delivery:live_stats` | `{ activeDeliveries, onlineAgents }` | Live dashboard stats |

### 5.3 Location Update Handler

```typescript
// kafka/consumers/locationUpdate.consumer.ts is NOT used for GPS —
// Socket.io handles GPS directly for minimal latency.
// Only FINAL status changes (DELIVERED, FAILED) are published to Kafka.

socket.on('delivery:location_update', async (data) => {
  const { deliveryTaskId, lat, lng } = data;

  // 1. Update agent's currentLocation in MongoDB (upsert)
  await DeliveryAgent.findByIdAndUpdate(socket.user.sub, {
    currentLocation: { type: 'Point', coordinates: [lng, lat], updatedAt: new Date() }
  });

  // 2. Append to locationHistory (time-series)
  await LocationHistory.create({ deliveryTaskId, agentId: socket.user.sub, coordinates: [lng, lat], timestamp: new Date() });

  // 3. Forward to buyer's room
  const task = await DeliveryTaskRepository.findById(deliveryTaskId);
  io.to(`order:${task.orderId}`).emit('delivery:location_broadcast', {
    lat, lng,
    estimatedArrival: await calculateETA(lat, lng, task.deliveryAddress),
    timestamp: new Date().toIso8601String(),
  });
});
```

---

## 6. Assignment Engine

```typescript
// services/assignment.service.ts

class AssignmentService {
  /**
   * Find the nearest AVAILABLE delivery agent to the pickup address.
   * Uses MongoDB $geoNear aggregation.
   * Falls back to any available agent in the city if no agent within 5km.
   */
  async findNearestAgent(pickupCoords: [number, number]): Promise<IDeliveryAgent | null> {
    const [lng, lat] = pickupCoords;
    const agents = await DeliveryAgent.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          maxDistance: 5000,        // 5km radius
          query: { status: 'AVAILABLE', isActive: true, isVerified: true },
          spherical: true,
        }
      },
      { $limit: 1 }
    ]);
    return agents[0] ?? null;
  }

  async assignTask(taskId: string): Promise<void> {
    const task = await DeliveryTaskRepository.findById(taskId);
    const agent = await this.findNearestAgent(task.pickupAddress.coordinates);

    if (!agent) {
      // No agent available — retry via BullMQ after 2 minutes
      await assignmentQueue.add('retry-assignment', { taskId }, { delay: 120_000 });
      return;
    }

    // Atomic: set agent status to ON_DELIVERY, set task to ASSIGNED
    await Promise.all([
      DeliveryAgent.findByIdAndUpdate(agent._id, { status: 'ON_DELIVERY' }),
      DeliveryTask.findByIdAndUpdate(taskId, {
        agentId: agent._id,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      }),
    ]);

    // Push to agent's Socket.io room
    io.to(`agent:${agent.userId}`).emit('delivery:new_assignment', {
      taskId,
      pickupAddress: task.pickupAddress,
      deliveryAddress: task.deliveryAddress,
    });

    // FCM push notification to delivery app
    await fcm.send({ token: agent.fcmToken, notification: { title: 'New Delivery!', body: 'You have a new delivery assignment.' } });
  }
}
```

---

## 7. Kafka Integration

### Consumed by Delivery Service

| Topic | Action |
|-------|--------|
| `order.confirmed` | Create DeliveryTask (status: PENDING), run AssignmentEngine |
| `order.cancelled` | Cancel DeliveryTask, free agent (set status back to AVAILABLE) |

### Published by Delivery Service

| Topic | When | Consumers |
|-------|------|-----------|
| `delivery.assigned` | Task assigned to agent | Notification Svc (SMS to buyer) |
| `delivery.picked_up` | Agent marks picked up | Notification Svc |
| `delivery.completed` | Agent marks delivered | Order Svc (update status DELIVERED), Notification Svc, Analytics |
| `delivery.failed` | Delivery failed | Order Svc (handle failure), Notification Svc |

---

## 8. Flutter Delivery App — Key Screens

| Screen | Key Features |
|--------|-------------|
| **Login** | Phone + password login; JWT stored in `flutter_secure_storage` |
| **Home / Status Toggle** | Go ONLINE / OFFLINE toggle; earnings today; total deliveries |
| **Active Delivery** | Order details (pickup + drop-off address); customer phone; Map with route; Action buttons (Picked Up / Delivered / Failed) |
| **Navigation Map** | `google_maps_flutter` with polyline route; "Open in Google Maps" button |
| **Delivery History** | Past deliveries list with status + earnings per task |
| **Earnings Dashboard** | Total earned, pending payout, paid history |
| **Profile** | Vehicle info, license, profile photo, rating display |

### Background GPS Streaming

```dart
// The delivery app must stream GPS even when backgrounded.
// Use flutter_background_service + geolocator.

@pragma('vm:entry-point')
void onStart(ServiceInstance service) {
  Geolocator.getPositionStream(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10,   // Emit every 10 meters moved
    ),
  ).listen((position) {
    socketClient.streamLocation(
      lat: position.latitude,
      lng: position.longitude,
      deliveryTaskId: activeTaskId,
    );
  });
}
```

---

## 9. What the Coding Agent Must Build

### Backend
- [ ] `delivery-service` Node.js/Express/TypeScript project (full clean architecture)
- [ ] MongoDB models: `DeliveryAgent`, `DeliveryTask`, `LocationHistory`, `AgentEarning`
- [ ] `AssignmentService` with MongoDB `$geoNear` agent-finding
- [ ] `DeliveryTrackingService` — status transitions + validation
- [ ] All API endpoints (agent, buyer-tracking, admin sections)
- [ ] Socket.io server: location stream, broadcast, room management
- [ ] BullMQ job: retry-assignment queue (2-min delay on no-agent-found)
- [ ] Kafka consumer: `order.confirmed` → create task
- [ ] Kafka producers: `delivery.assigned`, `delivery.completed`, `delivery.failed`
- [ ] Proof-of-delivery photo upload → S3
- [ ] Admin payout batch trigger endpoint
- [ ] `GET /health` and `GET /metrics`
- [ ] Unit tests for AssignmentService and DeliveryTrackingService
- [ ] Integration tests for all endpoints

### Flutter (`delivery_app`)
- [ ] Project setup with `flutter_riverpod`, `go_router`, `dio`, `flutter_secure_storage`
- [ ] Login screen (phone + password)
- [ ] Home screen with ONLINE/OFFLINE toggle
- [ ] Active delivery screen with Google Maps + route polyline
- [ ] Pickup / Deliver / Fail action buttons with confirmation dialogs
- [ ] Proof-of-delivery camera capture + upload
- [ ] Background GPS service (`flutter_background_service`)
- [ ] Socket.io connection with auto-reconnect
- [ ] FCM push handling for new assignment notifications
- [ ] Earnings dashboard screen
- [ ] Delivery history list screen

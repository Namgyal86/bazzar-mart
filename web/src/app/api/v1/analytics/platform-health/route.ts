import { NextResponse } from 'next/server';

const SERVICES = {
  monolith: process.env.MONOLITH_URL         || 'http://localhost:8100',
  delivery: process.env.DELIVERY_SERVICE_URL || 'http://localhost:8013',
};

async function ping(url: string): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(4000) });
    return { ok: res.ok, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: -1 };
  }
}

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  // 1. Ping monolith + delivery service in parallel
  const [monolithPing, deliveryPing] = await Promise.all([
    ping(SERVICES.monolith),
    ping(SERVICES.delivery),
  ]);

  const responseTimes = [monolithPing, deliveryPing]
    .filter((p) => p.ok && p.ms >= 0)
    .map((p) => p.ms);

  const p95ms = responseTimes.length > 0
    ? Math.round(responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)] ?? responseTimes[responseTimes.length - 1])
    : null;

  // 2. Fetch order stats from monolith
  const orderStats = await fetchJson(`${SERVICES.monolith}/api/v1/orders/admin/stats`);

  // 3. Fetch payment stats from monolith
  const paymentStats = await fetchJson(`${SERVICES.monolith}/api/v1/payments/admin/stats`);

  // 4. Fetch delivery stats from delivery-service (still separate)
  const deliveryStats = await fetchJson(`${SERVICES.delivery}/api/v1/delivery/admin/stats`);

  // ── Build metrics ──────────────────────────────────────────────────────────

  // API Response p95
  const apiResponse = p95ms !== null
    ? { value: `${p95ms}ms`, pct: Math.max(0, Math.min(100, Math.round((300 - p95ms) / 300 * 100))), status: p95ms < 300 ? 'good' : 'bad', available: true }
    : { value: 'Unavailable', pct: 0, status: 'unavailable', available: false };

  // Order Fulfillment
  const fulfillRate = orderStats?.data?.fulfillmentRate ?? orderStats?.fulfillmentRate ?? null;
  const orderFulfillment = fulfillRate !== null
    ? { value: `${Number(fulfillRate).toFixed(1)}%`, pct: Math.round(Number(fulfillRate)), status: Number(fulfillRate) >= 95 ? 'good' : 'warn', available: true }
    : { value: 'Unavailable', pct: 0, status: 'unavailable', available: false };

  // Payment Success
  const paySuccessRate = paymentStats?.data?.successRate ?? paymentStats?.successRate ?? null;
  const paymentSuccess = paySuccessRate !== null
    ? { value: `${Number(paySuccessRate).toFixed(1)}%`, pct: Math.round(Number(paySuccessRate)), status: Number(paySuccessRate) >= 95 ? 'good' : 'warn', available: true }
    : { value: 'Unavailable', pct: 0, status: 'unavailable', available: false };

  // On-Time Delivery
  const onTimeRate = deliveryStats?.data?.onTimeRate ?? deliveryStats?.onTimeRate ?? null;
  const onTimeDelivery = onTimeRate !== null
    ? { value: `${Number(onTimeRate).toFixed(1)}%`, pct: Math.round(Number(onTimeRate)), status: Number(onTimeRate) >= 95 ? 'good' : 'warn', available: true }
    : { value: 'Unavailable', pct: 0, status: 'unavailable', available: false };

  // Return Rate
  const returnRate = orderStats?.data?.returnRate ?? orderStats?.returnRate ?? null;
  const returns = returnRate !== null
    ? { value: `${Number(returnRate).toFixed(1)}%`, pct: Math.round((5 - Number(returnRate)) / 5 * 100), status: Number(returnRate) <= 5 ? 'good' : 'bad', available: true }
    : { value: 'Unavailable', pct: 0, status: 'unavailable', available: false };

  const metrics = [
    { label: 'API Response (p95)', target: '< 300ms', ...apiResponse },
    { label: 'Order Fulfillment',  target: '> 95%',   ...orderFulfillment },
    { label: 'Payment Success',    target: '> 95%',   ...paymentSuccess },
    { label: 'On-Time Delivery',   target: '> 95%',   ...onTimeDelivery },
    { label: 'Return Rate',        target: '< 5%',    ...returns },
  ];

  const allOperational = metrics.every((m) => m.status === 'good');
  const anyUnavailable = metrics.some((m) => !m.available);

  return NextResponse.json({
    success: true,
    data: {
      metrics,
      systemStatus: anyUnavailable ? 'degraded' : allOperational ? 'operational' : 'degraded',
      checkedAt: new Date().toISOString(),
    },
  });
}

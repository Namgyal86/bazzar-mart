import { NextResponse } from 'next/server';

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8008';

export async function GET() {
  try {
    const res = await fetch(`${NOTIFICATION_URL}/api/v1/notifications/admin`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Service not running — return empty list
    return NextResponse.json({ success: true, data: [] });
  }
}

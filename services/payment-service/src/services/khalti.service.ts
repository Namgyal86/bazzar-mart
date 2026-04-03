import axios, { AxiosError } from 'axios';

// Sandbox: https://dev.khalti.com  |  Production: https://khalti.com
const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://khalti.com/api/v2'
    : 'https://dev.khalti.com/api/v2';

const authHeader = () => ({
  Authorization: `Key ${process.env.KHALTI_SECRET_KEY || ''}`,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KhaltiInitiatePayload {
  return_url: string;
  website_url: string;
  amount: number; // in paisa (NPR × 100), minimum 1000
  purchase_order_id: string;
  purchase_order_name: string;
  customer_info?: { name?: string; email?: string; phone?: string };
}

export interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;  // ISO-8601
  expires_in: number;  // seconds (1800)
}

export type KhaltiStatus =
  | 'Completed'
  | 'Pending'
  | 'Initiated'
  | 'Refunded'
  | 'Expired'
  | 'User canceled'
  | 'Partially Refunded';

export interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number;
  status: KhaltiStatus;
  transaction_id: string;
  fee: number;
  refunded: boolean;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function khaltiInitiate(
  payload: KhaltiInitiatePayload,
): Promise<KhaltiInitiateResponse> {
  const res = await axios.post<KhaltiInitiateResponse>(
    `${BASE_URL}/epayment/initiate/`,
    payload,
    { headers: authHeader() },
  );
  return res.data;
}

export async function khaltiLookup(pidx: string): Promise<KhaltiLookupResponse> {
  const res = await axios.post<KhaltiLookupResponse>(
    `${BASE_URL}/epayment/lookup/`,
    { pidx },
    { headers: authHeader() },
  );
  return res.data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert NPR to paisa and enforce minimum of Rs. 10 (1000 paisa) */
export function toKhaltiPaisa(amountNPR: number): number {
  const paisa = Math.round(amountNPR * 100);
  if (paisa < 1000) throw new Error(`Khalti minimum amount is Rs. 10 (got Rs. ${amountNPR})`);
  return paisa;
}

/** Returns true only for statuses that mean the buyer paid */
export function isKhaltiSuccess(status: KhaltiStatus): boolean {
  return status === 'Completed';
}

/** Extracts a readable error message from a Khalti 4xx response */
export function khaltiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data;
    if (typeof data === 'object') {
      return JSON.stringify(data);
    }
    return String(data);
  }
  return err instanceof Error ? err.message : 'Khalti request failed';
}

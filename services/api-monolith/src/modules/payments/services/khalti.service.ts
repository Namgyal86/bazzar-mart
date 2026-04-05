import axios, { AxiosError } from 'axios';
import { env } from '../../../config/env';

const BASE_URL = env.NODE_ENV === 'production'
  ? 'https://khalti.com/api/v2'
  : 'https://dev.khalti.com/api/v2';

const authHeader = () => ({ Authorization: `Key ${env.KHALTI_SECRET_KEY ?? ''}` });

export interface KhaltiInitiatePayload {
  return_url:           string;
  website_url:          string;
  amount:               number;
  purchase_order_id:    string;
  purchase_order_name:  string;
  customer_info?:       { name?: string; email?: string; phone?: string };
}

export interface KhaltiInitiateResponse {
  pidx:        string;
  payment_url: string;
  expires_at:  string;
  expires_in:  number;
}

export type KhaltiStatus =
  | 'Completed' | 'Pending' | 'Initiated' | 'Refunded'
  | 'Expired' | 'User canceled' | 'Partially Refunded';

export interface KhaltiLookupResponse {
  pidx:           string;
  total_amount:   number;
  status:         KhaltiStatus;
  transaction_id: string;
  fee:            number;
  refunded:       boolean;
}

export async function khaltiInitiate(payload: KhaltiInitiatePayload): Promise<KhaltiInitiateResponse> {
  const res = await axios.post<KhaltiInitiateResponse>(`${BASE_URL}/epayment/initiate/`, payload, { headers: authHeader() });
  return res.data;
}

export async function khaltiLookup(pidx: string): Promise<KhaltiLookupResponse> {
  const res = await axios.post<KhaltiLookupResponse>(`${BASE_URL}/epayment/lookup/`, { pidx }, { headers: authHeader() });
  return res.data;
}

export function toKhaltiPaisa(amountNPR: number): number {
  const paisa = Math.round(amountNPR * 100);
  if (paisa < 1000) throw new Error(`Khalti minimum amount is Rs. 10 (got Rs. ${amountNPR})`);
  return paisa;
}

export function isKhaltiSuccess(status: KhaltiStatus): boolean {
  return status === 'Completed';
}

export function khaltiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data) {
    const d = err.response.data;
    return typeof d === 'object' ? JSON.stringify(d) : String(d);
  }
  return err instanceof Error ? err.message : 'Khalti request failed';
}

import crypto from 'crypto';
import axios from 'axios';

// Sandbox: https://rc-epay.esewa.com.np  |  Production: https://epay.esewa.com.np
const IS_PROD = process.env.NODE_ENV === 'production';

export const ESEWA_FORM_URL = IS_PROD
  ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
  : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

const STATUS_BASE = IS_PROD
  ? 'https://esewa.com.np/api/epay/transaction/status/'
  : 'https://rc.esewa.com.np/api/epay/transaction/status/';

// UAT secret key provided by eSewa docs; override in .env for production
const SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q(';
export const MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EsewaFormData {
  amount: number;
  tax_amount: number;
  product_service_charge: number;
  product_delivery_charge: number;
  total_amount: number;
  transaction_uuid: string;
  product_code: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface EsewaCallbackData {
  transaction_code: string;
  status: string;
  total_amount: number;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
}

export type EsewaStatus =
  | 'COMPLETE'
  | 'PENDING'
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'CANCELED';

export interface EsewaStatusResponse {
  product_code: string;
  transaction_uuid: string;
  total_amount: number;
  status: EsewaStatus;
  ref_id?: string;
}

// ─── Signature ────────────────────────────────────────────────────────────────

/**
 * Generate HMAC-SHA256 Base64 signature.
 * Message format: "total_amount=X,transaction_uuid=Y,product_code=Z"
 */
export function generateEsewaSignature(
  totalAmount: number,
  transactionUuid: string,
  productCode: string,
): string {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64');
}

/**
 * Verify eSewa's callback response signature.
 * Builds message from signed_field_names, then compares HMAC.
 */
export function verifyEsewaCallbackSignature(data: EsewaCallbackData): boolean {
  const fields = data.signed_field_names.split(',');
  const dataMap = data as unknown as Record<string, unknown>;
  const message = fields.map((f) => `${f}=${dataMap[f]}`).join(',');
  const expected = crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64');
  return expected === data.signature;
}

// ─── Callback response ────────────────────────────────────────────────────────

/** eSewa sends success_url?data=<base64-encoded-json> */
export function decodeEsewaCallbackData(encodedData: string): EsewaCallbackData {
  const decoded = Buffer.from(encodedData, 'base64').toString('utf-8');
  return JSON.parse(decoded) as EsewaCallbackData;
}

// ─── Status check ─────────────────────────────────────────────────────────────

export async function checkEsewaStatus(
  transactionUuid: string,
  totalAmount: number,
): Promise<EsewaStatusResponse> {
  const res = await axios.get<EsewaStatusResponse>(STATUS_BASE, {
    params: {
      product_code: MERCHANT_CODE,
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
    },
  });
  return res.data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isEsewaSuccess(status: EsewaStatus): boolean {
  return status === 'COMPLETE';
}

/**
 * Build the complete form data object to POST to eSewa.
 * The frontend submits this as an HTML form to ESEWA_FORM_URL.
 */
export function buildEsewaFormData(
  paymentId: string,
  amountNPR: number,
  successUrl: string,
  failureUrl: string,
): EsewaFormData {
  const totalAmount = amountNPR; // no tax/charges for now
  const signature = generateEsewaSignature(totalAmount, paymentId, MERCHANT_CODE);

  return {
    amount: amountNPR,
    tax_amount: 0,
    product_service_charge: 0,
    product_delivery_charge: 0,
    total_amount: totalAmount,
    transaction_uuid: paymentId,
    product_code: MERCHANT_CODE,
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
    signature,
  };
}

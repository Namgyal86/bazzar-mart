import crypto from 'crypto';
import axios from 'axios';
import { env } from '../../../config/env';

const IS_PROD = env.NODE_ENV === 'production';

export const ESEWA_FORM_URL = IS_PROD
  ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
  : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

const STATUS_BASE = IS_PROD
  ? 'https://esewa.com.np/api/epay/transaction/status/'
  : 'https://rc.esewa.com.np/api/epay/transaction/status/';

const SECRET_KEY    = env.ESEWA_SECRET_KEY    ?? '8gBm/:&EnhH.1/q(';
export const MERCHANT_CODE = env.ESEWA_MERCHANT_CODE ?? 'EPAYTEST';

export interface EsewaFormData {
  amount:                   number;
  tax_amount:               number;
  product_service_charge:   number;
  product_delivery_charge:  number;
  total_amount:             number;
  transaction_uuid:         string;
  product_code:             string;
  success_url:              string;
  failure_url:              string;
  signed_field_names:       string;
  signature:                string;
}

export interface EsewaCallbackData {
  transaction_code:  string;
  status:            string;
  total_amount:      number;
  transaction_uuid:  string;
  product_code:      string;
  signed_field_names: string;
  signature:         string;
}

export type EsewaStatus =
  | 'COMPLETE' | 'PENDING' | 'FULL_REFUND' | 'PARTIAL_REFUND'
  | 'AMBIGUOUS' | 'NOT_FOUND' | 'CANCELED';

export interface EsewaStatusResponse {
  product_code:      string;
  transaction_uuid:  string;
  total_amount:      number;
  status:            EsewaStatus;
  ref_id?:           string;
}

export function generateEsewaSignature(totalAmount: number, transactionUuid: string, productCode: string): string {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64');
}

export function verifyEsewaCallbackSignature(data: EsewaCallbackData): boolean {
  const fields  = data.signed_field_names.split(',');
  const dataMap = data as unknown as Record<string, unknown>;
  const message = fields.map(f => `${f}=${dataMap[f]}`).join(',');
  const expected = crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64');
  return expected === data.signature;
}

export function decodeEsewaCallbackData(encodedData: string): EsewaCallbackData {
  return JSON.parse(Buffer.from(encodedData, 'base64').toString('utf-8')) as EsewaCallbackData;
}

export async function checkEsewaStatus(transactionUuid: string, totalAmount: number): Promise<EsewaStatusResponse> {
  const res = await axios.get<EsewaStatusResponse>(STATUS_BASE, {
    params: { product_code: MERCHANT_CODE, total_amount: totalAmount, transaction_uuid: transactionUuid },
  });
  return res.data;
}

export function isEsewaSuccess(status: EsewaStatus): boolean {
  return status === 'COMPLETE';
}

export function buildEsewaFormData(paymentId: string, amountNPR: number, successUrl: string, failureUrl: string): EsewaFormData {
  const totalAmount = amountNPR;
  const signature   = generateEsewaSignature(totalAmount, paymentId, MERCHANT_CODE);
  return {
    amount: amountNPR, tax_amount: 0, product_service_charge: 0, product_delivery_charge: 0,
    total_amount: totalAmount, transaction_uuid: paymentId, product_code: MERCHANT_CODE,
    success_url: successUrl, failure_url: failureUrl,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
    signature,
  };
}

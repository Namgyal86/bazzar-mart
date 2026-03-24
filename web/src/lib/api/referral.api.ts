import { apiClient } from './client';

export interface ReferralCode {
  code: string;
  shareUrl: string;
  shareMessage: string;
  referralCount: number;
  pendingCount: number;
  rewardedCount: number;
  totalEarned: string;
}

export interface ReferralWallet {
  balance: string;
  totalEarned: string;
  totalSpent: string;
  totalExpired: string;
  transactions: {
    id: string;
    type: 'EARNED_AS_REFERRER' | 'EARNED_AS_REFEREE' | 'SPENT' | 'EXPIRED' | 'REVOKED';
    amount: string;
    balanceAfter: string;
    description: string;
    expiresAt?: string;
    createdAt: string;
  }[];
}

export interface ReferralHistoryItem {
  id: string;
  refereeEmail: string;
  status: 'PENDING' | 'SIGNED_UP' | 'COMPLETED' | 'REWARDED' | 'EXPIRED' | 'REVOKED';
  rewardedAt?: string;
  createdAt: string;
}

export interface ReferralDashboard {
  totalReferrals: number;
  pendingReferrals: number;
  rewardedReferrals: number;
  totalEarned: string;
}

export const referralApi = {
  getMyCode: () =>
    apiClient.get<{ success: true; data: ReferralCode }>('/api/v1/referrals/my-code'),

  getDashboard: () =>
    apiClient.get<{ success: true; data: ReferralDashboard }>('/api/v1/referrals/dashboard'),

  getHistory: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{ success: true; data: ReferralHistoryItem[]; meta: { total: number; page: number; limit: number } }>(
      '/api/v1/referrals/history',
      { params },
    ),

  getWallet: () =>
    apiClient.get<{ success: true; data: ReferralWallet }>('/api/v1/referrals/wallet'),

  applyCredits: (amount: number) =>
    apiClient.post<{ success: true; data: { appliedAmount: string; newTotal: string } }>(
      '/api/v1/referrals/apply',
      { amount },
    ),

  validateCode: (code: string) =>
    apiClient.get<{ success: true; data: { valid: boolean; referrerName?: string } }>(
      `/api/v1/referrals/validate/${code}`,
    ),

  // Admin
  adminList: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ success: true; data: any[]; meta: any }>('/api/v1/admin/referrals', { params }),

  adminRevoke: (id: string, reason: string) =>
    apiClient.patch(`/api/v1/admin/referrals/${id}/revoke`, { reason }),

  adminGetConfig: () =>
    apiClient.get<{ success: true; data: { key: string; value: string; description: string }[] }>(
      '/api/v1/admin/referral-config',
    ),

  adminUpdateConfig: (key: string, value: string) =>
    apiClient.patch(`/api/v1/admin/referral-config/${key}`, { value }),
};

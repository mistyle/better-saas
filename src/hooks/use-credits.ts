'use client';

import useSWR from 'swr';
import type { CreditTransaction } from '@/lib/credits';
import {
  getCreditBalance,
  type GetCreditBalanceResponse,
  getCreditHistory,
} from '@/server/actions/credit-actions';

// --- Credit Balance ---

const balanceFetcher = async (): Promise<GetCreditBalanceResponse> => {
  const result = await getCreditBalance();
  if (result.success && result.data) {
    return result.data;
  }
  throw new Error(result.error || 'Failed to load credit balance');
};

export function useCreditBalance() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('credit-balance', balanceFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  return {
    balance: data ?? null,
    error,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    refresh: () => mutate(),
  };
}

// --- Credit History ---

interface UseCreditHistoryOptions {
  limit?: number;
  offset?: number;
}

const historyFetcher = async (key: string): Promise<CreditTransaction[]> => {
  const [, limit, offset] = key.split('|');
  const result = await getCreditHistory({
    limit: Number(limit),
    offset: Number(offset),
  });
  if (result.success && result.data) {
    return result.data;
  }
  throw new Error(result.error || 'Failed to load credit history');
};

export function useCreditHistory(options: UseCreditHistoryOptions = {}) {
  const { limit = 50, offset = 0 } = options;

  const key = `credit-history|${limit}|${offset}`;

  const { data, error, isLoading, mutate } = useSWR(key, historyFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  return {
    transactions: data ?? [],
    error,
    isLoading,
    refresh: () => mutate(),
  };
}

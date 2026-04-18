'use client';

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { BillingInfo } from '@/server/actions/payment/get-billing-info';
import { getBillingInfo } from '@/server/actions/payment/get-billing-info';
import { syncSingleSubscription } from '@/server/actions/payment/sync-subscription-periods';

const billingFetcher = async (): Promise<BillingInfo> => {
  const result = await getBillingInfo();
  if (result.success && result.data) {
    return result.data;
  }
  throw new Error(result.error || 'Failed to load billing info');
};

export function useBilling() {
  const { data, error, isLoading, mutate } = useSWR('billing-info', billingFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
  });

  // Sync subscription mutation
  const { trigger: syncSubscription, isMutating: isSyncing } = useSWRMutation(
    'billing-sync',
    async (_, { arg }: { arg: string }) => {
      const result = await syncSingleSubscription(arg);
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync subscription');
      }
      return result;
    },
    {
      onSuccess: () => {
        // Refetch billing info after successful sync
        mutate();
      },
    }
  );

  return {
    billingInfo: data ?? null,
    error,
    isLoading,
    isSyncing,
    syncSubscription,
    refresh: () => mutate(),
  };
}

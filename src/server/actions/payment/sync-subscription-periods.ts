'use server';

import { getServerSession } from '@/lib/auth/server-session';
import { createPaymentProvider } from '@/payment/service';
import type { ActionResult, PaymentProviderName } from '@/payment/types';
import { paymentRepository } from '@/server/db/repositories/payment-repository';
import { getPaymentActionMessage } from './action-messages';

export async function syncSingleSubscription(
  subscriptionId: string
): Promise<ActionResult<{ updated: boolean }>> {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return {
        success: false,
        error: await getPaymentActionMessage('loginRequired'),
      };
    }

    const paymentRecord = await paymentRepository.findBySubscriptionId(subscriptionId);
    if (!paymentRecord || paymentRecord.userId !== session.user.id) {
      return {
        success: false,
        error: await getPaymentActionMessage('subscriptionNotFoundOrUnauthorized'),
      };
    }

    const provider = createPaymentProvider(
      (paymentRecord.provider || 'stripe') as PaymentProviderName
    );
    const subscription = await provider.getSubscription(subscriptionId);

    if (!subscription) {
      return {
        success: false,
        error: await getPaymentActionMessage('subscriptionNotFoundAtProvider'),
      };
    }

    await paymentRepository.update(paymentRecord.id, {
      priceId: subscription.priceId,
      periodStart: subscription.periodStart || subscription.currentPeriodStart,
      periodEnd: subscription.periodEnd || subscription.currentPeriodEnd,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
    });

    return {
      success: true,
      data: { updated: true },
      message: await getPaymentActionMessage('syncSubscriptionSuccess'),
    };
  } catch (error) {
    console.error('[sync-subscription-periods] syncSingleSubscription error:', error);
    return {
      success: false,
      error: await getPaymentActionMessage('syncSubscriptionFailed'),
    };
  }
}

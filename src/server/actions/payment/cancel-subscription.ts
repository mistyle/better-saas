'use server';

import { getServerSession } from '@/lib/auth/server-session';
import { createPaymentProvider } from '@/payment/service';
import type { ActionResult, PaymentProviderName } from '@/payment/types';
import { paymentRepository } from '@/server/db/repositories/payment-repository';
import { getPaymentActionMessage } from './action-messages';

export async function cancelSubscription(
  subscriptionId: string
): Promise<ActionResult<{ canceled: boolean }>> {
  let session: { user?: { id: string } } | null = null;

  try {
    session = await getServerSession();
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

    const canceled = await provider.cancelSubscription(subscriptionId);
    if (!canceled) {
      return {
        success: false,
        error: await getPaymentActionMessage('cancelSubscriptionFailed'),
      };
    }

    await paymentRepository.update(paymentRecord.id, {
      cancelAtPeriodEnd: true,
    });

    await paymentRepository.createEvent({
      paymentId: paymentRecord.id,
      eventType: 'canceled',
      eventData: JSON.stringify({
        subscriptionId,
        canceledAt: new Date().toISOString(),
        cancelAtPeriodEnd: true,
      }),
    });

    return {
      success: true,
      data: {
        canceled: true,
      },
      message: await getPaymentActionMessage('cancelSubscriptionSuccess'),
    };
  } catch (error) {
    console.error('[cancel-subscription] cancelSubscription error:', error);
    return {
      success: false,
      error: await getPaymentActionMessage('cancelSubscriptionFailed'),
    };
  }
}

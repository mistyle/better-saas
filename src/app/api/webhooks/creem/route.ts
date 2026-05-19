/**
 * Creem Webhook Handler
 *
 * Handles Creem webhook events:
 * - checkout.completed
 * - subscription.active
 * - subscription.paid
 * - subscription.canceled
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { paymentConfig } from '@/config/payment.config';
import { creditService } from '@/lib/credits';
import { CreemProvider } from '@/payment/creem/provider';
import type { CreemWebhookEvent } from '@/payment/creem/client';
import type { PaymentStatus } from '@/payment/types';
import { paymentRepository } from '@/server/db/repositories/payment-repository';

const creemProvider = new CreemProvider();

/**
 * Helper function to find payment plan by Creem product ID
 */
function findPlanByProductId(productId: string) {
  return paymentConfig.plans.find(
    (plan: any) =>
      plan.creemProductIds?.monthly === productId || plan.creemProductIds?.yearly === productId
  );
}

/**
 * Grant credits for subscription
 */
async function grantSubscriptionCredits(
  userId: string,
  productId: string,
  subscriptionId: string,
  isYearly: boolean
) {
  try {
    const plan = findPlanByProductId(productId);
    if (!plan?.credits) {
      console.log(
        `[creem-webhook] No credits configuration found for plan: ${plan?.id || 'unknown'}`
      );
      return;
    }

    const creditsToGrant =
      plan.credits.onSubscribe || (isYearly ? plan.credits.yearly : plan.credits.monthly);

    if (!creditsToGrant || creditsToGrant <= 0) {
      console.log(`[creem-webhook] No credits to grant for plan: ${plan.id}`);
      return;
    }

    await creditService.earnCredits({
      userId,
      amount: creditsToGrant,
      source: 'subscription',
      description: `${plan.name} subscription credits`,
      referenceId: subscriptionId,
      metadata: {
        planId: plan.id,
        productId,
        isYearly,
        subscriptionId,
        provider: 'creem',
      },
    });

    console.log(
      `[creem-webhook] Granted ${creditsToGrant} credits to user ${userId} for ${plan.name} subscription`
    );
  } catch (error) {
    console.error('[creem-webhook] grantSubscriptionCredits error:', error);
  }
}

/**
 * Grant monthly credits for recurring payments
 */
async function grantMonthlyCredits(
  userId: string,
  productId: string,
  subscriptionId: string,
  eventId: string
) {
  try {
    const plan = findPlanByProductId(productId);
    if (!plan?.credits?.monthly) {
      return;
    }

    await creditService.earnCredits({
      userId,
      amount: plan.credits.monthly,
      source: 'subscription',
      description: `Monthly ${plan.name} credits`,
      referenceId: `${subscriptionId}_${eventId}`,
      metadata: {
        planId: plan.id,
        productId,
        subscriptionId,
        eventId,
        type: 'monthly_renewal',
        provider: 'creem',
      },
    });

    console.log(
      `[creem-webhook] Granted monthly ${plan.credits.monthly} credits to user ${userId}`
    );
  } catch (error) {
    console.error('[creem-webhook] grantMonthlyCredits error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('creem-signature') || request.headers.get('x-webhook-signature') || '';

    if (!signature) {
      console.error('[creem-webhook] Missing webhook signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const isValid = await creemProvider.verifyWebhook(body, signature);
    if (!isValid) {
      console.error('[creem-webhook] Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event: CreemWebhookEvent = JSON.parse(body);

    // Check event deduplication
    const isProcessed = await paymentRepository.isProviderEventProcessed(event.id);
    if (isProcessed) {
      console.log(`[creem-webhook] Event ${event.id} already processed`);
      return NextResponse.json({ received: true });
    }

    console.log(`[creem-webhook] Processing Creem event: ${event.type}`);

    switch (event.type) {
      case 'checkout.completed':
        await handleCheckoutCompleted(event);
        break;

      case 'subscription.active':
        await handleSubscriptionActive(event);
        break;

      case 'subscription.paid':
        await handleSubscriptionPaid(event);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event);
        break;

      default:
        console.warn(`[creem-webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[creem-webhook] Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(event: CreemWebhookEvent) {
  const data = event.data.object as Record<string, any>;

  try {
    const subscriptionId = data.subscription_id;
    const customerId = data.customer_id;
    const productId = data.product_id;
    const userId = data.metadata?.userId;

    if (!userId) {
      console.error('[creem-webhook] No userId found in checkout metadata');
      return;
    }

    if (subscriptionId) {
      // Subscription checkout completed
      const existingRecord = await paymentRepository.findBySubscriptionId(subscriptionId);
      if (existingRecord) {
        console.log(`[creem-webhook] Payment record already exists for subscription: ${subscriptionId}`);
        return;
      }

      await paymentRepository.create({
        id: subscriptionId,
        priceId: productId || '',
        type: 'subscription',
        interval: data.interval || 'month',
        provider: 'creem',
        userId,
        customerId: customerId || '',
        subscriptionId,
        status: 'active' as PaymentStatus,
        periodStart: data.current_period_start ? new Date(data.current_period_start) : undefined,
        periodEnd: data.current_period_end ? new Date(data.current_period_end) : undefined,
      });

      await paymentRepository.createEvent({
        paymentId: subscriptionId,
        eventType: 'checkout.completed',
        providerEventId: event.id,
        eventData: JSON.stringify(data),
      });

      // Grant subscription credits
      const isYearly = data.interval === 'year';
      await grantSubscriptionCredits(userId, productId, subscriptionId, isYearly);

      console.log(`[creem-webhook] Subscription created from checkout: ${subscriptionId}`);
    } else {
      // One-time payment completed
      const paymentId = data.id || event.id;

      const existingRecord = await paymentRepository.findById(paymentId);
      if (existingRecord) {
        return;
      }

      await paymentRepository.create({
        id: paymentId,
        priceId: productId || '',
        type: 'one_time',
        provider: 'creem',
        userId,
        customerId: customerId || '',
        status: 'active' as PaymentStatus,
      });

      await paymentRepository.createEvent({
        paymentId,
        eventType: 'checkout.completed',
        providerEventId: event.id,
        eventData: JSON.stringify(data),
      });

      console.log(`[creem-webhook] One-time payment completed: ${paymentId}`);
    }
  } catch (error) {
    console.error('[creem-webhook] handleCheckoutCompleted error:', error);
    throw error;
  }
}

async function handleSubscriptionActive(event: CreemWebhookEvent) {
  const data = event.data.object as Record<string, any>;

  try {
    const subscriptionId = data.id;
    const paymentRecord = await paymentRepository.findBySubscriptionId(subscriptionId);

    if (!paymentRecord) {
      console.warn(`[creem-webhook] No payment record found for subscription ${subscriptionId}`);
      return;
    }

    await paymentRepository.update(paymentRecord.id, {
      status: 'active',
      periodStart: data.current_period_start ? new Date(data.current_period_start) : undefined,
      periodEnd: data.current_period_end ? new Date(data.current_period_end) : undefined,
    });

    await paymentRepository.createEvent({
      paymentId: paymentRecord.id,
      eventType: 'subscription.active',
      providerEventId: event.id,
      eventData: JSON.stringify(data),
    });

    console.log(`[creem-webhook] Subscription active: ${subscriptionId}`);
  } catch (error) {
    console.error('[creem-webhook] handleSubscriptionActive error:', error);
    throw error;
  }
}

async function handleSubscriptionPaid(event: CreemWebhookEvent) {
  const data = event.data.object as Record<string, any>;

  try {
    const subscriptionId = data.id || data.subscription_id;
    const paymentRecord = await paymentRepository.findBySubscriptionId(subscriptionId);

    if (!paymentRecord) {
      console.warn(`[creem-webhook] No payment record found for subscription ${subscriptionId}`);
      return;
    }

    await paymentRepository.update(paymentRecord.id, {
      status: 'active',
      periodStart: data.current_period_start ? new Date(data.current_period_start) : undefined,
      periodEnd: data.current_period_end ? new Date(data.current_period_end) : undefined,
    });

    await paymentRepository.createEvent({
      paymentId: paymentRecord.id,
      eventType: 'subscription.paid',
      providerEventId: event.id,
      eventData: JSON.stringify(data),
    });

    // Grant monthly credits (skip if it's the first payment)
    const isFirstPayment = data.billing_reason === 'subscription_create';
    if (!isFirstPayment && paymentRecord.userId) {
      await grantMonthlyCredits(
        paymentRecord.userId,
        paymentRecord.priceId,
        subscriptionId,
        event.id
      );
    }

    console.log(`[creem-webhook] Subscription paid: ${subscriptionId}`);
  } catch (error) {
    console.error('[creem-webhook] handleSubscriptionPaid error:', error);
    throw error;
  }
}

async function handleSubscriptionCanceled(event: CreemWebhookEvent) {
  const data = event.data.object as Record<string, any>;

  try {
    const subscriptionId = data.id || data.subscription_id;
    const paymentRecord = await paymentRepository.findBySubscriptionId(subscriptionId);

    if (!paymentRecord) {
      console.warn(`[creem-webhook] No payment record found for subscription ${subscriptionId}`);
      return;
    }

    await paymentRepository.update(paymentRecord.id, {
      status: 'canceled',
    });

    await paymentRepository.createEvent({
      paymentId: paymentRecord.id,
      eventType: 'subscription.canceled',
      providerEventId: event.id,
      eventData: JSON.stringify(data),
    });

    console.log(`[creem-webhook] Subscription canceled: ${subscriptionId}`);
  } catch (error) {
    console.error('[creem-webhook] handleSubscriptionCanceled error:', error);
    throw error;
  }
}

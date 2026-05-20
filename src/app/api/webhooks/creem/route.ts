/**
 * Creem Webhook Handler
 *
 * Handles Creem webhook events:
 * - checkout.completed
 * - subscription.active
 * - subscription.paid
 * - subscription.scheduled_cancel
 * - subscription.canceled
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { paymentConfig } from '@/config/payment.config';
import { creditService } from '@/lib/credits';
import type { CreemWebhookEvent } from '@/payment/creem/client';
import { CreemProvider } from '@/payment/creem/provider';
import type { PaymentStatus } from '@/payment/types';
import { paymentRepository } from '@/server/db/repositories/payment-repository';

const creemProvider = new CreemProvider();

type CreemRelation =
  | string
  | (Record<string, unknown> & {
      id?: string;
      metadata?: Record<string, string>;
      product_id?: string;
      customer_id?: string;
    });

type CreemObject = Record<string, unknown> & {
  id?: string;
  subscription_id?: string;
  product_id?: string;
  customer_id?: string;
  subscription?: CreemRelation;
  product?: CreemRelation;
  customer?: CreemRelation;
  checkout?: { metadata?: Record<string, string> };
  metadata?: Record<string, string>;
  status?: string;
  interval?: string;
  current_period_start?: string;
  current_period_end?: string;
  current_period_start_date?: string;
  current_period_end_date?: string;
  trial_start?: string;
  trial_end?: string;
  cancel_at_period_end?: boolean;
  billing_reason?: string;
  is_first_payment?: boolean;
  updated_at?: string;
  created_at?: string;
  canceled_at?: string;
};

interface NormalizedCreemEvent {
  id: string;
  type: string;
  object: CreemObject;
  raw: CreemWebhookEvent;
}

function relationId(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' ? id : undefined;
  }

  return undefined;
}

function relationObject(value: CreemRelation | undefined) {
  return typeof value === 'object' && value ? value : undefined;
}

function getMetadata(data: CreemObject): Record<string, string> {
  return data.metadata || relationObject(data.subscription)?.metadata || data.checkout?.metadata || {};
}

function getUserId(data: CreemObject): string | undefined {
  return getMetadata(data).userId || relationObject(data.customer)?.metadata?.userId;
}

function getProductId(data: CreemObject): string {
  return data.product_id || relationId(data.product) || relationObject(data.subscription)?.product_id || '';
}

function getCustomerId(data: CreemObject): string {
  return (
    data.customer_id || relationId(data.customer) || relationObject(data.subscription)?.customer_id || ''
  );
}

function getSubscriptionId(data: CreemObject, eventType: string): string | undefined {
  return (
    data.subscription_id ||
    relationId(data.subscription) ||
    relationObject(data.subscription)?.id ||
    (eventType.startsWith('subscription.') ? data.id : undefined)
  );
}

function getPeriodStart(data: CreemObject): Date | undefined {
  const value = data.current_period_start || data.current_period_start_date;
  return value ? new Date(value) : undefined;
}

function getPeriodEnd(data: CreemObject): Date | undefined {
  const value = data.current_period_end || data.current_period_end_date;
  return value ? new Date(value) : undefined;
}

function normalizeStatus(data: CreemObject, fallback: PaymentStatus): PaymentStatus {
  const status = data.status || fallback;

  if (fallback !== 'active' && status === 'active') {
    return fallback;
  }

  switch (status) {
    case 'active':
    case 'canceled':
    case 'scheduled_cancel':
    case 'past_due':
    case 'trialing':
    case 'incomplete':
    case 'paused':
    case 'expired':
      return status;
    case 'cancelled':
      return 'canceled';
    default:
      return fallback;
  }
}

function normalizeInterval(data: CreemObject) {
  return data.interval === 'month' || data.interval === 'year' ? data.interval : null;
}

function normalizeEvent(event: CreemWebhookEvent): NormalizedCreemEvent | null {
  const type = event.eventType || event.type;
  const object = event.object || event.data?.object;

  if (!type || !object) {
    return null;
  }

  const eventId =
    event.id ||
    (event as { event_id?: string }).event_id ||
    (event as { eventId?: string }).eventId ||
    [
      type,
      object.id || object.subscription_id || relationId(object.subscription) || 'unknown',
      event.created_at || object.updated_at || object.created_at || object.canceled_at || '',
    ].join(':');

  return {
    id: eventId,
    type,
    object,
    raw: event,
  };
}

/**
 * Helper function to find payment plan by Creem product ID
 */
function findPlanByProductId(productId: string) {
  return paymentConfig.plans.find(
    (plan) =>
      plan.creemProductIds?.monthly === productId || plan.creemProductIds?.yearly === productId
  );
}

function isYearlyProduct(productId: string, data: CreemObject): boolean {
  const plan = findPlanByProductId(productId);

  if (plan?.creemProductIds?.yearly === productId) {
    return true;
  }

  return data.interval === 'year';
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
    const signature =
      request.headers.get('creem-signature') || request.headers.get('x-webhook-signature') || '';

    if (!signature) {
      console.error('[creem-webhook] Missing webhook signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const isValid = await creemProvider.verifyWebhook(body, signature);
    if (!isValid) {
      console.error('[creem-webhook] Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = normalizeEvent(JSON.parse(body) as CreemWebhookEvent);
    if (!event) {
      console.error('[creem-webhook] Invalid webhook payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

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
      case 'subscription.trialing':
        await handleSubscriptionUpsert(event, 'active');
        break;

      case 'subscription.paid':
        await handleSubscriptionPaid(event);
        break;

      case 'subscription.scheduled_cancel':
        await handleSubscriptionScheduledCancel(event);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event);
        break;

      case 'subscription.past_due':
        await handleSubscriptionStatusOnly(event, 'past_due');
        break;

      case 'subscription.paused':
        await handleSubscriptionStatusOnly(event, 'paused');
        break;

      case 'subscription.expired':
        await handleSubscriptionStatusOnly(event, 'expired');
        break;

      case 'subscription.update':
        await handleSubscriptionUpsert(event, 'active');
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

async function recordEvent(
  paymentId: string,
  event: NormalizedCreemEvent,
  data: CreemObject = event.object
) {
  await paymentRepository.createEvent({
    paymentId,
    eventType: event.type,
    providerEventId: event.id,
    eventData: JSON.stringify(event.raw || data),
  });
}

async function handleCheckoutCompleted(event: NormalizedCreemEvent) {
  const data = event.object;
  const subscriptionId = getSubscriptionId(data, event.type);
  const productId = getProductId(data);
  const customerId = getCustomerId(data);
  const userId = getUserId(data);

  try {
    if (subscriptionId) {
      const paymentRecord = await upsertSubscriptionRecord(event, data, 'active');
      if (!paymentRecord || !userId) {
        return;
      }

      await grantSubscriptionCredits(
        userId,
        productId,
        subscriptionId,
        isYearlyProduct(productId, data)
      );

      console.log(`[creem-webhook] Subscription created from checkout: ${subscriptionId}`);
      return;
    }

    if (!userId) {
      console.error('[creem-webhook] No userId found in checkout metadata');
      return;
    }

    const paymentId = data.id || event.id;
    const existingRecord = await paymentRepository.findById(paymentId);
    if (existingRecord) {
      await recordEvent(existingRecord.id, event, data);
      return;
    }

    await paymentRepository.create({
      id: paymentId,
      priceId: productId,
      type: 'one_time',
      provider: 'creem',
      userId,
      customerId,
      status: 'active',
    });

    await recordEvent(paymentId, event, data);
    console.log(`[creem-webhook] One-time payment completed: ${paymentId}`);
  } catch (error) {
    console.error('[creem-webhook] handleCheckoutCompleted error:', error);
    throw error;
  }
}

async function upsertSubscriptionRecord(
  event: NormalizedCreemEvent,
  data: CreemObject,
  fallbackStatus: PaymentStatus
) {
  const subscriptionId = getSubscriptionId(data, event.type);
  if (!subscriptionId) {
    console.error('[creem-webhook] Subscription event missing subscription id', {
      eventId: event.id,
      eventType: event.type,
    });
    return null;
  }

  const productId = getProductId(data);
  const customerId = getCustomerId(data);
  const status = normalizeStatus(data, fallbackStatus);
  const existingRecord = await paymentRepository.findBySubscriptionId(subscriptionId);

  if (existingRecord) {
    const updated = await paymentRepository.update(existingRecord.id, {
      priceId: productId || existingRecord.priceId,
      status,
      periodStart: getPeriodStart(data),
      periodEnd: getPeriodEnd(data),
      cancelAtPeriodEnd: data.cancel_at_period_end ?? status === 'scheduled_cancel',
      trialStart: data.trial_start ? new Date(data.trial_start) : undefined,
      trialEnd: data.trial_end ? new Date(data.trial_end) : undefined,
    });
    await recordEvent(existingRecord.id, event, data);
    return updated || existingRecord;
  }

  const userId = getUserId(data);
  if (!userId) {
    console.warn(`[creem-webhook] No userId found for subscription ${subscriptionId}`);
    return null;
  }

  const created = await paymentRepository.create({
    id: subscriptionId,
    priceId: productId,
    type: 'subscription',
    interval: normalizeInterval(data),
    provider: 'creem',
    userId,
    customerId,
    subscriptionId,
    status,
    periodStart: getPeriodStart(data),
    periodEnd: getPeriodEnd(data),
    cancelAtPeriodEnd: data.cancel_at_period_end ?? status === 'scheduled_cancel',
    trialStart: data.trial_start ? new Date(data.trial_start) : undefined,
    trialEnd: data.trial_end ? new Date(data.trial_end) : undefined,
  });

  await recordEvent(created.id, event, data);
  return created;
}

async function handleSubscriptionUpsert(
  event: NormalizedCreemEvent,
  fallbackStatus: PaymentStatus
) {
  try {
    const paymentRecord = await upsertSubscriptionRecord(event, event.object, fallbackStatus);
    if (paymentRecord) {
      console.log(`[creem-webhook] Subscription upserted: ${paymentRecord.subscriptionId}`);
    }
  } catch (error) {
    console.error('[creem-webhook] handleSubscriptionUpsert error:', error);
    throw error;
  }
}

async function handleSubscriptionPaid(event: NormalizedCreemEvent) {
  const data = event.object;

  try {
    const paymentRecord = await upsertSubscriptionRecord(event, data, 'active');
    if (!paymentRecord?.subscriptionId) {
      return;
    }

    const isFirstPayment =
      data.billing_reason === 'subscription_create' || data.is_first_payment === true;
    if (!isFirstPayment) {
      await grantMonthlyCredits(
        paymentRecord.userId,
        paymentRecord.priceId,
        paymentRecord.subscriptionId,
        event.id
      );
    }

    console.log(`[creem-webhook] Subscription paid: ${paymentRecord.subscriptionId}`);
  } catch (error) {
    console.error('[creem-webhook] handleSubscriptionPaid error:', error);
    throw error;
  }
}

async function handleSubscriptionScheduledCancel(event: NormalizedCreemEvent) {
  try {
    const paymentRecord = await upsertSubscriptionRecord(event, event.object, 'scheduled_cancel');
    if (paymentRecord) {
      console.log(`[creem-webhook] Subscription scheduled to cancel: ${paymentRecord.subscriptionId}`);
    }
  } catch (error) {
    console.error('[creem-webhook] handleSubscriptionScheduledCancel error:', error);
    throw error;
  }
}

async function handleSubscriptionCanceled(event: NormalizedCreemEvent) {
  const data = event.object;

  try {
    const subscriptionId = getSubscriptionId(data, event.type);
    if (!subscriptionId) {
      console.error('[creem-webhook] Cancellation event missing subscription id');
      return;
    }

    const paymentRecord = await paymentRepository.findBySubscriptionId(subscriptionId);
    if (!paymentRecord) {
      console.warn(`[creem-webhook] No payment record found for subscription ${subscriptionId}`);
      return;
    }

    await paymentRepository.update(paymentRecord.id, {
      status: 'canceled',
      periodStart: getPeriodStart(data),
      periodEnd: getPeriodEnd(data),
      cancelAtPeriodEnd: false,
    });

    await recordEvent(paymentRecord.id, event, data);
    console.log(`[creem-webhook] Subscription canceled: ${subscriptionId}`);
  } catch (error) {
    console.error('[creem-webhook] handleSubscriptionCanceled error:', error);
    throw error;
  }
}

async function handleSubscriptionStatusOnly(
  event: NormalizedCreemEvent,
  status: PaymentStatus
) {
  try {
    const paymentRecord = await upsertSubscriptionRecord(event, event.object, status);
    if (paymentRecord) {
      console.log(`[creem-webhook] Subscription status updated: ${paymentRecord.subscriptionId}`);
    }
  } catch (error) {
    console.error('[creem-webhook] handleSubscriptionStatusOnly error:', error);
    throw error;
  }
}

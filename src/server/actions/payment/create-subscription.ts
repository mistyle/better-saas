'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { paymentConfig } from '@/config/payment.config';
import { env } from '@/env';
import { getServerSession } from '@/lib/auth/server-session';
import { getActivePaymentProviderName, getPaymentProvider } from '@/payment/service';
import type {
  ActionResult,
  PaymentInterval,
  PaymentProvider as PaymentProviderInterface,
  PaymentProviderName,
} from '@/payment/types';
import db from '@/server/db';
import { paymentRepository } from '@/server/db/repositories/payment-repository';
import { user } from '@/server/db/schema';
import { getPaymentActionMessage } from './action-messages';

/**
 * Get existing or create new Customer ID for a user, and persist it to the user table.
 * Uses atomic UPDATE ... WHERE stripe_customer_id IS NULL to prevent duplicate Customers
 * under concurrent requests.
 */
async function getOrCreateCustomerId(
  provider: PaymentProviderInterface,
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const providerName = provider.provider;

  const [dbUser] = await db
    .select({ stripeCustomerId: user.stripeCustomerId, paymentProvider: user.paymentProvider })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (
    dbUser?.stripeCustomerId &&
    (dbUser.paymentProvider === providerName ||
      (!dbUser.paymentProvider && providerName === 'stripe'))
  ) {
    return dbUser.stripeCustomerId;
  }

  const customerId = await provider.createCustomer(userId, email, name);

  // The column name is legacy Stripe-oriented, while payment_provider stores the active owner.
  const updated = await db
    .update(user)
    .set({ stripeCustomerId: customerId, paymentProvider: providerName, updatedAt: new Date() })
    .where(
      and(
        eq(user.id, userId),
        dbUser?.stripeCustomerId && dbUser.paymentProvider !== providerName
          ? dbUser.paymentProvider
            ? eq(user.paymentProvider, dbUser.paymentProvider)
            : isNull(user.paymentProvider)
          : isNull(user.stripeCustomerId)
      )
    )
    .returning({ stripeCustomerId: user.stripeCustomerId });

  if (updated.length === 0) {
    const [existing] = await db
      .select({ stripeCustomerId: user.stripeCustomerId, paymentProvider: user.paymentProvider })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (
      existing?.stripeCustomerId &&
      (existing.paymentProvider === providerName ||
        (!existing.paymentProvider && providerName === 'stripe'))
    ) {
      return existing.stripeCustomerId;
    }

    const [forced] = await db
      .update(user)
      .set({ stripeCustomerId: customerId, paymentProvider: providerName, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning({ stripeCustomerId: user.stripeCustomerId });

    if (!forced?.stripeCustomerId) {
      throw new Error('Failed to persist payment customer ID');
    }

    return forced.stripeCustomerId;
  }

  return customerId;
}

export interface CreateSubscriptionParams {
  priceId?: string;
  planId?: string;
  interval?: Exclude<PaymentInterval, null>;
  trialDays?: number;
  successUrl?: string;
  cancelUrl?: string;
}

function resolveCheckoutPriceId(
  providerName: PaymentProviderName,
  params: CreateSubscriptionParams
): string | null {
  if (params.priceId) {
    return params.priceId;
  }

  if (!params.planId) {
    return null;
  }

  const billingInterval = params.interval || 'month';
  const billingKey = billingInterval === 'year' ? 'yearly' : 'monthly';
  const plan = paymentConfig.plans.find((item) => item.id === params.planId);

  if (!plan || plan.id === 'free') {
    return null;
  }

  if (providerName === 'creem') {
    return plan.creemProductIds?.[billingKey] || null;
  }

  return plan.stripePriceIds?.[billingKey] || plan.stripePriceId || null;
}

export async function createCheckoutSession(
  params: CreateSubscriptionParams
): Promise<ActionResult<{ url?: string; subscriptionId?: string; clientSecret?: string }>> {
  let session: { user?: { id: string; email: string; name?: string } } | null = null;

  try {
    session = await getServerSession();
    if (!session?.user) {
      return {
        success: false,
        error: await getPaymentActionMessage('loginRequired'),
      };
    }

    const { successUrl, cancelUrl } = params;
    const provider = getPaymentProvider();
    const providerName = getActivePaymentProviderName();
    const priceId = resolveCheckoutPriceId(providerName, params);

    if (!priceId) {
      return {
        success: false,
        error: await getPaymentActionMessage('productNotConfigured'),
      };
    }

    const existingSubscription = await paymentRepository.findActiveSubscriptionByUserId(
      session.user.id
    );
    if (existingSubscription) {
      return {
        success: false,
        error: await getPaymentActionMessage('activeSubscriptionExists'),
      };
    }

    const customerId = await getOrCreateCustomerId(
      provider,
      session.user.id,
      session.user.email,
      session.user.name || undefined
    );

    if (providerName === 'creem') {
      const checkoutSession = await provider.createSubscriptionCheckout({
        userId: session.user.id,
        priceId,
        customerId,
        successUrl: successUrl || `${env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
        cancelUrl: cancelUrl || `${env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
        metadata: {
          userId: session.user.id,
          userEmail: session.user.email,
        },
      });

      if (!checkoutSession.url) {
        return {
          success: false,
          error: await getPaymentActionMessage('createCheckoutFailed'),
        };
      }

      return {
        success: true,
        data: { url: checkoutSession.url },
        message: await getPaymentActionMessage('redirectingToPayment'),
      };
    }

    const { stripe } = await import('@/payment/stripe/client');
    const price = await stripe.prices.retrieve(priceId);

    if (price.recurring) {
      const checkoutSession = await provider.createSubscriptionCheckout({
        userId: session.user.id,
        priceId,
        customerId,
        successUrl: successUrl || `${env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
        cancelUrl: cancelUrl || `${env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
        metadata: {
          userId: session.user.id,
          userEmail: session.user.email,
        },
      });

      if (!checkoutSession.url) {
        return {
          success: false,
          error: await getPaymentActionMessage('createCheckoutFailed'),
        };
      }

      return {
        success: true,
        data: {
          url: checkoutSession.url,
        },
        message: await getPaymentActionMessage('redirectingToPayment'),
      };
    }

    const checkoutSession = await provider.createPayment({
      userId: session.user.id,
      priceId,
      customerId,
      successUrl: successUrl || `${env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancelUrl: cancelUrl || `${env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        userId: session.user.id,
        userEmail: session.user.email,
      },
    });

    if (!checkoutSession.url) {
      return {
        success: false,
        error: await getPaymentActionMessage('createCheckoutFailed'),
      };
    }

    return {
      success: true,
      data: {
        url: checkoutSession.url,
      },
      message: await getPaymentActionMessage('redirectingToPayment'),
    };
  } catch (error) {
    console.error('[payment-subscription] createCheckoutSession error:', error);
    return {
      success: false,
      error: await getPaymentActionMessage('createCheckoutFailed'),
    };
  }
}

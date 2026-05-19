'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { env } from '@/env';
import { getServerSession } from '@/lib/auth/server-session';
import { getPaymentProvider, getActivePaymentProviderName } from '@/payment/service';
import type { ActionResult, PaymentProvider as PaymentProviderInterface } from '@/payment/types';
import db from '@/server/db';
import { user } from '@/server/db/schema';
import { paymentRepository } from '@/server/db/repositories/payment-repository';

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
  // Try to read persisted customerId from user table
  const [dbUser] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (dbUser?.stripeCustomerId) {
    return dbUser.stripeCustomerId;
  }

  // Create a new Customer via the active provider
  const customerId = await provider.createCustomer(userId, email, name);

  // Atomic persist: only update if stripe_customer_id is still NULL (no race)
  const updated = await db
    .update(user)
    .set({ stripeCustomerId: customerId, paymentProvider: getActivePaymentProviderName(), updatedAt: new Date() })
    .where(and(eq(user.id, userId), isNull(user.stripeCustomerId)))
    .returning({ stripeCustomerId: user.stripeCustomerId });

  if (updated.length === 0) {
    // Another request already set the customerId — read the persisted value
    const [existing] = await db
      .select({ stripeCustomerId: user.stripeCustomerId })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    return existing!.stripeCustomerId!;
  }

  return customerId;
}

export interface CreateSubscriptionParams {
  priceId: string;
  trialDays?: number;
  successUrl?: string;
  cancelUrl?: string;
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
        error: '请先登录',
      };
    }

    const { priceId, successUrl, cancelUrl } = params;
    const provider = getPaymentProvider();
    const providerName = getActivePaymentProviderName();

    // 检查用户是否已有活跃订阅
    const existingSubscription = await paymentRepository.findActiveSubscriptionByUserId(
      session.user.id
    );
    if (existingSubscription) {
      return {
        success: false,
        error: '您已有活跃的订阅',
      };
    }

    // 创建或获取客户 ID（从用户表读取或创建后持久化）
    const customerId = await getOrCreateCustomerId(
      provider,
      session.user.id,
      session.user.email,
      session.user.name || undefined
    );

    // For Creem: no need to check price type, always use checkout flow
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
          error: '创建支付会话失败',
        };
      }

      return {
        success: true,
        data: { url: checkoutSession.url },
        message: '正在跳转到支付页面...',
      };
    }

    // For Stripe: check price type to determine mode
    const { stripe } = await import('@/payment/stripe/client');
    const price = await stripe.prices.retrieve(priceId);

    if (price.recurring) {
      // 循环价格 - 创建 Checkout Session 用于订阅
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
          error: '创建支付会话失败',
        };
      }

      return {
        success: true,
        data: {
          url: checkoutSession.url,
        },
        message: '正在跳转到支付页面...',
      };
    }

    // 一次性价格 - 创建支付会话
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
        error: '创建支付会话失败',
      };
    }

    return {
      success: true,
      data: {
        url: checkoutSession.url,
      },
      message: '正在跳转到支付页面...',
    };
  } catch (error) {
    console.error('[payment-subscription] createCheckoutSession error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建支付会话失败',
    };
  }
}

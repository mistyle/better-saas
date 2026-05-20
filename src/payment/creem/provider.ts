/**
 * Creem Payment Provider
 *
 * Implements the PaymentProvider interface for Creem (Merchant of Record).
 * Handles checkout sessions, subscriptions, customers, and webhooks.
 *
 * Creem API:
 * - POST /v1/checkouts - create checkout
 * - GET /v1/subscriptions?id=xxx - get subscription
 * - POST /v1/subscriptions/{id}/cancel - cancel subscription
 * - Webhook events: checkout.completed, subscription.active, subscription.paid, subscription.canceled
 */

import crypto from 'node:crypto';
import type {
  CreatePaymentParams,
  CreateSubscriptionCheckoutParams,
  CreateSubscriptionParams,
  PaymentProvider,
  PaymentProviderName,
  PaymentResult,
  PaymentStatus,
  SubscriptionResult,
  UpdateSubscriptionParams,
} from '@/payment/types';
import type { CreemSubscription } from './client';
import { creemClient, creemConfig } from './client';

function getRelationId(value: string | { id: string } | undefined): string {
  if (!value) {
    return '';
  }

  return typeof value === 'string' ? value : value.id;
}

export class CreemProvider implements PaymentProvider {
  public readonly provider: PaymentProviderName = 'creem';

  /**
   * Create a customer in Creem
   * Note: Creem auto-creates customers during checkout, but we can pre-create for tracking
   */
  async createCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      const customer = await creemClient.createCustomer(email, name, { userId });
      return customer.id;
    } catch (error) {
      console.error('[creem-provider] createCustomer error:', error);
      throw new Error('Failed to create Creem customer');
    }
  }

  /**
   * Create a one-time payment checkout
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    try {
      const { userId, priceId, customerId, successUrl, cancelUrl, metadata } = params;

      const checkout = await creemClient.createCheckout({
        product_id: priceId, // In Creem, priceId maps to product_id
        success_url:
          successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
        cancel_url:
          cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
        metadata: {
          userId,
          ...metadata,
        },
        customer: customerId
          ? { id: customerId, email: metadata?.userEmail }
          : metadata?.userEmail
            ? { email: metadata.userEmail }
            : undefined,
      });

      return {
        id: checkout.id,
        status: 'incomplete' as PaymentStatus,
        url: checkout.checkout_url,
        customerId: checkout.customer_id || getRelationId(checkout.customer),
      };
    } catch (error) {
      console.error('[creem-provider] createPayment error:', error);
      throw new Error('Failed to create Creem payment');
    }
  }

  /**
   * Create subscription checkout session
   * In Creem, subscription is determined by the product configuration (recurring product)
   */
  async createSubscriptionCheckout(
    params: CreateSubscriptionCheckoutParams
  ): Promise<PaymentResult> {
    try {
      const { userId, priceId, customerId, successUrl, cancelUrl, metadata } = params;

      const checkout = await creemClient.createCheckout({
        product_id: priceId,
        success_url:
          successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
        cancel_url:
          cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
        metadata: {
          userId,
          ...metadata,
        },
        customer: customerId
          ? { id: customerId, email: metadata?.userEmail }
          : metadata?.userEmail
            ? { email: metadata.userEmail }
            : undefined,
      });

      return {
        id: checkout.id,
        status: 'incomplete' as PaymentStatus,
        url: checkout.checkout_url,
        customerId: checkout.customer_id || getRelationId(checkout.customer),
      };
    } catch (error) {
      console.error('[creem-provider] createSubscriptionCheckout error:', error);
      throw new Error('Failed to create Creem subscription checkout');
    }
  }

  /**
   * Create subscription directly (Creem uses checkout flow, so this creates a checkout)
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    try {
      const { userId, priceId, customerId, metadata } = params;

      const checkout = await creemClient.createCheckout({
        product_id: priceId,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
        metadata: {
          userId,
          ...metadata,
        },
        customer: customerId
          ? { id: customerId, email: metadata?.userEmail }
          : metadata?.userEmail
            ? { email: metadata.userEmail }
            : undefined,
      });

      // Creem doesn't return a full subscription at checkout creation
      // The subscription is created after payment via webhook
      return {
        id: checkout.id,
        status: 'incomplete' as PaymentStatus,
        customerId: checkout.customer_id || getRelationId(checkout.customer),
        priceId,
        interval: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        url: checkout.checkout_url,
      };
    } catch (error) {
      console.error('[creem-provider] createSubscription error:', error);
      throw new Error('Failed to create Creem subscription');
    }
  }

  /**
   * Update subscription - Creem has limited update support
   */
  async updateSubscription(
    subscriptionId: string,
    params: UpdateSubscriptionParams
  ): Promise<SubscriptionResult> {
    try {
      // If only canceling, delegate to cancelSubscription logic
      if (params.cancelAtPeriodEnd) {
        await this.cancelSubscription(subscriptionId);
      }

      // Get updated subscription
      const sub = await creemClient.getSubscription(subscriptionId);
      return this.mapCreemSubscription(sub);
    } catch (error) {
      console.error('[creem-provider] updateSubscription error:', error);
      throw new Error('Failed to update Creem subscription');
    }
  }

  /**
   * Cancel subscription (at period end by default)
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await creemClient.cancelSubscription(subscriptionId, {
        mode: 'scheduled',
        onExecute: 'cancel',
      });
      return true;
    } catch (error) {
      console.error('[creem-provider] cancelSubscription error:', error);
      return false;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
    try {
      const sub = await creemClient.getSubscription(subscriptionId);
      return this.mapCreemSubscription(sub);
    } catch (error) {
      console.error('[creem-provider] getSubscription error:', error);
      return null;
    }
  }

  /**
   * Get payment status
   * Creem doesn't have a direct PaymentIntent equivalent - check checkout status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    try {
      const checkout = await creemClient.getCheckout(paymentId);
      return this.mapCreemStatus(checkout.status);
    } catch (error) {
      console.error('[creem-provider] getPaymentStatus error:', error);
      throw new Error('Failed to get Creem payment status');
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  async verifyWebhook(payload: string, signature: string): Promise<boolean> {
    try {
      if (!creemConfig.webhookSecret) {
        throw new Error('CREEM_WEBHOOK_SECRET is required for webhook verification');
      }

      const expectedSignature = crypto
        .createHmac('sha256', creemConfig.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('[creem-provider] verifyWebhook error:', error);
      return false;
    }
  }

  // --- Private helpers ---

  private mapCreemSubscription(sub: CreemSubscription): SubscriptionResult {
    return {
      id: sub.id,
      status: sub.status as PaymentStatus,
      customerId: sub.customer_id || getRelationId(sub.customer),
      priceId: sub.product_id || getRelationId(sub.product),
      interval: sub.interval || null,
      periodStart: this.getPeriodStart(sub),
      periodEnd: this.getPeriodEnd(sub),
      trialStart: sub.trial_start ? new Date(sub.trial_start) : undefined,
      trialEnd: sub.trial_end ? new Date(sub.trial_end) : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end || sub.status === 'scheduled_cancel',
      currentPeriodStart: this.getPeriodStart(sub) || new Date(),
      currentPeriodEnd: this.getPeriodEnd(sub) || new Date(),
    };
  }

  private getPeriodStart(sub: CreemSubscription): Date | undefined {
    const value = sub.current_period_start || sub.current_period_start_date;
    return value ? new Date(value) : undefined;
  }

  private getPeriodEnd(sub: CreemSubscription): Date | undefined {
    const value = sub.current_period_end || sub.current_period_end_date;
    return value ? new Date(value) : undefined;
  }

  private mapCreemStatus(status: string): PaymentStatus {
    switch (status) {
      case 'active':
      case 'complete':
      case 'completed':
        return 'active';
      case 'canceled':
      case 'cancelled':
        return 'canceled';
      case 'scheduled_cancel':
        return 'scheduled_cancel';
      case 'past_due':
        return 'past_due';
      case 'trialing':
        return 'trialing';
      case 'paused':
        return 'paused';
      case 'expired':
        return 'expired';
      default:
        return 'incomplete';
    }
  }
}

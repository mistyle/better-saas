/**
 * Payment Service - Factory Pattern
 *
 * Routes requests to the configured payment provider adapter.
 * Inspired by ShipFree's multi-provider architecture.
 */

import { CreemProvider } from './creem/provider';
import { StripeProvider } from './stripe/provider';
import type { PaymentProvider } from './types';

export type PaymentProviderName = 'stripe' | 'creem';

// Singleton instance of the active adapter
let paymentProviderInstance: PaymentProvider | null = null;

/**
 * Get the active payment provider name from environment
 */
export function getActivePaymentProviderName(): PaymentProviderName {
  return (process.env.PAYMENT_PROVIDER as PaymentProviderName) || 'stripe';
}

/**
 * Build a provider instance by name.
 */
export function createPaymentProvider(providerName: PaymentProviderName): PaymentProvider {
  switch (providerName) {
    case 'creem':
      return new CreemProvider();
    case 'stripe':
      return new StripeProvider();
    default:
      return new StripeProvider();
  }
}

/**
 * Get the active payment provider instance (singleton)
 */
export function getPaymentProvider(): PaymentProvider {
  if (paymentProviderInstance) {
    return paymentProviderInstance;
  }

  const providerName = getActivePaymentProviderName();

  paymentProviderInstance = createPaymentProvider(providerName);

  return paymentProviderInstance;
}

/**
 * Check if the payment system is configured
 */
export function isPaymentSystemConfigured(): boolean {
  try {
    getPaymentProvider();
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset the singleton (useful for testing or hot-reload)
 */
export function resetPaymentProvider(): void {
  paymentProviderInstance = null;
}

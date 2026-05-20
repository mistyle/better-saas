/**
 * Creem API Client
 *
 * Low-level HTTP client for interacting with the Creem API.
 * Base URL: https://api.creem.io/v1
 * Auth: x-api-key header
 */

export interface CreemConfig {
  apiKey: string;
  webhookSecret: string;
  baseUrl: string;
}

export const creemConfig: CreemConfig = {
  apiKey: process.env.CREEM_API_KEY || '',
  webhookSecret: process.env.CREEM_WEBHOOK_SECRET || '',
  baseUrl: process.env.CREEM_API_BASE_URL || 'https://api.creem.io/v1',
};

// --- Request/Response Types ---

export interface CreemCheckoutRequest {
  product_id: string;
  success_url: string;
  cancel_url?: string;
  metadata?: Record<string, string>;
  customer?: {
    id?: string;
    email?: string;
  };
}

export interface CreemCheckoutResponse {
  id: string;
  checkout_url: string;
  status: string;
  product_id?: string;
  product?: string | { id: string };
  customer_id?: string;
  customer?: string | { id: string; email?: string };
  subscription_id?: string;
  subscription?: string | CreemSubscription;
  metadata?: Record<string, string>;
}

export interface CreemSubscription {
  id: string;
  status:
    | 'active'
    | 'canceled'
    | 'scheduled_cancel'
    | 'past_due'
    | 'trialing'
    | 'incomplete'
    | 'paused'
    | 'expired';
  product_id?: string;
  product?: string | { id: string };
  customer_id?: string;
  customer?: string | { id: string; email?: string };
  current_period_start?: string; // ISO date
  current_period_end?: string; // ISO date
  current_period_start_date?: string; // ISO date
  current_period_end_date?: string; // ISO date
  cancel_at_period_end?: boolean;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
  interval?: 'month' | 'year';
  metadata?: Record<string, string>;
}

export interface CreemCancelRequest {
  mode: 'immediate' | 'scheduled';
  onExecute?: 'cancel' | 'pause';
}

export interface CreemCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CreemWebhookEvent {
  id?: string;
  eventType?: string;
  type?: string;
  object?: Record<string, unknown>;
  data?: {
    object?: Record<string, unknown>;
  };
  created_at?: string;
}

// --- HTTP Client ---

class CreemClient {
  private config: CreemConfig;

  constructor(config: CreemConfig) {
    this.config = config;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'x-api-key': this.config.apiKey,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Creem API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  // --- Checkout ---

  async createCheckout(params: CreemCheckoutRequest): Promise<CreemCheckoutResponse> {
    return this.request<CreemCheckoutResponse>('POST', '/checkouts', params);
  }

  async getCheckout(checkoutId: string): Promise<CreemCheckoutResponse> {
    return this.request<CreemCheckoutResponse>('GET', `/checkouts?id=${checkoutId}`);
  }

  // --- Subscriptions ---

  async getSubscription(subscriptionId: string): Promise<CreemSubscription> {
    return this.request<CreemSubscription>('GET', `/subscriptions?id=${subscriptionId}`);
  }

  async cancelSubscription(
    subscriptionId: string,
    params: CreemCancelRequest = { mode: 'scheduled', onExecute: 'cancel' }
  ): Promise<CreemSubscription> {
    return this.request<CreemSubscription>(
      'POST',
      `/subscriptions/${subscriptionId}/cancel`,
      params
    );
  }

  // --- Customers ---

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<CreemCustomer> {
    return this.request<CreemCustomer>('POST', '/customers', {
      email,
      name,
      metadata,
    });
  }

  async getCustomer(customerId: string): Promise<CreemCustomer> {
    return this.request<CreemCustomer>('GET', `/customers?id=${customerId}`);
  }
}

// Export singleton instance
export const creemClient = new CreemClient(creemConfig);

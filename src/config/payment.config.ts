import type { PaymentConfig } from '@/types';

export const paymentConfig: PaymentConfig = {
  // Payment provider
  provider: 'stripe',

  // Base currency
  currency: 'usd',

  // Stripe configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    apiVersion: '2025-06-30.basil',
  },

  // Subscription plans
  plans: [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      price: 0,
      interval: null,
      credits: {
        onSignup: 50, // 注册赠送积分
      },
      features: [
        '50 credits per month',
        'Basic API access',
        '1GB storage',
        'Basic support',
        'Community access',
      ],
      popular: false,
      limits: {
        storage: 1,
        users: 1,
        projects: 3,
        apiCalls: 50,
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Best for professionals',
      price: 49,
      yearlyPrice: 499, // $49 * 10 months (2 months free)
      interval: 'month',
      stripePriceIds: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
      },
      credits: {
        monthly: 1000, // 每月积分
        yearly: 12000, // 年付积分（多送2个月）
        onSubscribe: 1000, // 订阅时立即获得
      },
      features: [
        '1,000 credits per month',
        'Advanced API access',
        '10GB storage',
        'Priority support',
        'Advanced analytics',
        'Custom integrations',
        'Team collaboration',
      ],
      popular: true,
      limits: {
        storage: 10,
        users: 5,
        projects: -1, // unlimited
        apiCalls: 10000,
      },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations',
      price: 199,
      yearlyPrice: 1999, // Updated pricing to match design document
      interval: 'month',
      stripePriceIds: {
        monthly:
          process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
        yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly',
      },
      credits: {
        monthly: 5000, // 每月积分
        yearly: 60000, // 年付积分
        onSubscribe: 5000, // 订阅时立即获得
      },
      features: [
        '5,000 credits per month',
        'Enterprise API access',
        'Unlimited storage',
        '24/7 dedicated support',
        'Custom integrations',
        'Advanced security',
        'SLA guarantee',
        'On-premise deployment',
      ],
      popular: false,
      limits: {
        storage: -1, // unlimited
        users: -1, // unlimited
        projects: -1, // unlimited
        apiCalls: 100000,
      },
    },
  ],

  // Trial configuration
  trial: {
    enabled: true,
    days: 14,
    plans: ['pro', 'enterprise'], // Only these plans support trial
  },

  // Invoice configuration
  invoice: {
    footer:
      'Thank you for your business! If you have any questions, please contact our support team.',
    logo: '/logo.png',
    supportEmail: 'support@better-saas.com',
  },

  // Billing configuration
  billing: {
    collectTaxId: true,
    allowPromotionCodes: true,
    automaticTax: true,
  },

  // Feature flags
  features: {
    subscriptions: true,
    oneTimePayments: true,
    invoices: true,
    customerPortal: true,
    webhooks: true,
  },
};

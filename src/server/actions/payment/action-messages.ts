import { getLocale } from 'next-intl/server';

type PaymentActionMessageKey =
  | 'loginRequired'
  | 'subscriptionNotFoundOrUnauthorized'
  | 'subscriptionNotFoundAtProvider'
  | 'activeSubscriptionExists'
  | 'productNotConfigured'
  | 'createCheckoutFailed'
  | 'redirectingToPayment'
  | 'cancelSubscriptionFailed'
  | 'cancelSubscriptionSuccess'
  | 'getBillingInfoFailed'
  | 'syncSubscriptionFailed'
  | 'syncSubscriptionSuccess';

const messages: Record<'en' | 'zh', Record<PaymentActionMessageKey, string>> = {
  zh: {
    loginRequired: '请先登录',
    subscriptionNotFoundOrUnauthorized: '订阅不存在或无权操作',
    subscriptionNotFoundAtProvider: '支付服务商未找到该订阅',
    activeSubscriptionExists: '您已有活跃的订阅',
    productNotConfigured: '支付产品尚未配置',
    createCheckoutFailed: '创建支付会话失败',
    redirectingToPayment: '正在跳转到支付页面...',
    cancelSubscriptionFailed: '取消订阅失败',
    cancelSubscriptionSuccess: '订阅已设置为在当前周期结束后取消',
    getBillingInfoFailed: '获取账单信息失败',
    syncSubscriptionFailed: '同步订阅失败',
    syncSubscriptionSuccess: '订阅已同步',
  },
  en: {
    loginRequired: 'Please log in first',
    subscriptionNotFoundOrUnauthorized: 'Subscription not found or not authorized',
    subscriptionNotFoundAtProvider: 'Subscription was not found at the payment provider',
    activeSubscriptionExists: 'You already have an active subscription',
    productNotConfigured: 'Payment product is not configured',
    createCheckoutFailed: 'Failed to create payment session',
    redirectingToPayment: 'Redirecting to the payment page...',
    cancelSubscriptionFailed: 'Failed to cancel subscription',
    cancelSubscriptionSuccess: 'The subscription will be canceled at the end of the current period',
    getBillingInfoFailed: 'Failed to load billing info',
    syncSubscriptionFailed: 'Failed to sync subscription',
    syncSubscriptionSuccess: 'Subscription synced',
  },
};

export async function getPaymentActionMessage(key: PaymentActionMessageKey): Promise<string> {
  const locale = await getLocale();
  const language = locale === 'zh' ? 'zh' : 'en';
  return messages[language][key];
}

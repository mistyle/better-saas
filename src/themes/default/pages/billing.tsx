'use client';

import { Calendar, CreditCard, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBilling } from '@/hooks/use-billing';
import { SubscriptionCard } from '@/themes/default/blocks/subscription-card';

export function BillingPage() {
  const {
    billingInfo,
    error,
    isLoading: loading,
    isSyncing: syncing,
    syncSubscription,
    refresh,
  } = useBilling();
  const searchParams = useSearchParams();
  const t = useTranslations('billing');
  const locale = useLocale();

  useEffect(() => {
    if (error) {
      console.error('[billing-page] loadBillingInfo error:', error);
      toast.error(t('get_billing_info_failed'));
    }
  }, [error, t]);

  const handleSyncSubscription = useCallback(async () => {
    if (!billingInfo?.activeSubscription?.subscriptionId) {
      toast.error(t('no_subscription_info'));
      return;
    }

    try {
      await syncSubscription(billingInfo.activeSubscription.subscriptionId);
      toast.success(t('sync_subscription_success'));
    } catch (err) {
      toast.error(t('sync_subscription_failed'));
      console.error('[billing-page] syncSubscription error:', err);
    }
  }, [billingInfo?.activeSubscription?.subscriptionId, syncSubscription, t]);

  // Handle URL parameters to show payment result notifications
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success(t('payment_success_active'), {
        duration: 5000,
      });
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    } else if (canceled === 'true') {
      toast.info(t('payment_success_canceled'), {
        duration: 5000,
      });
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, t]);

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return t('unknow');
    return new Date(date).toLocaleDateString(locale);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('active');
      case 'trialing':
        return t('trial');
      case 'past_due':
        return t('past_due');
      case 'canceled':
        return t('canceled');
      case 'incomplete':
        return t('incomplete');
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'trialing':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'past_due':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'canceled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-destructive">{t('get_billing_info_failed')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded bg-muted" />
        </div>

        {/* Current subscription skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>

        {/* Payment history skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => `payment-skeleton-${i}`).map((key) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-12 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        {billingInfo?.activeSubscription && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncSubscription}
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? t('syncing') : t('sync_subscription_info')}
            </Button>
          </div>
        )}
      </div>

      {/* Current subscription */}
      {billingInfo?.activeSubscription ? (
        <SubscriptionCard subscription={billingInfo.activeSubscription} onUpdate={refresh} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('current_plan')}</CardTitle>
            <CardDescription>{t('current_no_plan')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('goto_plan')}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('current_payment')}
          </CardTitle>
          <CardDescription>{t('all_payment_history')}</CardDescription>
        </CardHeader>
        <CardContent>
          {billingInfo?.paymentHistory && billingInfo.paymentHistory.length > 0 ? (
            <div className="space-y-4">
              {billingInfo.paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {payment.type === 'subscription'
                          ? t('subscription')
                          : t('one_time_payment')}
                      </span>
                      <Badge className={getStatusColor(payment.status)}>
                        {getStatusText(payment.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(payment.createdAt)}</span>
                    </div>
                    {payment.interval && (
                      <div className="text-muted-foreground text-sm">
                        {t('billing_cycle')}:
                        {payment.interval === 'month' ? t('month_payment') : t('year_payment')}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground text-sm">{t('price_id')}</div>
                    <div className="font-mono text-sm">{payment.priceId}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">{t('no_payment_history')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

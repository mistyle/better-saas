'use client';

import { AlertCircle, Calendar, CreditCard } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { PaymentRecord } from '@/payment/types';
import { cancelSubscription } from '@/server/actions/payment/cancel-subscription';

interface SubscriptionCardProps {
  subscription: PaymentRecord;
  onUpdate?: () => void;
}

export function SubscriptionCard({ subscription, onUpdate }: SubscriptionCardProps) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('billing');
  const locale = useLocale();

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return t('subscriptionCard.unknown');
    return new Date(date).toLocaleDateString(locale);
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

  const handleCancelSubscription = () => {
    startTransition(async () => {
      try {
        if (!subscription.subscriptionId) {
          toast.error(t('subscriptionCard.missingSubscriptionId'));
          return;
        }
        const result = await cancelSubscription(subscription.subscriptionId);
        if (result.success) {
          toast.success(t('subscriptionCard.cancelSuccess'));
          onUpdate?.();
        } else {
          console.error('[subscription-card] cancelSubscription failed:', result.error);
          toast.error(t('subscriptionCard.cancelFailed'));
        }
      } catch (error) {
        toast.error(t('subscriptionCard.cancelFailed'));
        console.error('[subscription-card] cancelSubscription error:', error);
      }
    });
  };

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const isTrialing = subscription.status === 'trialing';

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('subscriptionCard.title')}
            </CardTitle>
            <CardDescription>{t('subscriptionCard.description')}</CardDescription>
          </div>
          <Badge className={getStatusColor(subscription.status)}>
            {getStatusText(subscription.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-muted-foreground text-sm">
              {t('subscriptionCard.billingCycle')}
            </div>
            <div className="font-medium">
              {subscription.interval === 'month'
                ? t('subscriptionCard.monthly')
                : subscription.interval === 'year'
                  ? t('subscriptionCard.yearly')
                  : t('subscriptionCard.oneTime')}
            </div>
          </div>

          {subscription.periodStart && subscription.periodEnd && (
            <div>
              <div className="text-muted-foreground text-sm">
                {t('subscriptionCard.currentPeriod')}
              </div>
              <div className="font-medium text-sm">
                {formatDate(subscription.periodStart)} - {formatDate(subscription.periodEnd)}
              </div>
            </div>
          )}
        </div>

        {isTrialing && subscription.trialEnd && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <div className="text-sm">
              <span className="font-medium text-blue-500">{t('subscriptionCard.trialEnd')}</span>
              <span className="ml-1">{formatDate(subscription.trialEnd)}</span>
            </div>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <div className="text-sm">
              <span className="font-medium text-yellow-500">
                {t('subscriptionCard.cancelAtPeriodEnd')}
              </span>
              {subscription.periodEnd && (
                <span className="ml-1">: {formatDate(subscription.periodEnd)}</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Calendar className="h-4 w-4" />
          <span>
            {t('subscriptionCard.startTime', { date: formatDate(subscription.createdAt) })}
          </span>
        </div>
      </CardContent>

      {isActive && !subscription.cancelAtPeriodEnd && (
        <CardFooter>
          <Button
            variant="outline"
            onClick={handleCancelSubscription}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? t('subscriptionCard.processing') : t('subscriptionCard.cancelButton')}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

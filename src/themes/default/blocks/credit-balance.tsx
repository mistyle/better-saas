'use client';

import { Coins, Lock, RefreshCw, TrendingUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreditBalance } from '@/hooks/use-credits';

export function CreditBalance() {
  const t = useTranslations('credits.balance');
  const locale = useLocale();
  const { balance: creditData, error, isLoading, isRefreshing, refresh } = useCreditBalance();

  useEffect(() => {
    if (error) {
      toast.error(t('loadError'));
    }
  }, [error, t]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">{t('title')}</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!creditData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('unable')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('tryAgain')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Available Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">{t('available')}</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl text-primary">
            {creditData.availableBalance.toLocaleString(locale)}
          </div>
          <p className="text-muted-foreground text-xs">{t('ready')}</p>
        </CardContent>
      </Card>

      {/* Total Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">{t('total')}</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{creditData.balance.toLocaleString(locale)}</div>
          <p className="text-muted-foreground text-xs">{t('includingFrozen')}</p>
        </CardContent>
      </Card>

      {/* Frozen Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">{t('frozen')}</CardTitle>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl text-muted-foreground">
            {creditData.frozenBalance.toLocaleString(locale)}
          </div>
          <p className="text-muted-foreground text-xs">{t('temporarilyUnavailable')}</p>
        </CardContent>
      </Card>

      {/* Total Earned */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">{t('earned')}</CardTitle>
          <Badge variant="secondary" className="h-4 px-1 text-xs">
            {t('allTime')}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl text-green-600 dark:text-green-400">
            {creditData.totalEarned.toLocaleString(locale)}
          </div>
          <p className="text-muted-foreground text-xs">{t('lifetime')}</p>
          <div className="mt-2">
            <Button
              onClick={refresh}
              variant="ghost"
              size="sm"
              disabled={isRefreshing}
              className="h-6 px-2 text-xs"
            >
              {isRefreshing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

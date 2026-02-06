'use client';

import { Coins, Lock, RefreshCw, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserCreditAccount } from '@/lib/credits';
import { getCreditBalance } from '@/server/actions/credit-actions';

interface CreditBalanceData extends UserCreditAccount {
  availableBalance: number;
}

export function CreditBalance() {
  const [creditData, setCreditData] = useState<CreditBalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCreditBalance = useCallback(async () => {
    try {
      const result = await getCreditBalance();
      if (result.success && result.data) {
        const data = result.data;
        setCreditData({
          ...data,
          availableBalance: data.balance - data.frozenBalance,
        });
      } else {
        toast.error(result.error || 'Failed to load credit balance');
      }
    } catch (error) {
      toast.error('Failed to load credit balance');
      console.error('Error fetching credit balance:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCreditBalance();
  };

  useEffect(() => {
    fetchCreditBalance();
  }, [fetchCreditBalance]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Credit Balance</CardTitle>
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
          <CardTitle>Credit Balance</CardTitle>
          <CardDescription>Unable to load credit information</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
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
          <CardTitle className="font-medium text-sm">Available Credits</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl text-primary">
            {creditData.availableBalance.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-xs">Ready to use</p>
        </CardContent>
      </Card>

      {/* Total Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Total Balance</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{creditData.balance.toLocaleString()}</div>
          <p className="text-muted-foreground text-xs">Including frozen credits</p>
        </CardContent>
      </Card>

      {/* Frozen Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Frozen Credits</CardTitle>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl text-muted-foreground">
            {creditData.frozenBalance.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-xs">Temporarily unavailable</p>
        </CardContent>
      </Card>

      {/* Total Earned */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Total Earned</CardTitle>
          <Badge variant="secondary" className="h-4 px-1 text-xs">
            All Time
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl text-green-600 dark:text-green-400">
            {creditData.totalEarned.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-xs">Lifetime earnings</p>
          <div className="mt-2">
            <Button
              onClick={handleRefresh}
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

'use client';

import { Activity, Database, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getQuotaUsage } from '@/server/actions/credit-actions';

interface QuotaUsageData {
  apiCalls: {
    used: number;
    limit: number;
    isUnlimited: boolean;
  };
  storage: {
    used: number;
    limit: number;
    isUnlimited: boolean;
  };
}

export function QuotaOverview() {
  const [quotaData, setQuotaData] = useState<QuotaUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuotaUsage = useCallback(async () => {
    try {
      const result = await getQuotaUsage();
      if (result.success && result.data) {
        setQuotaData(result.data);
      } else {
        toast.error(result.error || 'Failed to load quota information');
      }
    } catch (error) {
      toast.error('Failed to load quota information');
      console.error('Error fetching quota usage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotaUsage();
  }, [fetchQuotaUsage]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>Current month usage statistics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-2 w-full rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-2 w-full rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quotaData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>Unable to load usage information</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Usage Overview
        </CardTitle>
        <CardDescription>Current month usage statistics and limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Calls Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="font-medium">API Calls</span>
            </div>
            {quotaData.apiCalls.isUnlimited ? (
              <Badge variant="secondary">Unlimited</Badge>
            ) : (
              <span className="text-muted-foreground text-sm">
                {quotaData.apiCalls.used.toLocaleString()} /{' '}
                {quotaData.apiCalls.limit.toLocaleString()}
              </span>
            )}
          </div>

          {!quotaData.apiCalls.isUnlimited && (
            <>
              <Progress
                value={(quotaData.apiCalls.used / quotaData.apiCalls.limit) * 100}
                className="h-2"
              />
              <div className="flex items-center justify-between text-xs">
                <span
                  className={getUsageColor(
                    (quotaData.apiCalls.used / quotaData.apiCalls.limit) * 100
                  )}
                >
                  {Math.round((quotaData.apiCalls.used / quotaData.apiCalls.limit) * 100)}% used
                </span>
                <span className="text-muted-foreground">
                  {(quotaData.apiCalls.limit - quotaData.apiCalls.used).toLocaleString()} remaining
                </span>
              </div>
            </>
          )}
        </div>

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              <span className="font-medium">Storage</span>
            </div>
            {quotaData.storage.isUnlimited ? (
              <Badge variant="secondary">Unlimited</Badge>
            ) : (
              <span className="text-muted-foreground text-sm">
                {formatBytes(quotaData.storage.used)} / {formatBytes(quotaData.storage.limit)}
              </span>
            )}
          </div>

          {!quotaData.storage.isUnlimited && (
            <>
              <Progress
                value={(quotaData.storage.used / quotaData.storage.limit) * 100}
                className="h-2"
              />
              <div className="flex items-center justify-between text-xs">
                <span
                  className={getUsageColor(
                    (quotaData.storage.used / quotaData.storage.limit) * 100
                  )}
                >
                  {Math.round((quotaData.storage.used / quotaData.storage.limit) * 100)}% used
                </span>
                <span className="text-muted-foreground">
                  {formatBytes(quotaData.storage.limit - quotaData.storage.used)} remaining
                </span>
              </div>
            </>
          )}
        </div>

        {/* Usage Period */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-muted-foreground text-sm">
            <span>Usage Period</span>
            <span>
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

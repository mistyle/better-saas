'use client';

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  History,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import type { CreditTransaction } from '@/lib/credits';
import { getCreditHistory } from '@/server/actions/credit-actions';

interface CreditHistoryProps {
  limit?: number;
  showViewAll?: boolean;
  enablePagination?: boolean;
}

export function CreditHistory({
  limit = 5,
  showViewAll = false,
  enablePagination = false,
}: CreditHistoryProps) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(false);
  const router = useRouter();

  const itemsPerPage = enablePagination ? 10 : limit;

  const fetchTransactions = useCallback(
    async (page = 1) => {
      try {
        setIsLoading(true);
        const offset = (page - 1) * itemsPerPage;
        const result = await getCreditHistory({
          limit: itemsPerPage + 1, // Request one extra to check if there's more data
          offset,
        });

        if (result.success && result.data) {
          const hasMore = result.data.length > itemsPerPage;
          const displayData = hasMore ? result.data.slice(0, itemsPerPage) : result.data;

          setTransactions(displayData);
          setHasMoreData(hasMore);
        } else {
          toast.error(result.error || 'Failed to load credit history');
        }
      } catch (error) {
        toast.error('Failed to load credit history');
        console.error('Error fetching credit history:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [itemsPerPage]
  );

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [fetchTransactions, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn':
      case 'refund':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'spend':
        return <Minus className="h-4 w-4 text-red-500" />;
      case 'admin_adjust':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earn':
      case 'refund':
        return 'text-green-600 dark:text-green-400';
      case 'spend':
        return 'text-red-600 dark:text-red-400';
      case 'admin_adjust':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getSourceBadge = (source: string) => {
    const variants = {
      subscription: 'default',
      api_call: 'secondary',
      admin: 'destructive',
      storage: 'outline',
      bonus: 'secondary',
    } as const;

    return (
      <Badge variant={variants[source as keyof typeof variants] || 'outline'}>
        {source.replace('_', ' ')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={`skeleton-${i}`}
            className="flex animate-pulse items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="space-y-1">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
            <div className="space-y-1 text-right">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center">
        <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 font-medium text-lg">No transactions yet</h3>
        <p className="mb-4 text-muted-foreground">
          Your credit transactions will appear here once you start using the platform.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">{getTransactionIcon(transaction.type)}</div>
            <div>
              <div className="font-medium">
                {transaction.description || `${transaction.type} credits`}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                {getSourceBadge(transaction.source)}
                <span>•</span>
                <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-medium ${getTransactionColor(transaction.type)}`}>
              {transaction.type === 'spend' ? '-' : '+'}
              {transaction.amount.toLocaleString()}
            </div>
            <div className="text-muted-foreground text-sm">
              Balance: {transaction.balanceAfter.toLocaleString()}
            </div>
          </div>
        </div>
      ))}

      {showViewAll && (
        <div className="border-t pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/credits/history')}
          >
            View All Transactions
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {enablePagination && (
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-muted-foreground text-sm">Page {currentPage}</span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasMoreData || isLoading}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

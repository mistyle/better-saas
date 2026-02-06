'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';
import { CreditHistory } from '../blocks/credit-history';

export function CreditHistoryPage() {
  const _router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    // TODO: Implement export functionality
    setTimeout(() => {
      setIsExporting(false);
    }, 2000);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-bold text-3xl">Credit History</h1>
            <p className="text-muted-foreground">
              Complete history of all your credit transactions
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={isExporting} className="gap-2">
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            Complete list of your credit earnings, spending, and adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreditHistory limit={10} showViewAll={false} enablePagination={true} />
        </CardContent>
      </Card>
    </div>
  );
}

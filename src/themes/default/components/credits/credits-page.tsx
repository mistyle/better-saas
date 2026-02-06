'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditBalance } from './credit-balance';
import { CreditHistory } from './credit-history';
import { QuotaOverview } from './quota-overview';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';

export function CreditsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Credits</h1>
          <p className="text-muted-foreground">Manage your credits and view usage history</p>
        </div>
      </div>

      {/* Credit Balance Card */}
      <CreditBalance />

      {/* Upgrade Prompt */}
      <Card className="border-2 border-primary/20 border-dashed bg-primary/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Need More Credits?</CardTitle>
          <CardDescription>
            Upgrade your subscription to get more credits every month automatically!
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => router.push('/#pricing')} className="gap-2">
              View Plans
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => router.push('/credits/history')}>
              View History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quota Overview */}
      <QuotaOverview />

      {/* Recent Credit History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest credit transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <CreditHistory limit={5} showViewAll={true} />
        </CardContent>
      </Card>
    </div>
  );
}

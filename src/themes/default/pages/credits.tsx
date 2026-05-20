'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';
import { CreditBalance } from '../blocks/credit-balance';
import { CreditHistory } from '../blocks/credit-history';

export function CreditsPage() {
  const t = useTranslations('credits');
  const router = useRouter();

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
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
          <CardTitle className="text-xl">{t('upgradeTitle')}</CardTitle>
          <CardDescription>{t('upgradeDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => router.push('/#pricing')} className="gap-2">
              {t('viewPlans')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => router.push('/credits/history')}>
              {t('viewHistory')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Credit History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentActivity')}</CardTitle>
          <CardDescription>{t('recentDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreditHistory limit={5} showViewAll={true} />
        </CardContent>
      </Card>
    </div>
  );
}

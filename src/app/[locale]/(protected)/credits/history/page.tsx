import { Suspense } from 'react';
import { CreditHistoryPage } from '@/themes/default/components/credits/credit-history-page';
import { CreditsPageSkeleton } from '@/themes/default/components/credits/credits-skeleton';

export default function CreditHistoryPageRoute() {
  return (
    <Suspense fallback={<CreditsPageSkeleton />}>
      <CreditHistoryPage />
    </Suspense>
  );
}

import { Suspense } from 'react';
import { CreditHistoryPage } from '@/themes/default/pages/credit-history';
import { CreditsPageSkeleton } from '@/themes/default/blocks/credits-skeleton';

export default function CreditHistoryPageRoute() {
  return (
    <Suspense fallback={<CreditsPageSkeleton />}>
      <CreditHistoryPage />
    </Suspense>
  );
}

import { Suspense } from 'react';
import { getThemeBlock, getThemePage } from '@/themes';

export default async function CreditHistoryPageRoute() {
  const { CreditHistoryPage } = await getThemePage('credit-history');
  const { CreditsPageSkeleton } = await getThemeBlock('credits-skeleton');
  return (
    <Suspense fallback={<CreditsPageSkeleton />}>
      <CreditHistoryPage />
    </Suspense>
  );
}

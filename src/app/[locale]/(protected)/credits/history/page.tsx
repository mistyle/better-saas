import { Suspense } from 'react';
import { getThemePage, getThemeBlock } from '@/themes/loader';

export default async function CreditHistoryPageRoute() {
  const { CreditHistoryPage } = await getThemePage('credit-history');
  const { CreditsPageSkeleton } = await getThemeBlock('credits-skeleton');
  return (
    <Suspense fallback={<CreditsPageSkeleton />}>
      <CreditHistoryPage />
    </Suspense>
  );
}

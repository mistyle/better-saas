import { Suspense } from 'react';
import { getThemeBlock, getThemePage } from '@/themes';

export default async function CreditsPageRoute() {
  const { CreditsPage } = await getThemePage('credits');
  const { CreditsPageSkeleton } = await getThemeBlock('credits-skeleton');
  return (
    <Suspense fallback={<CreditsPageSkeleton />}>
      <CreditsPage />
    </Suspense>
  );
}

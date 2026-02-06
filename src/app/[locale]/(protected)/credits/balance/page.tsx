import { Suspense } from 'react';
import { getThemePage, getThemeBlock } from '@/themes/loader';

export default async function CreditsPageRoute() {
  const { CreditsPage } = await getThemePage('credits');
  const { CreditsPageSkeleton } = await getThemeBlock('credits-skeleton');
  return (
    <Suspense fallback={<CreditsPageSkeleton />}>
      <CreditsPage />
    </Suspense>
  );
}

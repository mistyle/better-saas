import { Suspense } from 'react';
import { CreditsPage } from '@/themes/default/components/credits/credits-page';
import { CreditsPageSkeleton } from '@/themes/default/components/credits/credits-skeleton';

export default function CreditsPageRoute() {
  return (
    <Suspense fallback={<CreditsPageSkeleton />}>
      <CreditsPage />
    </Suspense>
  );
}

import { Suspense } from 'react';
import { CreditsPage } from '@/themes/default/pages/credits';
import { CreditsPageSkeleton } from '@/themes/default/blocks/credits-skeleton';

export default function CreditsPageRoute() {
  return (
    <Suspense fallback={<CreditsPageSkeleton />}>
      <CreditsPage />
    </Suspense>
  );
}

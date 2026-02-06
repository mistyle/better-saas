import type { ReactNode } from 'react';
import { RouteGuard } from '@/components/route-guard';
import { getThemeLayout } from '@/themes/loader';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import PermissionWrapper from '@/components/auth/permission-wrapper';
import { Suspense } from 'react';

// Force dynamic rendering for all dashboard routes
// This is necessary because dashboard pages require admin permissions
export const dynamic = 'force-dynamic';

type Props = {
  children: ReactNode;
};

/**
 * Dashboard layout - Handles authentication, admin permissions, and layout
 * All pages under /dashboard require:
 * 1. User authentication (AuthGuard)
 * 2. Admin permissions (PermissionWrapper)
 * 3. Dashboard-specific layout (ProtectedLayoutClient)
 */
export default async function DashboardLayout({ children }: Props) {
  const { ProtectedLayoutClient } = await getThemeLayout('protected');
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <RouteGuard useSkeletonFallback>
        <PermissionWrapper>
          <ProtectedLayoutClient>{children}</ProtectedLayoutClient>
        </PermissionWrapper>
      </RouteGuard>
    </Suspense>
  );
} 
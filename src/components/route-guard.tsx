'use client';

import { ArrowLeft, Loader2, Lock, Shield } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';
import { useIsAdmin } from '@/components/auth/permission-provider';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthInitialized, useAuthLoading, useIsAuthenticated } from '@/lib/auth/use-auth';

interface RouteGuardProps {
  children: React.ReactNode;
  /** Require admin role to access */
  requireAdmin?: boolean;
  /** Custom fallback while loading */
  fallback?: React.ReactNode;
  /** Redirect URL when not authenticated */
  redirectTo?: string;
  /** Redirect URL when not admin (only used with requireAdmin) */
  adminRedirectTo?: string;
  /** Show login prompt card when not authenticated */
  showLoginPrompt?: boolean;
  /** Show access denied card when not admin */
  showAccessDenied?: boolean;
  /** Use skeleton loading instead of spinner */
  useSkeletonFallback?: boolean;
}

export function RouteGuard({
  children,
  requireAdmin = false,
  fallback,
  redirectTo = '/login',
  adminRedirectTo = '/settings/profile',
  showLoginPrompt = true,
  showAccessDenied = true,
  useSkeletonFallback = false,
}: RouteGuardProps) {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const isInitialized = useAuthInitialized();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');

  // Only call useIsAdmin when requireAdmin is true
  // The hook is always called to satisfy React rules, but only used conditionally
  let isAdmin = false;
  try {
    isAdmin = useIsAdmin();
  } catch {
    // PermissionProvider not available — treat as non-admin
    isAdmin = false;
  }

  const getCurrentPath = useCallback(() => {
    const search = searchParams.toString();
    return pathname + (search ? `?${search}` : '');
  }, [pathname, searchParams]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated) {
      const currentPath = getCurrentPath();
      const separator = redirectTo.includes('?') ? '&' : '?';
      const loginUrl = `${redirectTo}${separator}callbackUrl=${currentPath}`;
      router.push(loginUrl);
    }
  }, [isInitialized, isLoading, isAuthenticated, redirectTo, router, getCurrentPath]);

  // Redirect non-admin users (when requireAdmin is true)
  useEffect(() => {
    if (requireAdmin && isInitialized && !isLoading && isAuthenticated && !isAdmin) {
      router.push(adminRedirectTo);
    }
  }, [requireAdmin, isInitialized, isLoading, isAuthenticated, isAdmin, adminRedirectTo, router]);

  // Loading state
  if (!isInitialized || isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }
    if (useSkeletonFallback) {
      return <LoadingSkeleton />;
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground text-sm">{t('loading')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (!showLoginPrompt) {
      return null;
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{t('accessDenied')}</CardTitle>
            <CardDescription>{t('loginRequired')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                const currentPath = getCurrentPath();
                const separator = redirectTo.includes('?') ? '&' : '?';
                const loginUrl = `${redirectTo}${separator}callbackUrl=${currentPath}`;
                router.push(loginUrl);
              }}
              className="w-full"
            >
              {t('login')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not admin (when requireAdmin is true)
  if (requireAdmin && !isAdmin) {
    if (!showAccessDenied) {
      return null;
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
              <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle>{t('adminRequired')}</CardTitle>
            <CardDescription>{t('adminRequiredDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => router.push(adminRedirectTo)}
              className="w-full"
              variant="default"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('goBack')}
            </Button>
            <Button onClick={() => router.push('/')} className="w-full" variant="outline">
              {t('goHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Backward-compatible aliases
export const AuthGuard = RouteGuard;
export const AdminGuard = (props: Omit<RouteGuardProps, 'requireAdmin'>) => (
  <RouteGuard {...props} requireAdmin useSkeletonFallback />
);

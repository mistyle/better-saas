'use client';

import { CreditCard, UserCheck, UserPlus, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { AdminGuard } from '@/components/route-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserStats } from '@/hooks/use-users';
import { themeBlock } from '@/themes/client-loader';

const UserList = themeBlock('user-list', 'UserList');

export default function UsersPage() {
  const sidebarT = useTranslations('sidebar');
  const t = useTranslations('dashboardUsers');
  const locale = useLocale();
  const { stats, error, isLoading: loading } = useUserStats();

  useEffect(() => {
    if (error) {
      console.error('Error fetching user stats:', error);
      toast.error(t('statsError'));
    }
  }, [error, t]);

  const formatNumber = (num: number) => {
    return num.toLocaleString(locale);
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">{sidebarT('users')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">{t('totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
                </div>
              ) : (
                <div className="font-bold text-2xl">{formatNumber(stats?.totalUsers || 0)}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">{t('activeUsers')}</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
                </div>
              ) : (
                <div className="font-bold text-2xl">{formatNumber(stats?.activeUsers || 0)}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">{t('newUsers')}</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
                </div>
              ) : (
                <div className="font-bold text-2xl">{formatNumber(stats?.newUsers || 0)}</div>
              )}
              <p className="text-muted-foreground text-xs">{t('last30Days')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">{t('paidUsers')}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
                </div>
              ) : (
                <div className="font-bold text-2xl">{formatNumber(stats?.paidUsers || 0)}</div>
              )}
              <p className="text-muted-foreground text-xs">{t('notTracked')}</p>
            </CardContent>
          </Card>
        </div>

        <UserList />
      </div>
    </AdminGuard>
  );
}

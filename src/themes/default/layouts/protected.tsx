'use client';

import { ProtectedContainer } from '@/themes/default/layouts/protected-container';
import { useIsAdmin } from '@/components/auth/permission-provider';
import type { SidebarGroup } from '@/types';
import { Coins, History, CreditCard, Files, Shield, Users, Key } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

interface ProtectedLayoutClientProps {
  children: ReactNode;
}

export function ProtectedLayoutClient({ children }: ProtectedLayoutClientProps) {
  const t = useTranslations('sidebar');
  const isAdmin = useIsAdmin();

  const sidebarGroups: SidebarGroup[] = useMemo(() => {
    const groups: SidebarGroup[] = [];

    // only admin can see Dashboard menu
    if (isAdmin) {
      groups.push({
        title: t('dashboard'),
        defaultOpen: true,
        items: [
          {
            title: t('users'),
            href: '/dashboard/users',
            icon: Users,
          },
          {
            title: t('files'),
            href: '/dashboard/files',
            icon: Files,
          },
        ],
      });
    }

    // all users can see Credits menu
    groups.push({
      title: t('credits'),
      defaultOpen: true,
      items: [
        {
          title: t('balance'),
          href: '/credits/balance',
          icon: Coins,
        },
        {
          title: t('history'),
          href: '/credits/history',
          icon: History,
        },
        {
          title: t('apiKeys'),
          href: '/credits/api-keys',
          icon: Key,
        },
      ],
    });

    // all users can see Settings menu
    groups.push({
      title: t('settings'),
      defaultOpen: true,
      items: [
        {
          title: t('profile'),
          href: '/settings/profile',
          icon: Users,
        },
        {
          title: t('billing'),
          href: '/settings/billing',
          icon: CreditCard,
        },
        {
          title: t('security'),
          href: '/settings/security',
          icon: Shield,
        },
      ],
    });

    return groups;
  }, [isAdmin, t]);

  return <ProtectedContainer sidebarGroups={sidebarGroups}>{children}</ProtectedContainer>;
}

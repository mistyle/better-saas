'use client';

import { Coins, CreditCard, Files, FolderOpen, History, Key, PenTool, Shield, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useIsAdmin } from '@/components/auth/permission-provider';
import { ProtectedContainer } from '@/themes/default/layouts/protected-container';
import type { SidebarGroup } from '@/types';

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
          {
            title: t('blog'),
            href: '/dashboard/blog',
            icon: PenTool,
          },
          {
            title: t('blogCategories'),
            href: '/dashboard/blog/categories',
            icon: FolderOpen,
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

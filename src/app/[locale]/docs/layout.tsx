import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { i18nConfig } from '@/config/i18n.config';
import { locales } from '@/i18n/routing';
import { buildDocsTree } from '@/lib/fumadocs/docs';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

type DocsLayoutTreeItem =
  | {
      type: 'folder';
      name: string;
      defaultOpen?: boolean;
      children: DocsLayoutTreeItem[];
    }
  | {
      type: 'page';
      name: string;
      url: string;
    };

export default async function Layout({ children, params }: Props) {
  const { locale } = await params;
  const messages = await getMessages();
  const t = await getTranslations('docsLayout');

  // Get the nested tree structure
  const treeItems = buildDocsTree(locale);

  // Helper function to generate correct URL based on locale prefix setting
  const getLocalizedUrl = (path: string) => {
    if (locale === i18nConfig.defaultLocale && i18nConfig.routing.localePrefix === 'as-needed') {
      // For default locale with 'as-needed', don't include locale prefix
      return path;
    }
    // For non-default locales, include locale prefix
    return `/${locale}${path}`;
  };

  const convertTreeItems = (items: typeof treeItems): DocsLayoutTreeItem[] => {
    return items.map((item) => {
      if (item.type === 'folder') {
        return {
          type: 'folder',
          name: item.name,
          defaultOpen: item.defaultOpen,
          children: item.children ? convertTreeItems(item.children) : [],
        };
      }
      return {
        type: 'page',
        name: item.name,
        url: getLocalizedUrl(item.url || ''),
      };
    });
  };

  const tree = {
    name: t('treeName'),
    children: convertTreeItems(treeItems),
  };

  const navUrl = getLocalizedUrl('/docs');

  return (
    <RootProvider
      i18n={{
        locale,
        locales,
        translations: messages.Docs,
      }}
      theme={{
        enabled: false,
      }}
    >
      <DocsLayout
        tree={tree}
        nav={{
          title: t('navTitle'),
          url: navUrl,
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}

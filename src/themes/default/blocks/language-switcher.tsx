'use client';

import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEnabledLanguages } from '@/hooks/use-config';
import { usePathname } from '@/i18n/navigation';

interface EnabledLanguage {
  locale: string;
  name?: string;
  nativeName?: string;
  flag?: string;
  dir?: 'ltr' | 'rtl';
  enabled?: boolean;
}

export function LanguageSwitcher() {
  const _t = useTranslations('common');
  const locale = useLocale();
  const _router = useRouter();
  const pathname = usePathname();
  const locales = useEnabledLanguages();

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;

    let targetUrl: string;

    if (newLocale === 'en') {
      targetUrl = pathname === '/' ? '/' : pathname;
    } else {
      targetUrl = `/${newLocale}${pathname === '/' ? '' : pathname}`;
    }

    // set cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${30 * 24 * 60 * 60}`;

    // force refresh page to ensure language switch takes effect
    window.location.href = targetUrl;
  };

  const currentLanguage = locales.find((lang: EnabledLanguage) => lang.locale === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {currentLanguage?.nativeName || 'English'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((lang: EnabledLanguage) => (
          <DropdownMenuItem
            key={lang.locale}
            onClick={() => handleLanguageChange(lang.locale)}
            className={locale === lang.locale ? 'bg-accent' : ''}
          >
            {lang.nativeName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

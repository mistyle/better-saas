'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatarMenu } from '@/themes/default/blocks/user-avatar-menu';

export function DashboardHeader() {
  const t = useTranslations('theme');
  const { setTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Left side - Search */}
      <div className="flex flex-1 items-center space-x-4"> </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-4">
        {/* Theme Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Sun className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">{t('toggle')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>{t('light')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>{t('dark')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>{t('system')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <UserAvatarMenu />
      </div>
    </header>
  );
}

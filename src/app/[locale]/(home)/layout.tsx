import { getThemeLayout } from '@/core/theme';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default async function MarketingLayout({ children }: Props) {
  const { LandingLayout } = await getThemeLayout('landing');
  return <LandingLayout>{children}</LandingLayout>;
} 
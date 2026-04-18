import type { ReactNode } from 'react';
import { getThemeLayout } from '@/themes';

type Props = {
  children: ReactNode;
};

export default async function MarketingLayout({ children }: Props) {
  const { LandingLayout } = await getThemeLayout('landing');
  return <LandingLayout>{children}</LandingLayout>;
}

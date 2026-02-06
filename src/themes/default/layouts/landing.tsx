import { Footer } from '@/components/blocks/footer/footer';
import { NavbarWrapper } from '@/components/blocks/navbar/navbar-wrapper';
import type { ReactNode } from 'react';

interface LandingLayoutProps {
  children: ReactNode;
}

export function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavbarWrapper />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

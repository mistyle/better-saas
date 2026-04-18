import type { ReactNode } from 'react';
import { Footer } from '../blocks/footer';
import { NavbarWrapper } from '../blocks/navbar';

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

'use client';

import { cn } from '@/lib/utils';
import type { ViewportSize } from '@/types/blocks';

interface ResponsivePreviewProps {
  viewport: ViewportSize;
  children: React.ReactNode;
  className?: string;
}

const viewportStyles = {
  desktop: 'w-full max-w-none',
  tablet: 'w-[768px] max-w-[768px]',
  mobile: 'w-[375px] max-w-[375px]',
};

export function ResponsivePreview({ viewport, children, className }: ResponsivePreviewProps) {
  return (
    <div className="flex justify-center bg-muted/30 p-6">
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          'border border-border bg-background shadow-sm',
          'overflow-hidden rounded-lg',
          viewportStyles[viewport],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

'use client';

import type { ViewportSize } from '@/types/blocks';
import { useState } from 'react';
import { CodeDisplay } from './code-display';
import { ComponentPreviewToolbar } from './component-preview-toolbar';
import { ResponsivePreview } from './responsive-preview';

interface ComponentPreviewWrapperProps {
  name: string;
  code: string;
  children: React.ReactNode;
}

export function ComponentPreviewWrapper({ name, code, children }: ComponentPreviewWrapperProps) {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b bg-muted/50 px-4 py-3">
        <h3 className="font-semibold text-lg">{name}</h3>
      </div>

      <ComponentPreviewToolbar
        viewport={viewport}
        onViewportChange={setViewport}
        showCode={showCode}
        onShowCodeChange={setShowCode}
      />

      {showCode ? (
        <CodeDisplay code={code} />
      ) : (
        <ResponsivePreview viewport={viewport}>{children}</ResponsivePreview>
      )}
    </div>
  );
}

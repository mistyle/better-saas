'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorLogger } from '@/lib/logger/logger-utils';

const codeDisplayErrorLogger = new ErrorLogger('code-display');

interface CodeDisplayProps {
  code: string;
  language?: string;
}

export function CodeDisplay({ code, language = 'tsx' }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      codeDisplayErrorLogger.logError(err as Error, {
        operation: 'copyToClipboard',
        code: `${code.substring(0, 100)}...`,
      });
    }
  };

  return (
    <div className="relative border-t bg-muted/50">
      <div className="flex items-center justify-between border-b bg-muted px-4 py-2">
        <span className="font-medium text-muted-foreground text-sm">{language.toUpperCase()}</span>
        <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 w-8 p-0">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <ScrollArea className="h-96">
        <pre className="p-4 text-sm">
          <code className="text-foreground">{code}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}

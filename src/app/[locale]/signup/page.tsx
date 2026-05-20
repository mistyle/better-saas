import { Loader2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { getThemeBlock } from '@/themes';

export default async function SignupPage() {
  const t = await getTranslations('common');
  const { SignupForm } = await getThemeBlock('signup');
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Suspense
          fallback={
            <div className="flex w-full max-w-sm flex-col items-center gap-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">{t('loading')}</p>
            </div>
          }
        >
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}

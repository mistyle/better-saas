import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SimpleApiKeyManager } from '@/themes/default/components/api-keys/simple-api-key-manager';
import { ApiUsageGuide } from '@/themes/default/components/api-keys/api-usage-guide';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.apiKeys');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ApiKeysPage() {
  const t = await getTranslations('settings.apiKeys');
  return (
    <div className="space-y-6" data-testid="api-keys-content">
      <div>
        <h1 className='font-bold text-3xl tracking-tight'>{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <SimpleApiKeyManager />

      <ApiUsageGuide />
    </div>
  );
}

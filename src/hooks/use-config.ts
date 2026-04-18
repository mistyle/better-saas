import { useMemo } from 'react';
import { appConfig, featuresConfig, i18nConfig, navbarConfig, paymentConfig } from '@/config';
import type { AppConfig, I18nConfig, NavbarConfig, PaymentConfig, PaymentPlan } from '@/types';

export function useAppConfig(): AppConfig {
  return useMemo(() => appConfig, []);
}

export function useI18nConfig(): I18nConfig {
  return useMemo(() => i18nConfig, []);
}

export function usePaymentConfig(): PaymentConfig {
  return useMemo(() => paymentConfig, []);
}

export function useNavbarConfig(): NavbarConfig {
  return useMemo(() => navbarConfig, []);
}

export function usePaymentPlans() {
  const config = usePaymentConfig();

  return useMemo(() => {
    return config.plans.filter((plan: PaymentPlan) => {
      if (plan.id === 'free') return true;
      return config.features.subscriptions || config.features.oneTimePayments;
    });
  }, [config]);
}

export function useAdminConfig() {
  const appConf = useAppConfig();

  return useMemo(
    () => ({
      emails: appConf.admin.emails,
      features: featuresConfig.admin,
    }),
    [appConf]
  );
}

export function useIsAdmin(userEmail?: string | null): boolean {
  const { emails } = useAdminConfig();

  return useMemo(() => {
    if (!userEmail || emails.length === 0) return false;
    return emails.includes(userEmail);
  }, [userEmail, emails]);
}

export function useUploadConfig() {
  const appConf = useAppConfig();

  return useMemo(
    () => ({
      ...appConf.upload,
      ...featuresConfig.fileManager,
    }),
    [appConf]
  );
}

export function useEnabledLanguages() {
  const config = useI18nConfig();

  return useMemo(() => {
    return config.locales
      .filter((locale: string) => config.languages[locale]?.enabled)
      .map((locale: string) => ({
        locale,
        ...config.languages[locale],
      }));
  }, [config]);
}

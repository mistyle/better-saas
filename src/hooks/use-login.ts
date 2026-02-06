import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth/auth-client';
import { useAuthLoading, useIsAuthenticated } from '@/lib/auth/use-auth';
import type { LoginFormData, UseLoginReturn } from '@/types/login';
import { useToastMessages } from './use-toast-messages';

export function useLogin(): UseLoginReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toastMessages = useToastMessages();

  const isLoading = useAuthLoading();
  const isAuthenticated = useIsAuthenticated();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get callback URL
  const getRedirectUrl = useCallback(() => {
    const callbackUrl = searchParams.get('callbackUrl');
    return callbackUrl || '/settings/profile';
  }, [searchParams]);

  // Auto redirect after successful login
  useEffect(() => {
    if (isAuthenticated) {
      const redirectUrl = getRedirectUrl();
      router.push(redirectUrl);
    }
  }, [isAuthenticated, router, getRedirectUrl]);

  // Handle social login
  const handleSocialLogin = async (provider: 'github' | 'google') => {
    try {
      setError(null);
      await authClient.signIn.social({ provider });
    } catch (err) {
      console.error('[use-login] socialLogin error:', err);
      toastMessages.error.socialLoginFailed();
    }
  };

  // Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email: formData.email,
        password: formData.password,
      });

      if (result.data) {
        toastMessages.success.loginSuccess();
        const redirectUrl = getRedirectUrl();
        router.push(redirectUrl);
      } else {
        const msg = result.error?.message || 'Login failed';
        setError(msg);
        toastMessages.error.loginFailed(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      toastMessages.error.loginFailed(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear error
  const handleClearError = () => {
    setError(null);
  };

  return {
    formData,
    setFormData,
    isLoading: isLoading || isSubmitting,
    error,
    isAuthenticated,
    handleEmailLogin,
    handleSocialLogin,
    handleClearError,
    getRedirectUrl,
  };
}

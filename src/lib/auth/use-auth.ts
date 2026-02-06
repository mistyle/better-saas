'use client';

import { authClient } from './auth-client';

/**
 * Core session hook — thin wrapper around better-auth's useSession.
 * Returns { data: { user, session } | null, isPending, error }.
 */
export function useSession() {
  return authClient.useSession();
}

export function useUser() {
  const { data } = authClient.useSession();
  return data?.user ?? null;
}

export function useIsAuthenticated() {
  const { data, isPending } = authClient.useSession();
  if (isPending) return false;
  return !!data?.session;
}

export function useAuthLoading() {
  const { isPending } = authClient.useSession();
  return isPending;
}

/**
 * "Initialized" means the first session check has completed.
 * Equivalent to !isPending after the initial fetch.
 */
export function useAuthInitialized() {
  const { isPending } = authClient.useSession();
  return !isPending;
}

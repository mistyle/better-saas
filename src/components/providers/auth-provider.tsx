'use client';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth state is now managed by better-auth's useSession() hook.
 * This provider is kept as a thin wrapper for future extensibility.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>;
}

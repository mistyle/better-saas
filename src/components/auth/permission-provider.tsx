'use client';

import { createContext, type ReactNode, useContext } from 'react';

interface PermissionContextType {
  isAdmin: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
  isAdmin: boolean;
}

export function PermissionProvider({ children, isAdmin }: PermissionProviderProps) {
  return <PermissionContext.Provider value={{ isAdmin }}>{children}</PermissionContext.Provider>;
}

export function useIsAdmin(): boolean {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('useIsAdmin must be used within a PermissionProvider');
  }
  return context.isAdmin;
}

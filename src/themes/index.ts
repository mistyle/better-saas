/**
 * Theme System
 *
 * Unified module containing:
 *   - Theme registry (available theme names)
 *   - Component contracts (type-safe module names + export interfaces)
 *   - Server-side loader (dynamic import + fallback for Server Components)
 *
 * Client Components should use `@/themes/client-loader` instead.
 *
 * Theme is selected via the NEXT_PUBLIC_THEME env var (default: "default").
 * Resolution order: active theme → default theme → throw Error.
 */

import type { ComponentType, ReactNode } from 'react';
import type { LoginFormProps } from '@/types/login';
import type { ProfileContentProps } from '@/types/profile';

// ===========================================================================
// Registry
// ===========================================================================

export const themeNames = ['default'] as const;

export type ThemeName = (typeof themeNames)[number];

// ===========================================================================
// Module Name Union Types
// Derived from file names under src/themes/default/{blocks,layouts,pages}
// ===========================================================================

export type BlockName =
  | 'credit-balance'
  | 'credit-history'
  | 'credits-skeleton'
  | 'dashboard-header'
  | 'faq'
  | 'features'
  | 'file-table'
  | 'file-upload'
  | 'footer'
  | 'hero'
  | 'image-preview-modal'
  | 'language-switcher'
  | 'login'
  | 'navbar'
  | 'pricing'
  | 'purchase-confirmation-dialog'
  | 'signup'
  | 'subscription-card'
  | 'tech-stack'
  | 'theme-toggle'
  | 'user-avatar-menu'
  | 'user-list';

export type LayoutName = 'landing' | 'protected' | 'protected-container' | 'protected-sidebar';

export type PageName =
  | 'api-key-manager'
  | 'billing'
  | 'credit-history'
  | 'credits'
  | 'file-manager'
  | 'home'
  | 'profile'
  | 'security';

// ===========================================================================
// Module Export Contracts
// Each entry maps a module name to the named exports it MUST provide.
// Only modules loaded via getThemeBlock/Page/Layout need entries here.
//
// When adding a new theme component file:
//   1. Add the file name to the corresponding union type above
//   2. If it's loaded via the loader, add an entry below
// ===========================================================================

/** Contracts for block modules loaded via the theme loader */
export interface ThemeBlockContracts {
  login: { LoginForm: ComponentType<LoginFormProps> };
  signup: { SignupForm: ComponentType<React.ComponentProps<'div'>> };
  'credits-skeleton': { CreditsPageSkeleton: ComponentType };
  'user-list': { UserList: ComponentType };
}

/** Contracts for layout modules loaded via the theme loader */
export interface ThemeLayoutContracts {
  landing: { LandingLayout: ComponentType<{ children: ReactNode }> };
  protected: { ProtectedLayoutClient: ComponentType<{ children: ReactNode }> };
}

/** Contracts for page modules loaded via the theme loader */
export interface ThemePageContracts {
  home: { HomePage: ComponentType };
  profile: { ProfileContent: ComponentType<ProfileContentProps> };
  billing: { BillingPage: ComponentType };
  credits: { CreditsPage: ComponentType };
  'credit-history': { CreditHistoryPage: ComponentType };
  'api-key-manager': { SimpleApiKeyManager: ComponentType };
  'file-manager': { FileManager: ComponentType };
  security: { SecurityContent: ComponentType };
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic module fallback
export type AnyModuleExports = Record<string, ComponentType<any>>;

// ===========================================================================
// Server-side Loader
// ===========================================================================

const DEFAULT_THEME: ThemeName = 'default';

export function getActiveTheme(): ThemeName {
  const env = process.env.NEXT_PUBLIC_THEME;
  if (env && themeNames.includes(env as ThemeName)) {
    return env as ThemeName;
  }
  return DEFAULT_THEME;
}

type ThemeCategory = 'blocks' | 'layouts' | 'pages';

/**
 * Generic theme module loader with fallback.
 *
 * Resolution:
 *   active theme → default theme → throw Error
 */
async function loadThemeModule(category: ThemeCategory, modulePath: string) {
  const theme = getActiveTheme();

  if (theme !== DEFAULT_THEME) {
    try {
      return await import(
        /* webpackInclude: /\.tsx?$/ */
        `@/themes/${theme}/${category}/${modulePath}`
      );
    } catch {
      // fall through to default
    }
  }

  try {
    return await import(
      /* webpackInclude: /\.tsx?$/ */
      `@/themes/${DEFAULT_THEME}/${category}/${modulePath}`
    );
  } catch (err) {
    throw new Error(
      `[Theme] Module "${modulePath}" not found in category "${category}" ` +
        `for theme "${theme}" or default theme. ${err instanceof Error ? err.message : ''}`
    );
  }
}

/**
 * Load a block component from the active theme (fallback → default).
 */
export async function getThemeBlock<K extends BlockName>(
  blockName: K
): Promise<K extends keyof ThemeBlockContracts ? ThemeBlockContracts[K] : AnyModuleExports> {
  return loadThemeModule('blocks', blockName);
}

/**
 * Load a layout component from the active theme (fallback → default).
 */
export async function getThemeLayout<K extends LayoutName>(
  layoutName: K
): Promise<K extends keyof ThemeLayoutContracts ? ThemeLayoutContracts[K] : AnyModuleExports> {
  return loadThemeModule('layouts', layoutName);
}

/**
 * Load a page component from the active theme (fallback → default).
 */
export async function getThemePage<K extends PageName>(
  pageName: K
): Promise<K extends keyof ThemePageContracts ? ThemePageContracts[K] : AnyModuleExports> {
  return loadThemeModule('pages', pageName);
}

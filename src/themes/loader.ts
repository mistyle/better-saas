/**
 * Theme Loading Engine
 *
 * Provides dynamic import + fallback theme resolution.
 * Theme name is set via NEXT_PUBLIC_THEME env var (default: "default").
 *
 * Resolution order:
 *   1. Try loading from the active theme
 *   2. Fall back to the "default" theme
 *   3. Throw if neither provides the module
 *
 * Supported categories: blocks, layouts, pages, components
 */

import { themeNames, type ThemeName } from './registry';

const DEFAULT_THEME: ThemeName = 'default';

export function getActiveTheme(): ThemeName {
  const env = process.env.NEXT_PUBLIC_THEME;
  if (env && themeNames.includes(env as ThemeName)) {
    return env as ThemeName;
  }
  return DEFAULT_THEME;
}

type ThemeCategory = 'blocks' | 'layouts' | 'pages' | 'components';

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
      `for theme "${theme}" or default theme. ${err instanceof Error ? err.message : ''}`,
    );
  }
}

/**
 * Load a block component from the active theme (fallback → default).
 */
export async function getThemeBlock(blockName: string) {
  return loadThemeModule('blocks', blockName);
}

/**
 * Load a layout component from the active theme (fallback → default).
 */
export async function getThemeLayout(layoutName: string) {
  return loadThemeModule('layouts', layoutName);
}

/**
 * Load a page component from the active theme (fallback → default).
 */
export async function getThemePage(pageName: string) {
  return loadThemeModule('pages', pageName);
}

/**
 * Load a sub-component from the active theme (fallback → default).
 * Path is relative to themes/<name>/components/, e.g. "settings/profile-content".
 */
export async function getThemeComponent(componentPath: string) {
  return loadThemeModule('components', componentPath);
}

/**
 * Theme Loading Engine
 *
 * Provides dynamic import + fallback theme resolution.
 * Theme name is set via NEXT_PUBLIC_THEME env var (default: "default").
 *
 * All loader functions try the configured theme first, then fall back
 * to the "default" theme on failure.
 */

const DEFAULT_THEME = 'default';

export function getActiveTheme(): string {
  return process.env.NEXT_PUBLIC_THEME || DEFAULT_THEME;
}

/**
 * Dynamically import a block component from the active theme.
 * Falls back to the default theme if the active theme doesn't provide it.
 */
export async function getThemeBlock(blockName: string) {
  const theme = getActiveTheme();

  if (theme !== DEFAULT_THEME) {
    try {
      const mod = await import(`@/themes/${theme}/blocks/${blockName}`);
      return mod;
    } catch {
      // fall through to default
    }
  }

  return import(`@/themes/${DEFAULT_THEME}/blocks/${blockName}`);
}

/**
 * Dynamically import a layout component from the active theme.
 * Falls back to the default theme if the active theme doesn't provide it.
 */
export async function getThemeLayout(layoutName: string) {
  const theme = getActiveTheme();

  if (theme !== DEFAULT_THEME) {
    try {
      const mod = await import(`@/themes/${theme}/layouts/${layoutName}`);
      return mod;
    } catch {
      // fall through to default
    }
  }

  return import(`@/themes/${DEFAULT_THEME}/layouts/${layoutName}`);
}

/**
 * Dynamically import a page component from the active theme.
 * Falls back to the default theme if the active theme doesn't provide it.
 */
export async function getThemePage(pageName: string) {
  const theme = getActiveTheme();

  if (theme !== DEFAULT_THEME) {
    try {
      const mod = await import(`@/themes/${theme}/pages/${pageName}`);
      return mod;
    } catch {
      // fall through to default
    }
  }

  return import(`@/themes/${DEFAULT_THEME}/pages/${pageName}`);
}

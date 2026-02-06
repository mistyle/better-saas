/**
 * Theme Registry
 *
 * Register all available theme names here.
 * The active theme is selected via the NEXT_PUBLIC_THEME env var.
 */
export const themeNames = ['default'] as const;

export type ThemeName = (typeof themeNames)[number];

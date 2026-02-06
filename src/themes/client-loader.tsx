'use client';

/**
 * Client-side Theme Loader
 *
 * Uses next/dynamic to load themed components in Client Components.
 * Same fallback mechanism as the server-side loader:
 *   active theme → default theme
 *
 * Usage:
 *   const LoginForm = themeBlock<LoginFormProps>('login', 'LoginForm');
 *   const ProfileContent = themePage<ProfileProps>('profile', 'ProfileContent');
 */

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

const theme = process.env.NEXT_PUBLIC_THEME || 'default';

export function themeBlock<P extends object = Record<string, unknown>>(
  blockName: string,
  exportName: string,
): ComponentType<P> {
  return dynamic<P>(() =>
    import(
      /* webpackInclude: /\.tsx?$/ */
      `@/themes/${theme}/blocks/${blockName}`
    )
      .then((mod) => ({ default: mod[exportName] as ComponentType<P> }))
      .catch(() =>
        import(
          /* webpackInclude: /\.tsx?$/ */
          `@/themes/default/blocks/${blockName}`
        ).then((mod) => ({ default: mod[exportName] as ComponentType<P> })),
      ),
  );
}

export function themePage<P extends object = Record<string, unknown>>(
  pageName: string,
  exportName: string,
): ComponentType<P> {
  return dynamic<P>(() =>
    import(
      /* webpackInclude: /\.tsx?$/ */
      `@/themes/${theme}/pages/${pageName}`
    )
      .then((mod) => ({ default: mod[exportName] as ComponentType<P> }))
      .catch(() =>
        import(
          /* webpackInclude: /\.tsx?$/ */
          `@/themes/default/pages/${pageName}`
        ).then((mod) => ({ default: mod[exportName] as ComponentType<P> })),
      ),
  );
}

export function themeLayout<P extends object = Record<string, unknown>>(
  layoutName: string,
  exportName: string,
): ComponentType<P> {
  return dynamic<P>(() =>
    import(
      /* webpackInclude: /\.tsx?$/ */
      `@/themes/${theme}/layouts/${layoutName}`
    )
      .then((mod) => ({ default: mod[exportName] as ComponentType<P> }))
      .catch(() =>
        import(
          /* webpackInclude: /\.tsx?$/ */
          `@/themes/default/layouts/${layoutName}`
        ).then((mod) => ({ default: mod[exportName] as ComponentType<P> })),
      ),
  );
}

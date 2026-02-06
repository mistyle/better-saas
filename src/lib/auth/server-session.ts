import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from './auth';

/**
 * Cached server-side session getter.
 * Uses React 19's `cache` to deduplicate auth.api.getSession() calls
 * within a single server render / request lifecycle.
 */
export const getServerSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

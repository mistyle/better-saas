'use server';

import { isAdmin } from '@/lib/auth/permissions';
import { getServerSession } from '@/lib/auth/server-session';

/**
 * Get user admin status on server side
 * Only checks if user is admin, no complex permission calculations needed
 * Note: This function uses headers() and requires dynamic rendering
 */
export async function getUserAdminStatus(): Promise<boolean> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return false;
    }

    return isAdmin(session.user);
  } catch (error) {
    console.error('Error getting user admin status:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

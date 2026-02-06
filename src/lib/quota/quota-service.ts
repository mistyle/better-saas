import { and, eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import db from '@/server/db';
import { userQuotaUsage } from '@/server/db/schema';

export type QuotaService = 'api_call' | 'storage' | 'custom';

export interface UpdateQuotaUsageParams {
  userId: string;
  service: QuotaService;
  amount: number;
  period?: string; // Format: YYYY-MM, defaults to current month
}

export interface QuotaUsageRecord {
  id: string;
  userId: string;
  service: QuotaService;
  period: string;
  usedAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get current period in YYYY-MM format
 */
function getCurrentPeriod(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Update user quota usage for a specific service
 * Creates a new record if it doesn't exist, otherwise increments the existing amount
 */
export async function updateQuotaUsage(params: UpdateQuotaUsageParams): Promise<QuotaUsageRecord> {
  const { userId, service, amount, period = getCurrentPeriod() } = params;

  try {
    // Try to update existing record first
    const updated = await db
      .update(userQuotaUsage)
      .set({
        usedAmount: sql`${userQuotaUsage.usedAmount} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userQuotaUsage.userId, userId),
          eq(userQuotaUsage.service, service),
          eq(userQuotaUsage.period, period)
        )
      )
      .returning();

    if (updated.length > 0) {
      return updated[0] as QuotaUsageRecord;
    }

    // If no existing record, create a new one
    const newRecord = {
      id: uuidv4(),
      userId,
      service,
      period,
      usedAmount: amount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inserted = await db.insert(userQuotaUsage).values(newRecord).returning();

    return inserted[0] as QuotaUsageRecord;
  } catch (error) {
    console.error('Error updating quota usage:', error);
    throw new Error(`Failed to update quota usage for user ${userId}`);
  }
}

/**
 * Get user quota usage for a specific period
 */
export async function getQuotaUsageByPeriod(
  userId: string,
  period: string = getCurrentPeriod()
): Promise<QuotaUsageRecord[]> {
  try {
    const records = await db
      .select()
      .from(userQuotaUsage)
      .where(and(eq(userQuotaUsage.userId, userId), eq(userQuotaUsage.period, period)));

    return records;
  } catch (error) {
    console.error('Error getting quota usage:', error);
    throw new Error(`Failed to get quota usage for user ${userId}`);
  }
}

/**
 * Get user quota usage for a specific service and period
 */
export async function getQuotaUsageByService(
  userId: string,
  service: QuotaService,
  period: string = getCurrentPeriod()
): Promise<QuotaUsageRecord | null> {
  try {
    const records = await db
      .select()
      .from(userQuotaUsage)
      .where(
        and(
          eq(userQuotaUsage.userId, userId),
          eq(userQuotaUsage.service, service),
          eq(userQuotaUsage.period, period)
        )
      )
      .limit(1);

    return records.length > 0 ? (records[0] as QuotaUsageRecord) : null;
  } catch (error) {
    console.error('Error getting quota usage by service:', error);
    throw new Error(`Failed to get quota usage for user ${userId} and service ${service}`);
  }
}

/**
 * Reset user quota usage for a specific period (useful for monthly resets)
 */
export async function resetQuotaUsage(
  userId: string,
  period: string = getCurrentPeriod()
): Promise<void> {
  try {
    await db
      .update(userQuotaUsage)
      .set({
        usedAmount: 0,
        updatedAt: new Date(),
      })
      .where(and(eq(userQuotaUsage.userId, userId), eq(userQuotaUsage.period, period)));
  } catch (error) {
    console.error('Error resetting quota usage:', error);
    throw new Error(`Failed to reset quota usage for user ${userId}`);
  }
}

/**
 * Initialize quota usage records for a new user or new period
 */
export async function initializeQuotaUsage(
  userId: string,
  period: string = getCurrentPeriod()
): Promise<QuotaUsageRecord[]> {
  const services = ['api_call', 'storage'] as const;
  const records = [];

  try {
    for (const service of services) {
      // Check if record already exists
      const existing = await getQuotaUsageByService(userId, service, period);

      if (!existing) {
        const newRecord = {
          id: uuidv4(),
          userId,
          service,
          period,
          usedAmount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const inserted = await db.insert(userQuotaUsage).values(newRecord).returning();

        records.push(inserted[0] as QuotaUsageRecord);
      } else {
        records.push(existing);
      }
    }

    return records;
  } catch (error) {
    console.error('Error initializing quota usage:', error);
    throw new Error(`Failed to initialize quota usage for user ${userId}`);
  }
}

/**
 * Convenience functions for specific services
 */
export const quotaService = {
  // API Call tracking
  trackApiCall: (userId: string, calls = 1) =>
    updateQuotaUsage({ userId, service: 'api_call', amount: calls }),

  // Storage tracking (in bytes)
  trackStorageUsage: (userId: string, bytes: number) =>
    updateQuotaUsage({ userId, service: 'storage', amount: bytes }),

  // Get current usage
  getCurrentUsage: (userId: string) => getQuotaUsageByPeriod(userId),

  // Get specific service usage
  getApiCallUsage: (userId: string, period?: string) =>
    getQuotaUsageByService(userId, 'api_call', period),

  getStorageUsage: (userId: string, period?: string) =>
    getQuotaUsageByService(userId, 'storage', period),

  // Initialize for new users
  initializeForUser: (userId: string) => initializeQuotaUsage(userId),

  // Reset monthly usage
  resetMonthlyUsage: (userId: string, period?: string) => resetQuotaUsage(userId, period),
};

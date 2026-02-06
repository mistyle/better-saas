'use server';

import { getServerSession } from '@/lib/auth/server-session';
import { creditService } from '@/lib/credits';
import { paymentRepository } from '@/server/db/repositories/payment-repository';
import type { ActionResult } from '@/payment/types';
import type { UserCreditAccount, CreditTransaction } from '@/lib/credits';
import { creditsConfig } from '@/config/credits.config';
import db from '@/server/db';
import { userQuotaUsage } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { quotaService, updateQuotaUsage, type QuotaService } from '@/lib/quota/quota-service';

export interface GetCreditBalanceResponse extends UserCreditAccount {
  availableBalance: number;
}

export interface GetCreditHistoryParams {
  limit?: number;
  offset?: number;
}

export interface GetQuotaUsageResponse {
  apiCalls: {
    used: number;
    limit: number;
    isUnlimited: boolean;
  };
  storage: {
    used: number; // in bytes
    limit: number; // in bytes
    isUnlimited: boolean;
  };
}

/**
 * Get user's credit balance
 */
export async function getCreditBalance(): Promise<ActionResult<GetCreditBalanceResponse>> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const account = await creditService.getOrCreateCreditAccount(session.user.id);
    
    return {
      success: true,
      data: {
        ...account,
        availableBalance: account.balance - account.frozenBalance,
      },
    };
  } catch (error) {
    console.error('Error getting credit balance:', error);
    return {
      success: false,
      error: 'Failed to get credit balance',
    };
  }
}

/**
 * Get user's credit transaction history
 */
export async function getCreditHistory(
  params: GetCreditHistoryParams = {}
): Promise<ActionResult<CreditTransaction[]>> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const { limit = 50, offset = 0 } = params;
    const transactions = await creditService.getTransactionHistory(
      session.user.id,
      limit,
      offset
    );
    
    return {
      success: true,
      data: transactions,
    };
  } catch (error) {
    console.error('Error getting credit history:', error);
    return {
      success: false,
      error: 'Failed to get credit history',
    };
  }
}

/**
 * Get user's quota usage for current month
 */
export async function getQuotaUsage(): Promise<ActionResult<GetQuotaUsageResponse>> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Get current period (YYYY-MM format)
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Get user's current subscription to determine limits
    const subscription = await paymentRepository.findActiveSubscriptionByUserId(session.user.id);
    
    // Get actual usage from database
    const usageRecords = await db.select({
      service: userQuotaUsage.service,
      usedAmount: userQuotaUsage.usedAmount,
    }).from(userQuotaUsage)
    .where(and(
      eq(userQuotaUsage.userId, session.user.id),
      eq(userQuotaUsage.period, currentPeriod)
    ));

    // Extract usage data
    const apiCallUsage = usageRecords.find(record => record.service === 'api_call')?.usedAmount || 0;
    const storageUsage = usageRecords.find(record => record.service === 'storage')?.usedAmount || 0;
    
    // Determine limits based on subscription
    const baseApiCallLimit = creditsConfig.freeUser.apiCall.freeQuotaCalls;
    const baseStorageLimit = creditsConfig.freeUser.storage.freeQuotaGB * 1024 * 1024 * 1024; // Convert GB to bytes
    
    let apiCallLimit = baseApiCallLimit;
    let storageLimit = baseStorageLimit;
    const isApiUnlimited = false;
    let isStorageUnlimited = false;

    if (subscription) {
      // User has an active subscription, get limits from payment config
      switch (subscription.priceId) {
        case process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY:
        case process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY:
          apiCallLimit = 10000;
          storageLimit = 10 * 1024 * 1024 * 1024; // 10GB
          break;
        case process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY:
        case process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEARLY:
          apiCallLimit = 100000;
          isStorageUnlimited = true;
          break;
      }
    }
    
    return {
      success: true,
      data: {
        apiCalls: {
          used: apiCallUsage,
          limit: apiCallLimit,
          isUnlimited: isApiUnlimited,
        },
        storage: {
          used: storageUsage,
          limit: storageLimit,
          isUnlimited: isStorageUnlimited,
        },
      },
    };
  } catch (error) {
    console.error('Error getting quota usage:', error);
    return {
      success: false,
      error: 'Failed to get quota usage',
    };
  }
}

/**
 * Admin function to grant credits to a user
 */
export async function grantCreditsToUser(
  userId: string,
  amount: number,
  description?: string
): Promise<ActionResult<CreditTransaction>> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Check if current user is admin (implement your admin check logic)
    // For now, we'll assume only certain users can do this
    // Note: The user type from better-auth might not have role by default
    const userWithRole = session.user as typeof session.user & { role?: string };
    const isAdmin = userWithRole.role === 'admin';
    
    if (!isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be positive',
      };
    }

    const transaction = await creditService.earnCredits({
      userId,
      amount,
      source: 'admin',
      description: description || `Admin granted ${amount} credits`,
      referenceId: `admin_${session.user.id}_${Date.now()}`,
      metadata: {
        grantedBy: session.user.id,
        grantedAt: new Date().toISOString(),
      },
    });
    
    return {
      success: true,
      data: transaction,
      message: `Successfully granted ${amount} credits to user`,
    };
  } catch (error) {
    console.error('Error granting credits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grant credits',
    };
  }
}

/**
 * Spend credits for a specific service
 */
export async function spendCredits(
  amount: number,
  service: 'api_call' | 'storage',
  description?: string,
  referenceId?: string
): Promise<ActionResult<CreditTransaction>> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be positive',
      };
    }

    // Check if user has enough credits
    const hasEnough = await creditService.hasEnoughCredits(session.user.id, amount);
    if (!hasEnough) {
      return {
        success: false,
        error: 'Insufficient credits',
      };
    }

    const transaction = await creditService.spendCredits({
      userId: session.user.id,
      amount,
      source: service,
      description: description || `${service.replace('_', ' ')} usage`,
      referenceId,
      metadata: {
        service,
        timestamp: new Date().toISOString(),
      },
    });
    
    return {
      success: true,
      data: transaction,
    };
  } catch (error) {
    console.error('Error spending credits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to spend credits',
    };
  }
}

/**
 * Update user quota usage for a specific service
 */
export async function updateUserQuotaUsage(
  service: QuotaService,
  amount: number
): Promise<ActionResult<{ used: number; service: QuotaService }>> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const updatedRecord = await updateQuotaUsage({
      userId: session.user.id,
      service,
      amount,
    });

    return {
      success: true,
      data: {
        used: updatedRecord.usedAmount,
        service: updatedRecord.service,
      },
    };
  } catch (error) {
    console.error('Error updating quota usage:', error);
    return {
      success: false,
      error: 'Failed to update quota usage',
    };
  }
}

/**
 * Initialize quota usage for current user (useful for new users)
 */
export async function initializeUserQuotaUsage(): Promise<ActionResult<{ message: string }>> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    await quotaService.initializeForUser(session.user.id);

    return {
      success: true,
      data: {
        message: 'Quota usage initialized successfully',
      },
    };
  } catch (error) {
    console.error('Error initializing quota usage:', error);
    return {
      success: false,
      error: 'Failed to initialize quota usage',
    };
  }
}

'use server';

import { getServerSession } from '@/lib/auth/server-session';
import type { CreditTransaction, UserCreditAccount } from '@/lib/credits';
import { creditService } from '@/lib/credits';
import type { ActionResult } from '@/payment/types';

export interface GetCreditBalanceResponse extends UserCreditAccount {
  availableBalance: number;
}

export interface GetCreditHistoryParams {
  limit?: number;
  offset?: number;
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
    const transactions = await creditService.getTransactionHistory(session.user.id, limit, offset);

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


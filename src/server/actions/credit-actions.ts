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


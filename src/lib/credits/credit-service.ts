import { and, desc, eq, sql } from 'drizzle-orm';
import db from '@/server/db';
import { creditTransactions, userCredits } from '@/server/db/schema';
import { DatabaseError } from '@/server/db/types';

// Credit transaction types
export type CreditTransactionType =
  | 'earn'
  | 'spend'
  | 'refund'
  | 'admin_adjust'
  | 'freeze'
  | 'unfreeze';
export type CreditTransactionSource = 'subscription' | 'api_call' | 'admin' | 'storage' | 'bonus';

export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  source: CreditTransactionSource;
  description?: string;
  referenceId?: string;
  metadata?: string;
  createdAt: Date;
}

export interface UserCreditAccount {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  frozenBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EarnCreditsParams {
  userId: string;
  amount: number;
  source: CreditTransactionSource;
  description?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface SpendCreditsParams {
  userId: string;
  amount: number;
  source: CreditTransactionSource;
  description?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export class CreditService {
  /**
   * Create a credit account for a new user
   */
  async createCreditAccount(userId: string): Promise<UserCreditAccount> {
    try {
      const creditAccount = await db
        .insert(userCredits)
        .values({
          id: crypto.randomUUID(),
          userId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          frozenBalance: 0,
        })
        .returning();

      return creditAccount[0] as UserCreditAccount;
    } catch (error) {
      throw new DatabaseError(`Failed to create credit account: ${error}`);
    }
  }

  /**
   * Get user's credit account
   */
  async getCreditAccount(userId: string): Promise<UserCreditAccount | null> {
    try {
      const account = await db
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      return (account[0] as UserCreditAccount) || null;
    } catch (error) {
      throw new DatabaseError(`Failed to get credit account: ${error}`);
    }
  }

  /**
   * Get or create user's credit account
   */
  async getOrCreateCreditAccount(userId: string): Promise<UserCreditAccount> {
    let account = await this.getCreditAccount(userId);

    if (!account) {
      account = await this.createCreditAccount(userId);
    }

    return account;
  }

  /**
   * Earn credits (add to balance)
   * Uses database transaction to ensure atomicity of balance update + transaction record insert.
   */
  async earnCredits(params: EarnCreditsParams): Promise<CreditTransaction> {
    const { userId, amount, source, description, referenceId, metadata } = params;

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    try {
      return await db.transaction(async (tx) => {
        // Get or create credit account
        let account = await tx
          .select()
          .from(userCredits)
          .where(eq(userCredits.userId, userId))
          .limit(1);

        if (account.length === 0) {
          // Create account if doesn't exist
          await tx.insert(userCredits).values({
            id: crypto.randomUUID(),
            userId,
            balance: 0,
            totalEarned: 0,
            totalSpent: 0,
            frozenBalance: 0,
          });

          account = await tx
            .select()
            .from(userCredits)
            .where(eq(userCredits.userId, userId))
            .limit(1);
        }

        // Atomic update: use sql expression to avoid read-then-write race
        const updated = await tx
          .update(userCredits)
          .set({
            balance: sql`${userCredits.balance} + ${amount}`,
            totalEarned: sql`${userCredits.totalEarned} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(userCredits.userId, userId))
          .returning();

        const updatedAccount = updated[0];
        if (!updatedAccount) {
          throw new Error('Failed to update credit account');
        }

        // Create transaction record
        const transaction = await tx
          .insert(creditTransactions)
          .values({
            id: crypto.randomUUID(),
            userId,
            type: 'earn',
            amount,
            balanceAfter: updatedAccount.balance,
            source,
            description,
            referenceId,
            metadata: metadata ? JSON.stringify(metadata) : null,
          })
          .returning();

        return transaction[0] as CreditTransaction;
      });
    } catch (error) {
      throw new DatabaseError(`Failed to earn credits: ${error}`);
    }
  }

  /**
   * Spend credits (deduct from balance)
   * Uses database transaction + atomic SQL WHERE condition to prevent concurrent over-spending (TOCTOU).
   */
  async spendCredits(params: SpendCreditsParams): Promise<CreditTransaction> {
    const { userId, amount, source, description, referenceId, metadata } = params;

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    try {
      return await db.transaction(async (tx) => {
        // Atomic update with balance check in WHERE clause to prevent concurrent over-spending
        const updated = await tx
          .update(userCredits)
          .set({
            balance: sql`${userCredits.balance} - ${amount}`,
            totalSpent: sql`${userCredits.totalSpent} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userCredits.userId, userId),
              sql`${userCredits.balance} - ${userCredits.frozenBalance} >= ${amount}`
            )
          )
          .returning();

        if (updated.length === 0 || !updated[0]) {
          // Distinguish between account not found and insufficient credits
          const account = await tx
            .select()
            .from(userCredits)
            .where(eq(userCredits.userId, userId))
            .limit(1);

          if (account.length === 0) {
            throw new Error('Credit account not found');
          }
          throw new Error('Insufficient credits');
        }

        const updatedAccount = updated[0];

        // Create transaction record
        const transaction = await tx
          .insert(creditTransactions)
          .values({
            id: crypto.randomUUID(),
            userId,
            type: 'spend',
            amount,
            balanceAfter: updatedAccount.balance,
            source,
            description,
            referenceId,
            metadata: metadata ? JSON.stringify(metadata) : null,
          })
          .returning();

        return transaction[0] as CreditTransaction;
      });
    } catch (error) {
      throw new DatabaseError(`Failed to spend credits: ${error}`);
    }
  }

  /**
   * Check if user has enough credits
   */
  async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    try {
      const account = await this.getCreditAccount(userId);
      if (!account) return false;

      const availableBalance = account.balance - account.frozenBalance;
      return availableBalance >= amount;
    } catch (error) {
      throw new DatabaseError(`Failed to check credit balance: ${error}`);
    }
  }

  /**
   * Get credit transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<CreditTransaction[]> {
    try {
      const transactions = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      return transactions as CreditTransaction[];
    } catch (error) {
      throw new DatabaseError(`Failed to get transaction history: ${error}`);
    }
  }

  /**
   * Refund credits
   */
  async refundCredits(params: EarnCreditsParams): Promise<CreditTransaction> {
    return await this.earnCredits({
      ...params,
      source: params.source,
      description: `Refund: ${params.description || ''}`,
    });
  }

  /**
   * Admin adjust credits (can be positive or negative)
   */
  async adminAdjustCredits(
    userId: string,
    amount: number,
    description?: string,
    referenceId?: string
  ): Promise<CreditTransaction> {
    if (amount > 0) {
      return await this.earnCredits({
        userId,
        amount,
        source: 'admin',
        description: `Admin adjustment: ${description || 'Credit adjustment'}`,
        referenceId,
      });
    }

    return await this.spendCredits({
      userId,
      amount: Math.abs(amount),
      source: 'admin',
      description: `Admin adjustment: ${description || 'Credit adjustment'}`,
      referenceId,
    });
  }

  /**
   * Freeze credits (make them unavailable for spending)
   * Uses database transaction + atomic SQL WHERE condition.
   */
  async freezeCredits(
    userId: string,
    amount: number,
    description?: string,
    referenceId?: string
  ): Promise<CreditTransaction> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    try {
      return await db.transaction(async (tx) => {
        // Atomic update with available balance check
        const updated = await tx
          .update(userCredits)
          .set({
            frozenBalance: sql`${userCredits.frozenBalance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userCredits.userId, userId),
              sql`${userCredits.balance} - ${userCredits.frozenBalance} >= ${amount}`
            )
          )
          .returning();

        if (updated.length === 0 || !updated[0]) {
          const account = await tx
            .select()
            .from(userCredits)
            .where(eq(userCredits.userId, userId))
            .limit(1);

          if (account.length === 0) {
            throw new Error('Credit account not found');
          }
          throw new Error('Insufficient available credits to freeze');
        }

        const updatedAccount = updated[0];

        // Create transaction record
        const transaction = await tx
          .insert(creditTransactions)
          .values({
            id: crypto.randomUUID(),
            userId,
            type: 'freeze',
            amount,
            balanceAfter: updatedAccount.balance, // Balance doesn't change, only frozen amount
            source: 'admin',
            description: description || 'Credits frozen',
            referenceId,
          })
          .returning();

        return transaction[0] as CreditTransaction;
      });
    } catch (error) {
      throw new DatabaseError(`Failed to freeze credits: ${error}`);
    }
  }

  /**
   * Unfreeze credits
   * Uses database transaction + atomic SQL WHERE condition.
   */
  async unfreezeCredits(
    userId: string,
    amount: number,
    description?: string,
    referenceId?: string
  ): Promise<CreditTransaction> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    try {
      return await db.transaction(async (tx) => {
        // Atomic update with frozen balance check
        const updated = await tx
          .update(userCredits)
          .set({
            frozenBalance: sql`${userCredits.frozenBalance} - ${amount}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userCredits.userId, userId),
              sql`${userCredits.frozenBalance} >= ${amount}`
            )
          )
          .returning();

        if (updated.length === 0 || !updated[0]) {
          const account = await tx
            .select()
            .from(userCredits)
            .where(eq(userCredits.userId, userId))
            .limit(1);

          if (account.length === 0) {
            throw new Error('Credit account not found');
          }
          throw new Error('Cannot unfreeze more credits than are frozen');
        }

        const updatedAccount = updated[0];

        // Create transaction record
        const transaction = await tx
          .insert(creditTransactions)
          .values({
            id: crypto.randomUUID(),
            userId,
            type: 'unfreeze',
            amount,
            balanceAfter: updatedAccount.balance, // Balance doesn't change, only frozen amount
            source: 'admin',
            description: description || 'Credits unfrozen',
            referenceId,
          })
          .returning();

        return transaction[0] as CreditTransaction;
      });
    } catch (error) {
      throw new DatabaseError(`Failed to unfreeze credits: ${error}`);
    }
  }
}

// Export singleton instance
export const creditService = new CreditService();

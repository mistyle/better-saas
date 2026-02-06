import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { paymentConfig } from '@/config/payment.config';
import { auth } from '@/lib/auth/auth';
import { creditService } from '@/lib/credits';
import { quotaService } from '@/lib/quota/quota-service';

export async function POST(request: NextRequest) {
  try {
    // Get the current session to verify authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    // Verify that the user can only initialize their own credits
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Can only initialize your own credits' },
        { status: 403 }
      );
    }

    console.log(`🎯 Initializing credit account for user: ${session.user.email}`);

    // Use getOrCreateCreditAccount to handle duplicates
    // Add retry mechanism to handle transient database connection issues
    let creditAccount = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        creditAccount = await creditService.getOrCreateCreditAccount(userId);
        break;
      } catch (err) {
        lastError = err;
        const delay = 200 * attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (!creditAccount) {
      throw lastError ?? new Error('Failed to initialize credit account after retries');
    }

    // Check if this user has already received signup bonus (prevents duplicate grants from social logins)
    const signupReferenceId = `signup_${userId}`;
    const existingSignupTransaction = await creditService
      .getTransactionHistory(userId, 100)
      .then((txs) => txs.find((tx) => tx.referenceId === signupReferenceId))
      .catch(() => null);
    const alreadyReceivedBonus = !!existingSignupTransaction;

    // Check if this is a newly created account (no previous transactions)
    let isNewAccount = false;
    if (!alreadyReceivedBonus) {
      try {
        const existingTransactions = await creditService.getTransactionHistory(userId, 1);
        isNewAccount = existingTransactions.length === 0;
      } catch (_txErr) {
        // Fallback: infer by zero totals on the account to avoid blocking bonus grant
        isNewAccount = creditAccount.totalEarned === 0 && creditAccount.totalSpent === 0;
      }
    }

    let signupCreditsGranted = 0;

    if (isNewAccount && !alreadyReceivedBonus) {
      // Grant signup bonus credits for free plan (only for new accounts)
      const freePlan = paymentConfig.plans.find((p) => p.id === 'free');
      const signupCredits = freePlan?.credits?.onSignup;

      if (signupCredits && signupCredits > 0) {
        await creditService.earnCredits({
          userId,
          amount: signupCredits,
          source: 'bonus',
          description: 'Welcome bonus - thank you for signing up!',
          referenceId: signupReferenceId,
        });
        signupCreditsGranted = signupCredits;
        console.log(`✅ Granted ${signupCredits} signup bonus credits to ${session.user.email}`);
      }
    } else if (alreadyReceivedBonus) {
      console.log(`⚠️ Signup bonus already granted to ${session.user.email}, skipping`);
    }

    // Initialize quota usage tracking
    try {
      await quotaService.initializeForUser(userId);
      console.log(`✅ Initialized quota tracking for ${session.user.email}`);
    } catch (quotaErr) {
      console.error(`Failed to initialize quota for ${session.user.email}:`, quotaErr);
      // Don't throw - quota initialization failure shouldn't block the response
    }

    console.log(`🎉 Successfully initialized credit account for user ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Credit account initialized successfully',
      data: {
        creditAccount,
        signupCreditsGranted,
        isNewAccount,
      },
    });
  } catch (error) {
    console.error('Failed to initialize user credits:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize credits',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

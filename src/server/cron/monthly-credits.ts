import { eq, inArray, isNull, not, or } from 'drizzle-orm';
import { paymentConfig } from '@/config/payment.config';
import { creditService } from '@/lib/credits';
import db from '@/server/db';
import { payment, user } from '@/server/db/schema';

/**
 * Grant monthly free credits to users without active subscriptions
 * This should be run on the 1st of each month
 */
export async function grantMonthlyFreeCredits() {
  console.log('🎁 Starting monthly free credits distribution...');

  try {
    // Get all users who don't have active subscriptions (free users)
    const freeUsers = await db
      .select({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      })
      .from(user)
      .leftJoin(payment, eq(payment.userId, user.id))
      .where(or(isNull(payment.status), not(inArray(payment.status, ['active', 'trialing']))));

    console.log(`Found ${freeUsers.length} free users`);

    const freePlan = paymentConfig.plans.find((p) => p.id === 'free');
    const freeCredits = freePlan?.credits?.monthly || 100;

    if (!freeCredits || freeCredits <= 0) {
      console.log('❌ No monthly credits configured for free plan');
      return { success: false, message: 'No monthly credits configured' };
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    // Process each free user
    for (const user of freeUsers) {
      try {
        // Check if user already has a credit account, create if not
        await creditService.getOrCreateCreditAccount(user.userId);

        // Grant monthly credits
        await creditService.earnCredits({
          userId: user.userId,
          amount: freeCredits,
          source: 'subscription',
          description: 'Monthly free credits',
          referenceId: `free_${new Date().toISOString().slice(0, 7)}`, // YYYY-MM format
          metadata: {
            type: 'monthly_free_credits',
            planId: 'free',
            month: new Date().toISOString().slice(0, 7),
          },
        });

        successCount++;
        console.log(`✅ Granted ${freeCredits} credits to ${user.userEmail} (${user.userId})`);
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ userId: user.userId, error: errorMessage });
        console.error(
          `❌ Failed to grant credits to ${user.userEmail} (${user.userId}):`,
          errorMessage
        );
      }
    }

    console.log('🎯 Monthly free credits distribution completed:');
    console.log(`   ✅ Success: ${successCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log(`   💰 Total credits distributed: ${successCount * freeCredits}`);

    return {
      success: true,
      totalUsers: freeUsers.length,
      successCount,
      errorCount,
      creditsPerUser: freeCredits,
      totalCreditsDistributed: successCount * freeCredits,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('💥 Fatal error in monthly credits distribution:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Manually trigger monthly credits distribution (for testing or manual runs)
 */
export async function triggerMonthlyCredits() {
  console.log('🔧 Manually triggering monthly credits distribution...');
  return await grantMonthlyFreeCredits();
}

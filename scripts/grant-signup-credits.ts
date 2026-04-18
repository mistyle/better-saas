import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { paymentConfig } from '../src/config/payment.config';
import { env } from '../src/env';
import { creditService } from '../src/lib/credits';
import { user, userCredits } from '../src/server/db/schema';

// Initialize database connection
const sql = neon(env.DATABASE_URL);
const db = drizzle(sql, {
  schema: { user, userCredits },
});

async function grantSignupCredits() {
  console.log('🎁 Starting to grant signup credits to users with zero balance...');

  try {
    // 1. 获取所有积分余额为0的用户（说明他们没有获得注册奖励）
    console.log('📊 Finding users with zero credit balance...');

    const usersWithZeroCredits = await db
      .select({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userCreatedAt: user.createdAt,
        balance: userCredits.balance,
        totalEarned: userCredits.totalEarned,
      })
      .from(user)
      .innerJoin(userCredits, eq(user.id, userCredits.userId))
      .where(eq(userCredits.balance, 0));

    console.log(`Found ${usersWithZeroCredits.length} users with zero credit balance`);

    if (usersWithZeroCredits.length === 0) {
      console.log('✅ All users already have credits!');
      return {
        success: true,
        message: 'No users need signup credits',
        processedUsers: 0,
      };
    }

    // 2. 获取免费计划的注册奖励积分
    const freePlan = paymentConfig.plans.find((p) => p.id === 'free');
    const signupCredits = freePlan?.credits?.onSignup || 50; // 默认50积分

    console.log(`Will grant ${signupCredits} signup credits to each user`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ userId: string; email: string; error: string }> = [];

    // 3. 为每个用户发放注册奖励积分
    for (const userData of usersWithZeroCredits) {
      try {
        console.log(`Processing user: ${userData.userEmail} (${userData.userId})`);

        // 发放注册奖励积分
        await creditService.earnCredits({
          userId: userData.userId,
          amount: signupCredits,
          source: 'bonus',
          description: 'Signup bonus credits',
          referenceId: `signup_bonus_${userData.userId}`,
          metadata: {
            type: 'signup_bonus',
            grantedAt: new Date().toISOString(),
            userEmail: userData.userEmail,
            userCreatedAt: userData.userCreatedAt.toISOString(),
            reason: 'Retroactive signup bonus for existing users',
          },
        });

        console.log(`✅ Granted ${signupCredits} credits to ${userData.userEmail}`);
        successCount++;

        // 添加小延迟避免数据库压力
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          userId: userData.userId,
          email: userData.userEmail,
          error: errorMessage,
        });
        console.error(`❌ Failed to grant credits to ${userData.userEmail}:`, errorMessage);
      }
    }

    // 4. 统计结果
    console.log('\n🎯 Signup credits granting completed:');
    console.log(`   ✅ Success: ${successCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log(`   💰 Total credits granted: ${successCount * signupCredits}`);

    if (errors.length > 0) {
      console.log('\n❌ Failed users:');
      for (const error of errors) {
        console.log(`   - ${error.email}: ${error.error}`);
      }
    }

    // 5. 验证结果
    if (successCount > 0) {
      console.log('\n🔍 Verifying results...');

      // 随机检查几个用户的积分余额
      const sampleUsers = usersWithZeroCredits.slice(0, 3);
      for (const sampleUser of sampleUsers) {
        try {
          const account = await creditService.getCreditAccount(sampleUser.userId);
          if (account) {
            console.log(
              `✅ ${sampleUser.userEmail}: ${account.balance} credits (Total Earned: ${account.totalEarned})`
            );
          }
        } catch (error) {
          console.log(`❌ Failed to verify ${sampleUser.userEmail}: ${error}`);
        }
      }
    }

    return {
      success: errorCount === 0,
      message: `Processed ${usersWithZeroCredits.length} users`,
      successCount,
      errorCount,
      totalCreditsGranted: successCount * signupCredits,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('💥 Fatal error in signup credits granting:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  grantSignupCredits()
    .then((result) => {
      console.log('\n📋 Final Result:', result);
      if (result.success) {
        console.log('✅ Script completed successfully!');
        process.exit(0);
      } else {
        console.log('❌ Script completed with errors!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { grantSignupCredits };

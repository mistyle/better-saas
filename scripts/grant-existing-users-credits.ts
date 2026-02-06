import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { eq, isNull } from 'drizzle-orm';
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

async function grantExistingUsersCredits() {
  console.log('🎁 Starting to grant credits to existing users...');

  try {
    // 1. 获取所有没有积分账户的用户
    console.log('📊 Finding users without credit accounts...');

    const usersWithoutCredits = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      })
      .from(user)
      .leftJoin(userCredits, eq(user.id, userCredits.userId))
      .where(isNull(userCredits.userId));

    console.log(`Found ${usersWithoutCredits.length} users without credit accounts`);

    if (usersWithoutCredits.length === 0) {
      console.log('✅ All users already have credit accounts!');
      return {
        success: true,
        message: 'No users need credit accounts',
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

    // 3. 为每个用户创建积分账户并发放奖励积分
    for (const userData of usersWithoutCredits) {
      try {
        console.log(`Processing user: ${userData.email} (${userData.id})`);

        // 创建积分账户
        await creditService.createCreditAccount(userData.id);

        // 发放注册奖励积分
        await creditService.earnCredits({
          userId: userData.id,
          amount: signupCredits,
          source: 'bonus',
          description: 'Retroactive signup bonus credits',
          referenceId: `retroactive_signup_${userData.id}`,
          metadata: {
            type: 'retroactive_signup_bonus',
            grantedAt: new Date().toISOString(),
            userEmail: userData.email,
            userCreatedAt: userData.createdAt.toISOString(),
          },
        });

        console.log(`✅ Granted ${signupCredits} credits to ${userData.email}`);
        successCount++;

        // 添加小延迟避免数据库压力
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          userId: userData.id,
          email: userData.email,
          error: errorMessage,
        });
        console.error(`❌ Failed to grant credits to ${userData.email}:`, errorMessage);
      }
    }

    // 4. 统计结果
    console.log('\n🎯 Credit granting completed:');
    console.log(`   ✅ Success: ${successCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log(`   💰 Total credits granted: ${successCount * signupCredits}`);

    if (errors.length > 0) {
      console.log('\n❌ Failed users:');
      for (const error of errors) {
        console.log(`   - ${error.email}: ${error.error}`);
      }
    }

    return {
      success: errorCount === 0,
      message: `Processed ${usersWithoutCredits.length} users`,
      successCount,
      errorCount,
      totalCreditsGranted: successCount * signupCredits,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('💥 Fatal error in credit granting:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  grantExistingUsersCredits()
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

export { grantExistingUsersCredits };

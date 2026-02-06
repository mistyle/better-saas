import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { and, desc, eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '../src/env';
import { creditTransactions } from '../src/server/db/schema';

// Initialize database connection
const sql = neon(env.DATABASE_URL);
const db = drizzle(sql, {
  schema: { creditTransactions },
});

async function verifyMonthlyCreditsExecution() {
  console.log('🔍 Verifying monthly credits execution...');

  try {
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
      .toISOString()
      .slice(0, 7);

    console.log(`Current month: ${currentMonth}`);
    console.log(`Last month: ${lastMonth}`);

    // 1. 检查当前月份的免费积分发放记录
    console.log('\n📊 Checking current month free credits distribution...');

    const currentMonthTransactions = await db
      .select({
        id: creditTransactions.id,
        userId: creditTransactions.userId,
        amount: creditTransactions.amount,
        source: creditTransactions.source,
        description: creditTransactions.description,
        referenceId: creditTransactions.referenceId,
        createdAt: creditTransactions.createdAt,
      })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.source, 'subscription'),
          eq(creditTransactions.type, 'earn'),
          like(creditTransactions.referenceId, `free_${currentMonth}%`)
        )
      )
      .orderBy(desc(creditTransactions.createdAt))
      .limit(10);

    console.log(
      `Found ${currentMonthTransactions.length} free credit transactions for ${currentMonth}`
    );

    if (currentMonthTransactions.length > 0) {
      console.log('✅ Current month free credits have been distributed');
      console.log('Recent transactions:');
      for (const tx of currentMonthTransactions.slice(0, 3)) {
        console.log(
          `  - ${tx.amount} credits to user ${tx.userId} at ${tx.createdAt.toISOString()}`
        );
      }
    } else {
      console.log('⚠️  No free credit transactions found for current month');

      // 检查今天是否是月初几天
      const dayOfMonth = currentDate.getDate();
      if (dayOfMonth <= 3) {
        console.log(
          `📅 Today is day ${dayOfMonth} of the month - credits should be distributed soon`
        );
      } else {
        console.log(`⚠️  Today is day ${dayOfMonth} of the month - credits may be overdue`);
      }
    }

    // 2. 检查上个月的发放记录
    console.log('\n📊 Checking last month free credits distribution...');

    const lastMonthTransactions = await db
      .select({
        id: creditTransactions.id,
        userId: creditTransactions.userId,
        amount: creditTransactions.amount,
        createdAt: creditTransactions.createdAt,
      })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.source, 'subscription'),
          eq(creditTransactions.type, 'earn'),
          like(creditTransactions.referenceId, `free_${lastMonth}%`)
        )
      );

    console.log(`Found ${lastMonthTransactions.length} free credit transactions for ${lastMonth}`);

    if (lastMonthTransactions.length > 0) {
      const totalCreditsLastMonth = lastMonthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      console.log(
        `✅ Last month distributed ${totalCreditsLastMonth} credits to ${lastMonthTransactions.length} users`
      );
    }

    // 3. 检查所有月度免费积分历史
    console.log('\n📈 Monthly free credits history...');

    const allFreeCredits = await db
      .select({
        referenceId: creditTransactions.referenceId,
        amount: creditTransactions.amount,
        createdAt: creditTransactions.createdAt,
      })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.source, 'subscription'),
          eq(creditTransactions.type, 'earn'),
          like(creditTransactions.referenceId, 'free_%')
        )
      )
      .orderBy(desc(creditTransactions.createdAt))
      .limit(50);

    if (allFreeCredits.length > 0) {
      // 手动分组统计
      const monthlyStats = new Map<
        string,
        { count: number; totalAmount: number; firstDate: Date; lastDate: Date }
      >();

      for (const tx of allFreeCredits) {
        if (tx.referenceId?.startsWith('free_')) {
          const month = tx.referenceId.substring(0, 12); // 'free_YYYY-MM'
          const existing = monthlyStats.get(month) || {
            count: 0,
            totalAmount: 0,
            firstDate: tx.createdAt,
            lastDate: tx.createdAt,
          };

          existing.count += 1;
          existing.totalAmount += tx.amount;
          if (tx.createdAt > existing.lastDate) existing.lastDate = tx.createdAt;
          if (tx.createdAt < existing.firstDate) existing.firstDate = tx.createdAt;

          monthlyStats.set(month, existing);
        }
      }

      console.log('Recent monthly distributions:');
      for (const [month, stats] of Array.from(monthlyStats.entries())
        .sort((a, b) => b[1].firstDate.getTime() - a[1].firstDate.getTime())
        .slice(0, 6)) {
        const monthDisplay = month.replace('free_', '');
        console.log(
          `  ${monthDisplay}: ${stats.count} users, ${stats.totalAmount} credits (${stats.firstDate.toLocaleDateString()})`
        );
      }
    } else {
      console.log('❌ No monthly free credits history found');
    }

    // 4. 生成建议
    console.log('\n💡 Recommendations:');

    if (currentMonthTransactions.length === 0) {
      console.log('🔧 Consider running manual credit distribution:');
      console.log('   curl -X POST https://your-app.vercel.app/api/cron/monthly-credits');
      console.log('   or');
      console.log('   npx tsx scripts/grant-monthly-free-credits.ts');
    }

    if (allFreeCredits.length < 2) {
      console.log('📅 Set up automated monthly distribution:');
      console.log('   - Ensure vercel.json contains cron configuration');
      console.log('   - Deploy to production to activate cron jobs');
    } else {
      console.log('✅ Monthly credit distribution appears to be working correctly');
    }

    return {
      success: true,
      currentMonth: {
        month: currentMonth,
        transactionCount: currentMonthTransactions.length,
        hasDistribution: currentMonthTransactions.length > 0,
      },
      lastMonth: {
        month: lastMonth,
        transactionCount: lastMonthTransactions.length,
        totalCredits: lastMonthTransactions.reduce((sum, tx) => sum + tx.amount, 0),
      },
      historyCount: allFreeCredits.length,
    };
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyMonthlyCreditsExecution()
    .then((result) => {
      console.log('\n📋 Verification Result:', result);
      if (result.success) {
        console.log('✅ Verification completed successfully');
        process.exit(0);
      } else {
        console.log('❌ Verification failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Verification script failed:', error);
      process.exit(1);
    });
}

export { verifyMonthlyCreditsExecution };

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { count, eq, sum } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '../src/env';
import { creditTransactions, user, userCredits } from '../src/server/db/schema';

// Initialize database connection
const sql = neon(env.DATABASE_URL);
const db = drizzle(sql, {
  schema: { user, userCredits, creditTransactions },
});

async function checkUsersCreditStatus() {
  console.log('📊 Checking users credit status...');

  try {
    // 1. 获取所有用户及其积分账户信息
    const usersWithCredits = await db
      .select({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userCreatedAt: user.createdAt,
        creditAccountId: userCredits.id,
        balance: userCredits.balance,
        totalEarned: userCredits.totalEarned,
        totalSpent: userCredits.totalSpent,
        frozenBalance: userCredits.frozenBalance,
        creditAccountCreatedAt: userCredits.createdAt,
      })
      .from(user)
      .leftJoin(userCredits, eq(user.id, userCredits.userId))
      .limit(10); // 只显示前10个用户

    console.log('\n📋 User Credit Status (showing first 10 users):');
    console.log('='.repeat(120));

    let _usersWithCreditAccounts = 0;
    let _usersWithoutCreditAccounts = 0;
    let _totalCreditsInSystem = 0;

    for (const userData of usersWithCredits) {
      if (userData.creditAccountId) {
        _usersWithCreditAccounts++;
        _totalCreditsInSystem += userData.balance || 0;

        console.log(`✅ ${userData.userEmail}`);
        console.log(`   User ID: ${userData.userId}`);
        console.log(`   Balance: ${userData.balance} credits`);
        console.log(`   Total Earned: ${userData.totalEarned}`);
        console.log(`   Total Spent: ${userData.totalSpent}`);
        console.log(`   Frozen: ${userData.frozenBalance}`);
        console.log(`   User Created: ${userData.userCreatedAt?.toISOString()}`);
        console.log(`   Credit Account Created: ${userData.creditAccountCreatedAt?.toISOString()}`);

        // 检查该用户的交易记录
        const transactions = await db
          .select({
            id: creditTransactions.id,
            type: creditTransactions.type,
            amount: creditTransactions.amount,
            source: creditTransactions.source,
            description: creditTransactions.description,
            createdAt: creditTransactions.createdAt,
          })
          .from(creditTransactions)
          .where(eq(creditTransactions.userId, userData.userId))
          .limit(3);

        if (transactions.length > 0) {
          console.log('   Recent Transactions:');
          for (const tx of transactions) {
            console.log(
              `     - ${tx.type}: ${tx.amount} (${tx.source}) - ${tx.description} [${tx.createdAt.toISOString()}]`
            );
          }
        } else {
          console.log('   No transactions found');
        }
      } else {
        _usersWithoutCreditAccounts++;
        console.log(`❌ ${userData.userEmail} - No credit account`);
        console.log(`   User ID: ${userData.userId}`);
        console.log(`   User Created: ${userData.userCreatedAt?.toISOString()}`);
      }
      console.log('');
    }

    // 2. 获取总体统计
    const totalUsersResult = await db.select({ count: count() }).from(user);
    const totalCreditAccountsResult = await db.select({ count: count() }).from(userCredits);
    const totalTransactionsResult = await db.select({ count: count() }).from(creditTransactions);
    const totalCreditsSumResult = await db
      .select({ sum: sum(userCredits.balance) })
      .from(userCredits);

    const totalUsers = totalUsersResult[0].count;
    const totalCreditAccounts = totalCreditAccountsResult[0].count;
    const totalTransactions = totalTransactionsResult[0].count;
    const totalCredits = Number(totalCreditsSumResult[0].sum) || 0;

    console.log('🎯 Overall Statistics:');
    console.log('='.repeat(50));
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Credit Accounts: ${totalCreditAccounts}`);
    console.log(`Total Transactions: ${totalTransactions}`);
    console.log(`Total Credits in System: ${totalCredits}`);
    console.log(`Coverage: ${Math.round((totalCreditAccounts / totalUsers) * 100)}%`);

    // 3. 检查是否需要为现有用户补发积分
    if (totalCreditAccounts < totalUsers) {
      console.log(`\n⚠️  ${totalUsers - totalCreditAccounts} users still need credit accounts!`);
    } else if (totalCredits === 0) {
      console.log(
        '\n⚠️  All users have credit accounts but no credits! Consider running signup bonus script.'
      );
    } else {
      console.log('\n✅ All users have credit accounts with credits!');
    }

    return {
      success: true,
      totalUsers,
      totalCreditAccounts,
      totalTransactions,
      totalCredits,
    };
  } catch (error) {
    console.error('❌ Failed to check credit status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkUsersCreditStatus()
    .then((result) => {
      console.log('\n📋 Final Result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { checkUsersCreditStatus };

import { NextResponse } from 'next/server';
import { validateCronRequest } from '@/lib/cron/auth';
import { grantMonthlyFreeCredits } from '@/server/cron/monthly-credits';

export async function GET(request: Request) {
  const executionStart = new Date();

  try {
    // 安全验证
    const authError = validateCronRequest(request);
    if (authError) {
      return authError;
    }

    // 获取请求信息
    const userAgent = request.headers.get('user-agent');
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    console.log('[monthly-credits-cron] Starting monthly credits cron job', {
      timestamp: executionStart.toISOString(),
      userAgent,
      ip,
    });

    const result = await grantMonthlyFreeCredits();
    const executionEnd = new Date();
    const executionTime = executionEnd.getTime() - executionStart.getTime();

    if (result.success) {
      console.log('[monthly-credits-cron] Monthly credits distribution completed successfully', {
        totalUsers: result.totalUsers,
        successCount: result.successCount,
        errorCount: result.errorCount,
        totalCreditsDistributed: result.totalCreditsDistributed,
        executionTime: `${executionTime}ms`,
      });

      return NextResponse.json({
        success: true,
        message: 'Monthly credits distributed successfully',
        data: {
          ...result,
          executionTime: `${executionTime}ms`,
          executedAt: executionEnd.toISOString(),
        },
      });
    }

    console.error('[monthly-credits-cron] Monthly credits distribution failed', {
      message: result.message,
      executionTime: `${executionTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        message: result.message,
        data: {
          executionTime: `${executionTime}ms`,
          failedAt: executionEnd.toISOString(),
        },
      },
      { status: 500 }
    );
  } catch (error) {
    const executionEnd = new Date();
    const executionTime = executionEnd.getTime() - executionStart.getTime();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('[monthly-credits-cron] Monthly credits cron job failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      executionTime: `${executionTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: errorMessage,
        data: {
          executionTime: `${executionTime}ms`,
          failedAt: executionEnd.toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Allow manual triggering via POST as well
  return GET(request);
}

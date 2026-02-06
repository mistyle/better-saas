import { NextResponse } from 'next/server';
import { env } from '@/env';

/**
 * 验证 cron 请求的合法性
 * @param request - Next.js Request 对象
 * @returns 如果验证失败，返回错误响应；如果验证成功，返回 null
 */
export function validateCronRequest(request: Request): NextResponse | null {
  // 如果没有配置 CRON_SECRET，则跳过验证（开发环境）
  if (!env.CRON_SECRET) {
    console.log('[cron-auth] CRON_SECRET not configured, skipping authentication');
    return null;
  }

  const url = new URL(request.url);
  const providedSecret =
    request.headers.get('authorization')?.replace('Bearer ', '') || url.searchParams.get('secret');

  if (providedSecret !== env.CRON_SECRET) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    console.warn('[cron-auth] Unauthorized cron job access attempt', {
      ip,
      userAgent,
      hasSecret: !!providedSecret,
      endpoint: url.pathname,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Unauthorized: Invalid or missing cron secret',
        error: 'CRON_AUTH_FAILED',
      },
      { status: 401 }
    );
  }

  return null;
}

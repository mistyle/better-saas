'use server';

import { getServerSession } from '@/lib/auth/server-session';
import type { ActionResult, PaymentRecord } from '@/payment/types';
import { paymentRepository } from '@/server/db/repositories/payment-repository';

export interface BillingInfo {
  activeSubscription?: PaymentRecord;
  paymentHistory: PaymentRecord[];
}

export async function getBillingInfo(): Promise<ActionResult<BillingInfo>> {
  let session: { user?: { id: string } } | null = null;

  try {
    session = await getServerSession();
    if (!session?.user) {
      return {
        success: false,
        error: '请先登录',
      };
    }

    // 获取用户的活跃订阅
    const activeSubscription = await paymentRepository.findActiveSubscriptionByUserId(
      session.user.id
    );

    // 获取用户的支付历史
    const paymentHistory = await paymentRepository.findByUserId(session.user.id);

    return {
      success: true,
      data: {
        activeSubscription: activeSubscription || undefined,
        paymentHistory,
      },
    };
  } catch (error) {
    console.error('[billing-info] getBillingInfo error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取账单信息失败',
    };
  }
}


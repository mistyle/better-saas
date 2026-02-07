# 身份验证与支付规范

## 身份验证 (Better Auth)

### 概述

项目使用 **Better Auth** 实现身份验证，支持：
- 邮箱/密码登录
- GitHub OAuth 登录
- Google OAuth 登录
- 管理员角色
- API Key 认证

### 配置文件

核心配置位于 `src/lib/auth/auth.ts`：

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, apiKey } from 'better-auth/plugins';
import db from '@/server/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: { /* ... */ },
    google: { /* ... */ },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 天
    cookieCache: { enabled: true, maxAge: 60 * 60 },
  },
  plugins: [admin(), apiKey()],
});
```

### 获取会话

#### 服务器端

```typescript
import { getServerSession } from '@/lib/auth/server-session';

const session = await getServerSession();

if (session?.user) {
  console.log('用户已登录:', session.user.email);
}
```

#### 客户端

```typescript
'use client';

import { useAuth } from '@/lib/auth/use-auth';

function UserInfo() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div>加载中...</div>;
  if (!user) return <div>未登录</div>;
  
  return <div>欢迎, {user.name}</div>;
}
```

### 客户端认证操作

```typescript
import { authClient } from '@/lib/auth/auth-client';

// 邮箱登录
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password',
});

// GitHub 登录
await authClient.signIn.social({ provider: 'github' });

// Google 登录
await authClient.signIn.social({ provider: 'google' });

// 注册
await authClient.signUp.email({
  email: 'user@example.com',
  password: 'password',
  name: 'User Name',
});

// 登出
await authClient.signOut();
```

### 权限检查

```typescript
import { getUserAdminStatus } from '@/server/actions/auth-actions';

// 检查是否管理员
const isAdmin = await getUserAdminStatus();

// 管理员邮箱列表配置在环境变量 ADMIN_EMAILS 中
```

### 路由保护

使用 `RouteGuard` 组件保护需要认证的页面：

```typescript
import { RouteGuard } from '@/components/route-guard';

export default function ProtectedLayout({ children }) {
  return <RouteGuard>{children}</RouteGuard>;
}
```

## 支付系统 (Stripe)

### 概述

项目集成 **Stripe** 支付，支持：
- 订阅计划管理
- 一次性支付
- Webhook 事件处理
- 客户门户

### 配置文件

支付配置位于 `src/config/payment.config.ts`：

```typescript
export const paymentConfig: PaymentConfig = {
  provider: 'stripe',
  currency: 'usd',
  plans: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      credits: { monthly: 50, onSignup: 50 },
      features: ['50 credits per month', '...'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 49,
      yearlyPrice: 499,
      credits: { monthly: 1000, yearly: 12000 },
      features: ['1,000 credits per month', '...'],
    },
    // ...
  ],
  trial: { enabled: true, days: 14, plans: ['pro', 'enterprise'] },
};
```

### 环境变量

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_...
```

### 创建订阅

```typescript
import Stripe from 'stripe';
import { env } from '@/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// 创建 Checkout Session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${env.NEXT_PUBLIC_APP_URL}/success`,
  cancel_url: `${env.NEXT_PUBLIC_APP_URL}/cancel`,
  customer_email: user.email,
});
```

### Webhook 处理

Webhook 处理器位于 `src/app/api/webhooks/stripe/route.ts`：

```typescript
// 需要处理的关键事件
switch (event.type) {
  case 'checkout.session.completed':
    // 支付成功，创建订阅记录
    break;
  case 'customer.subscription.updated':
    // 订阅更新
    break;
  case 'customer.subscription.deleted':
    // 订阅取消
    break;
  case 'invoice.payment_succeeded':
    // 发票支付成功，发放积分
    break;
  case 'invoice.payment_failed':
    // 支付失败处理
    break;
}
```

### 支付操作

支付相关 Server Actions 位于 `src/server/actions/payment/`：

```typescript
import { createCheckoutSession } from '@/server/actions/payment/checkout-actions';
import { cancelSubscription } from '@/server/actions/payment/subscription-actions';

// 创建结账会话
const { url } = await createCheckoutSession({
  planId: 'pro',
  interval: 'monthly',
});

// 取消订阅
await cancelSubscription();
```

## 积分系统

### 概述

积分系统用于追踪和限制用户的 API 使用：

### 配置

积分配置位于 `src/config/credits.config.ts`

### 数据库表

- `user_credits`: 用户积分余额
- `credit_transactions`: 积分交易记录

### 积分操作

```typescript
import { deductCredits, addCredits } from '@/lib/credits';

// 扣除积分
const result = await deductCredits({
  userId: user.id,
  amount: 10,
  source: 'api_call',
  description: 'API 调用消耗',
});

// 添加积分
await addCredits({
  userId: user.id,
  amount: 100,
  source: 'subscription',
  description: '订阅月度积分',
});
```

### 使用积分 Hook

```typescript
'use client';

import { useCredits } from '@/hooks/use-credits';

function CreditsDisplay() {
  const { credits, isLoading } = useCredits();
  
  return <div>积分余额: {credits}</div>;
}
```

## 数据库 Schema

### 用户相关表

```typescript
// user - 用户表
// session - 会话表
// account - OAuth 账户表
// verification - 验证码表
```

### 支付相关表

```typescript
// payment - 支付/订阅记录
// payment_event - 支付事件记录
// user_credits - 用户积分
// credit_transactions - 积分交易记录
```

### API Key 表

```typescript
// api_key - API 密钥表
```

## 最佳实践

1. **始终验证会话**: 在敏感操作前检查用户认证状态
2. **使用 Server Actions**: 对于表单提交优先使用 Server Actions
3. **处理 Webhook 幂等性**: 使用 `stripeEventId` 防止重复处理
4. **记录支付事件**: 所有支付相关操作都应记录到 `payment_event` 表
5. **积分事务安全**: 积分操作使用事务确保一致性
6. **错误处理**: 支付失败时要有合适的用户反馈和重试机制

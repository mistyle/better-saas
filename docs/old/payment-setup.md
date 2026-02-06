# 支付系统设置指南

本项目集成了 Stripe 支付系统，支持订阅和一次性支付。以下是完整的设置指南。

## 🏗️ 架构概览

### 核心组件
- **PaymentProvider 接口**: 抽象支付提供商接口，便于未来扩展
- **StripeProvider**: Stripe 支付提供商实现
- **PaymentRepository**: 支付记录数据库操作
- **Server Actions**: 处理支付相关的服务端逻辑
- **React 组件**: 订阅卡片、计费页面等 UI 组件

### 数据库表
- `payment`: 存储支付和订阅记录
- `payment_event`: 存储支付事件日志（用于审计和调试）

## 🚀 快速开始

### 1. 环境变量配置

在 `.env.local` 文件中添加以下环境变量：

```bash
# Stripe 配置
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"

# 应用 URL（用于支付成功/取消页面重定向）
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Stripe 账户设置

1. 注册 [Stripe 账户](https://stripe.com)
2. 在 Stripe Dashboard 中创建产品和价格：
   - 进入 "Products" 页面
   - 创建产品（如 "Plus Plan", "Pro Plan"）
   - 为每个产品创建月付和年付价格
   - 复制价格 ID（格式如 `price_xxx`）

3. 配置 Webhook：
   - 进入 "Developers" > "Webhooks"
   - 添加端点：`https://your-domain.com/api/webhooks/stripe`
   - 选择事件：
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - 复制 Webhook 签名密钥

### 3. 更新价格配置

在 `src/components/blocks/pricing/pricing.tsx` 中更新真实的 Stripe 价格 ID：

```typescript
stripePriceIds: {
  monthly: 'price_1234567890', // 替换为真实的月付价格 ID
  yearly: 'price_0987654321',  // 替换为真实的年付价格 ID
},
```

### 4. 数据库迁移

运行数据库迁移来创建支付相关的表：

```bash
pnpm drizzle-kit push
```

## 📝 使用说明

### 创建订阅

```typescript
import { createCheckoutSession } from '@/server/actions/payment/create-subscription';

const result = await createCheckoutSession({
  priceId: 'price_1234567890',
  successUrl: 'https://your-app.com/success',
  cancelUrl: 'https://your-app.com/cancel',
});

if (result.success && result.data?.url) {
  window.location.href = result.data.url;
}
```

### 取消订阅

```typescript
import { cancelSubscription } from '@/server/actions/payment/cancel-subscription';

const result = await cancelSubscription('sub_1234567890');
if (result.success) {
  console.log('订阅已取消');
}
```

### 获取账单信息

```typescript
import { getBillingInfo } from '@/server/actions/payment/get-billing-info';

const result = await getBillingInfo();
if (result.success) {
  const { activeSubscription, paymentHistory } = result.data;
}
```

## 🔧 自定义和扩展

### 添加新的支付提供商

1. 实现 `PaymentProvider` 接口：

```typescript
export class NewProvider implements PaymentProvider {
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    // 实现支付创建逻辑
  }
  
  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    // 实现订阅创建逻辑
  }
  
  // ... 其他方法
}
```

2. 在配置中选择使用的提供商

### 自定义支付流程

可以通过修改 Server Actions 来自定义支付流程：
- `src/server/actions/payment/create-subscription.ts`
- `src/server/actions/payment/cancel-subscription.ts`
- `src/server/actions/payment/get-billing-info.ts`

### UI 组件定制

支付相关的 UI 组件位于：
- `src/components/payment/subscription-card.tsx`
- `src/components/billing/billing-page.tsx`
- `src/components/blocks/pricing/pricing.tsx`

## 🛡️ 安全考虑

1. **Webhook 验证**: 所有 Stripe Webhook 都会验证签名
2. **用户权限**: 只有订阅所有者可以管理自己的订阅
3. **环境变量**: 敏感信息通过环境变量配置
4. **事件日志**: 所有支付事件都会记录到数据库

## 🐛 调试

### 查看支付事件日志

```sql
SELECT * FROM payment_event 
WHERE payment_id = 'your_payment_id' 
ORDER BY created_at DESC;
```

### 常见问题

1. **Webhook 签名验证失败**
   - 检查 `STRIPE_WEBHOOK_SECRET` 是否正确
   - 确保 Webhook URL 配置正确

2. **支付创建失败**
   - 检查 Stripe 价格 ID 是否有效
   - 确认用户已登录
   - **重要**：确保为订阅产品创建的是循环价格（recurring prices）

3. **模式错误 (payment vs subscription)**
   - 系统会自动检测价格类型并选择正确的模式
   - 循环价格 → `subscription` 模式
   - 一次性价格 → `payment` 模式

4. **订阅状态不同步**
   - 检查 Webhook 是否正常接收
   - 查看 `payment_event` 表中的事件日志

5. **价格 ID 配置错误**
   - 在 Stripe Dashboard 中确认价格 ID 格式为 `price_xxx`
   - 确保价格处于活跃状态
   - 验证价格是否为循环计费（用于订阅）

## 📚 相关文档

- [Stripe API 文档](https://stripe.com/docs/api)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Better Auth 文档](https://better-auth.com)
- [Drizzle ORM 文档](https://orm.drizzle.team)

## 🎯 下一步

1. 配置生产环境的 Stripe 密钥
2. 设置域名和 SSL 证书
3. 配置邮件通知（可选）
4. 添加更多支付方式（如支付宝、微信支付）
5. 实现发票生成功能 
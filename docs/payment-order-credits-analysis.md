# 支付模块、订单模块与积分模块深度分析

> 本文档对项目中的支付（Payment）、订单（Order/Payment Record）、积分（Credits）三大核心模块进行深度分析，并详细说明各环节的幂等性保证机制。

---

## 目录

1. [整体架构概览](#1-整体架构概览)
2. [支付模块分析](#2-支付模块分析)
3. [订单模块分析](#3-订单模块分析)
4. [积分模块分析](#4-积分模块分析)
5. [配额系统](#5-配额系统)
6. [幂等性保证机制](#6-幂等性保证机制)
7. [数据流转全景图](#7-数据流转全景图)
8. [潜在风险与改进建议](#8-潜在风险与改进建议)

---

## 1. 整体架构概览

### 1.1 模块关系总览

```mermaid
graph TB
    subgraph 用户端
        A[用户浏览器]
    end

    subgraph 前端层
        B[Pricing 页面]
        C[Billing 设置页面]
        D[Credits 面板]
    end

    subgraph Server Actions 层
        E[createCheckoutSession]
        F[createSubscription]
        G[cancelSubscription]
        H[getBillingInfo]
        I[getCreditBalance]
        J[spendCredits]
    end

    subgraph 支付提供商
        K[Stripe API]
        L[Stripe Webhook]
    end

    subgraph 数据层
        M[(payment 表)]
        N[(payment_event 表)]
        O[(user_credits 表)]
        P[(credit_transactions 表)]
        Q[(user_quota_usage 表)]
    end

    A --> B --> E
    A --> C --> G & H
    A --> D --> I & J
    E --> K
    F --> K
    K --> L
    L --> |Webhook 回调| R[Stripe Webhook Handler]
    R --> M & N & O & P
    E --> M & N
    G --> M & N
    J --> O & P & Q
```

### 1.2 技术栈

| 组件 | 技术 |
|------|------|
| 支付提供商 | Stripe（`stripe` SDK） |
| 数据库 | PostgreSQL（Neon Serverless） |
| ORM | Drizzle ORM |
| 前端框架 | Next.js（App Router） |
| 服务端操作 | Next.js Server Actions |
| Webhook | Next.js API Route |

### 1.3 核心文件清单

| 模块 | 文件路径 | 职责 |
|------|----------|------|
| 支付提供商 | `src/payment/stripe/provider.ts` | Stripe API 封装 |
| Stripe 客户端 | `src/payment/stripe/client.ts` | Stripe 实例初始化 |
| 支付类型 | `src/payment/types.ts` | 支付相关类型定义 |
| 支付配置 | `src/config/payment.config.ts` | 套餐与价格配置 |
| Webhook 处理 | `src/app/api/webhooks/stripe/route.ts` | Stripe Webhook 入口 |
| 支付仓储 | `src/server/db/repositories/payment-repository.ts` | 支付数据 CRUD |
| 积分服务 | `src/lib/credits/credit-service.ts` | 积分核心业务逻辑 |
| 积分配置 | `src/config/credits.config.ts` | 积分消耗规则配置 |
| 配额服务 | `src/lib/quota/quota-service.ts` | 用量配额管理 |
| 数据库 Schema | `src/server/db/schema.ts` | 数据表定义 |
| Server Actions | `src/server/actions/payment/` | 支付相关服务端操作 |
| Server Actions | `src/server/actions/credit-actions.ts` | 积分相关服务端操作 |

---

## 2. 支付模块分析

### 2.1 支付提供商架构（Provider Pattern）

项目采用**提供商模式（Provider Pattern）**对支付接口进行抽象：

```mermaid
classDiagram
    class PaymentProvider {
        <<interface>>
        +createPayment(params) PaymentResult
        +createSubscription(params) SubscriptionResult
        +updateSubscription(id, params) SubscriptionResult
        +cancelSubscription(id) boolean
        +getSubscription(id) SubscriptionResult
        +getPaymentStatus(id) PaymentStatus
        +verifyWebhook(payload, signature) boolean
        +createCustomer(userId, email, name) string
    }

    class StripeProvider {
        +createPayment(params) PaymentResult
        +createSubscription(params) SubscriptionResult
        +createSubscriptionCheckout(params) PaymentResult
        +updateSubscription(id, params) SubscriptionResult
        +cancelSubscription(id) boolean
        +getSubscription(id) SubscriptionResult
        +getPaymentStatus(id) PaymentStatus
        +verifyWebhook(payload, signature) boolean
        +constructWebhookEvent(payload, signature) Event
        +createCustomer(userId, email, name) string
    }

    PaymentProvider <|.. StripeProvider
```

当前仅实现了 `StripeProvider`，但接口设计支持未来接入其他支付提供商（如 LemonSqueezy、Paddle 等）。

### 2.2 支付模式

项目支持两种支付模式：

| 模式 | 类型 | 说明 |
|------|------|------|
| **订阅支付** | `subscription` | 按月/按年周期性扣费 |
| **一次性支付** | `one_time` | 单次付款 |

### 2.3 支付状态流转

```mermaid
stateDiagram-v2
    [*] --> incomplete : 创建 Checkout Session
    incomplete --> active : 支付成功
    incomplete --> incomplete_expired : 支付超时
    active --> past_due : 续费失败
    active --> canceled : 用户取消/到期
    active --> trialing : 开始试用
    trialing --> active : 试用结束&支付成功
    trialing --> canceled : 试用结束&未付款
    past_due --> active : 补缴成功
    past_due --> canceled : 长期未付
    past_due --> unpaid : 多次失败
    canceled --> [*]
    incomplete_expired --> [*]
    unpaid --> [*]
```

### 2.4 套餐配置

项目定义了三级套餐体系：

| 套餐 | 月价 | 年价 | 月积分 | 年积分 | 订阅即得积分 |
|------|------|------|--------|--------|------------|
| **Free** | $0 | - | 50 | - | 注册送 50 |
| **Pro** | $49 | $499 | 1,000 | 12,000 | 1,000 |
| **Enterprise** | $199 | $1,999 | 5,000 | 60,000 | 5,000 |

### 2.5 支付创建流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant SA as Server Action
    participant PR as PaymentRepository
    participant SP as StripeProvider
    participant S as Stripe API

    U->>SA: createCheckoutSession(priceId)
    SA->>SA: getServerSession() 验证登录
    SA->>PR: findActiveSubscriptionByUserId() 检查重复订阅
    
    alt 已有活跃订阅
        SA-->>U: 错误：已有活跃订阅
    end

    SA->>SP: createCustomer(userId, email)
    SP->>S: customers.create()
    S-->>SP: customerId
    
    SA->>S: prices.retrieve(priceId) 判断价格类型
    
    alt 循环价格（订阅）
        SA->>SP: createSubscriptionCheckout()
        SP->>S: checkout.sessions.create(mode: subscription)
        S-->>SP: session.url
    else 一次性价格
        SA->>SP: createPayment()
        SP->>S: checkout.sessions.create(mode: payment)
        S-->>SP: session.url
    end

    SA-->>U: 返回 Checkout URL 跳转支付
```

### 2.6 Webhook 事件处理

Stripe Webhook Handler（`/api/webhooks/stripe`）处理以下事件：

| 事件类型 | 处理逻辑 |
|----------|----------|
| `checkout.session.completed` | 创建支付记录、发放订阅积分 |
| `customer.subscription.created` | 更新订阅状态和周期信息 |
| `customer.subscription.updated` | 检测套餐升级、更新状态 |
| `customer.subscription.deleted` | 标记订阅为已取消 |
| `invoice.payment_succeeded` | 记录发票支付成功事件 |
| `invoice.payment_failed` | 记录发票支付失败事件 |
| `invoice.paid` | 发放月度续费积分（跳过首次付款） |

```mermaid
sequenceDiagram
    participant S as Stripe
    participant WH as Webhook Handler
    participant PR as PaymentRepository
    participant CS as CreditService

    S->>WH: POST /api/webhooks/stripe (带签名)
    WH->>WH: verifyWebhook(body, signature) 验证签名
    
    alt 签名无效
        WH-->>S: 400 Invalid signature
    end

    WH->>WH: constructWebhookEvent() 构造事件对象
    WH->>PR: isStripeEventProcessed(event.id) 检查幂等性
    
    alt 事件已处理
        WH-->>S: 200 {received: true}
    end

    WH->>WH: 根据 event.type 分发处理

    Note over WH,CS: 以 checkout.session.completed 为例

    WH->>PR: findBySubscriptionId() 检查记录是否存在
    
    alt 记录已存在
        WH-->>S: 跳过处理
    end

    WH->>PR: create() 创建支付记录
    WH->>PR: createEvent() 记录事件
    WH->>CS: earnCredits() 发放订阅积分
    WH-->>S: 200 {received: true}
```

---

## 3. 订单模块分析

### 3.1 数据库 Schema

项目中"订单"概念由 `payment` 和 `payment_event` 两张表共同承载：

#### payment 表（支付/订单主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | text PK | 支付记录 ID（订阅 ID 或 PaymentIntent ID） |
| `price_id` | text | Stripe Price ID |
| `type` | text | 支付类型：`subscription` / `one_time` |
| `interval` | text | 计费周期：`month` / `year` / `null` |
| `user_id` | text FK | 关联用户 |
| `customer_id` | text | Stripe Customer ID |
| `subscription_id` | text | Stripe 订阅 ID |
| `status` | text | 订阅状态 |
| `period_start` | timestamp | 当前计费周期开始时间 |
| `period_end` | timestamp | 当前计费周期结束时间 |
| `cancel_at_period_end` | boolean | 是否在周期结束后取消 |
| `trial_start` | timestamp | 试用开始时间 |
| `trial_end` | timestamp | 试用结束时间 |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |

#### payment_event 表（支付事件流水表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | text PK | 事件记录 ID |
| `payment_id` | text FK | 关联支付记录 |
| `event_type` | text | 事件类型 |
| `stripe_event_id` | text UNIQUE | Stripe 事件 ID（用于幂等） |
| `event_data` | text | 事件原始数据（JSON 字符串） |
| `created_at` | timestamp | 事件时间 |

```mermaid
erDiagram
    user ||--o{ payment : "用户拥有多个支付记录"
    payment ||--o{ payment_event : "支付记录拥有多个事件"
    user ||--o| user_credits : "用户拥有一个积分账户"
    user ||--o{ credit_transactions : "用户拥有多条积分流水"
    user ||--o{ user_quota_usage : "用户拥有多条配额用量"

    user {
        text id PK
        text name
        text email
        text role
    }

    payment {
        text id PK
        text price_id
        text type
        text interval
        text user_id FK
        text customer_id
        text subscription_id
        text status
        timestamp period_start
        timestamp period_end
        boolean cancel_at_period_end
        timestamp created_at
        timestamp updated_at
    }

    payment_event {
        text id PK
        text payment_id FK
        text event_type
        text stripe_event_id UK
        text event_data
        timestamp created_at
    }

    user_credits {
        text id PK
        text user_id FK
        integer balance
        integer total_earned
        integer total_spent
        integer frozen_balance
        timestamp created_at
        timestamp updated_at
    }

    credit_transactions {
        text id PK
        text user_id FK
        text type
        integer amount
        integer balance_after
        text source
        text description
        text reference_id
        text metadata
        timestamp created_at
    }

    user_quota_usage {
        text id PK
        text user_id FK
        text service
        text period
        integer used_amount
        timestamp created_at
        timestamp updated_at
    }
```

### 3.2 PaymentRepository 核心方法

```
PaymentRepository
├── create(data)                        // 创建支付记录
├── findById(id)                        // 按 ID 查询
├── findByUserId(userId)                // 按用户 ID 查询所有记录
├── findBySubscriptionId(subscriptionId) // 按订阅 ID 查询
├── findByCustomerId(customerId)        // 按客户 ID 查询
├── findActiveSubscriptionByUserId(userId) // 查询用户活跃订阅
├── update(id, data)                    // 更新支付记录
├── delete(id)                          // 删除支付记录
├── createEvent(data)                   // 创建支付事件
└── isStripeEventProcessed(eventId)     // 检查事件是否已处理（幂等检查）
```

### 3.3 订单生命周期

```mermaid
graph LR
    A[用户发起支付] --> B[创建 Checkout Session]
    B --> C[用户在 Stripe 页面完成支付]
    C --> D[Webhook: checkout.session.completed]
    D --> E[创建 payment 记录]
    E --> F[记录 payment_event]
    F --> G[发放积分]

    G --> H{周期续费}
    H -->|成功| I[invoice.paid → 发放月度积分]
    H -->|失败| J[invoice.payment_failed → 记录失败]
    
    K[用户升级套餐] --> L[Webhook: subscription.updated]
    L --> M[检测价格变化 → 发放升级奖励积分]
    L --> N[更新 payment 记录]

    O[用户取消] --> P[cancelSubscription]
    P --> Q[设置 cancel_at_period_end = true]
    Q --> R[Webhook: subscription.deleted → 状态改为 canceled]
```

---

## 4. 积分模块分析

### 4.1 积分账户模型

每个用户拥有一个 `user_credits` 账户，包含以下关键字段：

| 字段 | 含义 |
|------|------|
| `balance` | 当前总余额 |
| `totalEarned` | 累计获得积分 |
| `totalSpent` | 累计消耗积分 |
| `frozenBalance` | 冻结积分（不可用于消费） |

**可用余额** = `balance` - `frozenBalance`

### 4.2 积分交易类型

| 类型 | 说明 | 余额影响 |
|------|------|----------|
| `earn` | 获得积分 | balance ↑, totalEarned ↑ |
| `spend` | 消耗积分 | balance ↓, totalSpent ↑ |
| `refund` | 退款返还 | 复用 earn 逻辑 |
| `admin_adjust` | 管理员调整 | 可增可减 |
| `freeze` | 冻结积分 | frozenBalance ↑（balance 不变） |
| `unfreeze` | 解冻积分 | frozenBalance ↓（balance 不变） |

### 4.3 积分来源

| 来源 | 说明 |
|------|------|
| `subscription` | 订阅获得（首次订阅、月度续费、升级奖励） |
| `api_call` | API 调用消耗 |
| `admin` | 管理员手动调整 |
| `storage` | 存储消耗 |
| `bonus` | 注册奖励等活动赠送 |

### 4.4 积分流转全景图

```mermaid
graph TB
    subgraph 积分获取
        A1[注册奖励<br/>Free 套餐: 50 积分]
        A2[首次订阅<br/>Pro: 1000 / Enterprise: 5000]
        A3[月度续费<br/>Pro: 1000/月 / Enterprise: 5000/月]
        A4[年付积分<br/>Pro: 12000 / Enterprise: 60000]
        A5[套餐升级奖励<br/>新旧积分差额]
        A6[管理员赠送]
    end

    subgraph 积分账户
        B[user_credits<br/>balance / frozenBalance]
    end

    subgraph 积分消耗
        C1[API 调用<br/>1 积分/次]
        C2[存储使用<br/>10 积分/GB/月]
    end

    subgraph 积分管理
        D1[冻结积分]
        D2[解冻积分]
        D3[退款返还]
    end

    A1 & A2 & A3 & A4 & A5 & A6 --> B
    B --> C1 & C2
    D1 & D2 & D3 <--> B
```

### 4.5 CreditService 核心方法

```
CreditService
├── createCreditAccount(userId)         // 创建积分账户
├── getCreditAccount(userId)            // 获取积分账户
├── getOrCreateCreditAccount(userId)    // 获取或创建账户
├── earnCredits(params)                 // 获得积分（核心方法）
├── spendCredits(params)                // 消耗积分（核心方法）
├── hasEnoughCredits(userId, amount)    // 检查余额是否充足
├── getTransactionHistory(userId, ...)  // 查询交易历史
├── refundCredits(params)               // 退款返还积分
├── adminAdjustCredits(userId, amount)  // 管理员调整
├── freezeCredits(userId, amount)       // 冻结积分
└── unfreezeCredits(userId, amount)     // 解冻积分
```

### 4.6 积分获取流程（earnCredits）

```mermaid
flowchart TD
    A[调用 earnCredits] --> B{amount > 0?}
    B -->|否| C[抛出异常: Amount must be positive]
    B -->|是| D[查询 user_credits 账户]
    D --> E{账户存在?}
    E -->|否| F[创建新账户 balance=0]
    F --> D
    E -->|是| G[计算新余额<br/>newBalance = balance + amount<br/>newTotalEarned = totalEarned + amount]
    G --> H[UPDATE user_credits SET balance, totalEarned]
    H --> I[INSERT credit_transactions 记录流水]
    I --> J[返回交易记录]
```

### 4.7 积分消耗流程（spendCredits）

```mermaid
flowchart TD
    A[调用 spendCredits] --> B{amount > 0?}
    B -->|否| C[抛出异常: Amount must be positive]
    B -->|是| D[查询 user_credits 账户]
    D --> E{账户存在?}
    E -->|否| F[抛出异常: Credit account not found]
    E -->|是| G[计算可用余额<br/>availableBalance = balance - frozenBalance]
    G --> H{availableBalance >= amount?}
    H -->|否| I[抛出异常: Insufficient credits]
    H -->|是| J[计算新余额<br/>newBalance = balance - amount<br/>newTotalSpent = totalSpent + amount]
    J --> K[UPDATE user_credits SET balance, totalSpent]
    K --> L[INSERT credit_transactions 记录流水]
    L --> M[返回交易记录]
```

### 4.8 注册奖励积分发放

注册积分的发放通过 `/api/credits/initialize` API 路由实现：

```mermaid
flowchart TD
    A[用户注册/登录] --> B["POST /api/credits/initialize"]
    B --> C[验证认证 + userId 权限]
    C --> D["getOrCreateCreditAccount<br/>带 3 次重试机制"]
    D --> E["查询是否已有 signup_userId 的交易记录"]
    E --> F{已领取过注册奖励?}
    F -->|是| G[跳过，日志记录]
    F -->|否| H{"是新账户?<br/>totalEarned=0 && totalSpent=0"}
    H -->|否| I[跳过]
    H -->|是| J["earnCredits<br/>referenceId: signup_userId<br/>source: bonus"]
    J --> K[初始化配额跟踪]
    K --> L[返回成功]
```

---

## 5. 配额系统

### 5.1 配额模型

配额系统通过 `user_quota_usage` 表按月跟踪用户的资源使用量：

| 服务类型 | 免费用户配额 | Pro 配额 | Enterprise 配额 |
|----------|------------|---------|----------------|
| `api_call` | 100 次/月 | 10,000 次/月 | 100,000 次/月 |
| `storage` | 1 GB | 10 GB | 无限 |

配额系统与积分系统互补：
- **免费用户**：使用配额限制
- **付费用户**：通过积分系统按使用量扣费

### 5.2 配额表的唯一约束

`user_quota_usage` 表通过 `(userId, service, period)` 复合唯一索引确保每个用户每个月每个服务只有一条记录。

---

## 6. 幂等性保证机制

### 6.1 幂等性保障全景

```mermaid
graph TB
    subgraph Webhook 幂等性
        W1["Stripe Event ID 去重<br/>payment_event.stripe_event_id UNIQUE"]
        W2[isStripeEventProcessed 前置检查]
        W3["支付记录存在性检查<br/>findBySubscriptionId / findById"]
    end

    subgraph 积分幂等性
        C1["credit_transactions<br/>userId + referenceId 复合唯一约束"]
        C2["注册奖励 referenceId<br/>signup_userId 固定格式"]
        C3["订阅积分 referenceId<br/>subscriptionId"]
        C4["月度续费 referenceId<br/>subscriptionId_invoiceId"]
        C5["升级奖励 referenceId<br/>upgrade_subscriptionId_timestamp"]
    end

    subgraph 订阅幂等性
        S1["活跃订阅唯一性检查<br/>findActiveSubscriptionByUserId"]
        S2["用户权限校验<br/>subscription.userId === session.user.id"]
    end

    subgraph 配额幂等性
        Q1["复合唯一索引<br/>userId + service + period"]
        Q2[先 UPDATE 后 INSERT 模式]
    end
```

### 6.2 Webhook 事件幂等性

这是整个系统中**最关键**的幂等保障点，因为 Stripe 可能会对同一事件发送多次 Webhook。

#### 6.2.1 第一层：Stripe Event ID 去重

`payment_event` 表中 `stripe_event_id` 字段设置了 **UNIQUE 约束**：

```typescript
// schema.ts
stripeEventId: text('stripe_event_id').unique(),
```

Webhook Handler 在处理每个事件前，先通过 `isStripeEventProcessed()` 方法查询 `payment_event` 表：

```typescript
// route.ts - Webhook 入口
const isProcessed = await paymentRepository.isStripeEventProcessed(event.id);
if (isProcessed) {
    console.log(`[stripe-webhook] Event ${event.id} already processed`);
    return NextResponse.json({ received: true });
}
```

#### 6.2.2 第二层：支付记录存在性检查

在 `handleCheckoutSessionCompleted` 中，创建支付记录前会先查询是否已存在：

```typescript
// 订阅模式
const existingRecord = await paymentRepository.findBySubscriptionId(subscriptionId);
if (existingRecord) {
    console.log(`Payment record already exists for subscription: ${subscriptionId}`);
    return;
}

// 一次性支付模式
const existingRecord = await paymentRepository.findById(paymentIntentId);
if (existingRecord) {
    console.log(`Payment record already exists for payment: ${paymentIntentId}`);
    return;
}
```

#### 6.2.3 幂等性处理时序

```mermaid
sequenceDiagram
    participant S as Stripe
    participant WH as Webhook Handler
    participant PE as payment_event 表
    participant P as payment 表

    S->>WH: Event #1 (event_id: evt_xxx)
    WH->>PE: isStripeEventProcessed("evt_xxx")
    PE-->>WH: false（未处理）
    WH->>P: findBySubscriptionId(sub_xxx)
    P-->>WH: null（不存在）
    WH->>P: create() 创建支付记录
    WH->>PE: createEvent(stripeEventId: "evt_xxx")
    WH-->>S: 200 OK

    Note over S,PE: Stripe 重试发送同一事件

    S->>WH: Event #1 重发 (event_id: evt_xxx)
    WH->>PE: isStripeEventProcessed("evt_xxx")
    PE-->>WH: true（已处理）
    WH-->>S: 200 OK（跳过处理）
```

### 6.3 积分发放幂等性

#### 6.3.1 数据库层面：复合唯一约束

`credit_transactions` 表定义了 `(userId, referenceId)` 的复合唯一约束：

```typescript
// schema.ts
(table) => ({
    userReferenceUnique: {
        name: 'credit_user_reference_unique',
        columns: [table.userId, table.referenceId],
        unique: true,
    },
})
```

这意味着：**同一个用户的同一个 `referenceId` 只能有一条积分流水记录**。

#### 6.3.2 各场景的 referenceId 设计

| 场景 | referenceId 格式 | 唯一性保证 |
|------|------------------|-----------|
| 注册奖励 | `signup_{userId}` | 每用户只能领一次 |
| 首次订阅积分 | `{subscriptionId}` | 每个订阅只发一次 |
| 月度续费积分 | `{subscriptionId}_{invoiceId}` | 每张发票只发一次 |
| 升级奖励积分 | `upgrade_{subscriptionId}_{timestamp}` | 时间戳区分不同升级操作 |
| 升级即得积分 | `upgrade_immediate_{subscriptionId}_{timestamp}` | 同上 |
| 管理员赠送 | `admin_{adminUserId}_{timestamp}` | 时间戳区分 |
| 注册奖励（补发脚本） | `signup_bonus_{userId}` / `retroactive_signup_{userId}` | 每用户只能补发一次 |

#### 6.3.3 注册奖励的多重幂等保护

注册奖励积分发放路径 (`/api/credits/initialize`) 有**三层防护**：

1. **业务层**：查询历史交易中是否存在 `referenceId = signup_{userId}` 的记录
2. **业务层**：检查账户是否为新账户（`totalEarned === 0 && totalSpent === 0`）
3. **数据库层**：`(userId, referenceId)` 复合唯一约束，即使前两层检查并发穿透，数据库也会拒绝重复插入

```mermaid
flowchart TD
    A["POST /api/credits/initialize"] --> B["查询 referenceId=signup_userId 的交易"]
    B --> C{已有记录?}
    C -->|是| D[跳过：已领取过]
    C -->|否| E{"是新账户?<br/>totalEarned=0"}
    E -->|否| F[跳过：非新账户]
    E -->|是| G["earnCredits<br/>referenceId: signup_userId"]
    G --> H{DB 唯一约束检查}
    H -->|通过| I[成功发放]
    H -->|冲突| J["抛出异常<br/>但不影响系统稳定"]
```

### 6.4 订阅创建幂等性

在 `createCheckoutSession` / `createSubscription` Server Action 中：

```mermaid
flowchart TD
    A[用户点击订阅] --> B[getServerSession 验证登录]
    B --> C[findActiveSubscriptionByUserId]
    C --> D{已有活跃订阅?}
    D -->|是| E[返回错误：已有活跃订阅]
    D -->|否| F[继续创建订阅]
```

这确保了同一用户不会创建多个活跃订阅。

### 6.5 配额更新幂等性

`user_quota_usage` 表通过 `(userId, service, period)` 复合唯一索引保证每用户每服务每月只有一条记录。`updateQuotaUsage` 方法采用**先 UPDATE 后 INSERT**的模式：

```typescript
// 先尝试更新已有记录
const updated = await db.update(userQuotaUsage)
    .set({ usedAmount: sql`used_amount + ${amount}` })
    .where(/* userId, service, period 匹配 */)
    .returning();

if (updated.length > 0) return updated[0];

// 如果没有已有记录，则插入新记录
const inserted = await db.insert(userQuotaUsage).values(newRecord).returning();
```

### 6.6 幂等性保障总结

| 模块 | 幂等手段 | 层级 |
|------|---------|------|
| Webhook 事件 | `stripe_event_id` UNIQUE + 前置查询 | 数据库 + 应用 |
| 支付记录创建 | `findBySubscriptionId` / `findById` 前置检查 | 应用 |
| 积分发放 | `(userId, referenceId)` 复合唯一约束 | 数据库 |
| 注册奖励 | 三层检查（交易查询 + 新账户判断 + DB 唯一约束） | 应用 + 数据库 |
| 活跃订阅 | `findActiveSubscriptionByUserId` 前置检查 | 应用 |
| 配额更新 | `(userId, service, period)` 复合唯一索引 + 先更新后插入 | 数据库 + 应用 |
| Webhook 签名 | `stripe.webhooks.constructEvent` 签名验证 | 安全 |

---

## 7. 数据流转全景图

### 7.1 从用户注册到积分消耗的完整链路

```mermaid
graph TB
    subgraph 用户注册阶段
        R1[用户注册] --> R2[POST /api/credits/initialize]
        R2 --> R3[创建积分账户]
        R3 --> R4[发放注册奖励 50 积分]
        R4 --> R5[初始化配额跟踪]
    end

    subgraph 订阅阶段
        S1[用户选择套餐] --> S2[createCheckoutSession]
        S2 --> S3[Stripe Checkout 页面]
        S3 --> S4[支付成功]
        S4 --> S5[Webhook: checkout.session.completed]
        S5 --> S6[创建 payment 记录]
        S6 --> S7[发放首次订阅积分]
    end

    subgraph 使用阶段
        U1[用户调用 API] --> U2[spendCredits 扣减积分]
        U2 --> U3[updateQuotaUsage 更新配额]
    end

    subgraph 续费阶段
        P1[Stripe 自动扣费] --> P2[Webhook: invoice.paid]
        P2 --> P3{是首次付款?}
        P3 -->|是| P4[跳过（已在订阅时发放）]
        P3 -->|否| P5[发放月度续费积分]
    end

    subgraph 升级阶段
        UP1[用户升级套餐] --> UP2[Webhook: subscription.updated]
        UP2 --> UP3[检测价格变化]
        UP3 --> UP4[发放升级差额积分]
        UP4 --> UP5[发放新套餐即得积分]
    end

    subgraph 取消阶段
        C1[用户取消订阅] --> C2[cancelSubscription]
        C2 --> C3[Stripe: cancel_at_period_end = true]
        C3 --> C4[周期结束后]
        C4 --> C5[Webhook: subscription.deleted]
        C5 --> C6[payment 状态改为 canceled]
    end

    R5 --> S1
    S7 --> U1
    P5 --> U1
    UP5 --> U1
```

---

## 8. 潜在风险与改进建议

### 8.1 已识别的风险

| 风险点 | 描述 | 严重程度 |
|--------|------|----------|
| **积分操作非原子性** | `earnCredits` / `spendCredits` 中，余额更新和流水插入分为两次独立的 DB 操作，中间如果出错会导致数据不一致 | ⚠️ 高 |
| **并发扣减竞争** | `spendCredits` 中先查后改（read-then-write），高并发下可能出现超扣 | ⚠️ 高 |
| **Stripe Customer ID 未持久化** | `createCheckoutSession` 每次都创建新的 Stripe Customer，`TODO` 注释表明 `stripeCustomerId` 尚未存入用户表 | ⚠️ 中 |
| **升级积分的 referenceId 含 timestamp** | `upgrade_{subscriptionId}_{Date.now()}` 中使用时间戳，理论上在极短时间内重试不会命中唯一约束 | ⚠️ 低 |
| **Webhook 异常未完全捕获** | 部分 handler 的 catch 中 `throw error` 会导致 Stripe 重试，但重试时由于幂等检查会直接返回，这是预期行为 | ℹ️ 低 |

### 8.2 改进建议

#### 8.2.1 引入数据库事务保证积分操作原子性

当前 `earnCredits` / `spendCredits` 中的余额更新和流水插入是两个独立的 SQL 操作。建议将它们包裹在数据库事务中：

```typescript
// 改进方案示例（伪代码）
await db.transaction(async (tx) => {
    await tx.update(userCredits).set({ balance: newBalance, ... });
    await tx.insert(creditTransactions).values({ ... });
});
```

#### 8.2.2 使用乐观锁或悲观锁防止并发超扣

当前的 `spendCredits` 方法存在经典的 TOCTOU（Time-of-check to Time-of-use）问题。建议使用以下方式之一：

- **乐观锁**：在 `user_credits` 表增加 `version` 字段，UPDATE 时带版本条件
- **悲观锁**：使用 `SELECT ... FOR UPDATE` 锁定行
- **原子 SQL**：直接使用 `UPDATE ... SET balance = balance - $amount WHERE balance - frozen_balance >= $amount` 并检查影响行数

#### 8.2.3 持久化 Stripe Customer ID

当前代码中有明确的 `TODO` 注释，应尽快实现将 `stripeCustomerId` 保存到用户表，避免重复创建 Customer。

#### 8.2.4 统一升级积分的 referenceId 生成策略

建议将升级积分的 `referenceId` 改为基于确定性信息（如 `upgrade_{subscriptionId}_{oldPriceId}_{newPriceId}`），避免使用 `Date.now()` 带来的幂等漏洞。

---

> **文档版本**: v1.0
> **生成日期**: 2026-02-06
> **基于代码版本**: 当前主分支

# 社交登录积分初始化防重复方案

## 问题描述

同一个用户使用不同社交账号（GitHub、Google）登录时，可能会触发多次积分初始化，导致重复发放注册奖励。

## 解决方案

### 1. 统一 referenceId 格式

所有注册奖励统一使用 `signup_${userId}` 格式：

```typescript
const signupReferenceId = `signup_${userId}`;
```

### 2. 基于 userId 的幂等性检查

在 `/api/credits/initialize` 中实现严格的幂等性检查：

```typescript
// 检查是否已经发放过注册奖励
const existingSignupTransaction = await creditService.getTransactionHistory(userId, 100)
  .then(txs => txs.find(tx => tx.referenceId === signupReferenceId))
  .catch(() => null);
const alreadyReceivedBonus = !!existingSignupTransaction;

// 只有新账户且未发放过奖励才进行发放
if (isNewAccount && !alreadyReceivedBonus) {
  // 发放注册奖励
}
```

### 3. 工作原理

1. **用户首次注册**（邮箱或社交账号）：
   - 创建 user 记录，获得唯一 userId
   - 调用初始化 API，检查无历史记录，发放 50 积分
   - 记录 referenceId = `signup_${userId}`

2. **用户使用其他社交账号登录**：
   - Better Auth 识别为同一邮箱，关联到同一 userId
   - 前端检测到"新用户"（实际是新登录方式），调用初始化 API
   - API 检查发现已有 `signup_${userId}` 交易记录，跳过发放
   - 返回成功，但 `signupCreditsGranted = 0`

### 4. 关键优势

- **基于 userId 防重复**：无论用户通过多少种方式登录，都是同一个 userId，确保只发放一次
- **邮箱唯一性保障**：Better Auth 确保相同邮箱的不同社交账号映射到同一用户
- **完全幂等**：多次调用初始化 API 不会产生副作用
- **日志清晰**：明确记录是否发放及原因

### 5. 测试场景

1. **邮箱注册 → GitHub 登录**：
   - 邮箱注册获得 50 积分
   - GitHub 登录（相同邮箱）不再发放积分

2. **GitHub 登录 → Google 登录**：
   - GitHub 登录获得 50 积分
   - Google 登录（相同邮箱）不再发放积分

3. **重复调用初始化 API**：
   - 第一次调用发放 50 积分
   - 后续调用均跳过，返回已发放状态

### 6. 日志输出示例

```
🎯 Initializing credit account for user: user@example.com
✅ Granted 50 signup bonus credits to user@example.com
🎉 Successfully initialized credit account for user user@example.com
```

或

```
🎯 Initializing credit account for user: user@example.com
⚠️ Signup bonus already granted to user@example.com, skipping
🎉 Successfully initialized credit account for user user@example.com
```

### 7. 数据库约束

建议在 `credit_transactions` 表上添加唯一约束：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS credit_user_reference_unique
ON credit_transactions (user_id, reference_id)
WHERE reference_id IS NOT NULL;
```

这样即使应用层检查失败，数据库层也会防止重复记录。

## 实现文件

- `src/app/api/credits/initialize/route.ts` - 主要逻辑
- `src/store/auth-store.ts` - 前端调用逻辑
- `src/server/db/schema.ts` - 数据库约束（建议）

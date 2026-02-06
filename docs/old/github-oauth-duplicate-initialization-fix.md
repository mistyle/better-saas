# GitHub OAuth 重复初始化问题修复

## 问题描述

在GitHub OAuth登录流程中，用户的信用账户初始化被执行了两次，导致数据库唯一约束冲突错误：

```
NeonDbError: duplicate key value violates unique constraint "user_credits_user_id_unique"
```

## 问题分析

### 根本原因

1. **Better-Auth钩子重复触发**：`better-auth`的`hooks.after`钩子在OAuth流程中被触发了两次：
   - 第一次：在`/api/auth/callback/github`路径下成功创建用户信用账户
   - 第二次：在`/api/auth/get-session`路径下再次尝试创建相同用户的信用账户

2. **数据库约束**：`user_credits`表的`user_credits_user_id_unique`约束防止同一用户创建多个信用账户

3. **缺乏幂等性**：原始的`handleUserCreated`函数缺乏幂等性检查，每次调用都会尝试创建新的信用账户

### 日志分析

```
✅ 第一次调用成功：
/api/auth/callback/github
✅ Granted 50 signup bonus credits to user btcnoder@gmail.com
✅ Initialized quota usage records for user btcnoder@gmail.com
🎉 Successfully initialized credit account for user btcnoder@gmail.com

❌ 第二次调用失败：
/api/auth/get-session
❌ Failed to initialize credit account for user btcnoder@gmail.com: 
   duplicate key value violates unique constraint "user_credits_user_id_unique"
```

## 解决方案

### 1. 使用幂等性操作

将`createCreditAccount`替换为`getOrCreateCreditAccount`，避免重复创建：

```typescript
// 修改前：直接创建，可能导致重复
await creditService.createCreditAccount(user.id);

// 修改后：获取或创建，确保幂等性
const creditAccount = await creditService.getOrCreateCreditAccount(user.id);
```

### 2. 添加新用户检查

通过检查交易历史来判断是否为新用户，避免重复授予注册奖励：

```typescript
// 检查是否为新创建的账户（无历史交易记录）
const existingTransactions = await creditService.getTransactionHistory(user.id, 1);
const isNewAccount = existingTransactions.length === 0;

if (isNewAccount) {
  // 只为新用户授予注册奖励和初始化配额
  // ...
} else {
  console.log(`ℹ️ Credit account already exists for user ${user.email}, skipping initialization`);
}
```

### 3. 改进错误处理和日志

增加更详细的上下文信息用于调试：

```typescript
handleUserCreated(newSession.user).catch(error => {
  console.error('Failed to initialize user business data:', error);
  
  // 记录额外的上下文信息用于调试
  console.error('Context details:', {
    userId: newSession.user.id,
    userEmail: newSession.user.email,
    path: ctx.context.path,
    method: ctx.context.method,
  });
});
```

## 修复后的效果

1. **幂等性**：无论钩子被触发多少次，用户初始化只会执行一次
2. **错误消除**：不再出现唯一约束冲突错误
3. **资源节约**：避免重复的数据库操作和不必要的奖励授予
4. **更好的日志**：提供更清晰的执行状态反馈

## 相关文件

- `src/lib/auth/auth.ts` - 主要修复文件
- `src/lib/credits/credit-service.ts` - 信用服务（使用现有的`getOrCreateCreditAccount`方法）
- `src/server/db/schema.ts` - 数据库模式定义

## 预防措施

1. **幂等性设计**：所有用户初始化相关的操作都应该设计为幂等的
2. **钩子使用谨慎**：在使用认证钩子时，要考虑到可能的重复触发场景
3. **错误处理完善**：确保错误不会阻塞认证流程的正常进行
4. **监控和日志**：添加足够的日志来跟踪和调试类似问题

## 测试建议

1. 测试GitHub OAuth登录流程
2. 验证用户信用账户只创建一次
3. 确认注册奖励只授予一次
4. 检查错误日志是否清晰明了

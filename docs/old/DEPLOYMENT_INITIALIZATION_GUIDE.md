# 项目重新部署后的用户数据初始化指南

## 概述

当项目重新部署到新环境或数据库被重置后，需要为现有用户初始化积分账户和配额使用记录。本指南提供了完整的操作步骤和相关脚本说明。

## 前置条件

1. 确保数据库连接正常
2. 确保环境变量 `DATABASE_URL` 已正确配置
3. 确保项目依赖已安装 (`npm install`)

## 初始化步骤

### 第一步：检查当前数据库状态

在开始初始化之前，先检查数据库中用户和积分的当前状态：

```bash
# 检查用户积分状态
npx tsx scripts/check-users-credits-status.ts
```

这个脚本会显示：
- 前10个用户的详细积分信息
- 有/无积分账户的用户统计
- 系统中的总积分数量
- 交易记录统计

### 第二步：为现有用户创建积分账户

如果发现有用户没有积分账户，运行以下脚本：

```bash
# 为没有积分账户的用户创建账户并发放注册奖励积分
npx tsx scripts/grant-existing-users-credits.ts
```

此脚本功能：
- 查找所有没有积分账户的用户
- 为每个用户创建积分账户
- 发放注册奖励积分（默认50积分）
- 记录积分发放交易

### 第三步：为余额为零的用户补发注册积分

如果有用户已有积分账户但余额为0（可能是测试时消耗了注册积分），运行：

```bash
# 为余额为0的用户补发注册积分
npx tsx scripts/grant-signup-credits.ts
```

此脚本功能：
- 查找积分余额为0的用户
- 为这些用户发放注册奖励积分
- 更新积分账户余额和总收入

### 第四步：初始化用户配额使用记录

为所有用户创建当前月份的配额使用记录：

```bash
# 初始化所有用户的配额使用记录
npx tsx scripts/init-user-quota-usage.ts
```

此脚本功能：
- 为所有用户创建当前月份的配额使用记录
- 支持多种服务类型（api_call, storage）
- 初始使用量设为0
- 批量插入以提高性能

### 第五步：验证初始化结果

再次运行状态检查脚本，确认所有用户都已正确初始化：

```bash
# 再次检查用户积分状态
npx tsx scripts/check-users-credits-status.ts
```

## 脚本详细说明

### 1. check-users-credits-status.ts
- **用途**：检查用户积分账户状态
- **输出**：用户列表、积分余额、交易记录、系统统计
- **建议**：在初始化前后都运行此脚本

### 2. grant-existing-users-credits.ts
- **用途**：为没有积分账户的用户创建账户并发放积分
- **处理逻辑**：LEFT JOIN 查询找出无积分账户的用户
- **积分来源**：从 payment.config.ts 中获取免费计划的注册积分

### 3. grant-signup-credits.ts
- **用途**：为余额为0的现有用户补发注册积分
- **处理逻辑**：查找余额为0的用户（通常是消耗了注册积分的用户）
- **适用场景**：测试环境重置或积分被意外消耗

### 4. init-user-quota-usage.ts
- **用途**：初始化用户配额使用记录
- **功能特点**：
  - 支持批量处理
  - 自动检测现有记录，避免重复
  - 支持多种服务类型
  - 提供详细的统计信息

## 完整初始化流程（推荐顺序）

### 方式一：使用综合脚本（推荐）

```bash
# 快速检查系统状态
npm run deploy:init:check

# 执行完整初始化流程
npm run deploy:init
# 或者明确指定完整模式
npm run deploy:init:full
```

### 方式二：分步执行

```bash
# 1. 检查当前状态
npm run deploy:status

# 2. 创建积分账户（如果需要）
npm run deploy:credits

# 3. 补发注册积分（如果需要）
npx tsx scripts/grant-signup-credits.ts

# 4. 初始化配额记录
npm run deploy:quota

# 5. 验证最终状态
npm run deploy:status
```

### 方式三：直接使用脚本

```bash
# 1. 检查当前状态
npx tsx scripts/check-users-credits-status.ts

# 2. 创建积分账户（如果需要）
npx tsx scripts/grant-existing-users-credits.ts

# 3. 补发注册积分（如果需要）
npx tsx scripts/grant-signup-credits.ts

# 4. 初始化配额记录
npx tsx scripts/init-user-quota-usage.ts

# 5. 验证最终状态
npx tsx scripts/check-users-credits-status.ts
```

## 注意事项

1. **幂等性**：所有脚本都设计为幂等的，可以安全地多次运行
2. **批量处理**：脚本支持批量处理，适合大量用户的场景
3. **错误处理**：脚本包含完善的错误处理和日志记录
4. **数据验证**：每个脚本都会验证操作结果并提供统计信息

## 故障排除

### 常见问题

1. **DATABASE_URL 未设置**
   ```
   Error: DATABASE_URL environment variable is required
   ```
   解决：检查 `.env` 文件中的数据库连接字符串

2. **权限不足**
   ```
   Error: permission denied for table users
   ```
   解决：检查数据库用户权限

3. **重复记录错误**
   - 脚本已内置重复检查，正常情况下不会出现
   - 如果出现，检查数据库约束设置

### 日志分析

脚本运行时会输出详细日志：
- ✅ 表示成功操作
- ❌ 表示错误
- ⚠️ 表示警告
- 📊 表示统计信息

## 自动化建议

可以将这些脚本集成到部署流程中：

```json
{
  "scripts": {
    "deploy:init": "npm run deploy:credits && npm run deploy:quota",
    "deploy:credits": "npx tsx scripts/grant-existing-users-credits.ts",
    "deploy:quota": "npx tsx scripts/init-user-quota-usage.ts",
    "deploy:check": "npx tsx scripts/check-users-credits-status.ts"
  }
}
```

## 定期维护

建议定期运行以下检查：
- 每月运行配额初始化脚本（已集成到 cron job 中）
- 定期检查用户积分状态
- 监控异常的积分变动

---

*最后更新：2024年12月*
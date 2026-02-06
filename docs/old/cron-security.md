# Cron 接口安全配置

## 概述

本项目的 cron 接口已经实现了安全验证机制，防止未经授权的访问。所有 cron 接口都需要通过密钥验证才能执行。

## 安全配置

### 1. 设置 CRON_SECRET 环境变量

在生产环境中，**强烈建议**设置 `CRON_SECRET` 环境变量：

```bash
# 在 .env 文件中添加
CRON_SECRET="your-secure-random-secret-key"
```

**注意：**
- 使用强随机字符串作为密钥（建议至少 32 个字符）
- 不要在代码中硬编码密钥
- 定期更换密钥

### 2. 开发环境

在开发环境中，如果未设置 `CRON_SECRET`，系统会跳过验证并记录警告日志。这样便于本地开发和测试。

## 使用方式

### 方式一：通过 Authorization Header

```bash
curl -X GET "https://your-domain.com/api/cron/monthly-credits" \
  -H "Authorization: Bearer your-cron-secret-key"
```

### 方式二：通过查询参数

```bash
curl -X GET "https://your-domain.com/api/cron/monthly-credits?secret=your-cron-secret-key"
```

## Vercel Cron 配置

### 1. 配置环境变量

在 Vercel 项目设置中添加环境变量：
- 变量名：`CRON_SECRET`
- 变量值：你的安全密钥（建议使用强随机字符串）

### 2. 更新 vercel.json

项目已经配置好了 `vercel.json`，使用环境变量引用：

```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-credits",
      "schedule": "0 2 1 * *",
      "headers": {
        "Authorization": "Bearer $CRON_SECRET"
      }
    }
  ]
}
```

**注意：**
- `$CRON_SECRET` 会自动替换为你在 Vercel 中设置的环境变量值
- 定时任务每月1号凌晨2点执行（UTC时间）
- 必须在 Vercel 项目设置中配置 `CRON_SECRET` 环境变量，否则定时任务会失败

## 安全最佳实践

1. **生产环境必须设置密钥**：在生产环境中务必设置 `CRON_SECRET`
2. **使用强密钥**：密钥应该足够复杂和随机
3. **定期轮换**：定期更换 cron 密钥
4. **监控日志**：关注未授权访问的警告日志
5. **网络限制**：如果可能，在网络层面限制对 cron 接口的访问

## 错误处理

当验证失败时，接口会返回：

```json
{
  "success": false,
  "message": "Unauthorized: Invalid or missing cron secret",
  "error": "CRON_AUTH_FAILED"
}
```

HTTP 状态码：`401 Unauthorized`

## 现有 Cron 接口

目前项目中的 cron 接口：

- `/api/cron/monthly-credits` - 月度积分分发

所有接口都已实现相同的安全验证机制。
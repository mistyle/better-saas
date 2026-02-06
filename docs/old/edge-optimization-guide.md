# Vercel Edge Functions 优化指南

本指南详细说明了如何优化 Better-SaaS 项目以更好地利用 Vercel Edge Functions，同时保持与 Cloudflare Workers 的完全兼容性。

## 优化概览

### 🎯 优化目标
- 最大化 Vercel Edge Functions 的使用
- 保持 Cloudflare Workers 兼容性
- 提升全球访问性能
- 降低冷启动时间

### ✅ 已实施的优化

#### 1. 中间件优化
```typescript
// src/middleware.ts
export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
  runtime: 'edge', // ← 新增：在 Edge Runtime 中运行
};
```

#### 2. API 路由分类

**Edge Runtime API 路由** (快速响应)：
- `/api/auth/[...all]` - 用户认证
- `/api/health` - 健康检查
- `/api/user/session` - 会话验证

**Serverless Functions** (复杂处理)：
- `/api/webhooks/stripe` - Stripe 支付处理

#### 3. 数据库连接优化
```typescript
// src/server/db/index.ts
import { neon } from '@neondatabase/serverless';
const sql = neon(env.DATABASE_URL);
const db = drizzle(sql, { schema });
```

#### 4. Server Actions 优化
```typescript
// 简单认证检查使用 Edge Runtime
export const runtime = 'edge';
```

## 部署配置

### Vercel 配置 (vercel.json)
```json
{
  "functions": {
    "src/app/api/auth/[...all]/route.ts": {
      "runtime": "edge"
    },
    "src/app/api/webhooks/stripe/route.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 30
    }
  },
  "regions": ["sin1", "hnd1", "iad1"]
}
```

### Cloudflare 配置 (open-next.config.ts)
```typescript
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
```

## 性能提升

### Edge Functions 优势
1. **全球分布**：在全球边缘节点运行
2. **零冷启动**：几乎瞬时响应
3. **低延迟**：地理位置就近处理
4. **自动扩展**：无需配置即可处理高并发

### 兼容性保证
- 所有 Edge Runtime 代码完全兼容 Cloudflare Workers
- 数据库连接使用 neon-http，支持两个平台
- 环境变量和配置统一管理

## 最佳实践

### 1. 选择运行时
```typescript
// 适合 Edge Runtime：
- 认证检查
- 简单数据验证
- 重定向逻辑
- 缓存策略

// 适合 Serverless Functions：
- 复杂数据库操作
- 文件上传处理
- 第三方 API 集成
- 长时间运行任务
```

### 2. 代码编写指南
```typescript
// ✅ Edge Runtime 兼容
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ data: 'value' });
  return response;
}

export const runtime = 'edge';
```

### 3. 错误处理
```typescript
try {
  // 业务逻辑
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : 'Unknown');
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

## 监控和调试

### 1. 性能监控
- 使用 Vercel Analytics 监控 Edge Functions 性能
- 关注冷启动时间和响应时间
- 监控错误率和成功率

### 2. 日志记录
```typescript
// Edge Runtime 兼容的日志
console.log('Info:', { userId, timestamp: Date.now() });
console.error('Error:', error instanceof Error ? error.message : 'Unknown');
```

## 部署命令

### Vercel 部署
```bash
# 开发环境
npm run dev

# 构建和预览
npm run build
npm run preview

# 部署到 Vercel
vercel --prod
```

### Cloudflare 部署
```bash
# 构建 Cloudflare 版本
npm run cf:preview

# 部署到 Cloudflare Workers
npm run cf:deploy
```

## 故障排除

### 常见问题

1. **Edge Runtime 不支持某些 API**
   ```typescript
   // ❌ 不支持
   import fs from 'fs';
   
   // ✅ 替代方案
   import { NextRequest } from 'next/server';
   const data = await request.json();
   ```

2. **数据库连接问题**
   ```typescript
   // ✅ 使用 HTTP 连接
   import { neon } from '@neondatabase/serverless';
   const sql = neon(DATABASE_URL);
   ```

3. **环境变量访问**
   ```typescript
   // ✅ 正确方式
   import { env } from '@/env';
   const value = env.CUSTOM_VAR;
   ```

## 总结

通过本次优化，项目现在能够：
- 在 Vercel 上充分利用 Edge Functions 的性能优势
- 保持与 Cloudflare Workers 的完全兼容性
- 实现更快的全球访问速度
- 提供更好的用户体验

继续监控性能指标，并根据实际使用情况进一步优化。 
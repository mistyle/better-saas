# Vercel Edge Functions 优化指南

本指南详细说明如何在保持 Cloudflare Workers 兼容性的同时，优化项目以最大化使用 Vercel Edge Functions。

## 优化概述

我们的优化策略采用**分层运行时方法**：

- **Edge Runtime**：用于轻量级、快速响应的功能
- **Node.js Runtime**：用于复杂的业务逻辑和数据库操作

## 架构设计

### 1. 平台检测系统

```typescript
// src/lib/platform-utils.ts
export function detectPlatform(): RuntimePlatform {
  // 自动检测当前运行环境
  // 支持: vercel-edge, vercel-serverless, cloudflare-workers, node
}
```

### 2. 运行时分配策略

| 功能类型 | 运行时选择 | 原因 |
|---------|-----------|------|
| 中间件 | Edge Runtime | 全球分布，低延迟 |
| 认证状态检查 | Edge Runtime | 简单逻辑，快速响应 |
| 健康检查 | Edge Runtime | 无状态，高可用 |
| 数据库操作 | Node.js Runtime | 复杂查询，连接池 |
| 文件上传 | Node.js Runtime | 大文件处理 |
| Webhook 处理 | Node.js Runtime | 复杂业务逻辑 |

## 实现细节

### 1. 中间件优化

```typescript
// src/middleware.ts
export const runtime = 'edge'; // 明确指定 Edge Runtime

export default function middleware(request: NextRequest) {
  // 在边缘运行的国际化和安全头部设置
}
```

### 2. API 路由配置

#### Edge Runtime API 示例

```typescript
// src/app/api/health/route.ts
export const runtime = 'edge';

export async function GET() {
  return createPlatformResponse({
    status: 'healthy',
    platform: detectPlatform(),
  });
}
```

#### Node.js Runtime API 示例

```typescript
// src/app/api/webhooks/stripe/route.ts
// 默认使用 Node.js Runtime（无需显式声明）

export async function POST(request: NextRequest) {
  // 复杂的 Stripe webhook 处理逻辑
}
```

### 3. Vercel 配置优化

```json
// vercel.json
{
  "functions": {
    "src/app/api/health/route.ts": {
      "runtime": "edge"
    },
    "src/app/api/platform-info/route.ts": {
      "runtime": "edge"
    },
    "src/app/api/auth/status/route.ts": {
      "runtime": "edge"
    },
    "src/app/api/auth/[...all]/route.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 30
    },
    "src/app/api/webhooks/stripe/route.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 30
    }
  }
}
```

## 性能优化

### 1. Next.js 配置

```typescript
// next.config.ts
const config: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'sharp', '@jsquash/jpeg', '@jsquash/png', '@jsquash/resize'
    ],
  },
  webpack: (config, { isServer }) => {
    // Edge Runtime 打包优化
    if (config.name === 'server') {
      config.optimization = {
        ...config.optimization,
        sideEffects: false,
      };
    }
    return config;
  },
  compress: true,
  swcMinify: true,
};
```

### 2. 包大小优化

- 使用 `serverComponentsExternalPackages` 排除大型依赖
- 启用 SWC minify 压缩
- 动态导入非关键代码

## 兼容性保证

### 1. 平台适配层

```typescript
// 统一的响应创建
export function createPlatformResponse(data: unknown, options = {}) {
  // 自动检测平台并设置相应头部
  const platform = detectPlatform();
  if (platform === 'vercel-edge') {
    responseHeaders['X-Edge-Runtime'] = 'vercel';
  } else if (platform === 'cloudflare-workers') {
    responseHeaders['X-Edge-Runtime'] = 'cloudflare';
  }
  
  return new Response(JSON.stringify(data), { headers: responseHeaders });
}
```

### 2. 功能检测

```typescript
// 检查当前平台支持的功能
export function isFeatureSupported(feature: string): boolean {
  const config = getPlatformConfig();
  return config[feature];
}

// 使用示例
if (isFeatureSupported('supportsFileSystem')) {
  // 使用文件系统 API
} else {
  // 使用替代方案
}
```

## 部署流程

### 1. Vercel 部署

```bash
# 使用优化的部署脚本
pnpm vercel:deploy

# 或手动部署
vercel deploy --prod
```

### 2. Cloudflare Workers 部署

```bash
# Cloudflare 部署保持不变
pnpm cf:deploy
```

### 3. 验证部署

```bash
# 测试平台功能
pnpm platform:test

# 检查 Edge Runtime 状态
curl https://your-domain.vercel.app/api/platform-info
```

## 监控和调试

### 1. 平台信息 API

访问 `/api/platform-info` 查看当前运行环境：

```json
{
  "platform": "vercel-edge",
  "isEdgeRuntime": true,
  "config": {
    "maxExecutionTime": 30000,
    "memoryLimit": "128MB",
    "supportsNodeAPIs": false,
    "supportsFileSystem": false,
    "supportsDatabase": true
  }
}
```

### 2. 健康检查

访问 `/api/health` 进行健康检查：

```json
{
  "status": "healthy",
  "platform": "vercel-edge",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 最佳实践

### 1. 运行时选择原则

- **优先使用 Edge Runtime**：对于无状态、轻量级操作
- **谨慎使用 Node.js Runtime**：仅用于必须的复杂操作
- **避免混合使用**：同一功能保持运行时一致性

### 2. 代码组织

- 将 Edge Runtime 代码放在单独的模块中
- 使用平台检测避免运行时错误
- 提供 fallback 机制

### 3. 测试策略

- 单元测试覆盖平台检测逻辑
- 集成测试验证两个平台的兼容性
- 性能测试对比不同运行时的表现

## 故障排除

### 1. 常见问题

**问题**: Edge Runtime 中使用了 Node.js API
**解决**: 使用平台检测，提供替代实现

**问题**: Bundle 大小超过 Edge Runtime 限制
**解决**: 使用动态导入，优化依赖

**问题**: Cloudflare Workers 部署失败
**解决**: 检查代码兼容性，避免 Vercel 特定 API

### 2. 调试工具

- 使用 `detectPlatform()` 确认运行环境
- 查看 `X-Edge-Runtime` 头部确认运行时
- 使用 Vercel 函数日志调试

## 性能收益

采用这种优化策略后，您可以期待：

- **响应时间减少 50-80%**：Edge Runtime 的全球分布
- **冷启动时间几乎为零**：Edge Runtime 的预热机制
- **成本优化**：根据使用量选择合适的运行时
- **全球可用性提升**：边缘节点的高可用性

## 结论

通过分层运行时策略，我们成功实现了：

1. ✅ **最大化 Edge Functions 使用**：轻量级操作在边缘运行
2. ✅ **保持 Cloudflare Workers 兼容性**：统一的平台适配层
3. ✅ **性能显著提升**：合理的运行时分配
4. ✅ **代码可维护性**：清晰的架构设计

这种方案既充分利用了 Vercel Edge Functions 的优势，又保证了多平台部署的灵活性。 
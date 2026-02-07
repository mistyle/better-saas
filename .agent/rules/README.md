# Better-SaaS 项目规则

本目录包含 Better-SaaS 项目的开发规则和最佳实践指南。

## 规则文件列表

| 文件 | 说明 |
|------|------|
| [project-overview.md](./project-overview.md) | 项目概述、技术栈和目录结构 |
| [coding-conventions.md](./coding-conventions.md) | 编码规范、TypeScript、代码风格 |
| [component-patterns.md](./component-patterns.md) | 组件开发模式、UI组件系统 |
| [i18n-guidelines.md](./i18n-guidelines.md) | 国际化开发指南 |
| [api-patterns.md](./api-patterns.md) | API 开发模式、Server Actions |
| [auth-and-payment.md](./auth-and-payment.md) | 身份验证、支付、积分系统 |
| [development-workflow.md](./development-workflow.md) | 开发工作流、命令、调试 |

## 快速参考

### 核心技术栈
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript (严格模式)
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据库**: PostgreSQL + Drizzle ORM
- **认证**: Better Auth
- **支付**: Stripe
- **国际化**: next-intl

### 必须使用 pnpm

```bash
pnpm install    # 安装依赖
pnpm dev        # 开发服务器
pnpm build      # 构建
pnpm check      # 代码检查
```

### 路径别名

```typescript
import { Button } from '@/components/ui';
import { auth } from '@/lib/auth/auth';
import { env } from '@/env';
```

### 关键目录

```
src/
├── app/        # 页面和API路由
├── components/ # React组件
├── config/     # 配置文件
├── server/     # 服务器端代码
├── lib/        # 工具库
├── hooks/      # React Hooks
├── i18n/       # 国际化
└── types/      # 类型定义
```

## 遵循规则

在开发过程中，请遵循以下原则：

1. **阅读相关规则文件** - 开始新功能前，先阅读相关的规则文件
2. **保持一致性** - 遵循现有代码的风格和模式
3. **使用 TypeScript** - 利用类型系统提高代码质量
4. **国际化优先** - 所有用户可见文本都应国际化
5. **安全第一** - 敏感操作必须检查认证和权限

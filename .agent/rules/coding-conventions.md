# 编码规范

## 包管理器

**必须使用 pnpm** 作为包管理器。

```bash
# 安装依赖
pnpm install

# 添加依赖
pnpm add <package>

# 开发依赖
pnpm add -D <package>

# 运行脚本
pnpm <script>
```

## TypeScript 规范

### 严格模式配置
项目启用了 TypeScript 严格模式，包括：
- `strict: true`
- `noUncheckedIndexedAccess: true`

### 路径别名
使用 `@/` 作为 `src/` 的路径别名：
```typescript
// ✅ 正确
import { Button } from '@/components/ui';
import { auth } from '@/lib/auth/auth';

// ❌ 错误
import { Button } from '../../../components/ui';
```

### 类型定义位置
- 全局类型: `src/types/index.d.ts`
- 模块特定类型: 在对应模块目录下定义

## 代码风格 (Biome)

使用 Biome 进行代码格式化和检查：

```bash
# 检查代码
pnpm check

# 检查并自动修复
pnpm check:write

# 检查并自动修复（包括不安全的修复）
pnpm check:unsafe
```

### 格式化规范
- **缩进**: 2 个空格
- **行宽**: 100 字符
- **引号**: 单引号
- **分号**: 始终使用
- **尾随逗号**: ES5 风格

### Tailwind 类名排序
项目配置了自动 Tailwind 类名排序，支持 `clsx`、`cva`、`cn` 函数。

## React 组件规范

### 组件文件命名
- 组件文件: `kebab-case.tsx` (如 `loading-skeleton.tsx`)
- 组件导出: `PascalCase` (如 `LoadingSkeleton`)

### Server Components vs Client Components
```typescript
// Server Component (默认)
export default function Dashboard() {
  return <div>Dashboard</div>;
}

// Client Component (需要交互)
'use client';
export default function Counter() {
  const [count, setCount] = useState(0);
  // ...
}
```

### 组件导出方式
UI 组件统一从 `@/components/ui` 导出：

```typescript
// src/components/ui/index.ts
export { Button } from './button';
export { Card } from './card';
// ...

// 使用
import { Button, Card, Input } from '@/components/ui';
```

## Server Actions 规范

Server Actions 位于 `src/server/actions/` 目录：

```typescript
'use server';

import { getServerSession } from '@/lib/auth/server-session';

export async function someAction() {
  const session = await getServerSession();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  // 业务逻辑
}
```

### 权限检查
需要管理员权限的操作必须检查：

```typescript
import { getUserAdminStatus } from './auth-actions';

const isAdmin = await getUserAdminStatus();
if (!isAdmin) {
  throw new Error('Admin access required');
}
```

## 数据库规范

### Schema 定义
使用 Drizzle ORM 在 `src/server/db/schema.ts` 定义：

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const example = pgTable('example', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});
```

### 数据库命令
```bash
# 生成迁移
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 推送到数据库 (开发用)
pnpm db:push

# 打开数据库 Studio
pnpm db:studio
```

### Repository 模式
数据访问层使用 Repository 模式，位于 `src/server/db/repositories/`：

```typescript
// base-repository.ts 提供基础 CRUD 操作
// 具体 repository 继承或实现特定业务逻辑
```

## Hooks 规范

自定义 Hooks 放在 `src/hooks/` 目录，使用 `use-` 前缀：

```typescript
// src/hooks/use-credits.ts
export function useCredits() {
  // Hook 实现
}
```

## 配置文件规范

所有业务配置放在 `src/config/` 目录：

- `app.config.ts` - 应用基础配置
- `payment.config.ts` - 支付和订阅计划配置
- `credits.config.ts` - 积分系统配置
- `i18n.config.ts` - 国际化配置
- `navbar.config.ts` - 导航栏配置
- `features.config.ts` - 功能开关

配置类型定义在 `src/types/index.d.ts`。

## 环境变量规范

使用 `@t3-oss/env-nextjs` 进行环境变量验证：

```typescript
// src/env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    // ...
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    // ...
  },
  // ...
});
```

使用环境变量时必须从 `@/env` 导入：

```typescript
import { env } from '@/env';

const dbUrl = env.DATABASE_URL;
```

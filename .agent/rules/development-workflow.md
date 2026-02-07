# 开发工作流

## 开发命令

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 构建与预览

```bash
# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview

# 分析构建包大小
pnpm analyze
```

### 代码质量

```bash
# 代码检查
pnpm check

# 检查并自动修复
pnpm check:write

# TypeScript 类型检查
pnpm typecheck
```

### 数据库操作

```bash
# 生成迁移文件
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 推送 schema 到数据库 (开发用)
pnpm db:push

# 打开 Drizzle Studio
pnpm db:studio
```

### 管理员设置

```bash
# 设置管理员账户
pnpm admin:setup
```

## Cloudflare 部署

项目支持部署到 Cloudflare Workers：

```bash
# 本地 Cloudflare 开发
pnpm cf:dev

# 预览 Cloudflare 构建
pnpm cf:preview

# 部署到 Cloudflare
pnpm cf:deploy

# 上传到 Cloudflare
pnpm cf:upload
```

## 环境变量

### 必需的环境变量

复制 `env.example` 到 `.env` 并填写：

```bash
# 数据库
DATABASE_URL=postgresql://...

# 认证
BETTER_AUTH_SECRET=your-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# 文件存储
R2_BUCKET_NAME=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=...
R2_PUBLIC_URL=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# 管理员
ADMIN_EMAILS=admin@example.com
```

## Git 工作流

### 提交规范

建议使用语义化提交信息：

```
feat: 添加用户头像上传功能
fix: 修复登录页面样式问题
docs: 更新 README 文档
chore: 更新依赖版本
refactor: 重构认证模块
```

### 提交前检查

在提交代码前运行：

```bash
pnpm check
pnpm typecheck
```

## 项目结构添加新功能

### 添加新页面

1. 在 `src/app/[locale]/(protected)/` 或 `(home)/` 下创建目录
2. 创建 `page.tsx` 文件
3. 如需要，创建 `loading.tsx` 和 `error.tsx`
4. 更新国际化翻译文件

### 添加新 API

1. 在 `src/app/api/` 下创建路由目录
2. 创建 `route.ts` 处理器
3. 实现认证和权限检查
4. 添加数据验证

### 添加新组件

1. UI 基础组件放在 `src/components/ui/`
2. 业务组件放在 `src/components/` 对应目录
3. 从 `@/components/ui` 导出基础组件
4. 编写组件文档

### 添加新数据库表

1. 在 `src/server/db/schema.ts` 定义表结构
2. 运行 `pnpm db:generate` 生成迁移
3. 运行 `pnpm db:migrate` 或 `pnpm db:push`
4. 如需要，创建对应的 Repository

### 添加新 Hook

1. 在 `src/hooks/` 下创建 Hook 文件
2. 命名使用 `use-` 前缀
3. 导出 Hook 函数

## 调试技巧

### 服务器端日志

```typescript
console.log('Server log:', data);
console.error('Server error:', error);
```

### 客户端调试

使用浏览器开发者工具的 Console 和 Network 面板。

### 数据库调试

使用 Drizzle Studio：

```bash
pnpm db:studio
```

### API 调试

使用浏览器开发者工具或 Postman 等工具测试 API。

## 常见问题

### 依赖安装问题

```bash
# 清除缓存并重新安装
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### 数据库连接问题

1. 检查 `DATABASE_URL` 环境变量
2. 确保数据库服务正在运行
3. 检查网络连接

### 构建错误

1. 运行 `pnpm typecheck` 检查类型错误
2. 运行 `pnpm check` 检查代码问题
3. 检查环境变量是否完整

### 热更新不工作

1. 检查文件是否在正确位置
2. 尝试重启开发服务器
3. 清除 `.next` 缓存目录

## 性能优化

### 代码分割

使用动态导入延迟加载大型组件：

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loading />,
});
```

### 图片优化

使用 Next.js Image 组件：

```typescript
import Image from 'next/image';

<Image src="/image.jpg" alt="描述" width={800} height={600} />
```

### Bundle 分析

```bash
pnpm analyze
```

分析打包大小，优化依赖。

# Better-SaaS 项目目录结构

> 本文档描述项目 `src/` 目录的整体架构设计，基于 Next.js 16 + App Router + 主题系统。

## 顶层目录概览

```
src/
├── app/            # Next.js App Router 路由层（仅放路由文件，不放业务逻辑）
├── components/     # 共享 UI 组件（可被任意主题复用）
├── config/         # 应用配置（静态配置，不含业务逻辑）
├── content/        # MDX 内容（文档、博客）
├── hooks/          # 客户端自定义 Hooks
├── i18n/           # 国际化路由与消息
├── lib/            # 工具函数与第三方服务封装
├── payment/        # 支付抽象层
├── server/         # 服务端业务逻辑（Server Actions、DB、Cron）
├── store/          # 客户端状态管理（Zustand）
├── styles/         # 全局样式
├── themes/         # 主题系统（blocks / layouts / pages）
├── types/          # TypeScript 类型定义
├── env.ts          # 环境变量校验（zod schema）
└── middleware.ts   # Next.js 中间件（国际化路由）
```

---

## 各目录详细说明

### `app/` — 路由层

仅存放 Next.js 路由约定文件（`page.tsx`、`layout.tsx`、`route.ts`），**不放业务组件**。页面组件通过主题系统动态加载。

```
app/
├── [locale]/                    # 国际化路由段
│   ├── layout.tsx               # 根locale布局（ThemeProvider + AuthProvider）
│   ├── (home)/                  # 营销/着陆页分组
│   │   ├── layout.tsx           # 着陆页布局（通过主题系统加载 LandingLayout）
│   │   ├── page.tsx             # 首页（通过主题系统加载 HomePage）
│   │   ├── blog/                # 博客页面
│   │   └── blocks/              # 组件展示页
│   ├── (protected)/             # 需要登录的页面分组
│   │   ├── dashboard/           # 仪表盘
│   │   ├── settings/            # 用户设置（个人资料/安全/计费）
│   │   └── credits/             # 积分系统
│   ├── docs/                    # 文档（fumadocs）
│   ├── login/                   # 登录
│   ├── signup/                  # 注册
│   ├── privacy/                 # 隐私政策
│   └── terms/                   # 服务条款
├── api/                         # API 路由（无locale前缀）
│   ├── auth/[...all]/           # Better-Auth 处理
│   ├── api-keys/                # API Key 管理
│   ├── credits/                 # 积分初始化
│   ├── cron/                    # 定时任务
│   ├── data/                    # 数据接口
│   ├── health/                  # 健康检查
│   ├── v1/ai/chat/              # AI 聊天（版本化 API）
│   └── webhooks/stripe/         # Stripe Webhook
├── layout.tsx                   # 根布局（html/body）
└── not-found.tsx                # 全局 404
```

### `components/` — 共享 UI 与功能组件

存放可被所有主题复用的 UI 基础组件和功能域组件。**不含着陆页区块**（已移至 `themes/`）。

```
components/
├── ui/                # shadcn/ui 基础组件（Button, Card, Dialog...）
├── dashboard/         # 仪表盘组件
├── settings/          # 设置页组件
├── billing/           # 计费页组件
├── credits/           # 积分页组件
├── file-manager/      # 文件管理组件
├── api-keys/          # API Key 管理组件
├── payment/           # 支付相关组件
├── auth/              # 权限包装组件
├── providers/         # Context Provider（Theme, Auth）
├── widget/            # 小部件（ThemeToggle, LanguageSwitcher, UserAvatar）
├── preview/           # 组件预览
├── mdx-components.tsx # MDX 自定义组件
├── auth-guard.tsx     # 认证守卫
├── admin-guard.tsx    # 管理员守卫
└── loading-skeleton.tsx
```

### `config/` — 应用配置

纯静态配置，不含业务逻辑。运行时配置通过环境变量注入。仅保留实际在运行时消费的配置项。

```
config/
├── index.ts           # 配置入口（统一导出）
├── app.config.ts      # 应用基础配置（名称、URL、元数据、管理员）
├── features.config.ts # 功能开关（fileManager、admin）
├── i18n.config.ts     # 国际化配置
├── appearance.config.ts   # 颜色模式配置（dark/light/system）
├── navbar.config.ts
├── payment.config.ts
└── credits.config.ts
```

### `themes/` — 主题系统

主题系统的所有代码集中在此：加载引擎、注册表、主题实现。`default` 主题作为兜底。

```
themes/
├── loader.ts              # 主题加载引擎（getThemeBlock / getThemeLayout / getThemePage）
├── registry.ts            # 主题注册表（themeNames、ThemeName 类型）
└── default/               # 默认主题
    ├── blocks/
    │   ├── index.tsx  # 统一导出
    │   ├── hero.tsx   # 首页 Hero 区块
    │   ├── footer.tsx # 页脚
    │   ├── navbar.tsx # 导航栏（含 Navbar + NavbarWrapper）
    │   ├── pricing.tsx# 定价方案
    │   ├── faq.tsx    # 常见问题
    │   ├── features.tsx # 特性展示
    │   ├── tech-stack.tsx # 技术栈展示
    │   ├── login.tsx  # 登录表单
    │   └── signup.tsx # 注册表单
    ├── layouts/       # 布局组件
    │   ├── index.tsx
    │   └── landing.tsx # 着陆页布局（Navbar + Footer + children）
    └── pages/         # 页面组件
        ├── index.tsx
        └── home.tsx   # 首页（Hero + TechStack + Pricing + Faq）
```

**创建新主题**：运行 `./scripts/create-theme.sh <theme-name>`，会从 default 复制并注册。

**主题加载机制**：
1. 读取 `NEXT_PUBLIC_THEME` 环境变量（默认 `default`）
2. 尝试从 `themes/<active-theme>/` 加载组件
3. 加载失败则自动 fallback 到 `themes/default/`

### `server/` — 服务端业务逻辑

所有服务端代码集中于此，包括 Server Actions、数据库、定时任务。

```
server/
├── actions/           # Next.js Server Actions
│   ├── auth-actions.ts
│   ├── user-actions.ts
│   ├── file-actions.ts
│   ├── credit-actions.ts
│   ├── upload-avatar.ts
│   ├── error-messages.ts
│   └── payment/      # 支付相关 Actions
│       ├── create-subscription.ts
│       ├── cancel-subscription.ts
│       ├── get-billing-info.ts
│       └── sync-subscription-periods.ts
├── db/                # 数据库层
│   ├── index.ts       # 数据库连接
│   ├── schema.ts      # Drizzle ORM Schema
│   ├── types.ts       # 数据库类型
│   ├── repositories/  # Repository 模式
│   │   ├── base-repository.ts
│   │   ├── file-repository.ts
│   │   ├── payment-repository.ts
│   │   └── index.ts
│   └── services/      # 数据库服务层
│       └── index.ts
└── cron/              # 定时任务
    └── monthly-credits.ts
```

### `lib/` — 工具函数与服务封装

第三方服务的客户端封装和工具函数。

```
lib/
├── utils.ts           # 通用工具（cn, formatters）
├── icons.ts           # 图标 re-export
├── blocks-registry.ts # 组件展示注册表
├── auth/              # Better-Auth 封装
│   ├── auth.ts        # 服务端 auth 实例
│   ├── auth-client.ts # 客户端 auth 实例
│   └── permissions.ts # 权限定义
├── fumadocs/          # Fumadocs 文档/博客数据源
│   ├── docs.ts
│   └── blog.ts
├── files/             # 文件服务
│   ├── file-service.ts
│   ├── r2-client.ts
│   └── image-processor.ts
├── logger/            # 日志
│   ├── logger.ts
│   └── logger-utils.ts
├── credits/           # 积分服务
│   ├── credit-service.ts
│   └── index.ts
├── quota/             # 配额服务
│   └── quota-service.ts
└── cron/              # Cron 认证
    └── auth.ts
```

### `hooks/` — 客户端 Hooks

```
hooks/
├── use-config.ts       # 配置访问 hooks
├── use-navbar.ts       # 导航栏数据
├── use-login.ts        # 登录逻辑
├── use-profile.ts      # 用户资料
├── use-files.ts        # 文件管理
├── use-debounce.ts     # 防抖
└── use-toast-messages.ts
```

### `i18n/` — 国际化

```
i18n/
├── routing.ts         # 国际化路由配置
├── navigation.ts      # 导航辅助函数
├── request.ts         # 服务端请求处理
└── messages/          # 翻译消息文件
    ├── en.json
    └── zh.json
```

### `payment/` — 支付抽象层

```
payment/
├── types.ts           # 支付类型定义
└── stripe/
    ├── client.ts      # Stripe 客户端
    └── provider.ts    # Stripe 提供者封装
```

### `store/` — 客户端状态

```
store/
└── auth-store.ts      # Zustand 认证状态（SSR 安全）
```

### `content/` — MDX 内容

```
content/
├── data.json          # 内容元数据
├── blog/              # 博客文章
│   ├── en/
│   └── zh/
└── docs/              # 文档
    ├── en/
    │   ├── meta.json
    │   ├── index.mdx
    │   ├── quickstart.mdx
    │   ├── customization/
    │   ├── deployment/
    │   ├── development/
    │   └── features/
    └── zh/            # （同 en 结构）
```

---

## 架构设计原则

### 1. 路由层极薄

`app/` 目录仅包含路由约定文件，页面渲染逻辑通过主题系统委托给 `themes/` 中的组件。这使得切换主题不需要修改任何路由文件。

### 2. 主题系统分层

```
themes/loader.ts    → 加载引擎（动态导入 + fallback）
themes/registry.ts  → 注册表（注册新主题名）
themes/<name>/      → 主题实现（blocks / layouts / pages）
components/         → 共享 UI 组件（所有主题可复用）
config/appearance   → 颜色模式（dark/light/system，与主题皮肤无关）
```

区块组件（Hero, Navbar, Footer 等）直接存放在 `themes/<theme>/blocks/` 中。每个主题拥有自己的区块实现，共享的 UI 基础组件（shadcn/ui）仍在 `components/ui/` 中。

### 3. 服务端/客户端分离

- **服务端**：`server/`（Actions, DB, Cron）、`lib/`（服务封装）
- **客户端**：`hooks/`、`store/`、`components/`（标记 `'use client'`）
- **共享**：`config/`、`types/`、`i18n/`

### 4. 功能域内聚

每个功能域（支付、积分、文件管理等）在 `components/`、`server/actions/`、`lib/` 中各有对应目录，保持同一功能的代码就近组织。

### 5. 配置集中

所有静态配置在 `config/` 目录，环境变量通过 `env.ts`（zod schema）校验，运行时配置通过 `NEXT_PUBLIC_*` 前缀暴露给客户端。

---

## 技术栈版本

| 依赖 | 版本 |
|------|------|
| Next.js | 16.x (Turbopack) |
| React | 19.2.x |
| TypeScript | 5.8.x |
| Tailwind CSS | 4.x |
| fumadocs-core / fumadocs-ui | 16.x |
| fumadocs-mdx | 14.x |
| Drizzle ORM | 0.41.x |
| Better Auth | 1.2.x |
| Zod | 4.x |
| Stripe | 18.x |
| @opennextjs/cloudflare | 1.16.x |
| Wrangler | 4.63.x |

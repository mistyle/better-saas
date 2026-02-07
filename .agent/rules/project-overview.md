# Better-SaaS 项目概述

## 项目简介

Better-SaaS 是一个现代化的全栈 SaaS 应用程序模板，基于 Next.js 15 构建，提供身份验证、支付、文件管理、国际化等核心功能。

## 技术栈

### 核心框架
- **Next.js 15** - App Router 架构
- **React 19** - UI 框架
- **TypeScript** - 类型安全

### 前端技术
- **Tailwind CSS v4** - 样式框架
- **Radix UI** - 无障碍 UI 原语库
- **shadcn/ui (new-york 风格)** - UI 组件系统
- **Lucide React** - 图标库
- **SWR** - 数据获取
- **next-intl** - 国际化
- **next-themes** - 主题切换

### 后端技术
- **Drizzle ORM** - 数据库 ORM
- **PostgreSQL (Neon)** - 数据库
- **Better Auth** - 身份验证
- **Stripe** - 支付集成
- **Cloudflare R2/AWS S3** - 文件存储

### 开发工具
- **pnpm** - 包管理器 (必须使用)
- **Biome** - 代码格式化和检查
- **@t3-oss/env-nextjs** - 环境变量验证
- **drizzle-kit** - 数据库迁移工具

## 项目结构

```
better-saas/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── [locale]/           # 国际化路由
│   │   │   ├── (home)/         # 首页相关
│   │   │   ├── (protected)/    # 需要认证的路由
│   │   │   │   ├── dashboard/  # 仪表盘
│   │   │   │   ├── settings/   # 设置页面
│   │   │   │   └── credits/    # 积分管理
│   │   │   ├── login/          # 登录页
│   │   │   ├── signup/         # 注册页
│   │   │   └── docs/           # 文档页面
│   │   └── api/                # API 路由
│   ├── components/             # React 组件
│   │   ├── ui/                 # shadcn/ui 基础组件
│   │   ├── auth/               # 认证相关组件
│   │   ├── blog/               # 博客组件
│   │   └── providers/          # Context Providers
│   ├── config/                 # 配置文件
│   │   ├── app.config.ts       # 应用配置
│   │   ├── payment.config.ts   # 支付配置
│   │   ├── credits.config.ts   # 积分配置
│   │   ├── i18n.config.ts      # 国际化配置
│   │   └── navbar.config.ts    # 导航栏配置
│   ├── server/                 # 服务器端代码
│   │   ├── db/                 # 数据库相关
│   │   │   ├── schema.ts       # Drizzle schema 定义
│   │   │   ├── repositories/   # 数据访问层
│   │   │   └── services/       # 业务逻辑服务
│   │   └── actions/            # Server Actions
│   ├── lib/                    # 工具库
│   │   ├── auth/               # 认证工具
│   │   ├── credits/            # 积分工具
│   │   └── files/              # 文件处理工具
│   ├── hooks/                  # React Hooks
│   ├── i18n/                   # 国际化配置
│   │   ├── messages/           # 翻译文件 (en.json, zh.json)
│   │   └── routing.ts          # 国际化路由
│   ├── types/                  # TypeScript 类型定义
│   ├── styles/                 # 全局样式
│   ├── payment/                # 支付模块
│   └── themes/                 # 主题配置
├── drizzle/                    # 数据库迁移文件
├── public/                     # 静态资源
├── docs/                       # 项目文档
└── scripts/                    # 脚本工具
```

## 路由分组约定

- `[locale]` - 国际化动态路由
- `(home)` - 公开访问的首页组
- `(protected)` - 需要身份认证的路由组
- 路由保护通过 `RouteGuard` 组件实现

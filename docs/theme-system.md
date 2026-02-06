# 主题系统实现原理

## 概述

Better-SaaS 项目实现了一套基于**动态导入 + 回退机制**的主题系统，允许通过环境变量切换整站的 UI 组件。主题组件按照 **blocks / layouts / pages** 三层结构组织。

## 核心文件

| 文件 | 职责 |
|------|------|
| `src/themes/registry.ts` | 主题注册表，维护所有可用主题名称的类型安全列表 |
| `src/themes/loader.ts` | 服务端主题加载引擎（Server Component 用） |
| `src/themes/client-loader.tsx` | 客户端主题加载引擎（Client Component 用，基于 `next/dynamic`） |
| `src/themes/default/` | 默认主题，包含所有业务组件的完整实现 |
| `scripts/create-theme.sh` | 新主题脚手架脚本 |

## 目录结构

```
src/themes/
├── registry.ts              # 主题名称注册
├── loader.ts                # 动态加载引擎
└── default/                 # 默认主题
    ├── blocks/              # 区块组件（可复用的 UI 单元）
    │   ├── index.tsx        # barrel 导出
    │   ├── navbar.tsx       # 导航栏
    │   ├── hero.tsx         # 首屏
    │   ├── pricing.tsx      # 定价
    │   ├── faq.tsx          # 常见问题
    │   ├── footer.tsx       # 页脚
    │   └── ...
    ├── layouts/             # 布局组件（页面骨架）
    │   ├── index.tsx
    │   ├── landing.tsx      # 营销页布局（navbar + footer）
    │   ├── protected.tsx    # 受保护页布局（sidebar）
    │   └── ...
    └── pages/               # 页面组件（完整页面内容）
        ├── index.tsx
        ├── home.tsx         # 首页
        ├── profile.tsx      # 个人资料
        ├── billing.tsx      # 账单
        └── ...
```

## 工作原理

### 1. 主题注册（registry.ts）

所有可用主题必须在 `registry.ts` 中注册：

```ts
export const themeNames = ['default'] as const;
export type ThemeName = (typeof themeNames)[number];
```

新增主题时，需将主题名加入数组（`create-theme.sh` 脚本会自动完成）。

### 2. 主题选择

通过环境变量 `NEXT_PUBLIC_THEME` 指定当前活跃主题：

```env
NEXT_PUBLIC_THEME=my-brand
```

未设置或值无效时，回退到 `default`。

### 3. 动态加载与回退（loader.ts）

加载引擎提供三个函数：
- `getThemeBlock(name)` — 加载区块组件
- `getThemeLayout(name)` — 加载布局组件
- `getThemePage(name)` — 加载页面组件

**解析顺序：**

```
请求加载组件
    ↓
尝试从当前主题导入 → 成功 → 返回模块
    ↓ 失败
尝试从 default 主题导入 → 成功 → 返回模块
    ↓ 失败
抛出错误
```

使用示例（Server Component 中）：

```tsx
// src/app/[locale]/(home)/page.tsx
import { getThemePage } from '@/themes/loader';

export default async function HomePage() {
  const { HomePage: ThemedHomePage } = await getThemePage('home');
  return <ThemedHomePage />;
}
```

### 3.5 客户端主题加载（client-loader.tsx）

Client Component 无法使用 async/await，因此提供了基于 `next/dynamic` 的客户端 loader，具有相同的回退机制：

```tsx
// src/app/[locale]/login/page.tsx
'use client';
import { themeBlock } from '@/themes/client-loader';

const LoginForm = themeBlock('login', 'LoginForm');

export default function LoginPage() {
  return <LoginForm formData={...} />;
}
```

提供三个函数：`themeBlock()`、`themePage()`、`themeLayout()`，用法与服务端 loader 对应。

### 4. 创建新主题

使用脚手架脚本：

```bash
# 完整模式：复制 default 主题所有文件
./scripts/create-theme.sh my-brand

# 最小模式：只创建目录结构，所有组件回退到 default
./scripts/create-theme.sh my-brand --minimal
```

脚本会自动：
1. 创建 `src/themes/my-brand/` 目录结构
2. 在 `registry.ts` 中注册主题名

然后在 `.env` 中设置：

```env
NEXT_PUBLIC_THEME=my-brand
```

只需创建想要覆盖的组件文件，未覆盖的组件自动回退到 default 主题。

## 三层组件分类

| 分类 | 说明 | 示例 |
|------|------|------|
| **blocks** | 可复用的 UI 区块，通常是页面中的一个区域 | navbar, hero, pricing, footer, user-list |
| **layouts** | 页面骨架，定义整体结构 | landing (营销页), protected (管理后台) |
| **pages** | 完整的页面内容，组合多个 blocks | home, profile, billing, credits |

---

## ⚠️ 当前不足与改进建议

### ~~问题 1：大量页面硬编码了 default 主题路径~~ ✅ 已解决

所有页面和布局均已迁移为通过 `loader.ts`（Server Component）或 `client-loader.tsx`（Client Component）动态加载主题组件。切换 `NEXT_PUBLIC_THEME` 后全站生效。

### 问题 2：loader 使用字符串动态导入，缺乏类型安全

**现状：**

```tsx
const { HomePage } = await getThemePage('home');
```

`'home'` 是纯字符串，IDE 无法提供自动补全，拼写错误只能在运行时发现。

**建议：** 为每个分类定义可用模块名的联合类型：

```tsx
type BlockName = 'navbar' | 'hero' | 'pricing' | 'footer' | ...;
type LayoutName = 'landing' | 'protected' | ...;
type PageName = 'home' | 'profile' | 'billing' | ...;
```

### 问题 3：缺少主题组件接口约束

**现状：** 主题组件之间没有共享的 TypeScript 接口。新主题的同名组件可能与 default 主题的 props 不兼容，导致运行时错误。

**建议：** 为需要覆盖的核心组件定义接口：

```tsx
// src/themes/contracts.ts
export interface HomePageProps { }
export interface NavbarProps { logo: LogoConfig; menu: MenuItem[]; ... }
export interface PricingProps { plans: Plan[]; ... }
```

### ~~问题 4：Client Component 无法使用 loader~~ ✅ 已解决

已创建 `src/themes/client-loader.tsx`，基于 `next/dynamic` 实现，提供 `themeBlock()`、`themePage()`、`themeLayout()` 三个函数，支持同样的主题回退机制。

### 问题 5：barrel index 文件未被实际使用

**现状：** 每个分类下的 `index.tsx` 维护了 barrel 导出，但无人通过 barrel 导入。loader 直接按文件名导入具体模块。

**建议：** 要么删除 barrel 文件以减少维护负担，要么将 loader 改为从 barrel 导入以利用 tree-shaking。

### 问题 6：主题只覆盖视觉组件，不支持配置覆盖

**现状：** 导航菜单、定价计划等配置在 `src/config/` 下全局共享，无法按主题定制。

**建议：** 扩展主题系统支持配置覆盖：

```
src/themes/my-brand/
├── blocks/
├── layouts/
├── pages/
└── config/         # 主题级配置覆盖
    ├── navbar.config.ts
    └── pricing.config.ts
```

## 总结

当前主题系统的**基础架构（loader + 回退 + 脚手架）是完善的**，但在实际使用层面存在**覆盖不完整**的问题。最优先的改进是将所有硬编码的 `@/themes/default/...` 导入迁移为通过 loader 动态加载，这样才能真正实现"放在 themes 文件夹下就能生效"的目标。

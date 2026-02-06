# 主题组件迁移方案

> 将 `src/components/` 下的业务组件迁移到 `src/themes/default/` 下，使其纳入主题系统管理，支持主题级别的 UI 定制。

## 1. 核心原则

- **`components/ui/`** 保持不变 — shadcn/ui 原子组件，所有主题共享
- **基础设施组件** 保持不变 — 与主题无关的逻辑组件
- **业务/视觉组件** 迁移到主题 — 可在不同主题中有不同实现
- 迁移后，app 页面通过 `themes/loader.ts` 动态加载组件，自动获得主题切换和 fallback 能力

## 2. 组件分类

### 2.1 保留在 `components/` 中（基础设施层）

| 路径 | 说明 |
|------|------|
| `ui/` | shadcn/ui 原子组件，所有主题共享 |
| `providers/auth-provider.tsx` | 认证 Provider，app 级基础设施 |
| `providers/theme-provider.tsx` | 主题 Provider，app 级基础设施 |
| `auth/permission-provider.tsx` | 权限上下文 Provider |
| `auth/permission-wrapper.tsx` | 权限包装器（server → client 桥接）|
| `auth-guard.tsx` | 路由守卫，逻辑组件 |
| `admin-guard.tsx` | 管理员守卫，逻辑组件 |
| `loading-skeleton.tsx` | 通用加载骨架屏 |
| `mdx-components.tsx` | MDX 渲染组件 |

### 2.2 迁移到 `themes/default/` 中（主题层）

#### blocks/（可复用 UI 块，已有）

当前已有: `hero`, `navbar`, `footer`, `pricing`, `login`, `signup`, `faq`, `features`, `tech-stack`

新增（从 `components/widget/` 迁入）:

| 源文件 | 目标 | 说明 |
|--------|------|------|
| `widget/user-avatar-menu.tsx` | `blocks/user-avatar-menu.tsx` | 用户头像下拉菜单 |
| `widget/language-switcher.tsx` | `blocks/language-switcher.tsx` | 语言切换器 |
| `widget/theme-toggle.tsx` | `blocks/theme-toggle.tsx` | 主题切换按钮 |
| `widget/callout.tsx` | `blocks/callout.tsx` | 提示框 |

#### layouts/（布局，已有 landing）

| 源文件 | 目标 | 说明 |
|--------|------|------|
| `dashboard/protected-layout-client.tsx` | `layouts/protected.tsx` | 后台保护页面布局 |
| `dashboard/protected-sidebar.tsx` | `layouts/protected-sidebar.tsx` | 后台侧边栏 |

#### components/（主题级子组件，新增分类）

这些组件不是独立的 block 或 layout，但构成页面的主要视觉内容，在不同主题中可能有完全不同的 UI 实现。

| 源路径 | 目标路径 | 说明 |
|--------|----------|------|
| `settings/profile-content.tsx` | `components/settings/profile-content.tsx` | 个人资料页内容 |
| `settings/security-content.tsx` | `components/settings/security-content.tsx` | 安全设置页内容 |
| `settings/setting-content.tsx` | `components/settings/setting-content.tsx` | 通用设置组件 |
| `billing/billing-page.tsx` | `components/billing/billing-page.tsx` | 账单页 |
| `credits/credit-balance.tsx` | `components/credits/credit-balance.tsx` | 积分余额 |
| `credits/credit-history.tsx` | `components/credits/credit-history.tsx` | 积分历史 |
| `credits/credit-history-page.tsx` | `components/credits/credit-history-page.tsx` | 积分历史页 |
| `credits/credits-page.tsx` | `components/credits/credits-page.tsx` | 积分总览页 |
| `credits/credits-skeleton.tsx` | `components/credits/credits-skeleton.tsx` | 积分骨架屏 |
| `credits/quota-overview.tsx` | `components/credits/quota-overview.tsx` | 配额总览 |
| `dashboard/dashboard-content.tsx` | `components/dashboard/dashboard-content.tsx` | 仪表板内容 |
| `dashboard/dashboard-header.tsx` | `components/dashboard/dashboard-header.tsx` | 仪表板头部 |
| `dashboard/protected-container.tsx` | `components/dashboard/protected-container.tsx` | 保护容器 |
| `dashboard/user-list.tsx` | `components/dashboard/user-list.tsx` | 用户列表 |
| `file-manager/file-manager.tsx` | `components/file-manager/file-manager.tsx` | 文件管理器 |
| `file-manager/file-grid.tsx` | `components/file-manager/file-grid.tsx` | 文件网格 |
| `file-manager/file-table.tsx` | `components/file-manager/file-table.tsx` | 文件表格 |
| `file-manager/file-upload.tsx` | `components/file-manager/file-upload.tsx` | 文件上传 |
| `file-manager/image-preview-modal.tsx` | `components/file-manager/image-preview-modal.tsx` | 图片预览弹窗 |
| `api-keys/api-usage-guide.tsx` | `components/api-keys/api-usage-guide.tsx` | API 使用指南 |
| `api-keys/simple-api-key-manager.tsx` | `components/api-keys/simple-api-key-manager.tsx` | API Key 管理器 |
| `payment/purchase-confirmation-dialog.tsx` | `components/payment/purchase-confirmation-dialog.tsx` | 购买确认弹窗 |
| `payment/subscription-card.tsx` | `components/payment/subscription-card.tsx` | 订阅卡片 |
| `preview/*` | `components/preview/*` | 组件预览工具（5个文件）|

## 3. 迁移后目录结构

```
src/
├── components/                  # 基础设施层（主题无关）
│   ├── ui/                      # shadcn/ui 原子组件
│   ├── providers/               # app 级 Providers
│   │   ├── auth-provider.tsx
│   │   └── theme-provider.tsx
│   ├── auth/                    # 权限基础设施
│   │   ├── permission-provider.tsx
│   │   └── permission-wrapper.tsx
│   ├── auth-guard.tsx
│   ├── admin-guard.tsx
│   ├── loading-skeleton.tsx
│   └── mdx-components.tsx
│
├── themes/
│   ├── registry.ts              # 主题注册表
│   ├── loader.ts                # 主题加载引擎（需扩展）
│   │
│   └── default/                 # 默认主题
│       ├── blocks/              # 可复用 UI 块
│       │   ├── hero.tsx
│       │   ├── navbar.tsx
│       │   ├── footer.tsx
│       │   ├── pricing.tsx
│       │   ├── login.tsx
│       │   ├── signup.tsx
│       │   ├── faq.tsx
│       │   ├── features.tsx
│       │   ├── tech-stack.tsx
│       │   ├── user-avatar-menu.tsx    ← widget/
│       │   ├── language-switcher.tsx   ← widget/
│       │   ├── theme-toggle.tsx        ← widget/
│       │   ├── callout.tsx             ← widget/
│       │   └── index.tsx
│       │
│       ├── layouts/             # 布局组件
│       │   ├── landing.tsx
│       │   ├── protected.tsx           ← dashboard/protected-layout-client
│       │   ├── protected-sidebar.tsx   ← dashboard/protected-sidebar
│       │   └── index.tsx
│       │
│       ├── pages/               # 整页组件
│       │   ├── home.tsx
│       │   └── index.tsx
│       │
│       └── components/          # 主题级子组件
│           ├── settings/
│           │   ├── profile-content.tsx
│           │   ├── security-content.tsx
│           │   └── setting-content.tsx
│           ├── billing/
│           │   └── billing-page.tsx
│           ├── credits/
│           │   ├── credit-balance.tsx
│           │   ├── credit-history.tsx
│           │   ├── credit-history-page.tsx
│           │   ├── credits-page.tsx
│           │   ├── credits-skeleton.tsx
│           │   └── quota-overview.tsx
│           ├── dashboard/
│           │   ├── dashboard-content.tsx
│           │   ├── dashboard-header.tsx
│           │   ├── protected-container.tsx
│           │   └── user-list.tsx
│           ├── file-manager/
│           │   ├── file-manager.tsx
│           │   ├── file-grid.tsx
│           │   ├── file-table.tsx
│           │   ├── file-upload.tsx
│           │   └── image-preview-modal.tsx
│           ├── api-keys/
│           │   ├── api-usage-guide.tsx
│           │   └── simple-api-key-manager.tsx
│           ├── payment/
│           │   ├── purchase-confirmation-dialog.tsx
│           │   └── subscription-card.tsx
│           └── preview/
│               ├── code-display.tsx
│               ├── component-preview-toolbar.tsx
│               ├── component-preview-wrapper.tsx
│               ├── responsive-preview.tsx
│               └── server-component-preview.tsx
```

## 4. loader.ts 扩展

当前 `loader.ts` 仅支持 `blocks`、`layouts`、`pages` 三种类型。迁移后需新增 `getThemeComponent` 方法：

```ts
// 新增：加载主题级子组件（带 fallback）
export async function getThemeComponent(componentPath: string) {
  const theme = getActiveTheme();

  if (theme !== DEFAULT_THEME) {
    try {
      return await import(`@/themes/${theme}/components/${componentPath}`);
    } catch {
      // fall through to default
    }
  }

  return import(`@/themes/${DEFAULT_THEME}/components/${componentPath}`);
}
```

## 5. App 页面引用方式变化

迁移前（直接 import）：
```tsx
import { ProfileContent } from '@/components/settings/profile-content';
```

迁移后（通过主题加载器）：
```tsx
const { ProfileContent } = await getThemeComponent('settings/profile-content');
```

对于客户端组件页面，可使用 `React.lazy` 或在 server component 中加载后传入。

## 6. 迁移步骤

1. **扩展 `loader.ts`** — 新增 `getThemeComponent` 方法
2. **逐模块迁移文件** — 按以下顺序：
   - `widget/` → `blocks/`（最简单，已有类似模式）
   - `dashboard/` 中的布局组件 → `layouts/`
   - `settings/` → `components/settings/`
   - `billing/` → `components/billing/`
   - `credits/` → `components/credits/`
   - `dashboard/` 剩余 → `components/dashboard/`
   - `file-manager/` → `components/file-manager/`
   - `api-keys/` → `components/api-keys/`
   - `payment/` → `components/payment/`
   - `preview/` → `components/preview/`
3. **更新 app 页面引用** — 改为通过 loader 加载
4. **更新 `create-theme.sh`** — 支持新的 `components/` 目录
5. **删除 `components/` 中已迁移的空目录**
6. **构建验证**

## 7. 创建新主题的流程

迁移完成后，创建新主题的流程：

```bash
# 1. 运行脚本，复制 default 主题的全部内容
./scripts/create-theme.sh my-brand

# 2. 只修改需要定制的文件，其余删除（会自动 fallback 到 default）
# 例如只想换首页 hero + navbar 的样式：
rm -rf src/themes/my-brand/components/
rm -rf src/themes/my-brand/pages/
rm src/themes/my-brand/blocks/faq.tsx
rm src/themes/my-brand/blocks/features.tsx
# ... 只保留要定制的文件

# 3. 设置环境变量
echo "NEXT_PUBLIC_THEME=my-brand" >> .env

# 4. 构建验证
pnpm build
```

**核心优势**：新主题只需实现想要改变的组件，其余全部自动 fallback 到 default 主题。

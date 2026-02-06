# 博客分类功能开发计划

## 现状分析

当前博客系统只有 **标签（tags）** 功能：
- 存储方式：`blogPost.tags` 字段，JSON 字符串数组 `'["Next.js","React"]'`
- 输入方式：逗号分隔的自由文本
- 特点：无预定义、无层级、无独立管理

**缺少的功能：** 独立的分类（Category）体系，用于对文章进行结构化归类。

## 分类 vs 标签

| 维度 | 分类（Category） | 标签（Tags） |
|------|-----------------|-------------|
| 关系 | 一篇文章属于一个分类 | 一篇文章可有多个标签 |
| 管理 | 预定义，后台统一管理 | 自由输入 |
| 层级 | 支持（可选） | 不支持 |
| 用途 | 文章的主要归属 | 辅助描述和搜索 |

## 技术方案

### 方案：独立分类表 + 文章外键关联

新建 `blog_category` 表，`blogPost` 表新增 `categoryId` 外键。

```
blog_category                    blog_post
┌────────────────┐              ┌──────────────────┐
│ id (PK)        │◄─────────────│ category_id (FK) │
│ name           │              │ ...              │
│ slug           │              └──────────────────┘
│ description    │
│ locale         │
│ sort_order     │
│ created_at     │
│ updated_at     │
└────────────────┘
```

**优点：**
- 结构清晰，查询高效
- 分类可独立管理（增删改排序）
- 前台可按分类聚合展示
- 未来可扩展为树形结构（加 parent_id）

## 开发计划

### 阶段一：数据层

**1.1 新建 `blog_category` 表 Schema**

文件：`src/server/db/schema.ts`

```ts
export const blogCategory = pgTable('blog_category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),          // 分类名称
  slug: text('slug').notNull(),          // URL 标识
  description: text('description'),       // 分类描述
  locale: text('locale').notNull().default('zh'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({
  slugLocaleUnique: unique('blog_category_slug_locale_unique').on(table.slug, table.locale),
}));
```

**1.2 `blogPost` 表新增 `categoryId` 字段**

```ts
categoryId: text('category_id').references(() => blogCategory.id, { onDelete: 'set null' }),
```

> 使用 `onDelete: 'set null'`，删除分类时文章不会丢失，只是分类变为空。

**1.3 新建 `category-repository.ts`**

文件：`src/server/db/repositories/category-repository.ts`

方法：
- `create(data)` — 创建分类
- `findById(id)` — 按 ID 查询
- `findBySlugAndLocale(slug, locale)` — 按 slug + locale 查询
- `findAll(options)` — 分页列表（支持 locale 筛选）
- `findAllByLocale(locale)` — 按语言获取全部（用于下拉选择）
- `update(id, data)` — 更新分类
- `delete(id)` — 删除分类
- `reorder(ids)` — 批量更新排序

**1.4 更新 `blog-repository.ts`**

- `findAll()` / `findPublished()` 加入分类 JOIN 查询，返回 `categoryName`、`categorySlug`
- 新增 `findByCategory(categorySlug, locale)` 方法

**1.5 生成数据库迁移并推送**

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

### 阶段二：API 层

**2.1 分类 CRUD API**

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/blog/categories` | GET | 获取分类列表（admin 返回全部，public 按 locale） |
| `/api/blog/categories` | POST | 创建分类（admin） |
| `/api/blog/categories/[id]` | PUT | 更新分类（admin） |
| `/api/blog/categories/[id]` | DELETE | 删除分类（admin） |

**2.2 更新现有博客 API**

- `POST /api/blog`、`PUT /api/blog/[id]`：请求 body 增加 `categoryId` 字段
- `GET /api/blog`：响应中增加 `categoryName`、`categorySlug`
- `GET /api/blog`：支持 `category` 查询参数筛选

### 阶段三：后台管理 UI

**3.1 分类管理页面**

文件：`src/app/[locale]/(protected)/dashboard/blog/categories/page.tsx`

功能：
- 分类列表（名称、slug、文章数量、排序）
- 新建/编辑分类弹窗
- 拖拽排序（可选，首期用上下箭头）
- 删除分类（确认对话框）

**3.2 编辑器表单增加分类选择**

文件：`src/components/blog/blog-editor-form.tsx`

- 新增分类下拉选择器（Select 组件）
- 页面加载时从 API 获取分类列表
- 保存时将 `categoryId` 提交给 API

**3.3 文章列表增加分类列和筛选**

文件：`src/components/blog/blog-post-list.tsx`

- 表格新增「分类」列
- 筛选栏新增分类下拉筛选

**3.4 侧边栏更新**

- 在「博客管理」下新增「分类管理」子菜单项

### 阶段四：前台页面

**4.1 博客列表页增加分类筛选**

文件：`src/app/[locale]/(home)/blog/page.tsx`

- URL 支持 `?category=xxx` 查询参数
- 页面顶部展示分类标签/按钮栏
- 点击分类跳转到对应分类

**4.2 新建分类归档页（可选）**

文件：`src/app/[locale]/(home)/blog/category/[slug]/page.tsx`

- 按分类 slug 展示该分类下的所有已发布文章
- 页面标题显示分类名称

**4.3 文章详情页展示分类**

文件：`src/app/[locale]/(home)/blog/[slug]/page.tsx`

- 文章头部元信息区域展示所属分类（可点击跳转）

### 阶段五：收尾

- 中英文 i18n 翻译
- 构建验证 `pnpm build`
- 更新开发文档

## 涉及文件清单

| 操作 | 文件 |
|------|------|
| 新建 | `src/server/db/repositories/category-repository.ts` |
| 新建 | `src/app/api/blog/categories/route.ts` |
| 新建 | `src/app/api/blog/categories/[id]/route.ts` |
| 新建 | `src/app/[locale]/(protected)/dashboard/blog/categories/page.tsx` |
| 新建 | `src/app/[locale]/(home)/blog/category/[slug]/page.tsx`（可选） |
| 修改 | `src/server/db/schema.ts` — 新增 blogCategory 表 + blogPost.categoryId |
| 修改 | `src/server/db/repositories/blog-repository.ts` — 加入分类 JOIN |
| 修改 | `src/server/db/repositories/index.ts` — 导出 categoryRepository |
| 修改 | `src/app/api/blog/route.ts` — 支持 categoryId 参数 |
| 修改 | `src/app/api/blog/[id]/route.ts` — 支持 categoryId 更新 |
| 修改 | `src/components/blog/blog-editor-form.tsx` — 添加分类选择器 |
| 修改 | `src/components/blog/blog-post-list.tsx` — 添加分类列和筛选 |
| 修改 | `src/themes/default/layouts/protected.tsx` — 侧边栏分类入口 |
| 修改 | `src/app/[locale]/(home)/blog/page.tsx` — 分类筛选 |
| 修改 | `src/app/[locale]/(home)/blog/[slug]/page.tsx` — 显示分类 |
| 修改 | `src/i18n/messages/zh.json` / `en.json` — i18n |

## 工作量估计

| 阶段 | 预估 |
|------|------|
| 阶段一：数据层 | 中等 |
| 阶段二：API 层 | 较小 |
| 阶段三：后台管理 UI | 中等 |
| 阶段四：前台页面 | 较小 |
| 阶段五：收尾 | 较小 |

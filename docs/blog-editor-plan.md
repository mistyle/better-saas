# Blog 后台编辑发布功能开发计划

## 1. 背景与目标

### 现状

当前 blog 功能基于 **fumadocs + MDX 文件** 实现：

- 文章以 `.mdx` 文件存储在 `src/content/blog/{en,zh}/` 目录下
- 通过 `source.config.ts` 中的 `defineDocs` 配置加载
- `src/lib/fumadocs/blog.ts` 提供 `getBlogPosts` / `getBlogPost` 等查询函数
- 前台页面位于 `src/app/[locale]/(home)/blog/`
- 每篇文章通过 frontmatter 定义 `title`、`description`、`author`、`date`、`tags`

这种方式需要开发者手动编辑 MDX 文件并重新部署才能发布文章，无法由管理员在后台直接操作。

### 目标

实现**后台管理界面**，让管理员可以：

1. 在后台创建、编辑、删除 blog 文章
2. 使用 **Tiptap** 富文本编辑器编写文章内容
3. 支持文章的**草稿 / 已发布 / 已归档**三种状态
4. 支持**多语言**（中文 / 英文）文章管理
5. 前台 blog 页面从**数据库**读取已发布文章并渲染

## 2. 技术方案

### 2.1 数据存储

放弃文件系统存储，改为 **PostgreSQL 数据库**存储文章数据。

**新增 `blog_post` 表（drizzle schema）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text (PK) | UUID |
| slug | text (unique) | URL 友好标识，如 `getting-started` |
| locale | text | 语言代码：`en` / `zh` |
| title | text | 文章标题 |
| description | text | 摘要描述 |
| content | text | Tiptap JSON 格式的富文本内容 |
| htmlContent | text | 预渲染的 HTML（用于前台直接展示） |
| coverImage | text | 封面图片 URL（可选） |
| author | text | 作者名 |
| tags | text | JSON 数组字符串，如 `["Next.js","React"]` |
| status | text | `draft` / `published` / `archived` |
| publishedAt | timestamp | 发布时间（排序用） |
| createdAt | timestamp | 创建时间 |
| updatedAt | timestamp | 更新时间 |
| authorId | text (FK → user.id) | 创建者 |

**约束：** `(slug, locale)` 组合唯一，确保同一语言下 slug 不重复。

### 2.2 编辑器

使用 **Tiptap** 编辑器，需要安装的包：

```
@tiptap/react
@tiptap/starter-kit
@tiptap/extension-image
@tiptap/extension-link
@tiptap/extension-code-block-lowlight
@tiptap/extension-placeholder
@tiptap/extension-heading
@tiptap/extension-highlight
@tiptap/extension-typography
lowlight
```

编辑器功能：
- 标题（H1-H3）
- 加粗 / 斜体 / 删除线 / 代码
- 有序列表 / 无序列表
- 引用块
- 代码块（语法高亮）
- 图片插入（复用现有 R2 文件上传服务）
- 链接

内容以 Tiptap 的 **JSON 格式**存入 `content` 字段，同时生成 HTML 存入 `htmlContent` 字段（前台直接渲染，避免客户端再次解析）。

### 2.3 API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/blog` | 获取文章列表（分页、筛选状态/语言） |
| GET | `/api/blog/[id]` | 获取单篇文章详情 |
| POST | `/api/blog` | 创建文章 |
| PUT | `/api/blog/[id]` | 更新文章 |
| DELETE | `/api/blog/[id]` | 删除文章 |
| POST | `/api/blog/[id]/publish` | 发布文章（draft → published） |
| POST | `/api/blog/[id]/archive` | 归档文章 |

所有接口需要**管理员权限**校验。

### 2.4 页面路由

**后台管理页面（需要管理员权限）：**

| 路由 | 说明 |
|------|------|
| `/dashboard/blog` | 文章列表（表格展示，支持筛选/搜索/分页） |
| `/dashboard/blog/new` | 新建文章（编辑器页面） |
| `/dashboard/blog/[id]/edit` | 编辑文章（编辑器页面） |

**前台展示页面（改造现有页面）：**

| 路由 | 说明 |
|------|------|
| `/blog` | 文章列表（从数据库读取已发布文章） |
| `/blog/[slug]` | 文章详情（渲染 htmlContent） |

### 2.5 前台渲染

前台文章详情页直接渲染数据库中预存的 `htmlContent`，配合 Tailwind CSS 的 `prose` 样式类。

代码块语法高亮在保存时生成到 HTML 中（服务端预渲染），前台无需加载 highlight 库。

## 3. 实施步骤

### 阶段一：数据层（预计 1-2 天）

- [ ] 在 `src/server/db/schema.ts` 中新增 `blogPost` 表定义
- [ ] 执行 `drizzle-kit generate` 生成迁移文件
- [ ] 创建 `src/server/db/repositories/blog-repository.ts`
  - CRUD 操作
  - 分页查询（按状态、语言筛选）
  - slug 唯一性校验

### 阶段二：API 层（预计 1 天）

- [ ] 创建 `src/app/api/blog/route.ts`（GET 列表 + POST 创建）
- [ ] 创建 `src/app/api/blog/[id]/route.ts`（GET + PUT + DELETE）
- [ ] 创建 `src/app/api/blog/[id]/publish/route.ts`（POST 发布）
- [ ] 创建 `src/app/api/blog/[id]/archive/route.ts`（POST 归档）
- [ ] 所有接口添加管理员权限校验
- [ ] 输入校验（zod schema）

### 阶段三：Tiptap 编辑器组件（预计 2-3 天）

- [ ] 安装 Tiptap 相关依赖
- [ ] 创建 `src/themes/default/blocks/blog-editor.tsx` — 编辑器主组件
  - 工具栏（格式化按钮）
  - 图片上传（对接现有 R2 文件服务）
  - 代码块语法高亮
- [ ] 创建 `src/themes/default/blocks/blog-editor-toolbar.tsx` — 工具栏组件
- [ ] JSON ↔ HTML 转换工具函数

### 阶段四：后台管理页面（预计 2 天）

- [ ] 创建 `src/app/[locale]/(protected)/dashboard/blog/page.tsx` — 文章列表
  - 表格展示（标题、状态、语言、作者、发布时间）
  - 搜索 / 状态筛选 / 语言筛选
  - 分页
  - 操作按钮（编辑、发布、删除、归档）
- [ ] 创建 `src/app/[locale]/(protected)/dashboard/blog/new/page.tsx` — 新建文章
  - Tiptap 编辑器
  - 元数据表单（标题、slug、描述、标签、语言、封面图）
  - 保存为草稿 / 直接发布
- [ ] 创建 `src/app/[locale]/(protected)/dashboard/blog/[id]/edit/page.tsx` — 编辑文章
- [ ] 在 dashboard 侧边栏导航中添加 "Blog 管理" 入口

### 阶段五：前台页面改造（预计 1 天）

- [ ] 改造 `src/app/[locale]/(home)/blog/page.tsx`
  - 从数据库查询已发布文章替代 fumadocs 文件源
  - 保持现有 UI 风格
- [ ] 改造 `src/app/[locale]/(home)/blog/[slug]/page.tsx`
  - 从数据库按 slug + locale 查询文章
  - 直接渲染 `htmlContent`
  - 保留 SEO metadata 生成
- [ ] 移除 `source.config.ts` 中的 blog 相关配置（保留 docs）
- [ ] 保留 `src/content/blog/` 目录作为参考，后续可删除

### 阶段六：收尾与优化（预计 1 天）

- [ ] 为 blog 列表和详情页添加适当缓存策略
- [ ] 添加 i18n 翻译键（blog 管理相关的 UI 文案）
- [ ] 更新 `src/themes/index.ts` 中的 `BlockName` / `PageName` 类型
- [ ] 更新 `src/themes/contracts.ts` 合约（如有需要）
- [ ] 构建验证 + 手动测试

## 4. 数据迁移（可选）

如果需要将现有 MDX 文件中的文章迁移到数据库：

- [ ] 编写迁移脚本 `scripts/migrate-blog-posts.ts`
  - 解析 MDX frontmatter 提取元数据
  - 将 MDX 正文转为 Tiptap JSON 和 HTML
  - 插入数据库

## 5. 文件结构预览

```
src/
├── server/db/
│   ├── schema.ts                    # + blogPost 表
│   └── repositories/
│       └── blog-repository.ts       # 新增
├── app/
│   ├── api/blog/                    # 新增 API 路由
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       ├── publish/route.ts
│   │       └── archive/route.ts
│   └── [locale]/
│       ├── (home)/blog/             # 改造前台页面
│       │   ├── page.tsx
│       │   └── [slug]/page.tsx
│       └── (protected)/dashboard/
│           └── blog/                # 新增后台页面
│               ├── page.tsx
│               ├── new/page.tsx
│               └── [id]/edit/page.tsx
├── themes/default/blocks/
│   ├── blog-editor.tsx              # 新增
│   └── blog-editor-toolbar.tsx      # 新增
└── themes/default/pages/
    ├── blog-list.tsx                # 新增（后台列表）
    └── blog-edit.tsx                # 新增（后台编辑）
```

## 6. 预计工期

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| 阶段一 | 数据层 | 1-2 天 |
| 阶段二 | API 层 | 1 天 |
| 阶段三 | Tiptap 编辑器 | 2-3 天 |
| 阶段四 | 后台管理页面 | 2 天 |
| 阶段五 | 前台页面改造 | 1 天 |
| 阶段六 | 收尾与优化 | 1 天 |
| **合计** | | **8-10 天** |

# 博客编辑器图片上传至 Cloudflare R2 实现原理

## 概述

博客编辑器中的图片上传功能基于 **Tiptap 富文本编辑器** + **Next.js API Route** + **Cloudflare R2 对象存储** 构建。整个流程从用户在编辑器工具栏点击上传按钮开始，经过前端文件选择、API 鉴权、R2 存储、数据库记录，最终将图片 URL 插入到编辑器内容中。

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端（浏览器）                             │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  工具栏组件    │───▶│  <input> 文件选择  │───▶│ handleImage   │  │
│  │  ImagePlus 按钮│    │  accept="image/*" │    │ Upload()      │  │
│  └──────────────┘    └──────────────────┘    └───────┬───────┘  │
│                                                      │          │
│                                              FormData + fetch   │
│                                                      │          │
└──────────────────────────────────────────────────────┼──────────┘
                                                       │
                                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                   API Route: /api/blog/upload                    │
│                                                                  │
│  1. 鉴权：验证 session + 管理员权限                                │
│  2. 解析 FormData，提取 file                                      │
│  3. 调用 uploadFile(file, userId)                                │
│     └─▶ 返回 { url, id }                                        │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                  file-service.ts: uploadFile()                   │
│                                                                  │
│  1. validateImageFile()  ─ 校验文件类型和大小                      │
│  2. getImageMetadata()   ─ 提取宽高信息                           │
│  3. generateUniqueFilename() ─ 生成 UUID + 时间戳文件名           │
│  4. generateR2Key()      ─ 生成存储路径 images/YYYY/MM/xxx.ext   │
│  5. generateThumbnail()  ─ 使用 jimp 生成缩略图                   │
│  6. uploadToR2(原图)     ─ PutObjectCommand 上传至 R2             │
│  7. uploadToR2(缩略图)   ─ PutObjectCommand 上传缩略图            │
│  8. fileRepository.create() ─ 数据库记录文件元信息                  │
│  9. 返回 FileInfo（含公开访问 URL）                                │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Cloudflare R2 存储                          │
│                                                                  │
│  Bucket: R2_BUCKET_NAME                                          │
│  ├── images/2025/02/uuid-timestamp.png      （原图）              │
│  └── thumbnails/2025/02/uuid-timestamp.png  （缩略图）            │
│                                                                  │
│  公开访问 URL: R2_PUBLIC_URL/{r2Key}                              │
└──────────────────────────────────────────────────────────────────┘
```

## 关键文件说明

| 文件 | 职责 |
|------|------|
| `src/components/blog/blog-editor.tsx` | Tiptap 编辑器组件，包含 `handleImageUpload` 回调 |
| `src/components/blog/blog-editor-toolbar.tsx` | 工具栏组件，包含文件选择 `<input>` 和上传触发逻辑 |
| `src/app/api/blog/upload/route.ts` | API 路由，处理鉴权和文件接收 |
| `src/lib/files/file-service.ts` | 核心文件服务，封装完整上传流程 |
| `src/lib/files/r2-client.ts` | R2 客户端配置（基于 AWS S3 SDK） |
| `src/lib/files/image-processor.ts` | 图片校验、元数据提取、缩略图生成 |

## 详细流程

### 第一步：前端触发上传

用户点击工具栏的 **ImagePlus** 图标按钮，触发隐藏的 `<input type="file">` 元素：

```tsx
// blog-editor-toolbar.tsx
<ToolbarButton onClick={() => fileInputRef.current?.click()}>
  <ImagePlus className="h-4 w-4" />
</ToolbarButton>
<input ref={fileInputRef} type="file" accept="image/*" className="hidden"
  onChange={handleImageSelect} />
```

文件选中后，`handleImageSelect` 调用父组件传入的 `onImageUpload(file)` 回调。

### 第二步：前端发送请求

`blog-editor.tsx` 中的 `handleImageUpload` 将文件包装为 `FormData`，通过 `fetch` 发送至 `/api/blog/upload`：

```tsx
// blog-editor.tsx
const handleImageUpload = useCallback(async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/blog/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  // 将返回的 URL 插入到编辑器中
  editor.chain().focus().setImage({ src: data.url }).run();
}, [editor]);
```

### 第三步：API 路由鉴权与转发

`/api/blog/upload` 路由执行两层校验：
1. **身份认证**：通过 `auth.api.getSession()` 获取当前会话
2. **权限检查**：通过 `isAdmin(session.user)` 确认管理员身份

校验通过后，调用 `uploadFile(file, userId)` 执行实际上传：

```ts
// api/blog/upload/route.ts
const session = await auth.api.getSession({ headers: request.headers });
if (!session?.user || !isAdmin(session.user)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
const fileInfo = await uploadFile(file, session.user.id);
return NextResponse.json({ url: fileInfo.url, id: fileInfo.id });
```

### 第四步：文件处理与 R2 上传

`file-service.ts` 中的 `uploadFile()` 是核心函数，执行以下操作：

1. **文件校验** — `validateImageFile()` 检查 MIME 类型和文件大小
2. **元数据提取** — `getImageMetadata()` 使用 jimp 获取图片宽高
3. **文件名生成** — `generateUniqueFilename()` 生成 `{UUID}-{timestamp}.{ext}` 格式的唯一文件名
4. **R2 Key 生成** — `generateR2Key()` 生成存储路径，格式为 `images/YYYY/MM/{filename}`
5. **缩略图生成** — `generateThumbnail()` 使用 jimp 生成缩略图
6. **R2 上传** — 通过 AWS S3 SDK 的 `PutObjectCommand` 将原图和缩略图上传至 R2
7. **数据库记录** — `fileRepository.create()` 将文件元信息（文件名、大小、R2 Key 等）写入 `file` 表
8. **返回 URL** — 拼接 `R2_PUBLIC_URL/{r2Key}` 作为公开访问地址

### 第五步：图片插入编辑器

API 返回 `{ url, id }` 后，前端调用 Tiptap 的 `setImage` 命令将图片节点插入到当前光标位置：

```ts
editor.chain().focus().setImage({ src: data.url }).run();
```

Tiptap 的 Image 扩展会将其渲染为 `<img>` 标签，编辑器内容中存储为 JSON 节点。

## R2 客户端配置

使用 `@aws-sdk/client-s3`（Cloudflare R2 兼容 S3 API）：

```ts
// r2-client.ts
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,          // Cloudflare R2 端点
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});
```

## 存储路径规范

| 类型 | 路径格式 | 示例 |
|------|---------|------|
| 原图 | `images/YYYY/MM/{uuid}-{timestamp}.{ext}` | `images/2025/02/a1b2c3-1738800000.png` |
| 缩略图 | `thumbnails/YYYY/MM/{uuid}-{timestamp}.{ext}` | `thumbnails/2025/02/a1b2c3-1738800000.png` |

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `R2_ENDPOINT` | Cloudflare R2 S3 兼容端点 |
| `R2_ACCESS_KEY_ID` | R2 API Token 的 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API Token 的 Secret Access Key |
| `R2_BUCKET_NAME` | R2 Bucket 名称 |
| `R2_PUBLIC_URL` | R2 Bucket 的公开访问域名 |

## 安全机制

- **鉴权**：仅管理员可上传（session + admin 校验）
- **文件校验**：限制上传文件类型（image/*）和大小
- **文件名随机化**：UUID + 时间戳，防止路径猜测和覆盖
- **数据库记录**：每个文件关联上传用户 ID，支持审计追踪

# 图片上传限制修改总结

## 🎯 修改目标

限制项目中的图片上传功能，只允许上传 JPEG 和 PNG 格式的图片，并更新相应的用户界面文案。

## 📍 修改位置

### 1. Dashboard Files 页面 (`/dashboard/files`)

**文件路径：** `src/components/file-manager/file-upload.tsx`

**修改内容：**
- 更新上传提示文案：从"拖拽图片到这里，或点击选择文件"改为"拖拽图片到这里，或点击选择图片"
- 更新格式说明：从动态显示所有支持格式改为固定显示"仅支持 JPEG 和 PNG 格式的图片"
- 更新错误提示：文件类型错误时显示"仅支持 JPEG 和 PNG 格式的图片"

### 2. Settings Profile 页面 (`/settings/profile`)

**文件路径：** `src/components/settings/profile-content.tsx`

**修改内容：**
- 更新文件选择器的 `accept` 属性：从 `image/*` 改为 `image/jpeg,image/png`
- 添加客户端文件类型验证
- 添加文件大小验证（10MB 限制）
- 使用 `toast.error()` 替代 `alert()` 提供更好的用户体验
- 更新头像卡片描述，明确说明支持的格式和大小限制

## 🔧 配置文件修改

### 1. 应用配置 (`src/config/app.config.ts`)

```typescript
// 修改前
allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

// 修改后  
allowedTypes: ['image/jpeg', 'image/png'] // 只支持 JPEG 和 PNG 格式
```

### 2. 功能配置 (`src/config/features.config.ts`)

```typescript
// 修改前
allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

// 修改后
allowedTypes: ['image/jpeg', 'image/png'] // 只支持 JPEG 和 PNG 格式
```

## ✅ 验证方式

### 客户端验证
- 文件选择器只显示 JPEG 和 PNG 文件
- 上传前验证文件类型和大小
- 使用友好的 toast 提示错误信息

### 服务器端验证
- `validateImageFile()` 函数检查文件类型
- `image-processor.ts` 只处理 JPEG 和 PNG 格式
- 文件大小限制为 10MB

## 🎨 用户体验改进

1. **清晰的格式说明**：用户界面明确显示只支持 JPEG 和 PNG 格式
2. **友好的错误提示**：使用 toast 通知替代 alert 弹窗
3. **一致的限制**：两个上传页面使用相同的限制规则
4. **即时反馈**：文件选择时立即验证，无需等待上传

## 🔄 兼容性

- ✅ Vercel Serverless Functions：完全支持
- ✅ Vercel Edge Functions：完全支持  
- ✅ Cloudflare Workers：完全支持
- ✅ 现有图片处理功能：完全兼容 jSquash

## 📝 注意事项

1. 现有的 GIF、WebP、SVG 图片将无法上传
2. 用户需要将其他格式的图片转换为 JPEG 或 PNG 格式
3. 所有客户端和服务器端验证都已同步更新
4. 测试用例已更新以反映新的限制 
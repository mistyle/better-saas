# 组件开发规范

## UI 组件系统

### shadcn/ui 组件

项目使用 **shadcn/ui (new-york 风格)**，组件位于 `src/components/ui/`。

添加新的 shadcn 组件：
```bash
pnpm dlx shadcn@latest add <component-name>
```

### 组件配置
参见 `components.json`：
```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

### cn 工具函数
使用 `cn` 函数合并 Tailwind 类名：

```typescript
import { cn } from '@/lib/utils';

function MyComponent({ className }) {
  return (
    <div className={cn('base-classes', className)}>
      Content
    </div>
  );
}
```

## 组件模式

### 页面组件结构

```typescript
// app/[locale]/(protected)/dashboard/page.tsx
import { getServerSession } from '@/lib/auth/server-session';
import { DashboardContent } from './dashboard-content';

export default async function DashboardPage() {
  const session = await getServerSession();
  
  return <DashboardContent user={session?.user} />;
}
```

### 客户端组件

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

export function InteractiveComponent() {
  const [state, setState] = useState(false);
  
  return (
    <Button onClick={() => setState(!state)}>
      Toggle
    </Button>
  );
}
```

### 表单组件

使用 Radix UI 原语配合自定义样式：

```typescript
import { Input, Label, Button } from '@/components/ui';

export function FormExample() {
  return (
    <form>
      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input id="email" type="email" />
      </div>
      <Button type="submit">提交</Button>
    </form>
  );
}
```

### Loading 状态

使用骨架屏组件：

```typescript
import { LoadingSkeleton } from '@/components/loading-skeleton';

export function Loading() {
  return <LoadingSkeleton />;
}
```

## 路由保护

使用 `RouteGuard` 组件保护需要认证的路由：

```typescript
import { RouteGuard } from '@/components/route-guard';

export default function ProtectedLayout({ children }) {
  return (
    <RouteGuard>
      {children}
    </RouteGuard>
  );
}
```

## 主题支持

项目支持亮色/暗色主题切换：

```typescript
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      切换主题
    </Button>
  );
}
```

## 图标使用

使用 Lucide React 图标库：

```typescript
import { Home, Settings, User } from 'lucide-react';

export function Navigation() {
  return (
    <nav>
      <Home className="h-5 w-5" />
      <Settings className="h-5 w-5" />
      <User className="h-5 w-5" />
    </nav>
  );
}
```

常用图标也可以从 `@/lib/icons` 导入预配置的图标。

## 富文本编辑器

项目使用 Tiptap 作为富文本编辑器，用于博客等场景：

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function RichTextEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
  });
  
  return <EditorContent editor={editor} />;
}
```

## 文件上传

使用 react-dropzone 配合 R2 存储：

```typescript
import { useDropzone } from 'react-dropzone';

export function FileUploader() {
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.png', '.gif'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });
  
  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <p>拖拽文件到此处或点击选择</p>
    </div>
  );
}
```

## Toast 通知

使用 Sonner 显示 Toast 通知：

```typescript
import { toast } from 'sonner';

// 成功提示
toast.success('操作成功');

// 错误提示
toast.error('操作失败');

// 加载状态
const loadingToast = toast.loading('处理中...');
// 完成后
toast.dismiss(loadingToast);
toast.success('完成');
```

## 响应式设计

遵循移动优先的响应式设计：

```typescript
<div className="
  px-4 md:px-6 lg:px-8
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
  gap-4 md:gap-6
">
  {/* 内容 */}
</div>
```

常用断点：
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

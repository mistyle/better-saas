# 国际化 (i18n) 规范

## 概述

项目使用 **next-intl** 实现国际化，支持以下语言：
- 英语 (en) - 默认
- 简体中文 (zh)

## 目录结构

```
src/
├── i18n/
│   ├── messages/
│   │   ├── en.json      # 英文翻译
│   │   └── zh.json      # 中文翻译
│   ├── routing.ts       # 路由配置
│   ├── request.ts       # 请求配置
│   └── navigation.ts    # 导航辅助函数
└── config/
    └── i18n.config.ts   # i18n 配置
```

## 路由结构

所有页面都在 `[locale]` 目录下：

```
src/app/
├── [locale]/
│   ├── (home)/         # 首页
│   ├── (protected)/    # 受保护页面
│   ├── login/
│   ├── signup/
│   └── docs/
```

URL 示例：
- 英文: `/en/dashboard`
- 中文: `/zh/dashboard`

## 使用翻译

### 服务器组件

```typescript
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('namespace');
  
  return <h1>{t('title')}</h1>;
}
```

### 客户端组件

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function ClientComponent() {
  const t = useTranslations('namespace');
  
  return <p>{t('message')}</p>;
}
```

### 带参数的翻译

```json
// en.json
{
  "greeting": "Hello, {name}!"
}
```

```typescript
t('greeting', { name: 'John' });
// 输出: Hello, John!
```

### 复数形式

```json
// en.json
{
  "items": "{count, plural, =0 {No items} one {# item} other {# items}}"
}
```

```typescript
t('items', { count: 5 });
// 输出: 5 items
```

## 翻译文件组织

### 命名空间

翻译按功能模块组织为命名空间：

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "auth": {
    "login": "Log In",
    "logout": "Log Out",
    "signup": "Sign Up"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back"
  }
}
```

### 使用命名空间

```typescript
const t = useTranslations('auth');
t('login'); // Log In

// 或访问嵌套
const tCommon = useTranslations('common');
tCommon('save'); // Save
```

## 添加新翻译

1. 在 `src/i18n/messages/en.json` 添加英文翻译
2. 在 `src/i18n/messages/zh.json` 添加中文翻译
3. 确保两个文件的键结构完全一致

### 示例

```json
// en.json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}

// zh.json
{
  "newFeature": {
    "title": "新功能",
    "description": "这是一个新功能"
  }
}
```

## 日期和数字格式化

### 日期格式

```typescript
import { useFormatter } from 'next-intl';

function DateDisplay({ date }) {
  const format = useFormatter();
  
  return (
    <time>
      {format.dateTime(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    </time>
  );
}
```

### 数字/货币格式

```typescript
import { useFormatter } from 'next-intl';

function PriceDisplay({ price }) {
  const format = useFormatter();
  
  return (
    <span>
      {format.number(price, {
        style: 'currency',
        currency: 'USD'
      })}
    </span>
  );
}
```

## 语言切换

```typescript
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { locales } from '@/i18n/routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };
  
  return (
    <select value={locale} onChange={(e) => switchLocale(e.target.value)}>
      {locales.map(({ locale, name }) => (
        <option key={locale} value={locale}>
          {name}
        </option>
      ))}
    </select>
  );
}
```

## 导航链接

使用国际化的 Link 和 useRouter：

```typescript
import { Link, useRouter } from '@/i18n/navigation';

// 链接会自动包含当前语言前缀
<Link href="/dashboard">Dashboard</Link>

// 编程式导航
const router = useRouter();
router.push('/settings');
```

## 最佳实践

1. **保持键名语义化**：使用描述性的键名，如 `dashboard.welcome` 而不是 `text1`

2. **避免硬编码文本**：所有用户可见的文本都应使用翻译

3. **同步更新**：添加新翻译时同时更新所有语言文件

4. **使用命名空间**：按功能模块组织翻译，便于维护

5. **考虑文本长度**：不同语言的翻译长度可能不同，UI 设计要有弹性

6. **测试多语言**：在不同语言下测试 UI 布局和显示效果

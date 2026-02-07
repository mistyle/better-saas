# API 开发规范

## API 路由结构

API 路由位于 `src/app/api/` 目录：

```
src/app/api/
├── auth/                  # 认证 API
│   └── [...all]/          # Better Auth 路由
├── blog/                  # 博客 API
│   ├── posts/
│   └── categories/
├── api-keys/              # API Key 管理
├── credits/               # 积分 API
├── data/                  # 数据 API
├── health/                # 健康检查
└── webhooks/              # Webhook 处理
    └── stripe/            # Stripe Webhook
```

## API 路由处理器

### 基本结构

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server-session';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 业务逻辑
    const data = {};
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

### 动态路由

```typescript
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // 根据 id 获取数据
  return NextResponse.json({ id });
}
```

## Server Actions (推荐)

对于表单提交和简单的数据变更，优先使用 Server Actions：

```typescript
// src/server/actions/example-actions.ts
'use server';

import { getServerSession } from '@/lib/auth/server-session';
import db from '@/server/db';

export async function createItem(data: { name: string }) {
  const session = await getServerSession();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  // 验证数据
  if (!data.name) {
    throw new Error('Name is required');
  }
  
  // 执行数据库操作
  const result = await db.insert(/* ... */);
  
  return result;
}
```

### 在组件中使用

```typescript
'use client';

import { createItem } from '@/server/actions/example-actions';

export function CreateForm() {
  async function handleSubmit(formData: FormData) {
    const name = formData.get('name') as string;
    
    try {
      await createItem({ name });
      // 成功处理
    } catch (error) {
      // 错误处理
    }
  }
  
  return (
    <form action={handleSubmit}>
      <input name="name" required />
      <button type="submit">创建</button>
    </form>
  );
}
```

## 数据获取模式

### SWR 客户端获取

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useData() {
  const { data, error, isLoading, mutate } = useSWR('/api/data', fetcher);
  
  return {
    data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
```

### 自定义 Hooks

项目中的自定义数据获取 Hooks 位于 `src/hooks/`：

```typescript
// src/hooks/use-credits.ts
import useSWR from 'swr';

export function useCredits() {
  const { data, error, isLoading, mutate } = useSWR('/api/credits', fetcher);
  
  return {
    credits: data?.credits ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}
```

## Webhook 处理

### Stripe Webhook 示例

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }
  
  // 处理事件
  switch (event.type) {
    case 'checkout.session.completed':
      // 处理支付成功
      break;
    case 'customer.subscription.updated':
      // 处理订阅更新
      break;
    // ...更多事件类型
  }
  
  return NextResponse.json({ received: true });
}
```

## 错误处理

### 统一错误响应格式

```typescript
interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

function createErrorResponse(
  message: string,
  status: number,
  code?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, code },
    { status }
  );
}

// 使用
return createErrorResponse('Not found', 404, 'RESOURCE_NOT_FOUND');
```

### 常见错误状态码

- `400` - Bad Request (请求参数错误)
- `401` - Unauthorized (未认证)
- `403` - Forbidden (无权限)
- `404` - Not Found (资源不存在)
- `409` - Conflict (资源冲突)
- `422` - Unprocessable Entity (验证失败)
- `429` - Too Many Requests (请求过多)
- `500` - Internal Server Error (服务器错误)

## 认证与授权

### 检查认证状态

```typescript
import { getServerSession } from '@/lib/auth/server-session';

const session = await getServerSession();

if (!session?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 检查管理员权限

```typescript
import { getUserAdminStatus } from '@/server/actions/auth-actions';

const isAdmin = await getUserAdminStatus();

if (!isAdmin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## 数据验证

使用 Zod 进行请求数据验证：

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = createItemSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 422 }
    );
  }
  
  const { name, description } = result.data;
  // 继续处理...
}
```

## API 响应规范

### 成功响应

```typescript
// 单个资源
return NextResponse.json({ data: item });

// 列表资源 (带分页)
return NextResponse.json({
  data: items,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 100,
    totalPages: 10,
  },
});

// 创建成功
return NextResponse.json({ data: newItem }, { status: 201 });

// 删除成功 (无内容)
return new NextResponse(null, { status: 204 });
```

### 错误响应

```typescript
return NextResponse.json(
  {
    error: '错误信息',
    code: 'ERROR_CODE', // 可选
    details: {}, // 可选，验证错误详情等
  },
  { status: 400 }
);
```

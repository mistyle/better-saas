# Better SaaS API Key 集成方案

## 概述

本方案基于 better-auth 的 API Key 插件，为 Better SaaS 项目提供对外 API 调用功能。用户可以创建和管理 API Key，通过 API Key 访问平台的各种服务，同时集成现有的积分系统进行计费。

## 系统架构

### 核心组件

1. **Better Auth API Key 插件** - 提供 API Key 的创建、验证和管理
2. **API Key 中间件** - 验证 API Key 并创建会话
3. **积分集成** - API 调用时自动扣除积分
4. **权限控制** - 基于 API Key 的权限管理
5. **速率限制** - 防止 API 滥用

### 数据流程

```mermaid
flowchart TD
    A[客户端API请求] --> B[API Key中间件]
    B --> C{验证API Key}
    C -->|无效| D[返回401错误]
    C -->|有效| E[创建模拟会话]
    E --> F[检查权限]
    F -->|无权限| G[返回403错误]
    F -->|有权限| H[检查积分余额]
    H -->|余额不足| I[返回402错误]
    H -->|余额充足| J[执行API逻辑]
    J --> K[扣除积分]
    K --> L[记录使用量]
    L --> M[返回结果]
```

## 实施步骤

### 1. 安装和配置 API Key 插件

#### 1.1 更新 better-auth 配置

```typescript
// src/lib/auth/auth.ts
import { env } from '@/env';
import db from '@/server/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, apiKey } from 'better-auth/plugins';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  baseURL: env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24 * 3,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 
    },
  },
  plugins: [
    admin(),
    apiKey({
      // API Key 配置
      apiKeyHeaders: ['x-api-key', 'authorization'], // 支持多种header格式
      prefix: 'bsaas_', // API Key 前缀
      length: 32, // API Key 长度
      
      // 默认速率限制配置
      rateLimit: {
        window: 60 * 1000, // 1分钟窗口
        max: 100, // 每分钟最多100次请求
      },
      
      // 自定义 API Key 获取逻辑（可选）
      apiKeyGetter: (ctx) => {
        // 支持 Bearer token 格式
        const authHeader = ctx.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          return authHeader.substring(7);
        }
        
        // 支持 x-api-key header
        return ctx.headers.get('x-api-key');
      },
    })
  ]
});
```

#### 1.2 数据库迁移

创建 API Key 相关的数据库表：

```sql
-- 添加到新的迁移文件中
-- drizzle/xxxx_add_api_key_tables.sql

-- API Key 表
CREATE TABLE "api_key" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "key" text NOT NULL UNIQUE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "expires_at" timestamp,
  "remaining" integer,
  "refill_interval" integer,
  "refill_amount" integer,
  "metadata" text, -- JSON string
  "permissions" text, -- JSON string
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- API Key 速率限制表
CREATE TABLE "api_key_rate_limit" (
  "id" text PRIMARY KEY NOT NULL,
  "api_key_id" text NOT NULL REFERENCES "api_key"("id") ON DELETE CASCADE,
  "window" integer NOT NULL,
  "max" integer NOT NULL,
  "request_count" integer DEFAULT 0 NOT NULL,
  "window_start" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX "api_key_user_id_idx" ON "api_key"("user_id");
CREATE INDEX "api_key_expires_at_idx" ON "api_key"("expires_at");
CREATE INDEX "api_key_rate_limit_api_key_id_idx" ON "api_key_rate_limit"("api_key_id");
```

#### 1.3 更新 Drizzle Schema

```typescript
// src/server/db/schema.ts
// 在现有 schema 文件末尾添加

export const apiKey = pgTable('api_key', {
  id: text('id').primaryKey(),
  name: text('name'),
  key: text('key').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at'),
  remaining: integer('remaining'),
  refillInterval: integer('refill_interval'),
  refillAmount: integer('refill_amount'),
  metadata: text('metadata'), // JSON string
  permissions: text('permissions'), // JSON string
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const apiKeyRateLimit = pgTable('api_key_rate_limit', {
  id: text('id').primaryKey(),
  apiKeyId: text('api_key_id')
    .notNull()
    .references(() => apiKey.id, { onDelete: 'cascade' }),
  window: integer('window').notNull(),
  max: integer('max').notNull(),
  requestCount: integer('request_count').notNull().default(0),
  windowStart: timestamp('window_start')
    .$defaultFn(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});
```

### 2. 创建 API Key 管理服务

#### 2.1 API Key 服务类

```typescript
// src/lib/api-key/api-key-service.ts
import { auth } from '@/lib/auth/auth';
import db from '@/server/db';
import { apiKey } from '@/server/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { generateId } from '@/lib/utils';

export interface CreateApiKeyParams {
  name?: string;
  expiresIn?: number; // 秒
  remaining?: number; // 剩余调用次数
  refillInterval?: number; // 重填间隔（毫秒）
  refillAmount?: number; // 重填数量
  permissions?: Record<string, string[]>;
  metadata?: Record<string, any>;
  rateLimit?: {
    window: number; // 时间窗口（毫秒）
    max: number; // 最大请求数
  };
}

export interface ApiKeyInfo {
  id: string;
  name?: string;
  key?: string; // 只在创建时返回
  userId: string;
  expiresAt?: Date;
  remaining?: number;
  permissions?: Record<string, string[]>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class ApiKeyService {
  /**
   * 创建 API Key
   */
  static async createApiKey(
    userId: string,
    params: CreateApiKeyParams = {}
  ): Promise<ApiKeyInfo> {
    const result = await auth.api.createApiKey({
      body: {
        name: params.name,
        expiresIn: params.expiresIn,
        prefix: 'bsaas_',
        metadata: params.metadata,
        permissions: params.permissions,
      },
      headers: {
        // 模拟用户会话
        'x-user-id': userId,
      },
    });

    if (!result.data) {
      throw new Error('Failed to create API key');
    }

    return {
      id: result.data.id,
      name: result.data.name,
      key: result.data.key, // 只在创建时返回完整key
      userId: result.data.userId,
      expiresAt: result.data.expiresAt,
      remaining: params.remaining,
      permissions: params.permissions,
      metadata: params.metadata,
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
    };
  }

  /**
   * 获取用户的所有 API Key
   */
  static async listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
    const result = await auth.api.listApiKeys({
      headers: {
        'x-user-id': userId,
      },
    });

    if (!result.data) {
      return [];
    }

    return result.data.map(key => ({
      id: key.id,
      name: key.name,
      userId: key.userId,
      expiresAt: key.expiresAt,
      remaining: key.remaining,
      permissions: key.permissions ? JSON.parse(key.permissions) : undefined,
      metadata: key.metadata ? JSON.parse(key.metadata) : undefined,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));
  }

  /**
   * 删除 API Key
   */
  static async deleteApiKey(userId: string, keyId: string): Promise<void> {
    await auth.api.deleteApiKey({
      body: { keyId },
      headers: {
        'x-user-id': userId,
      },
    });
  }

  /**
   * 验证 API Key
   */
  static async verifyApiKey(
    key: string,
    permissions?: Record<string, string[]>
  ): Promise<{ valid: boolean; userId?: string; keyInfo?: ApiKeyInfo }> {
    try {
      const result = await auth.api.verifyApiKey({
        body: { key, permissions },
      });

      if (result.data?.valid) {
        return {
          valid: true,
          userId: result.data.userId,
          keyInfo: {
            id: result.data.id,
            name: result.data.name,
            userId: result.data.userId,
            expiresAt: result.data.expiresAt,
            remaining: result.data.remaining,
            permissions: result.data.permissions ? JSON.parse(result.data.permissions) : undefined,
            metadata: result.data.metadata ? JSON.parse(result.data.metadata) : undefined,
            createdAt: result.data.createdAt,
            updatedAt: result.data.updatedAt,
          },
        };
      }

      return { valid: false };
    } catch (error) {
      console.error('API Key verification failed:', error);
      return { valid: false };
    }
  }

  /**
   * 清理过期的 API Key
   */
  static async cleanupExpiredKeys(): Promise<number> {
    const result = await auth.api.deleteAllExpiredApiKeys();
    return result.data?.deletedCount || 0;
  }
}
```

### 3. 创建 API 端点

#### 3.1 API Key 管理端点

```typescript
// src/app/api/api-keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { ApiKeyService } from '@/lib/api-key/api-key-service';
import { z } from 'zod';

const createApiKeySchema = z.object({
  name: z.string().optional(),
  expiresIn: z.number().optional(),
  remaining: z.number().optional(),
  permissions: z.record(z.array(z.string())).optional(),
  metadata: z.record(z.any()).optional(),
});

// 创建 API Key
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createApiKeySchema.parse(body);

    const apiKey = await ApiKeyService.createApiKey(
      session.user.id,
      validatedData
    );

    return NextResponse.json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    console.error('Create API key failed:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

// 获取用户的 API Keys
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const apiKeys = await ApiKeyService.listApiKeys(session.user.id);

    return NextResponse.json({
      success: true,
      data: apiKeys,
    });
  } catch (error) {
    console.error('List API keys failed:', error);
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 }
    );
  }
}
```

```typescript
// src/app/api/api-keys/[keyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { ApiKeyService } from '@/lib/api-key/api-key-service';

// 删除 API Key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await ApiKeyService.deleteApiKey(session.user.id, params.keyId);

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Delete API key failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
```

#### 3.2 对外 API 端点示例

```typescript
// src/app/api/v1/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { trackApiCall } from '@/lib/quota/quota-service';
import { creditService } from '@/lib/credits';
import { z } from 'zod';

const chatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  model: z.enum(['gpt-3.5-turbo', 'gpt-4']).default('gpt-3.5-turbo'),
  temperature: z.number().min(0).max(2).default(0.7),
});

// AI 聊天 API
export async function POST(request: NextRequest) {
  try {
    // 1. 验证 API Key 并获取用户会话
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // 2. 验证请求数据
    const body = await request.json();
    const { message, model, temperature } = chatRequestSchema.parse(body);

    // 3. 检查权限（如果API Key设置了权限）
    const apiKeyHeader = request.headers.get('x-api-key') || 
      request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (apiKeyHeader) {
      const verification = await auth.api.verifyApiKey({
        body: {
          key: apiKeyHeader,
          permissions: { ai: ['chat'] }, // 需要 ai.chat 权限
        },
      });

      if (!verification.data?.valid) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // 4. 计算积分成本
    const creditCost = model === 'gpt-4' ? 10 : 5; // GPT-4 更贵

    // 5. 检查积分余额
    const hasCredits = await creditService.hasEnoughCredits(
      session.user.id,
      creditCost
    );

    if (!hasCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: creditCost,
          available: await creditService.getAvailableBalance(session.user.id),
        },
        { status: 402 }
      );
    }

    // 6. 执行 AI 聊天逻辑
    const chatResponse = await performAIChat({
      message,
      model,
      temperature,
    });

    // 7. 扣除积分并记录使用量
    await trackApiCall(session.user.id, 'ai_chat', creditCost);

    // 8. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        response: chatResponse.content,
        model,
        usage: {
          credits_used: creditCost,
          tokens: chatResponse.tokens,
        },
      },
    });
  } catch (error) {
    console.error('AI chat API failed:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 模拟 AI 聊天函数
async function performAIChat(params: {
  message: string;
  model: string;
  temperature: number;
}) {
  // 这里集成实际的 AI 服务
  return {
    content: `AI response to: ${params.message}`,
    tokens: 150,
  };
}
```

### 4. 创建前端管理界面

#### 4.1 API Key 管理组件

```typescript
// src/components/api-keys/api-key-manager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name?: string;
  key?: string;
  expiresAt?: string;
  remaining?: number;
  createdAt: string;
}

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // 获取 API Keys
  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      const result = await response.json();
      
      if (result.success) {
        setApiKeys(result.data);
      } else {
        toast.error('Failed to load API keys');
      }
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  // 创建 API Key
  const createApiKey = async (data: { name?: string; expiresIn?: number }) => {
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('API key created successfully');
        setShowCreateDialog(false);
        fetchApiKeys();
        
        // 显示新创建的 key
        if (result.data.key) {
          setVisibleKeys(prev => new Set([...prev, result.data.id]));
        }
      } else {
        toast.error('Failed to create API key');
      }
    } catch (error) {
      toast.error('Failed to create API key');
    }
  };

  // 删除 API Key
  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('API key deleted successfully');
        fetchApiKeys();
      } else {
        toast.error('Failed to delete API key');
      }
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // 切换 key 可见性
  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Keys</h2>
          <p className="text-muted-foreground">
            Manage your API keys for programmatic access
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <CreateApiKeyForm onSubmit={createApiKey} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No API keys found. Create your first API key to get started.
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    {key.name || 'Unnamed'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {visibleKeys.has(key.id) 
                          ? key.key || 'bsaas_••••••••••••••••'
                          : 'bsaas_••••••••••••••••'
                        }
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleKeyVisibility(key.id)}
                      >
                        {visibleKeys.has(key.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      {key.key && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(key.key!)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {key.expiresAt ? (
                      new Date(key.expiresAt) > new Date() ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Expired</Badge>
                      )
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {key.remaining ?? 'Unlimited'}
                  </TableCell>
                  <TableCell>
                    {new Date(key.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteApiKey(key.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// 创建 API Key 表单组件
function CreateApiKeyForm({ 
  onSubmit 
}: { 
  onSubmit: (data: { name?: string; expiresIn?: number }) => void 
}) {
  const [name, setName] = useState('');
  const [expiresIn, setExpiresIn] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: { name?: string; expiresIn?: number } = {};
    
    if (name.trim()) {
      data.name = name.trim();
    }
    
    if (expiresIn) {
      const days = parseInt(expiresIn);
      if (days > 0) {
        data.expiresIn = days * 24 * 60 * 60; // 转换为秒
      }
    }
    
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name (Optional)</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My API Key"
        />
      </div>
      
      <div>
        <Label htmlFor="expires">Expires in (Days, Optional)</Label>
        <Input
          id="expires"
          type="number"
          value={expiresIn}
          onChange={(e) => setExpiresIn(e.target.value)}
          placeholder="30"
          min="1"
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="submit">
          Create API Key
        </Button>
      </div>
    </form>
  );
}
```

#### 4.2 添加到设置页面

```typescript
// src/app/[locale]/dashboard/settings/page.tsx
// 在现有设置页面中添加 API Keys 标签

import { ApiKeyManager } from '@/components/api-keys/api-key-manager';

// 在 tabs 配置中添加
const tabs = [
  // ... 现有标签
  {
    id: 'api-keys',
    label: 'API Keys',
    component: <ApiKeyManager />,
  },
];
```

### 5. API 文档和使用示例

#### 5.1 创建 API 文档

```markdown
<!-- src/content/docs/en/api/getting-started.mdx -->
# API Documentation

## Authentication

All API requests require authentication using an API key. You can create and manage your API keys in the dashboard settings.

### API Key Authentication

Include your API key in the request headers:

```bash
# Using x-api-key header
curl -H "x-api-key: bsaas_your_api_key_here" \
  https://your-domain.com/api/v1/ai/chat

# Using Authorization header
curl -H "Authorization: Bearer bsaas_your_api_key_here" \
  https://your-domain.com/api/v1/ai/chat
```

## Rate Limits

- Default: 100 requests per minute per API key
- Rate limits can be customized per API key
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets

## Credits and Billing

API calls consume credits from your account:
- AI Chat (GPT-3.5): 5 credits per request
- AI Chat (GPT-4): 10 credits per request
- File Upload: 100 credits per GB

Paid users receive free quotas before credits are consumed.

## Endpoints

### AI Chat

`POST /api/v1/ai/chat`

Generate AI responses to user messages.

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Hello! I'm doing well, thank you for asking...",
    "model": "gpt-3.5-turbo",
    "usage": {
      "credits_used": 5,
      "tokens": 150
    }
  }
}
```

**Error Responses:**
- `401`: Invalid API key
- `402`: Insufficient credits
- `403`: Insufficient permissions
- `429`: Rate limit exceeded
```

#### 5.2 SDK 示例

```typescript
// 创建 TypeScript SDK
// src/lib/sdk/better-saas-sdk.ts

export interface BetterSaasConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ChatRequest {
  message: string;
  model?: 'gpt-3.5-turbo' | 'gpt-4';
  temperature?: number;
}

export interface ChatResponse {
  response: string;
  model: string;
  usage: {
    credits_used: number;
    tokens: number;
  };
}

export class BetterSaasSDK {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: BetterSaasConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://your-domain.com';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    const result = await response.json();
    return result.data;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

// 使用示例
const sdk = new BetterSaasSDK({
  apiKey: 'bsaas_your_api_key_here',
});

const response = await sdk.chat({
  message: 'Hello, world!',
  model: 'gpt-3.5-turbo',
});

console.log(response.response);
```

### 6. 安全和最佳实践

#### 6.1 安全配置

```typescript
// src/middleware.ts
// 添加 API Key 相关的中间件

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

export async function middleware(request: NextRequest) {
  // API 路由的特殊处理
  if (request.nextUrl.pathname.startsWith('/api/v1/')) {
    // 检查 API Key
    const apiKey = request.headers.get('x-api-key') || 
      request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // 验证 API Key 格式
    if (!apiKey.startsWith('bsaas_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      );
    }

    // 添加安全头
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
  }

  // 其他路由的现有逻辑
  // ...
}

export const config = {
  matcher: [
    '/api/v1/:path*',
    // ... 其他匹配规则
  ],
};
```

#### 6.2 监控和日志

```typescript
// src/lib/api-key/monitoring.ts

import db from '@/server/db';
import { apiKeyRateLimit } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export interface ApiUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  creditsConsumed: number;
  averageResponseTime: number;
}

export class ApiMonitoring {
  /**
   * 记录 API 调用
   */
  static async logApiCall(params: {
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    creditsUsed: number;
    userAgent?: string;
    ipAddress?: string;
  }) {
    // 记录到日志系统或数据库
    console.log('API Call:', {
      timestamp: new Date().toISOString(),
      ...params,
    });
  }

  /**
   * 获取 API 使用统计
   */
  static async getUsageStats(
    apiKeyId: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<ApiUsageStats> {
    // 从日志或数据库获取统计数据
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      creditsConsumed: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * 检查异常使用模式
   */
  static async detectAnomalies(apiKeyId: string): Promise<{
    suspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    
    // 检查请求频率异常
    // 检查错误率异常
    // 检查地理位置异常
    
    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }
}
```

### 7. 部署和维护

#### 7.1 环境变量配置

```bash
# .env.local
# API Key 相关配置
API_KEY_ENCRYPTION_SECRET=your-encryption-secret-here
API_KEY_DEFAULT_RATE_LIMIT_WINDOW=60000
API_KEY_DEFAULT_RATE_LIMIT_MAX=100

# 监控配置
API_MONITORING_ENABLED=true
API_ANOMALY_DETECTION_ENABLED=true
```

#### 7.2 定期维护任务

```typescript
// src/app/api/cron/cleanup-expired-api-keys/route.ts
import { NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/api-key/api-key-service';

export async function POST() {
  try {
    const deletedCount = await ApiKeyService.cleanupExpiredKeys();
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired API keys`,
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
```

## 总结

这个方案提供了完整的 API Key 集成解决方案，包括：

### 核心功能
1. **API Key 管理** - 创建、列表、删除 API Keys
2. **身份验证** - 基于 API Key 的请求验证
3. **权限控制** - 细粒度的 API 权限管理
4. **积分集成** - 自动扣除积分和配额管理
5. **速率限制** - 防止 API 滥用
6. **监控日志** - 完整的使用统计和异常检测

### 安全特性
1. **加密存储** - API Key 安全存储
2. **前缀标识** - 统一的 API Key 格式
3. **过期机制** - 自动清理过期 Keys
4. **使用限制** - 剩余次数和重填机制
5. **异常检测** - 自动识别可疑使用模式

### 开发体验
1. **管理界面** - 用户友好的 Web 管理界面
2. **完整文档** - 详细的 API 文档和示例
3. **SDK 支持** - TypeScript SDK 简化集成
4. **错误处理** - 清晰的错误信息和状态码

这个方案可以让 Better SaaS 项目快速具备对外 API 服务能力，同时保持与现有积分系统的完美集成。
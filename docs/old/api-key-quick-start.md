# API Key 功能快速实施指南

## 快速开始（30分钟内完成基础集成）

### 第一步：安装和配置 API Key 插件

#### 1. 更新 better-auth 配置

```typescript
// src/lib/auth/auth.ts
// 在现有配置基础上添加 apiKey 插件

import { admin, apiKey } from 'better-auth/plugins';

// 在 plugins 数组中添加 apiKey
plugins: [
  admin(),
  apiKey({
    apiKeyHeaders: ['x-api-key', 'authorization'],
    prefix: 'bsaas_',
    length: 32,
    rateLimit: {
      window: 60 * 1000, // 1分钟
      max: 100, // 100次请求
    },
  })
]
```

#### 2. 运行数据库迁移

```bash
# 生成新的迁移文件
npx drizzle-kit generate

# 应用迁移
npx drizzle-kit migrate
```

### 第二步：创建 API Key 管理端点

#### 创建 API Key 管理路由

```typescript
// src/app/api/api-keys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

// 创建 API Key
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = await auth.api.createApiKey({
      body: {
        name: body.name,
        expiresIn: body.expiresIn,
        prefix: 'bsaas_',
      },
      headers: { 'x-user-id': session.user.id },
    });

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

// 获取 API Keys 列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await auth.api.listApiKeys({
      headers: { 'x-user-id': session.user.id },
    });

    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}
```

```typescript
// src/app/api/api-keys/[keyId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

// 删除 API Key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await auth.api.deleteApiKey({
      body: { keyId: params.keyId },
      headers: { 'x-user-id': session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}
```

### 第三步：创建对外 API 端点

#### 示例：AI 聊天 API

```typescript
// src/app/api/v1/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { trackApiCall } from '@/lib/quota/quota-service';
import { creditService } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证 API Key
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // 2. 解析请求
    const { message, model = 'gpt-3.5-turbo' } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 3. 计算积分成本
    const creditCost = model === 'gpt-4' ? 10 : 5;

    // 4. 检查积分余额
    const hasCredits = await creditService.hasEnoughCredits(session.user.id, creditCost);
    if (!hasCredits) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          required: creditCost,
          available: await creditService.getAvailableBalance(session.user.id)
        },
        { status: 402 }
      );
    }

    // 5. 执行 AI 聊天（这里用模拟数据）
    const aiResponse = {
      content: `AI response to: ${message}`,
      tokens: 150,
    };

    // 6. 扣除积分
    await trackApiCall(session.user.id, 'ai_chat', creditCost);

    // 7. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        response: aiResponse.content,
        model,
        usage: {
          credits_used: creditCost,
          tokens: aiResponse.tokens,
        },
      },
    });
  } catch (error) {
    console.error('AI chat API failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 第四步：创建简单的管理界面

#### API Key 管理组件

```typescript
// src/components/api-keys/simple-api-key-manager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name?: string;
  key?: string;
  createdAt: string;
}

export function SimpleApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // 获取 API Keys
  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys');
      const result = await response.json();
      if (result.success) {
        setApiKeys(result.data);
      }
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  // 创建 API Key
  const createApiKey = async () => {
    if (creating) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || undefined }),
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('API key created successfully');
        setNewKeyName('');
        fetchApiKeys();
        // 自动显示新创建的 key
        if (result.data.key) {
          setVisibleKeys(prev => new Set([...prev, result.data.id]));
        }
      } else {
        toast.error('Failed to create API key');
      }
    } catch (error) {
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  // 删除 API Key
  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('API key deleted');
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

  // 切换显示/隐藏
  const toggleVisibility = (keyId: string) => {
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
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="API Key Name (optional)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
            <Button onClick={createApiKey} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" />
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your API Keys</h3>
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No API keys found. Create your first API key to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">
                      {key.name || 'Unnamed API Key'}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {visibleKeys.has(key.id) && key.key
                          ? key.key
                          : 'bsaas_••••••••••••••••••••••••••••••••'
                        }
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVisibility(key.id)}
                      >
                        {visibleKeys.has(key.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      {key.key && visibleKeys.has(key.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(key.key!)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteApiKey(key.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
```

### 第五步：添加到设置页面

```typescript
// 在设置页面中添加 API Keys 选项卡
// src/app/[locale]/dashboard/settings/page.tsx

import { SimpleApiKeyManager } from '@/components/api-keys/simple-api-key-manager';

// 在现有的 tabs 数组中添加
{
  id: 'api-keys',
  label: 'API Keys',
  component: <SimpleApiKeyManager />,
}
```

## 测试 API

### 1. 创建 API Key
访问设置页面，创建一个新的 API Key。

### 2. 测试 API 调用

```bash
# 使用 curl 测试
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: bsaas_your_api_key_here" \
  -d '{"message": "Hello, world!", "model": "gpt-3.5-turbo"}'
```

### 3. 预期响应

```json
{
  "success": true,
  "data": {
    "response": "AI response to: Hello, world!",
    "model": "gpt-3.5-turbo",
    "usage": {
      "credits_used": 5,
      "tokens": 150
    }
  }
}
```

## 常见问题解决

### 1. API Key 验证失败
- 检查 API Key 格式是否正确（应该以 `bsaas_` 开头）
- 确认 API Key 没有过期
- 检查请求头是否正确设置

### 2. 积分扣除问题
- 确认用户有足够的积分余额
- 检查 `trackApiCall` 函数是否正确调用
- 查看积分交易记录确认扣除是否成功

### 3. 数据库迁移问题
- 确认已运行 `drizzle-kit generate` 和 `drizzle-kit migrate`
- 检查数据库连接是否正常
- 查看迁移文件是否正确生成

## 下一步扩展

1. **添加更多 API 端点** - 文件上传、数据查询等
2. **权限系统** - 为不同 API Key 设置不同权限
3. **使用统计** - 添加 API 调用统计和监控
4. **速率限制自定义** - 允许用户自定义速率限制
5. **Webhook 支持** - 添加事件通知功能

## 生产环境注意事项

1. **安全性**
   - 使用 HTTPS
   - 定期轮换 API Keys
   - 监控异常使用模式

2. **性能**
   - 添加缓存层
   - 实施连接池
   - 监控响应时间

3. **监控**
   - 添加日志记录
   - 设置告警机制
   - 定期备份数据

这个快速实施指南可以让你在30分钟内完成基础的API Key功能集成，为项目提供对外API服务能力。
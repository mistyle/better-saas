# Server Actions 改写说明

## 从 API Route 到 Server Action 的改写

### 改写前 (API Route)

```typescript
// src/app/api/upload/avatar/route.ts
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const data = await request.formData();
    const file: File | null = data.get('avatar') as unknown as File;
    
    // ... 处理逻辑
    
    return NextResponse.json({
      success: true,
      url: fileUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '文件上传失败' },
      { status: 500 }
    );
  }
}

// 客户端调用
const response = await fetch('/api/upload/avatar', {
  method: 'POST',
  body: formData,
});
const result = await response.json();
```

### 改写后 (Server Action)

```typescript
// src/lib/actions/upload-avatar.ts
'use server';

export async function uploadAvatarAction(formData: FormData) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error('未授权访问');
    }

    const file = formData.get('avatar') as File;
    
    // ... 处理逻辑
    
    return {
      success: true,
      url: fileUrl,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : '文件上传失败'
    );
  }
}

// 客户端调用
const result = await uploadAvatarAction(formData);
```

## 改写优势

### 1. 代码简洁性
- **API Route**: 需要处理HTTP请求/响应，手动构造JSON响应
- **Server Action**: 直接函数调用，自动序列化返回值

### 2. 类型安全
- **API Route**: 客户端调用时需要手动处理响应类型
- **Server Action**: 完整的端到端类型安全，TypeScript可以推断返回类型

### 3. 错误处理
- **API Route**: 需要手动设置HTTP状态码和错误响应
- **Server Action**: 直接抛出错误，Next.js自动处理

### 4. 性能优化
- **API Route**: 额外的HTTP往返
- **Server Action**: 直接在服务器执行，减少网络延迟

### 5. 安全性
- **API Route**: 需要手动实现CSRF保护
- **Server Action**: 内置CSRF保护和安全机制

## 使用场景建议

### 适合 Server Action 的场景：
- 表单提交
- 文件上传
- 数据变更操作
- 需要服务器端验证的操作

### 仍适合 API Route 的场景：
- 需要被外部系统调用的API
- 需要复杂HTTP头部处理
- 需要流式响应
- 第三方集成webhook

## 迁移检查清单

- [x] 将API Route函数改为Server Action
- [x] 添加 'use server' 指令
- [x] 更新客户端调用方式
- [x] 简化错误处理逻辑
- [x] 删除原API Route文件
- [x] 测试功能正常性 
# Zustand 认证状态管理使用指南

本项目使用 Zustand 和 persist 插件来管理用户认证状态，提供了完整的登录、注册、社交登录和状态持久化功能。

## 🚀 功能特性

- ✅ 邮箱密码登录/注册
- ✅ GitHub/Google 社交登录
- ✅ 状态持久化（localStorage）
- ✅ 自动初始化认证状态
- ✅ TypeScript 类型安全
- ✅ 错误处理和加载状态
- ✅ 中文错误提示

## 📁 文件结构

```
src/
├── store/
│   └── auth-store.ts                 # 主要的认证状态管理
├── components/
│   ├── providers/
│   │   └── auth-provider.tsx         # 认证提供者组件
│   └── auth/
│       ├── login-form.tsx            # 登录表单示例
│       └── user-info.tsx             # 用户信息显示示例
└── lib/
    └── auth/
        ├── auth.ts                   # 服务端认证配置
        └── auth-client.ts            # 客户端认证配置
```

## 🛠️ 安装和配置

### 1. 依赖已安装
项目已包含所需依赖：
- `zustand` - 状态管理
- `better-auth` - 认证库

### 2. 在根布局中添加认证提供者

```tsx
// src/app/layout.tsx 或 src/app/[locale]/layout.tsx
import { AuthProvider } from '@/components/providers/auth-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## 📚 使用方法

### 1. 基础 Hooks

```tsx
import { 
  useUser, 
  useIsAuthenticated, 
  useAuthLoading, 
  useAuthInitialized,
  useAuth 
} from '@/store/auth-store';

function MyComponent() {
  const user = useUser();                    // 当前用户信息
  const isAuthenticated = useIsAuthenticated(); // 是否已登录
  const isLoading = useAuthLoading();        // 加载状态
  const isInitialized = useAuthInitialized(); // 是否已初始化
  const auth = useAuth();                    // 认证操作方法

  return (
    <div>
      {isAuthenticated ? (
        <p>欢迎, {user?.name}!</p>
      ) : (
        <p>请先登录</p>
      )}
    </div>
  );
}
```

### 2. 登录功能

```tsx
import { useAuth } from '@/store/auth-store';

function LoginComponent() {
  const { signIn, signInWithGithub, signInWithGoogle } = useAuth();

  const handleLogin = async () => {
    const result = await signIn('user@example.com', 'password');
    
    if (result.success) {
      console.log('登录成功');
    } else {
      console.error('登录失败:', result.error);
    }
  };

  const handleGithubLogin = async () => {
    await signInWithGithub(); // 会重定向到 GitHub
  };

  const handleGoogleLogin = async () => {
    await signInWithGoogle(); // 会重定向到 Google
  };

  return (
    <div>
      <button onClick={handleLogin}>邮箱登录</button>
      <button onClick={handleGithubLogin}>GitHub 登录</button>
      <button onClick={handleGoogleLogin}>Google 登录</button>
    </div>
  );
}
```

### 3. 注册功能

```tsx
import { useAuth } from '@/store/auth-store';

function RegisterComponent() {
  const { signUp } = useAuth();

  const handleRegister = async () => {
    const result = await signUp(
      'user@example.com', 
      'password', 
      'User Name' // 可选
    );
    
    if (result.success) {
      console.log('注册成功');
    } else {
      console.error('注册失败:', result.error);
    }
  };

  return (
    <button onClick={handleRegister}>注册</button>
  );
}
```

### 4. 退出登录

```tsx
import { useAuth } from '@/store/auth-store';

function LogoutComponent() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    console.log('已退出登录');
  };

  return (
    <button onClick={handleLogout}>退出登录</button>
  );
}
```

### 5. 条件渲染

```tsx
import { useIsAuthenticated, useAuthInitialized } from '@/store/auth-store';

function ConditionalComponent() {
  const isAuthenticated = useIsAuthenticated();
  const isInitialized = useAuthInitialized();

  if (!isInitialized) {
    return <div>初始化中...</div>;
  }

  return (
    <div>
      {isAuthenticated ? (
        <AuthenticatedContent />
      ) : (
        <UnauthenticatedContent />
      )}
    </div>
  );
}
```

## 🔧 高级配置

### 1. 自定义持久化配置

```tsx
// 在 auth-store.ts 中修改 persist 配置
{
  name: 'auth-storage',
  partialize: (state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    // 添加其他需要持久化的状态
  }),
  version: 1,
  // 添加状态迁移逻辑
  migrate: (persistedState, version) => {
    if (version < 1) {
      // 处理版本升级
    }
    return persistedState;
  },
}
```

### 2. 手动初始化

```tsx
import { useAuth } from '@/store/auth-store';

function ManualInitComponent() {
  const { initialize } = useAuth();

  const handleManualInit = async () => {
    await initialize();
  };

  return (
    <button onClick={handleManualInit}>手动初始化</button>
  );
}
```

### 3. 清除认证状态

```tsx
import { useAuth } from '@/store/auth-store';

function ClearAuthComponent() {
  const { clearAuth } = useAuth();

  const handleClearAuth = () => {
    clearAuth(); // 清除内存中的状态，但保留持久化数据
  };

  return (
    <button onClick={handleClearAuth}>清除认证状态</button>
  );
}
```

## 🎨 完整示例

查看以下示例组件：
- `src/components/auth/login-form.tsx` - 完整的登录表单
- `src/components/auth/user-info.tsx` - 用户信息显示

## 🔒 安全注意事项

1. **敏感信息**: 只在客户端存储必要的用户信息，避免存储敏感数据
2. **令牌管理**: 认证令牌由 better-auth 自动管理
3. **HTTPS**: 生产环境必须使用 HTTPS
4. **环境变量**: 确保正确配置所有必要的环境变量

## 🐛 故障排除

### 1. 状态未持久化
- 检查浏览器是否支持 localStorage
- 确认 persist 配置正确

### 2. 初始化失败
- 检查网络连接
- 确认 better-auth 配置正确
- 查看浏览器控制台错误

### 3. 社交登录失败
- 检查 OAuth 配置
- 确认回调 URL 正确
- 验证客户端 ID 和密钥

## 📝 类型定义

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  
  signInWithGithub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  
  initialize: () => Promise<void>;
  clearAuth: () => void;
}
```

## 🤝 贡献

如果你发现任何问题或有改进建议，请创建 Issue 或提交 Pull Request。 
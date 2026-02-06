# 管理员权限设置指南

本项目实现了基于角色的权限控制系统，区分管理员和普通用户的访问权限。

## 权限区别

### 管理员用户
- ✅ 可以访问 Dashboard（仪表板）
  - 用户管理
  - 通知管理  
  - 文件管理
  - 文章管理
- ✅ 可以访问 Settings（设置）
  - 个人资料
  - 账单管理
  - 安全设置

### 普通用户
- ❌ 无法访问 Dashboard
- ✅ 可以访问 Settings（设置）
  - 个人资料
  - 账单管理
  - 安全设置

## 管理员配置

### 1. 环境变量配置

在 `.env.local` 文件中添加管理员邮箱列表：

```bash
# 管理员邮箱列表（用逗号分隔）
ADMIN_EMAILS="admin@example.com,admin2@example.com,manager@company.com"
```

### 2. 设置管理员

有两种方式设置管理员：

#### 方式一：使用脚本设置（推荐）

1. 确保用户已经注册账户
2. 在 `ADMIN_EMAILS` 环境变量中添加该用户的邮箱
3. 运行设置脚本：

```bash
# 设置单个管理员
pnpm admin:setup admin@example.com
```

#### 方式二：直接修改数据库

如果你有数据库访问权限，可以直接修改：

```sql
UPDATE "user" 
SET role = 'admin', updated_at = NOW() 
WHERE email = 'admin@example.com';
```

### 3. 验证管理员权限

管理员设置成功后：

1. 登录该用户账户
2. 查看侧边栏是否显示 Dashboard 菜单
3. 尝试访问 `/dashboard/users` 等管理员页面

## 安全注意事项

1. **环境变量安全**：
   - 不要将 `.env.local` 文件提交到版本控制
   - 生产环境中确保环境变量安全配置

2. **权限检查**：
   - 客户端权限检查仅用于 UI 显示控制
   - 服务端会进行真正的权限验证
   - 所有 Dashboard 页面都有 `AdminGuard` 保护

3. **管理员管理**：
   - 建议至少设置 2 个管理员账户
   - 定期审查管理员列表
   - 离职人员及时移除管理员权限

## 故障排除

### 问题：用户无法看到 Dashboard 菜单

1. 检查用户邮箱是否在 `ADMIN_EMAILS` 中
2. 检查数据库中用户的 `role` 字段是否为 `'admin'`
3. 尝试重新登录或刷新页面

### 问题：访问 Dashboard 页面显示权限错误

1. 确认用户已经是管理员
2. 检查 `AdminGuard` 组件是否正常工作
3. 查看浏览器控制台是否有错误信息

### 问题：设置脚本运行失败

1. 确保数据库连接正常
2. 确认用户已经注册
3. 检查邮箱是否在 `ADMIN_EMAILS` 配置中

## 开发说明

### 权限检查函数

```typescript
import { isAdmin, hasPermission, PERMISSIONS } from '@/lib/auth/permissions';

// 检查是否为管理员
const userIsAdmin = isAdmin(user);

// 检查特定权限
const canViewDashboard = hasPermission(user, PERMISSIONS.DASHBOARD_VIEW);
```

### 权限保护组件

```tsx
import { AdminGuard } from '@/components/admin-guard';

// 保护管理员页面
export default function AdminPage() {
  return (
    <AdminGuard>
      <div>管理员专用内容</div>
    </AdminGuard>
  );
}
```

### 权限 Hooks

```tsx
import { useIsAdmin, useHasPermission } from '@/store/auth-store';

function MyComponent() {
  const isAdmin = useIsAdmin();
  const hasPermission = useHasPermission();
  
  return (
    <div>
      {isAdmin && <AdminPanel />}
      {hasPermission(PERMISSIONS.DASHBOARD_VIEW) && <DashboardLink />}
    </div>
  );
}
``` 
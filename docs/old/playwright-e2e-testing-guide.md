# Playwright E2E 测试完整指南

## 目录
1. [什么是 Playwright](#什么是-playwright)
2. [项目中的 Playwright 配置](#项目中的-playwright-配置)
3. [测试结构和组织](#测试结构和组织)
4. [测试环境设置](#测试环境设置)
5. [详细测试用例解析](#详细测试用例解析)
6. [常用 API 和最佳实践](#常用-api-和最佳实践)
7. [运行和调试测试](#运行和调试测试)
8. [进阶技巧](#进阶技巧)
9. [常见问题解答](#常见问题解答)

## 什么是 Playwright

Playwright 是微软开发的现代化端到端(E2E)测试框架，支持多种浏览器(Chrome、Firefox、Safari)和多种设备(桌面、移动端)。它能够自动化真实的用户交互，确保应用在实际使用场景中的正确性。

### 主要特性
- **跨浏览器测试**: 支持 Chromium、Firefox、WebKit
- **移动端测试**: 支持移动设备模拟
- **自动等待**: 智能等待元素可见、可点击等
- **网络拦截**: 可以模拟 API 响应
- **截图和视频**: 自动记录测试过程
- **并行执行**: 提高测试效率

## 项目中的 Playwright 配置

### 配置文件解析 (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // 测试文件目录
  testDir: './tests/e2e',
  
  // 并行运行测试文件
  fullyParallel: true,
  
  // CI 环境禁止 test.only
  forbidOnly: !!process.env.CI,
  
  // CI 环境重试机制
  retries: process.env.CI ? 2 : 0,
  
  // CI 环境使用单线程
  workers: process.env.CI ? 1 : undefined,
  
  // 测试报告配置
  reporter: [
    ['html'],                                    // HTML 报告
    ['json', { outputFile: 'test-results/results.json' }],  // JSON 报告
    ['junit', { outputFile: 'test-results/results.xml' }],  // JUnit 报告
  ],
  
  // 全局测试配置
  use: {
    baseURL: 'http://localhost:3000',           // 应用基础URL
    trace: 'on-first-retry',                    // 失败重试时记录trace
    screenshot: 'only-on-failure',              // 失败时截图
    video: 'retain-on-failure',                 // 失败时保留视频
  },
  
  // 多浏览器项目配置
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  
  // 自动启动开发服务器
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

### Package.json 脚本配置

```json
{
  "scripts": {
    "test:e2e": "playwright test",                    // 运行所有E2E测试
    "test:e2e:ui": "playwright test --ui",            // 使用UI模式运行
    "test:e2e:headed": "playwright test --headed",    // 显示浏览器窗口
    "test:security": "playwright test tests/security", // 安全测试
    "test:performance": "playwright test tests/performance", // 性能测试
    "test:all": "pnpm test && pnpm test:e2e && pnpm test:security" // 全部测试
  }
}
```

## 测试结构和组织

### 目录结构
```
tests/
├── e2e/                    # E2E测试目录
│   ├── auth/              # 认证相关测试
│   │   └── login.spec.ts
│   ├── dashboard/         # 仪表板测试
│   │   ├── navigation.spec.ts
│   │   └── file-management.spec.ts
│   ├── admin/             # 管理员功能测试
│   │   └── user-management.spec.ts
│   └── payment/           # 支付功能测试
├── fixtures/              # 测试数据
│   ├── users.json
│   └── files.json
└── utils/                 # 测试工具
    ├── mock-setup.ts
    └── mock-factories.ts
```

## 测试环境设置

### 认证状态管理

在 Playwright 中，可以通过 `storageState` 模拟用户登录状态：

```typescript
// 普通用户登录状态
test.use({
  storageState: {
    cookies: [
      {
        name: 'auth-token',
        value: 'mock-auth-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  },
});

// 管理员用户登录状态
test.use({
  storageState: {
    cookies: [
      {
        name: 'auth-token',
        value: 'mock-admin-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  },
});
```

### API Mock 设置

```typescript
test.beforeEach(async ({ page }) => {
  // 模拟用户会话 API
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
      }),
    });
  });
});
```

## 详细测试用例解析

### 1. 用户登录测试 (`tests/e2e/auth/login.spec.ts`)

#### 基础表单验证测试

```typescript
test('should display required field validation errors', async ({ page }) => {
  // 导航到登录页面
  await page.goto('/auth/sign-in');
  
  // 不填写任何字段直接提交
  await page.click('button[type="submit"]');

  // 验证错误消息显示
  await expect(page.locator('text=Email is required')).toBeVisible();
  await expect(page.locator('text=Password is required')).toBeVisible();
});
```

**解析要点：**
- `page.goto()`: 导航到指定页面
- `page.click()`: 点击元素
- `expect().toBeVisible()`: 断言元素可见
- `page.locator()`: 定位元素，支持文本、CSS选择器、XPath等

#### 网络请求模拟测试

```typescript
test('should handle login failure', async ({ page }) => {
  // 模拟登录失败的API响应
  await page.route('**/api/auth/sign-in', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Invalid email or password' }),
    });
  });

  // 填写登录表单
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');

  // 验证错误消息
  await expect(page.locator('text=Invalid email or password')).toBeVisible();
});
```

**解析要点：**
- `page.route()`: 拦截网络请求
- `route.fulfill()`: 模拟响应
- `page.fill()`: 填写表单字段
- 通过模拟不同的API响应来测试各种场景

#### 键盘导航测试

```typescript
test('should support keyboard navigation', async ({ page }) => {
  await page.goto('/auth/sign-in');
  
  // 使用Tab键导航
  await page.keyboard.press('Tab');
  await expect(page.locator('input[type="email"]')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('input[type="password"]')).toBeFocused();

  // 使用Enter键提交表单
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.locator('input[type="password"]').press('Enter');

  // 验证表单提交
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
});
```

**解析要点：**
- `page.keyboard.press()`: 模拟键盘按键
- `toBeFocused()`: 断言元素获得焦点
- `toBeDisabled()`: 断言元素被禁用
- 测试可访问性和键盘导航

### 2. 仪表板导航测试 (`tests/e2e/dashboard/navigation.spec.ts`)

#### 移动端响应式测试

```typescript
test('应该支持移动端导航', async ({ page }) => {
  // 设置移动端视口
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('/dashboard');

  // 检查移动端菜单按钮
  const menuButton = page.locator('[data-testid="mobile-menu-button"]');
  await expect(menuButton).toBeVisible();

  // 点击菜单按钮
  await menuButton.click();

  // 检查移动端菜单
  const mobileMenu = page.locator('[data-testid="mobile-menu"]');
  await expect(mobileMenu).toBeVisible();
});
```

**解析要点：**
- `page.setViewportSize()`: 设置视口大小
- `[data-testid="..."]`: 使用测试专用的数据属性定位元素
- 测试响应式设计和移动端体验

#### 主题切换测试

```typescript
test('应该支持主题切换', async ({ page }) => {
  await page.goto('/dashboard');
  
  // 检查主题切换按钮
  const themeToggle = page.locator('[data-testid="theme-toggle"]');
  await expect(themeToggle).toBeVisible();

  // 切换到暗色主题
  await themeToggle.click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  // 切换回亮色主题
  await themeToggle.click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});
```

**解析要点：**
- `toHaveClass()`: 断言元素包含特定CSS类
- `not.toHaveClass()`: 断言元素不包含特定CSS类
- 测试UI状态变化

### 3. 文件管理测试 (`tests/e2e/dashboard/file-management.spec.ts`)

#### 文件上传测试

```typescript
test('应该支持文件上传', async ({ page }) => {
  // 模拟文件上传API
  await page.route('**/api/files/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        file: {
          id: 'file-3',
          filename: 'new-file.txt',
          originalName: 'test-file.txt',
          mimeType: 'text/plain',
          size: 1024,
          createdAt: new Date().toISOString(),
        },
      }),
    });
  });

  await page.goto('/dashboard/files');

  // 点击上传按钮
  await page.click('[data-testid="upload-button"]');

  // 检查上传模态框
  const uploadModal = page.locator('[data-testid="upload-modal"]');
  await expect(uploadModal).toBeVisible();

  // 检查文件输入框
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeVisible();

  // 点击上传提交按钮
  await page.click('[data-testid="upload-submit"]');

  // 检查成功消息
  await expect(page.locator('text=文件上传成功')).toBeVisible();
});
```

**解析要点：**
- 文件上传需要模拟API响应
- 使用模态框和表单交互
- 验证成功状态和用户反馈

#### 拖拽上传测试

```typescript
test('应该支持拖拽上传', async ({ page }) => {
  await page.goto('/dashboard/files');
  
  // 检查拖拽区域
  const dropZone = page.locator('[data-testid="drop-zone"]');
  await expect(dropZone).toBeVisible();

  // 模拟拖拽事件
  await dropZone.dispatchEvent('dragover', {
    dataTransfer: {
      files: [
        {
          name: 'dragged-file.jpg',
          type: 'image/jpeg',
          size: 1024000,
        },
      ],
    },
  });

  // 检查拖拽状态
  await expect(dropZone).toHaveClass(/drag-over/);

  // 模拟放置事件
  await dropZone.dispatchEvent('drop', {
    dataTransfer: {
      files: [
        {
          name: 'dragged-file.jpg',
          type: 'image/jpeg',
          size: 1024000,
        },
      ],
    },
  });

  // 检查上传开始
  await expect(page.locator('text=正在上传...')).toBeVisible();
});
```

**解析要点：**
- `dispatchEvent()`: 触发自定义事件
- 测试拖拽交互
- 验证UI状态变化

#### 文件下载测试

```typescript
test('应该支持文件下载', async ({ page }) => {
  // 模拟下载API
  await page.route('**/api/files/file-1/download', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="document.pdf"',
      },
      body: 'PDF content',
    });
  });

  await page.goto('/dashboard/files');

  // 点击下载按钮
  await page.click('[data-testid="download-file-1"]');

  // 等待下载开始
  const downloadPromise = page.waitForEvent('download');
  const download = await downloadPromise;

  // 检查下载文件名
  expect(download.suggestedFilename()).toBe('document.pdf');
});
```

**解析要点：**
- `page.waitForEvent('download')`: 等待下载事件
- 测试文件下载功能
- 验证下载文件属性

### 4. 管理员用户管理测试 (`tests/e2e/admin/user-management.spec.ts`)

#### 用户封禁测试

```typescript
test('应该支持封禁用户', async ({ page }) => {
  // 模拟封禁API
  await page.route('**/api/admin/users/user-1/ban', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.goto('/admin/users');

  // 点击封禁按钮
  await page.click('[data-testid="ban-user-1"]');

  // 检查封禁对话框
  const banDialog = page.locator('[data-testid="ban-dialog"]');
  await expect(banDialog).toBeVisible();

  // 填写封禁原因
  await page.fill('[data-testid="ban-reason"]', '违反社区规定');

  // 设置封禁期限
  await page.selectOption('[data-testid="ban-duration"]', '7');

  // 确认封禁
  await page.click('[data-testid="confirm-ban"]');

  // 检查成功消息
  await expect(page.locator('text=用户封禁成功')).toBeVisible();

  // 检查用户状态更新
  await expect(page.locator('[data-testid="user-status-user-1"]')).toContainText('已封禁');
});
```

**解析要点：**
- `page.selectOption()`: 选择下拉选项
- `toContainText()`: 断言元素包含特定文本
- 测试复杂的管理员操作流程

#### 危险操作确认测试

```typescript
test('应该支持删除用户', async ({ page }) => {
  // 模拟删除API
  await page.route('**/api/admin/users/user-1', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });

  await page.goto('/admin/users');

  // 点击删除按钮
  await page.click('[data-testid="delete-user-1"]');

  // 检查危险操作确认对话框
  const dangerDialog = page.locator('[data-testid="danger-dialog"]');
  await expect(dangerDialog).toBeVisible();
  await expect(dangerDialog.locator('text=此操作不可撤销')).toBeVisible();

  // 输入确认文本
  await page.fill('[data-testid="confirm-text"]', 'DELETE');

  // 确认删除
  await page.click('[data-testid="confirm-delete"]');

  // 检查成功消息
  await expect(page.locator('text=用户删除成功')).toBeVisible();

  // 检查用户从列表中移除
  await expect(page.locator('text=user1@example.com')).not.toBeVisible();
});
```

**解析要点：**
- 检查HTTP方法：`route.request().method()`
- 测试危险操作的确认流程
- 验证数据从界面中移除

## 常用 API 和最佳实践

### 元素定位策略

```typescript
// 1. 使用 data-testid (推荐)
page.locator('[data-testid="submit-button"]')

// 2. 使用文本内容
page.locator('text=登录')

// 3. 使用 CSS 选择器
page.locator('button.primary')

// 4. 使用角色定位
page.locator('role=button[name="登录"]')

// 5. 使用 XPath
page.locator('//button[@type="submit"]')
```

### 等待策略

```typescript
// 等待元素可见
await expect(page.locator('#element')).toBeVisible();

// 等待元素可点击
await expect(page.locator('button')).toBeEnabled();

// 等待网络请求
await page.waitForResponse('**/api/users');

// 等待页面加载
await page.waitForLoadState('networkidle');

// 等待URL变化
await page.waitForURL('**/dashboard');
```

### 断言方法

```typescript
// 元素状态断言
await expect(element).toBeVisible();
await expect(element).toBeHidden();
await expect(element).toBeEnabled();
await expect(element).toBeDisabled();
await expect(element).toBeFocused();
await expect(element).toBeChecked();

// 文本内容断言
await expect(element).toHaveText('Expected text');
await expect(element).toContainText('Partial text');

// 属性断言
await expect(element).toHaveAttribute('href', '/dashboard');
await expect(element).toHaveClass('active');

// 数量断言
await expect(page.locator('.item')).toHaveCount(5);
```

### 表单交互

```typescript
// 填写输入框
await page.fill('input[name="email"]', 'test@example.com');

// 选择下拉选项
await page.selectOption('select[name="country"]', 'China');

// 选择复选框
await page.check('input[type="checkbox"]');

// 选择单选按钮
await page.check('input[value="male"]');

// 上传文件
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf');
```

## 运行和调试测试

### 基本运行命令

```bash
# 运行所有 E2E 测试
pnpm test:e2e

# 运行特定测试文件
pnpm test:e2e tests/e2e/auth/login.spec.ts

# 运行特定测试用例
pnpm test:e2e -g "should display login form"

# 使用 UI 模式运行
pnpm test:e2e:ui

# 显示浏览器窗口运行
pnpm test:e2e:headed

# 运行特定浏览器
pnpm test:e2e --project=chromium
```

### 调试技巧

```typescript
// 1. 添加调试断点
await page.pause();

// 2. 截图调试
await page.screenshot({ path: 'debug.png' });

// 3. 打印页面内容
console.log(await page.content());

// 4. 打印元素信息
console.log(await page.locator('button').textContent());

// 5. 等待用户交互
await page.pause();
```

### 测试报告

运行测试后，Playwright 会生成详细的测试报告：

```bash
# 查看 HTML 报告
npx playwright show-report

# 查看 trace 文件
npx playwright show-trace test-results/trace.zip
```

## 进阶技巧

### 1. 页面对象模式 (Page Object Model)

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/sign-in');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async getErrorMessage() {
    return await this.page.locator('.error-message').textContent();
  }
}

// 在测试中使用
test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password123');
  
  await expect(page).toHaveURL('/dashboard');
});
```

### 2. 测试数据管理

```typescript
// fixtures/test-data.ts
export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'password123',
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'admin123',
  },
};

// 在测试中使用
import { testUsers } from '../fixtures/test-data';

test('should login with valid user', async ({ page }) => {
  await page.goto('/auth/sign-in');
  await page.fill('input[type="email"]', testUsers.validUser.email);
  await page.fill('input[type="password"]', testUsers.validUser.password);
  await page.click('button[type="submit"]');
});
```

### 3. 自定义断言

```typescript
// utils/custom-assertions.ts
export async function expectToastMessage(page: Page, message: string) {
  await expect(page.locator('.toast')).toContainText(message);
  await expect(page.locator('.toast')).toBeVisible();
}

// 在测试中使用
import { expectToastMessage } from '../utils/custom-assertions';

test('should show success message', async ({ page }) => {
  // ... 执行操作
  await expectToastMessage(page, '操作成功');
});
```

### 4. 并行测试和测试隔离

```typescript
// 使用测试钩子确保测试隔离
test.beforeEach(async ({ page }) => {
  // 清理本地存储
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // 清理 cookies
  await page.context().clearCookies();
});

// 使用 test.describe.parallel 并行运行
test.describe.parallel('Parallel Tests', () => {
  test('test 1', async ({ page }) => {
    // 测试逻辑
  });
  
  test('test 2', async ({ page }) => {
    // 测试逻辑
  });
});
```

### 5. 视觉回归测试

```typescript
test('should match visual snapshot', async ({ page }) => {
  await page.goto('/dashboard');
  
  // 等待页面稳定
  await page.waitForLoadState('networkidle');
  
  // 视觉对比
  await expect(page).toHaveScreenshot('dashboard.png');
});
```

## 总结

Playwright 提供了强大的 E2E 测试能力，通过本指南中的配置和实例，你可以：

1. **理解项目结构**: 知道测试文件如何组织和配置
2. **掌握基本 API**: 学会元素定位、交互和断言
3. **模拟复杂场景**: 处理认证、文件上传、API 模拟等
4. **调试和优化**: 使用各种调试工具和最佳实践
5. **扩展测试能力**: 应用页面对象模式、自定义断言等进阶技巧

记住，好的 E2E 测试应该：
- 覆盖关键用户流程
- 具有良好的可读性和维护性
- 运行稳定且快速
- 提供清晰的错误信息

通过持续实践和改进，你将能够构建出高质量的 E2E 测试套件，确保应用的稳定性和用户体验。 

## 常见问题解答

### 1. 多浏览器测试配置

#### 问题：配置了多浏览器，Playwright 就能实现多浏览器测试了吗？还需要安装相应的浏览器吗？

**答案：** 需要安装浏览器！仅仅在配置文件中声明是不够的。

#### 浏览器安装

```bash
# 安装所有浏览器
npx playwright install

# 安装特定浏览器
npx playwright install chromium firefox webkit

# 安装浏览器及系统依赖
npx playwright install --with-deps

# 查看已安装的浏览器
npx playwright install --list
```

#### 只使用 Chrome 浏览器的配置

如果你只想使用 Chrome 浏览器进行测试，可以修改 `playwright.config.ts`：

```typescript
export default defineConfig({
  // ... other config
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 注释掉其他浏览器
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],
});
```

或者运行时指定浏览器：

```bash
# 只运行 Chrome 浏览器测试
pnpm test:e2e --project=chromium
```

### 2. 测试账号配置

#### 方法一：使用环境变量

在 `.env.test` 文件中配置测试账号：

```env
# .env.test
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=adminpassword123
```

在测试中使用：

```typescript
// tests/utils/test-accounts.ts
export const testAccounts = {
  regularUser: {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword123',
  },
  adminUser: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'adminpassword123',
  },
};

// 在测试中使用
import { testAccounts } from '../utils/test-accounts';

test('should login with test account', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', testAccounts.regularUser.email);
  await page.fill('input[type="password"]', testAccounts.regularUser.password);
  await page.click('button[type="submit"]');
});
```

#### 方法二：使用 Playwright 的 Storage State

```typescript
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import { testAccounts } from './utils/test-accounts';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 登录
  await page.goto('/login');
  await page.fill('input[type="email"]', testAccounts.regularUser.email);
  await page.fill('input[type="password"]', testAccounts.regularUser.password);
  await page.click('button[type="submit"]');
  
  // 等待登录成功
  await page.waitForURL('/dashboard');
  
  // 保存认证状态
  await page.context().storageState({ path: authFile });
});

// 在测试中使用
test.use({ storageState: authFile });
```

#### 方法三：Mock 认证状态（推荐用于 E2E 测试）

```typescript
test.beforeEach(async ({ page }) => {
  // Mock 认证 API
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'test-user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
        session: {
          id: 'test-session-1',
          token: 'test-token',
        },
      }),
    });
  });
  
  // 设置认证 Cookie
  await page.context().addCookies([
    {
      name: 'auth-token',
      value: 'test-auth-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
});
```

### 3. UI 模式运行

#### 问题：使用 UI 模式运行 Playwright，是不是就变成手动模式了？

**答案：** 不是！UI 模式仍然是自动化测试，只是提供了可视化界面。

#### UI 模式的特点

```bash
# 启动 UI 模式
pnpm test:e2e:ui
```

**UI 模式的优势：**

1. **可视化测试执行**: 看到测试在真实浏览器中运行
2. **调试友好**: 可以暂停、单步执行、查看元素
3. **测试选择**: 可以选择运行特定的测试用例
4. **实时反馈**: 立即看到测试结果和错误

**UI 模式 vs 手动测试：**

| 特性 | UI 模式 | 手动测试 |
|------|---------|----------|
| 执行方式 | 自动化脚本 | 人工操作 |
| 可重复性 | 完全一致 | 可能有差异 |
| 速度 | 快速 | 较慢 |
| 覆盖率 | 全面 | 可能遗漏 |
| 调试能力 | 强 | 有限 |

#### UI 模式的使用场景

```typescript
// 在 UI 模式中调试测试
test('debug test in UI mode', async ({ page }) => {
  await page.goto('/login');
  
  // 在 UI 模式中可以看到这个暂停
  await page.pause();
  
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // 可以实时看到页面变化
  await expect(page).toHaveURL('/dashboard');
});
```

### 4. 测试路由和错误修复

基于项目的实际路由结构，以下是需要修复的主要问题：

#### 登录页面路由修复

```typescript
// 错误的路由
await page.goto('/auth/sign-in');

// 正确的路由（基于项目结构）
await page.goto('/login');
```

#### API 路由修复

```typescript
// 错误的 API 路由
await page.route('**/api/auth/sign-in', async (route) => {
  // ...
});

// 正确的 API 路由（基于 better-auth）
await page.route('**/api/auth/sign-in/email', async (route) => {
  // ...
});
```

#### 社交登录路由修复

```typescript
// 错误的社交登录路由
await page.route('**/api/auth/github', async (route) => {
  // ...
});

// 正确的社交登录路由
await page.route('**/api/auth/sign-in/github', async (route) => {
  // ...
});
```

### 5. 测试最佳实践建议

#### 测试数据隔离

```typescript
// 每个测试都应该有独立的数据
test.beforeEach(async ({ page }) => {
  // 清理状态
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // 清理 cookies
  await page.context().clearCookies();
});
```

#### 等待策略

```typescript
// 好的做法：等待特定状态
await page.waitForLoadState('networkidle');
await expect(page.locator('[data-testid="content"]')).toBeVisible();

// 避免：固定时间等待
// await page.waitForTimeout(3000); // 不推荐
```

#### 元素定位

```typescript
// 推荐：使用 data-testid
await page.click('[data-testid="submit-button"]');

// 可以：使用语义化定位
await page.click('role=button[name="Submit"]');

// 避免：依赖样式类
// await page.click('.btn-primary'); // 不推荐
```

### 6. 调试技巧

#### 调试命令

```bash
# 显示浏览器窗口运行
pnpm test:e2e:headed

# 使用调试模式
pnpm test:e2e --debug

# 运行特定测试并暂停
pnpm test:e2e --grep "should login" --headed --debug
```

#### 调试代码

```typescript
// 截图调试
await page.screenshot({ path: 'debug-screenshot.png' });

// 打印页面内容
console.log(await page.content());

// 打印元素信息
const element = page.locator('[data-testid="error-message"]');
console.log(await element.textContent());
console.log(await element.isVisible());

// 等待调试
await page.pause();
```

记住，E2E 测试的目标是模拟真实用户行为，确保应用在实际使用场景中的正确性。通过合理的配置和最佳实践，你可以构建出稳定、可靠的测试套件。 
# 日志系统完整指南

## 概述

本项目使用基于 Pino 的结构化日志系统，提供高性能、可扩展的日志记录功能。所有原有的 `console` 语句已被替换为结构化日志记录。

## 核心组件

### 1. 基础日志器 (`src/lib/logger/logger.ts`)

```typescript
import { createLogger } from '@/lib/logger/logger';

const logger = createLogger();
logger.info('基础信息日志');
logger.error('错误信息');
logger.warn('警告信息');
logger.debug('调试信息');
```

### 2. 子日志器

```typescript
import { createChildLogger } from '@/lib/logger/logger';

const childLogger = createChildLogger('module-name');
childLogger.info({ userId: '123' }, '用户操作');
```

### 3. 专用日志器 (`src/lib/logger/logger-utils.ts`)

#### ErrorLogger - 错误日志记录器
```typescript
import { ErrorLogger } from '@/lib/logger/logger-utils';

const errorLogger = new ErrorLogger('module-name');

try {
  // 业务逻辑
} catch (error) {
  errorLogger.logError(error as Error, {
    operation: 'specific-operation',
    userId: '123',
    additionalContext: 'value'
  });
}
```

#### PerformanceLogger - 性能日志记录器
```typescript
import { PerformanceLogger } from '@/lib/logger/logger-utils';

const perfLogger = new PerformanceLogger('api-endpoint');

const stopTimer = perfLogger.startTimer('database-query');
// 执行数据库查询
stopTimer();
```

#### logUtils - 通用日志工具
```typescript
import { logUtils } from '@/lib/logger/logger-utils';

// 安全事件日志
logUtils.logSecurityEvent('Invalid login attempt', 'high', {
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});

// 业务事件日志
logUtils.logBusinessEvent('user-signup', 'success', {
  userId: '123',
  plan: 'premium'
});

// 系统事件日志
logUtils.logSystemEvent('database-connection', 'connected', {
  host: 'localhost',
  database: 'app_db'
});
```

## 项目中的实际应用

### 1. 服务器操作层

#### 文件操作 (`src/server/actions/file-actions.ts`)
```typescript
const fileErrorLogger = new ErrorLogger('file-actions');

export async function uploadFileAction(formData: FormData) {
  try {
    // 文件上传逻辑
  } catch (error) {
    fileErrorLogger.logError(error as Error, {
      operation: 'uploadFile',
      fileName: file.name,
      fileSize: file.size,
      userId: session.user.id,
    });
    throw error;
  }
}
```

#### 支付操作 (`src/server/actions/payment/`)
```typescript
const paymentErrorLogger = new ErrorLogger('payment');

export async function createCheckoutSession(data: CheckoutSessionData) {
  try {
    // 支付会话创建逻辑
  } catch (error) {
    paymentErrorLogger.logError(error as Error, {
      operation: 'createCheckoutSession',
      priceId: data.priceId,
      userId: session.user.id,
    });
    throw error;
  }
}
```

### 2. API 路由层

#### Stripe Webhook (`src/app/api/webhooks/stripe/route.ts`)
```typescript
const webhookErrorLogger = new ErrorLogger('stripe-webhook');
const webhookLogger = createChildLogger('stripe-webhook');

export async function POST(request: NextRequest) {
  try {
    // Webhook 处理逻辑
    webhookLogger.info({
      eventId: event.id,
      eventType: event.type,
      status: 'processing',
    }, `Processing Stripe event: ${event.type}`);
    
  } catch (error) {
    webhookErrorLogger.logError(error as Error, {
      operation: 'webhook_handler',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    throw error;
  }
}
```

### 3. 组件层

#### 认证相关 (`src/store/auth-store.ts`)
```typescript
const authErrorLogger = new ErrorLogger('auth-store');

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      signIn: async (email: string, password: string) => {
        try {
          // 登录逻辑
        } catch (error) {
          authErrorLogger.logError(error as Error, {
            operation: 'signIn',
            email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // 脱敏处理
          });
          throw error;
        }
      },
    })
  )
);
```

#### 用户界面组件
```typescript
const billingErrorLogger = new ErrorLogger('billing-page');

export function BillingPage() {
  const loadBillingInfo = useCallback(async () => {
    try {
      // 账单信息加载逻辑
    } catch (err) {
      billingErrorLogger.logError(err as Error, {
        operation: 'loadBillingInfo',
      });
      setError('获取账单信息失败');
    }
  }, []);
}
```

## 日志级别和环境配置

### 开发环境
- 输出到控制台，带有彩色格式化
- 包含所有日志级别（debug, info, warn, error）
- 显示详细的错误堆栈信息

### 生产环境
- 输出 JSON 格式，便于日志收集系统处理
- 只输出 info 级别及以上的日志
- 优化性能，减少不必要的日志输出

## 最佳实践

### 1. 错误处理
```typescript
// ✅ 好的做法
try {
  await riskyOperation();
} catch (error) {
  errorLogger.logError(error as Error, {
    operation: 'riskyOperation',
    userId: user.id,
    additionalContext: 'relevant-data'
  });
  // 继续处理错误或重新抛出
}

// ❌ 避免的做法
try {
  await riskyOperation();
} catch (error) {
  console.error('Something went wrong:', error);
}
```

### 2. 结构化日志
```typescript
// ✅ 好的做法
logger.info({
  userId: '123',
  action: 'file-upload',
  fileName: 'document.pdf',
  fileSize: 1024000,
  duration: 1500
}, 'File uploaded successfully');

// ❌ 避免的做法
logger.info('User 123 uploaded document.pdf (1MB) in 1.5s');
```

### 3. 敏感信息处理
```typescript
// ✅ 好的做法
logger.info({
  userId: user.id,
  email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
  action: 'login'
}, 'User login successful');

// ❌ 避免的做法
logger.info({
  userId: user.id,
  email: user.email,
  password: user.password // 绝对不要记录密码
}, 'User login successful');
```

### 4. 性能监控
```typescript
// ✅ 好的做法
const perfLogger = new PerformanceLogger('api-endpoint');
const stopTimer = perfLogger.startTimer('database-query');

const results = await database.query('SELECT * FROM users');

stopTimer(); // 自动记录执行时间
```

## 监控和告警

### 1. 错误日志监控
- 监控 ERROR 级别日志的频率
- 设置告警阈值，当错误率超过正常水平时发送通知
- 关注特定操作的错误模式

### 2. 性能监控
- 监控关键操作的执行时间
- 识别性能瓶颈和异常缓慢的操作
- 设置性能基线和告警阈值

### 3. 安全监控
- 监控安全相关事件（登录失败、权限检查等）
- 识别潜在的安全威胁和攻击模式
- 实时告警可疑活动

## 日志分析工具

### 推荐的日志分析平台
1. **ELK Stack** (Elasticsearch, Logstash, Kibana)
2. **Grafana + Loki**
3. **Splunk**
4. **Datadog**
5. **New Relic**

### 日志查询示例
```bash
# 查找特定用户的错误日志
grep "userId.*123" logs/app.log | grep "ERROR"

# 查找性能问题
grep "duration.*[5-9][0-9][0-9][0-9]" logs/app.log

# 查找安全事件
grep "security.*high" logs/app.log
```

## 故障排查指南

### 1. 应用程序错误
```bash
# 查看最近的错误日志
tail -f logs/app.log | grep ERROR

# 查找特定操作的错误
grep "operation.*uploadFile" logs/app.log | grep ERROR
```

### 2. 性能问题
```bash
# 查找慢查询
grep "duration.*[1-9][0-9][0-9][0-9]" logs/app.log

# 查看 API 响应时间
grep "api-endpoint" logs/app.log | grep duration
```

### 3. 安全事件
```bash
# 查看登录失败
grep "login.*failed" logs/app.log

# 查看权限检查失败
grep "permission.*denied" logs/app.log
```

## 总结

通过实施这套完整的日志系统，项目现在具备了：

1. **结构化日志记录** - 所有日志都包含丰富的上下文信息
2. **专业的错误处理** - 统一的错误日志记录和处理机制
3. **性能监控** - 关键操作的性能指标记录
4. **安全审计** - 安全相关事件的详细记录
5. **生产就绪** - 适合生产环境的日志配置和格式

这套系统为应用的监控、调试和维护提供了强大的支持，有助于快速定位问题和优化性能。 
# Mock 策略迁移计划

## 📋 **迁移概述**

本文档详细说明了从当前分散的 mock 策略迁移到统一、可维护的 mock 策略的完整计划。

## 🎯 **迁移目标**

### **当前问题**
1. **分散的 Mock 定义** - 每个测试文件都有重复的 mock 设置
2. **类型安全缺失** - 大量使用 `any` 类型，容易出错
3. **维护困难** - 修改一个 mock 需要在多个文件中更新
4. **测试不稳定** - 复杂的 mock 设置导致测试脆弱
5. **开发效率低** - 编写测试需要大量样板代码

### **目标收益**
- ✅ **代码量减少 60-80%** - 统一的工厂函数和配置
- ✅ **类型安全提升** - 完整的 TypeScript 类型定义
- ✅ **维护性提升** - 集中的 mock 管理
- ✅ **测试稳定性** - 标准化的测试场景
- ✅ **开发效率** - 快速的测试编写

## 🏗️ **新架构设计**

### **1. Mock 工厂层 (Factory Layer)**
```
tests/utils/mock-factories.ts
├── User & Auth Mocks
├── File System Mocks  
├── Browser API Mocks
├── Next.js Router Mocks
├── SWR Mocks
└── Toast Messages Mock
```

### **2. Mock 配置层 (Setup Layer)**
```
tests/utils/mock-setup.ts
├── Global Mock State Management
├── Module Mock Configurations
├── Test Environment Setup
└── Test Scenario Helpers
```

### **3. 应用层 (Application Layer)**
```
具体测试文件
├── 使用预定义场景
├── 使用工厂函数
└── 使用统一配置
```

## 📅 **迁移时间表**

### **第一阶段：基础设施建设 (已完成)**
- [x] 创建 Mock 工厂函数
- [x] 建立统一配置系统
- [x] 创建迁移示例
- [x] 编写迁移文档

### **第二阶段：核心测试迁移 (1-2周)**
- [ ] 迁移 Auth 相关测试
- [ ] 迁移 Hook 测试
- [ ] 迁移组件测试
- [ ] 验证功能完整性

### **第三阶段：全面迁移 (2-3周)**
- [ ] 迁移剩余单元测试
- [ ] 迁移集成测试
- [ ] 清理旧代码
- [ ] 更新文档

### **第四阶段：优化和完善 (1周)**
- [ ] 性能优化
- [ ] 增加更多场景
- [ ] 团队培训
- [ ] 最终验证

## 🔧 **具体迁移步骤**

### **步骤 1: 分析现有测试**

对于每个测试文件，分析：
```typescript
// 当前的 mock 设置
const mockAuthStore = { /* ... */ };
const mockRouter = { /* ... */ };
const mockToast = { /* ... */ };

// 识别模式：
// 1. 重复的 mock 定义
// 2. 常用的测试场景  
// 3. 自定义的 mock 行为
```

### **步骤 2: 逐步替换**

#### **2.1 替换基础设置**
```typescript
// 旧代码 (❌)
beforeEach(() => {
  jest.clearAllMocks();
  mockAuthStore.isLoading = false;
  mockAuthStore.error = null;
  // ... 20+ 行设置代码
});

// 新代码 (✅)
beforeEach(() => {
  setupTestEnvironment();
});
```

#### **2.2 使用工厂函数**
```typescript
// 旧代码 (❌)
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  // ... 硬编码数据
};

// 新代码 (✅)
const user = createMockUser({ 
  email: 'custom@example.com',
  role: 'admin' 
});
```

#### **2.3 使用场景函数**
```typescript
// 旧代码 (❌)
mockAuthStore.isAuthenticated = true;
mockAuthStore.isLoading = false;
mockAuthStore.user = mockUser;
mockRouter.push = jest.fn();

// 新代码 (✅)
const mocks = setupAuthenticatedUserScenario();
```

### **步骤 3: 验证功能**

对于每个迁移的测试：
1. ✅ 确保所有测试通过
2. ✅ 检查 mock 行为正确
3. ✅ 验证类型安全性
4. ✅ 确认覆盖率不降低

### **步骤 4: 清理旧代码**

1. 删除旧的 mock 定义
2. 移除重复的设置代码
3. 更新导入语句
4. 更新相关文档

## 📁 **文件迁移优先级**

### **高优先级 (核心功能)**
1. `tests/unit/hooks/use-login.test.ts`
2. `tests/unit/hooks/use-profile.test.ts`
3. `tests/unit/store/auth-store.test.ts`
4. `tests/unit/components/auth-guard.test.tsx`

### **中优先级 (业务功能)**
1. `tests/unit/hooks/use-files.test.ts`
2. `tests/unit/hooks/use-navbar.test.ts`
3. `tests/unit/components/permission-provider.test.tsx`
4. `tests/unit/lib/file-service.test.ts`

### **低优先级 (辅助功能)**
1. `tests/unit/hooks/use-config.test.ts`
2. `tests/unit/hooks/use-toast-messages.test.tsx`
3. `tests/unit/lib/utils.test.ts`

## 🛠️ **迁移工具和脚本**

### **自动化迁移脚本**
```bash
# 创建迁移脚本
pnpm run migrate:mocks [test-file]

# 验证迁移结果
pnpm run test:verify-migration

# 清理旧代码
pnpm run clean:old-mocks
```

### **迁移检查清单**
- [ ] 移除旧的 mock 定义
- [ ] 替换为新的工厂函数
- [ ] 使用统一的设置函数
- [ ] 验证所有测试通过
- [ ] 检查类型安全性
- [ ] 更新相关文档

## 📊 **迁移效果对比**

### **代码量对比**
```typescript
// 迁移前：每个测试文件 50-100 行 mock 设置
// 迁移后：每个测试文件 5-10 行设置

// 总体代码减少：60-80%
```

### **类型安全对比**
```typescript
// 迁移前：大量 any 类型，运行时错误
const mockUser: any = { /* ... */ };

// 迁移后：完整类型定义，编译时检查
const user: MockUser = createMockUser();
```

### **维护性对比**
```typescript
// 迁移前：修改需要更新 15+ 个文件
// 迁移后：修改只需要更新 1-2 个工厂函数
```

## 🎓 **团队培训计划**

### **培训内容**
1. **新 Mock 架构介绍** (30分钟)
2. **工厂函数使用方法** (30分钟)  
3. **场景配置最佳实践** (30分钟)
4. **实际迁移演示** (30分钟)
5. **Q&A 和讨论** (30分钟)

### **培训资源**
- 📖 迁移文档
- 🎥 录制的演示视频
- 💻 实际代码示例
- 🔧 迁移工具和脚本

## 🚀 **成功标准**

### **技术指标**
- ✅ 所有测试通过率 100%
- ✅ 代码覆盖率不降低
- ✅ 测试执行时间不增加
- ✅ TypeScript 编译无错误

### **质量指标**
- ✅ Mock 相关代码量减少 60%+
- ✅ 新测试编写时间减少 50%+
- ✅ Mock 相关 bug 减少 80%+
- ✅ 团队满意度评分 8/10+

## 📞 **支持和反馈**

### **迁移支持**
- 📧 技术支持邮箱
- 💬 内部讨论群
- 📅 每周进度同步会议
- 🆘 紧急问题处理流程

### **反馈收集**
- 📝 迁移问题记录
- 📊 迁移效果统计
- 💡 改进建议收集
- 🔄 持续优化计划

---

## 📚 **相关资源**

- [Mock 工厂函数 API 文档](./mock-factories-api.md)
- [测试场景配置指南](./test-scenarios-guide.md)
- [迁移示例代码](../tests/examples/migration-example.test.ts)
- [最佳实践指南](./testing-best-practices.md) 
# @testing-library/jest-dom 高级功能详解

## 📋 **概述**

`@testing-library/jest-dom` 提供了一系列专门用于 DOM 测试的自定义 Jest 匹配器，让 DOM 元素的断言更加直观和强大。

## 🎯 **核心优势**

### **1. 语义化断言**
```typescript
// 传统方式 (❌ 不直观)
expect(element.getAttribute('disabled')).toBe('');
expect(element.classList.contains('active')).toBe(true);

// jest-dom 方式 (✅ 直观易读)
expect(element).toBeDisabled();
expect(element).toHaveClass('active');
```

### **2. 更好的错误信息**
```typescript
// 传统错误信息：
// Expected: ""
// Received: null

// jest-dom 错误信息：
// Expected element to be disabled, but it was enabled
```

## 🔧 **高级功能详解**

### **1. 可见性和显示状态**

#### **toBeVisible() - 元素可见性检查**
```typescript
// 检查元素是否真正可见（不仅存在于 DOM 中）
expect(element).toBeVisible();

// 考虑的因素：
// - display: none
// - visibility: hidden  
// - opacity: 0
// - 父元素的可见性
// - 元素尺寸（width/height = 0）

// 实际应用示例
test('modal should be visible when open', () => {
  const modal = screen.getByRole('dialog');
  fireEvent.click(screen.getByText('Open Modal'));
  
  expect(modal).toBeVisible(); // 检查模态框是否真正显示
});
```

#### **toBeInTheDocument() vs toBeVisible()**
```typescript
// toBeInTheDocument() - 元素存在于 DOM 中
expect(element).toBeInTheDocument(); // 元素在 DOM 树中

// toBeVisible() - 元素可见
expect(element).toBeVisible(); // 元素可见且可交互

// 组合使用
test('hidden element exists but not visible', () => {
  const hiddenElement = screen.getByTestId('hidden');
  
  expect(hiddenElement).toBeInTheDocument(); // ✅ 存在
  expect(hiddenElement).not.toBeVisible();   // ✅ 但不可见
});
```

### **2. 表单和交互状态**

#### **表单元素状态检查**
```typescript
// 表单元素的各种状态
expect(input).toBeDisabled();     // 禁用状态
expect(input).toBeEnabled();      // 启用状态
expect(input).toBeRequired();     // 必填状态
expect(input).toBeValid();        // 验证通过
expect(input).toBeInvalid();      // 验证失败

// 复杂表单验证示例
test('form validation states', () => {
  const emailInput = screen.getByLabelText(/email/i);
  const submitButton = screen.getByRole('button', { name: /submit/i });
  
  // 初始状态
  expect(emailInput).toBeEnabled();
  expect(emailInput).toBeRequired();
  expect(submitButton).toBeDisabled(); // 表单未完成时禁用
  
  // 输入无效邮箱
  fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
  expect(emailInput).toBeInvalid();
  
  // 输入有效邮箱
  fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
  expect(emailInput).toBeValid();
  expect(submitButton).toBeEnabled(); // 表单完成后启用
});
```

#### **选择和检查状态**
```typescript
// 复选框和单选按钮
expect(checkbox).toBeChecked();      // 选中状态
expect(checkbox).not.toBeChecked();  // 未选中状态

// 部分选中状态（indeterminate）
expect(checkbox).toBePartiallyChecked();

// 选择框
expect(select).toHaveValue('option1');
expect(multiSelect).toHaveValue(['option1', 'option2']);

// 实际应用
test('todo item selection', () => {
  const selectAllCheckbox = screen.getByLabelText('Select All');
  const todoCheckboxes = screen.getAllByRole('checkbox', { name: /todo item/i });
  
  // 选择部分项目
  fireEvent.click(todoCheckboxes[0]);
  expect(selectAllCheckbox).toBePartiallyChecked(); // 部分选中
  
  // 选择所有项目
  todoCheckboxes.forEach(checkbox => fireEvent.click(checkbox));
  expect(selectAllCheckbox).toBeChecked(); // 全选
});
```

### **3. 内容和属性检查**

#### **文本内容检查**
```typescript
// 精确文本匹配
expect(element).toHaveTextContent('Exact text');

// 正则表达式匹配
expect(element).toHaveTextContent(/partial.*text/i);

// 忽略额外空白字符
expect(element).toHaveTextContent('Hello World'); // 匹配 "  Hello   World  "

// 实际应用
test('user profile display', () => {
  const userCard = screen.getByTestId('user-card');
  
  expect(userCard).toHaveTextContent(/John Doe/);
  expect(userCard).toHaveTextContent(/Software Engineer/);
  expect(userCard).not.toHaveTextContent(/Admin/); // 非管理员
});
```

#### **属性和样式检查**
```typescript
// 属性检查
expect(element).toHaveAttribute('data-testid', 'button');
expect(element).toHaveAttribute('aria-expanded', 'true');

// 样式检查
expect(element).toHaveStyle('color: red');
expect(element).toHaveStyle({
  backgroundColor: 'blue',
  fontSize: '16px'
});

// CSS 类检查
expect(element).toHaveClass('btn', 'btn-primary');
expect(element).toHaveClass('active'); // 包含特定类
expect(element).not.toHaveClass('disabled');

// 实际应用
test('button states and styling', () => {
  const button = screen.getByRole('button', { name: /submit/i });
  
  // 初始状态
  expect(button).toHaveClass('btn', 'btn-primary');
  expect(button).not.toHaveClass('loading');
  
  // 点击后进入加载状态
  fireEvent.click(button);
  expect(button).toHaveClass('btn', 'btn-primary', 'loading');
  expect(button).toBeDisabled();
  expect(button).toHaveTextContent(/loading/i);
});
```

### **4. 焦点和可访问性**

#### **焦点状态检查**
```typescript
// 焦点检查
expect(element).toHaveFocus();
expect(element).not.toHaveFocus();

// 可访问性属性
expect(element).toHaveAccessibleName('Submit Form');
expect(element).toHaveAccessibleDescription('Click to submit the form');

// 实际应用
test('keyboard navigation', () => {
  const firstInput = screen.getByLabelText('First Name');
  const lastInput = screen.getByLabelText('Last Name');
  
  // 初始焦点
  firstInput.focus();
  expect(firstInput).toHaveFocus();
  
  // Tab 导航
  fireEvent.keyDown(firstInput, { key: 'Tab' });
  expect(lastInput).toHaveFocus();
  expect(firstInput).not.toHaveFocus();
});
```

### **5. 表单值检查**

#### **输入值检查**
```typescript
// 输入框值
expect(input).toHaveValue('text value');
expect(numberInput).toHaveValue(42);

// 显示值（用户看到的值）
expect(input).toHaveDisplayValue('Formatted Value');

// 文件输入
expect(fileInput).toHaveValue(''); // 空文件
// 注意：由于安全原因，无法直接检查文件内容

// 实际应用
test('form input handling', () => {
  const priceInput = screen.getByLabelText('Price');
  
  // 输入数字
  fireEvent.change(priceInput, { target: { value: '1234.56' } });
  expect(priceInput).toHaveValue(1234.56); // 数值
  expect(priceInput).toHaveDisplayValue('$1,234.56'); // 格式化显示
});
```

## 🚀 **高级使用模式**

### **1. 自定义匹配器**
```typescript
// 扩展 jest-dom 匹配器
expect.extend({
  toBeWithinViewport(received) {
    const rect = received.getBoundingClientRect();
    const isVisible = rect.top >= 0 && 
                     rect.bottom <= window.innerHeight &&
                     rect.left >= 0 && 
                     rect.right <= window.innerWidth;
    
    return {
      message: () => `Expected element to be within viewport`,
      pass: isVisible,
    };
  },
});

// 使用自定义匹配器
test('element is within viewport', () => {
  const element = screen.getByTestId('visible-element');
  expect(element).toBeWithinViewport();
});
```

### **2. 组合匹配器**
```typescript
// 复杂的 DOM 状态检查
test('complex UI state', () => {
  const modal = screen.getByRole('dialog');
  const closeButton = within(modal).getByRole('button', { name: /close/i });
  const form = within(modal).getByRole('form');
  
  // 组合多个匹配器
  expect(modal).toBeInTheDocument();
  expect(modal).toBeVisible();
  expect(modal).toHaveAttribute('aria-modal', 'true');
  expect(modal).toHaveClass('modal', 'modal-open');
  
  expect(closeButton).toBeVisible();
  expect(closeButton).toHaveAccessibleName('Close modal');
  
  expect(form).toBeInTheDocument();
  expect(form).toHaveAttribute('novalidate');
});
```

### **3. 条件断言**
```typescript
// 根据条件进行不同的断言
test('responsive design behavior', () => {
  const sidebar = screen.queryByTestId('sidebar');
  const mobileMenu = screen.queryByTestId('mobile-menu');
  
  // 根据屏幕尺寸进行不同断言
  if (window.innerWidth >= 768) {
    expect(sidebar).toBeVisible();
    expect(mobileMenu).not.toBeInTheDocument();
  } else {
    expect(sidebar).not.toBeVisible();
    expect(mobileMenu).toBeInTheDocument();
  }
});
```

## 🛠️ **最佳实践**

### **1. 选择合适的匹配器**
```typescript
// ✅ 使用语义化匹配器
expect(button).toBeDisabled();

// ❌ 避免过于具体的实现细节
expect(button.getAttribute('disabled')).toBe('');
```

### **2. 组合使用匹配器**
```typescript
// ✅ 全面的状态检查
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveClass('expected-class');

// ❌ 单一维度检查可能遗漏问题
expect(element).toBeInTheDocument();
```

### **3. 错误信息优化**
```typescript
// ✅ 提供上下文信息
test('user can submit form', () => {
  const submitButton = screen.getByRole('button', { name: /submit/i });
  
  // 填写必要字段
  fireEvent.change(screen.getByLabelText(/email/i), { 
    target: { value: 'test@example.com' } 
  });
  
  // 清晰的断言
  expect(submitButton).toBeEnabled(); // 明确表达期望
});
```

## 📊 **性能考虑**

### **1. 避免过度查询**
```typescript
// ✅ 高效的查询
test('efficient DOM queries', () => {
  const container = screen.getByTestId('user-list');
  const users = within(container).getAllByRole('listitem');
  
  users.forEach((user, index) => {
    expect(user).toBeInTheDocument();
    expect(user).toHaveTextContent(`User ${index + 1}`);
  });
});
```

### **2. 合理使用等待**
```typescript
// ✅ 异步状态检查
test('async content loading', async () => {
  const loadButton = screen.getByText('Load Data');
  fireEvent.click(loadButton);
  
  // 等待内容出现
  const content = await screen.findByText('Loaded Content');
  expect(content).toBeVisible();
  
  // 检查加载状态消失
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});
```

## 🎯 **总结**

`@testing-library/jest-dom` 的高级功能帮助我们：

1. **提高测试可读性** - 语义化的匹配器让测试意图更清晰
2. **增强错误信息** - 提供更有意义的失败信息
3. **简化 DOM 测试** - 减少样板代码，专注于测试逻辑
4. **提升可维护性** - 抽象底层 DOM 操作，降低测试脆弱性
5. **支持可访问性** - 内置对 ARIA 属性和可访问性的支持

通过合理使用这些高级功能，我们可以编写出更加健壮、可维护的前端测试。 
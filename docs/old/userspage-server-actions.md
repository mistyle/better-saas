### 为什么 `UsersPage`（客户端组件）可以调用服务端的 `getUserStats`，且数据库读取不报错？

**核心结论**：这是 Next.js App Router 的 Server Actions 能力。`getUserStats` 位于带有 `'use server'` 指令的模块中，Next 在构建时不会把该函数实现打包到客户端，而是生成一个“客户端代理”。当你在浏览器里调用这个函数时，实际上是通过一个受保护的网络调用触发在服务端执行的函数，数据库读取发生在服务端环境，自然不会在客户端报错。

---

#### 关键点
- **模块标记与边界**：
  - `UsersPage` 文件含有 `'use client'`，因此它是客户端组件；
  - `getUserStats` 所在文件顶端是 `'use server'`，告诉 Next 该模块只在服务端执行。

- **编译期生成代理**：
  - 当客户端组件直接 `import { getUserStats }` 时，Next 不会把函数实现打到浏览器包里，而是注入一个“代理函数”。
  - 代理在浏览器被调用时，会向对应的 Server Action 端点发起请求（携带必要的 RSC/Action 元数据与 Cookie）。

- **请求上下文与鉴权**：
  - `getUserStats` 内使用 `headers()` 与会话方法读取请求上下文，这些在 Server Action 调用时由框架注入，能拿到 Cookie/会话信息；
  - 代码内再次做了 `Unauthorized` 与 `Admin access required` 的服务端校验，确保安全不仅依赖于前端 `AdminGuard`。

- **数据库访问位置**：
  - 实际查询通过 Drizzle ORM 在服务端执行；
  - 客户端只拿到结果数据，不直接接触数据库驱动或凭证，因此不会出现客户端环境访问数据库的错误。

- **项目配置**：
  - `next.config.ts` 中开启了 `experimental.serverActions` 配置，使上述行为生效。

---

#### 简化调用链路
1. 浏览器渲染 `UsersPage`（客户端组件）；
2. `useEffect` 中调用 `getUserStats()`；
3. 客户端代理向服务端的 Server Action 端点发起请求（自动带上 Cookie/Headers）；
4. 服务端执行 `getUserStats`：鉴权 -> 数据库查询 -> 返回结果；
5. 客户端拿到返回值更新 UI。

---

#### 何时会报错（常见误区）
- 直接在客户端组件里访问数据库或 `next/headers`；
- 去掉 `'use server'` 导致函数被错误打包到客户端；
- 关闭/缺失 `experimental.serverActions` 或错误使用跨域导致 Cookie 丢失；
- 服务端未做鉴权校验，返回 401/403 等。




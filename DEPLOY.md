# 个人博客系统 - 部署文档

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 后端 | Express + TypeScript |
| 数据库 | SQLite + Prisma ORM |
| 认证 | JWT (JSON Web Token) |

## 项目结构

```
blog/
  client/          # 前端 (React + Vite)
    src/
      components/  # 通用组件 (Navbar, Footer, PostCard, Pagination)
      contexts/    # React Context (Auth)
      lib/         # API 客户端
      pages/       # 页面组件
  server/          # 后端 (Express)
    prisma/        # 数据库模型 & 迁移
    src/
      lib/         # 工具 (Prisma 客户端)
      middleware/   # Express 中间件 (auth, errorHandler)
      routes/      # API 路由 (auth, posts, categories, tags, comments)
```

## 本地运行

### 前置要求

- Node.js >= 18.x
- npm >= 9.x

### 1. 安装依赖

```bash
# 在项目根目录
npm install

# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 2. 初始化数据库

```bash
cd server

# 生成 Prisma Client
npx prisma generate

# 创建数据库并执行迁移
npx prisma db push

# 填充示例数据
npx tsx src/seed.ts
```

### 3. 启动开发服务器

```bash
# 在项目根目录，同时启动前后端（需要 concurrently）
npm run dev

# 或者分别启动：
# 终端1 - 后端 (端口 3001)
cd server && npm run dev

# 终端2 - 前端 (端口 5173)
cd client && npm run dev
```

### 4. 访问

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001/api

### 默认管理员账号

| 邮箱 | 密码 |
|------|------|
| admin@blog.com | admin123 |

## 生产部署

### 构建前端

```bash
cd client
npm run build
```

构建产物输出到 `client/dist/`。

### 部署方案 A：单服务器（推荐个人博客）

将前端构建产物和后端放在同一服务器：

1. 修改 `server/src/index.ts`，添加静态文件服务：

```typescript
import path from 'path';
app.use(express.static(path.join(__dirname, '../../client/dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});
```

2. 编译后端：

```bash
cd server
npm run build
```

3. 使用 PM2 启动：

```bash
npm install -g pm2
pm2 start dist/index.js --name blog
```

### 部署方案 B：Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    root /path/to/client/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端端口 | `3001` |
| `JWT_SECRET` | JWT 签名密钥 | `blog-secret-key-change-in-production` |

**生产环境务必修改 JWT_SECRET**：

```bash
export JWT_SECRET="your-random-secret-string"
```

## 安全措施

- **密码加密**：使用 bcryptjs 对密码进行哈希处理
- **JWT 认证**：无状态身份验证，7天过期
- **输入验证**：使用 express-validator 对所有用户输入进行验证和转义
- **SQL注入防护**：使用 Prisma ORM 的参数化查询
- **CORS 配置**：限制跨域请求来源
- **XSS 防护**：前端使用 React 默认的 JSX 转义，用户输入经过 escape() 处理

## API 文档

### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 | 否 |
| GET | `/api/auth/me` | 获取当前用户 | 是 |

### 文章

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/posts` | 文章列表 | 否 |
| GET | `/api/posts/:slug` | 文章详情 | 否 |
| POST | `/api/posts` | 创建文章 | 是 |
| PUT | `/api/posts/:id` | 更新文章 | 是 |
| DELETE | `/api/posts/:id` | 删除文章 | 是 |

查询参数：`page`, `limit`, `category`, `tag`, `search`

### 分类 & 标签

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/categories` | 分类列表 | 否 |
| POST | `/api/categories` | 创建分类 | 是 |
| DELETE | `/api/categories/:id` | 删除分类 | 是 |
| GET | `/api/tags` | 标签列表 | 否 |
| POST | `/api/tags` | 创建标签 | 是 |
| DELETE | `/api/tags/:id` | 删除标签 | 是 |

### 评论

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/comments/post/:postId` | 文章评论 | 否 |
| POST | `/api/comments` | 创建评论 | 是 |
| DELETE | `/api/comments/:id` | 删除评论 | 是 |

## 功能特性

- 用户注册与登录（JWT认证）
- 文章发布、编辑、删除（Markdown编辑器）
- 评论系统（支持回复）
- 分类与标签管理
- 文章搜索与筛选
- 响应式设计（移动端适配）
- 阅读量统计
- 草稿/发布状态管理

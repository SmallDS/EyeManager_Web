# 眼镜店管理系统 (EyeManager Web)

> 基于 **Nuxt 3 + Element Plus + Prisma + PostgreSQL** 构建的多租户眼镜店 SaaS 管理后台，配套同名微信小程序客户端 ([EyeManager_Wx](https://github.com/SmallDS/EyeManager_Wx)) 提供移动端只读查阅能力。

---

## 目录
- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [数据模型](#数据模型)
- [API 文档](#api-文档)
- [本地开发](#本地开发)
- [Docker 部署](#docker-部署)
- [GitHub Actions 自动构建](#github-actions-自动构建)
- [CSV 数据导入](#csv-数据导入)
- [环境变量说明](#环境变量说明)
- [测试](#测试)

---

## 功能概览

### 🏪 Web 管理后台
| 功能模块 | 说明 |
|---|---|
| 顾客档案管理 | 顾客列表、分页检索、新增、编辑、删除 |
| 验光记录管理 | 每位顾客的历史验光单（远用/近用/瞳距数据）查阅与管理 |
| 数据导入 | 管理员通过浏览器上传顾客 CSV 和验光 CSV，后台异步批量导入并出具报告 |
| 多租户隔离 | 所有数据按门店 Tenant 隔离，后台按登录账号和门店分配控制访问 |
| 权限管理 | 管理员维护门店、员工账号、小程序用户门店分配和微信小程序配置 |
| 仪表盘 | 顾客总数、验光记录总数及最近活动快速概览 |

### 📱 微信小程序（配套）
- 顾客列表浏览（支持分页、搜索防抖、触底翻页）
- 顾客档案详情查阅与验光单历史记录
- 经典横屏模式查看验光大单据
- 首页实时时钟卡片与搜索结果统计
- 通过微信 `openid` 识别小程序用户，等待管理员分配门店后使用

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端框架 | [Nuxt 3](https://nuxt.com/) + Vue 3 |
| UI 组件库 | [Element Plus](https://element-plus.org/) |
| ORM & 数据库驱动 | [Prisma](https://www.prisma.io/) |
| 数据库 | PostgreSQL 15+ |
| 包管理器 | pnpm |
| 容器化 | Docker (多阶段构建) + Docker Compose |
| CI/CD | GitHub Actions + GHCR (GitHub Container Registry) |

---

## 数据模型

```
Tenant (门店租户)
  ├── UserTenant (员工门店分配)
  ├── WxUserTenant (小程序用户门店分配)
  ├── Customer (顾客档案)
  │     ├── sourceCustomerId  (原始系统顾客 ID)
  │     ├── pinyin            (姓名拼音首字母，用于检索)
  │     └── OptometryExam (验光记录)
  │             ├── distanceRight / distanceLeft  (远用右/左眼数据 JSON)
  │             ├── nearRight / nearLeft           (近用右/左眼数据 JSON)
  │             └── pupil                          (瞳距/瞳高数据 JSON)
  └── ImportBatch (数据导入批次)
        └── ImportIssue (导入问题记录)
```

---

## API 文档

后台 API 使用账密登录后的 httpOnly Cookie 会话鉴权。管理员可访问全部门店；员工只能访问已分配门店。小程序 API 使用小程序会话 token 和当前门店校验访问权限。

### 仪表盘
| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/dashboard` | 获取顾客总数、验光总数及最近活动 |

### 顾客管理
| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/customers` | 顾客列表（支持 `q` 模糊查询, `take`, `skip` 分页） |
| `POST` | `/api/customers` | 新增顾客 |
| `GET` | `/api/customers/:id` | 获取顾客详情（含验光记录列表） |
| `PUT` | `/api/customers/:id` | 编辑顾客信息 |
| `DELETE` | `/api/customers/:id` | 删除顾客档案（级联删除验光记录） |

### 验光记录
| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/customers/:id/exams` | 为指定顾客新建空验光单 |
| `PUT` | `/api/optometry/:id` | 修改验光单数据 |
| `DELETE` | `/api/optometry/:id` | 删除验光单 |

### 数据导入
| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/imports` | 获取历次导入批次列表及状态 |
| `POST` | `/api/imports` | 上传顾客/验光 CSV 文件触发导入（管理员） |
| `DELETE` | `/api/admin/business-data` | 清空当前门店所有业务数据（需 `confirmation: "清空数据"`） |

---

## 本地开发

> 推荐在 **WSL (Linux)** 文件系统下运行以获得最佳兼容性。

### 1. 克隆并进入项目

```bash
git clone https://github.com/SmallDS/EyeManager_Web.git
cd EyeManager_Web
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入 PostgreSQL 连接串和首个管理员账号密码
```

`.env` 内容说明见 [环境变量说明](#环境变量说明)。

### 3. 安装依赖

```bash
pnpm install
```

### 4. 初始化数据库

```bash
# 生成 Prisma Client
pnpm db:generate

# 同步数据库 schema（确保 PostgreSQL 已运行）
pnpm db:migrate
```

### 5. 启动开发服务

```bash
pnpm dev
```

服务默认监听在 `http://localhost:3000`。

---

## Docker 部署

本项目支持通过 Docker Compose 以单条命令一键部署，直接拉取 GitHub Actions 在 GHCR 上自动构建的生产镜像，**无需在服务器上安装 Node.js 或执行编译**。

### 1. 在服务器上创建部署目录

```bash
mkdir eyemanager && cd eyemanager
```

### 2. 下载 docker-compose.yml

```bash
curl -O https://raw.githubusercontent.com/SmallDS/EyeManager_Web/main/docker-compose.yml
```

### 3. 创建 .env 文件，填入数据库连接串

```bash
cat > .env << 'EOF'
DATABASE_URL="postgresql://用户名:密码@数据库主机:5432/数据库名?schema=public"
EOF
```

### 4. 拉取镜像并启动

```bash
docker compose pull
docker compose up -d
```

### 5. 查看启动日志

```bash
docker compose logs -f app
```

服务就绪后，即可通过 `http://服务器IP:3000` 访问后台管理界面。

---

## GitHub Actions 自动构建

每当推送代码到 `main` 分支时，GitHub Actions 会自动：

1. 在 GitHub 提供的虚拟环境中拉取最新代码。
2. 根据 `Dockerfile` 进行多阶段 Docker 镜像构建。
3. 将构建好的镜像（含 `latest` 和 `sha-xxxxxxx` 两个 Tag）推送到 **GHCR**：

   ```
   ghcr.io/smallds/eyemanager_web:latest
   ```

4. 服务器只需执行 `docker compose pull && docker compose up -d` 即可完成更新。

镜像构建状态可在仓库的 **Actions** 面板实时查看。

---

## CSV 数据导入

### 通过 Web 管理界面导入（推荐）

1. 访问管理后台，进入 **数据导入** 页面。
2. 选择 `顾客 CSV` 和 `验光 CSV` 上传。
3. 支持勾选"导入前清空业务数据"（确认词：`清空数据`）。
4. 提交后后台异步处理，页面自动刷新导入进度。

### 通过 API 导入

浏览器后台登录后进入 **数据导入** 页面上传。导入接口使用管理员登录会话鉴权，不再使用 API Key。

### 通过命令行导入（Dry Run 预览）

```bash
# 仅预览，不写入数据库
pnpm import:csv

# 实际写入数据库
pnpm import:csv -- --write --tenant=main \
  --customers=t_customer.csv \
  --optometry=t_optometry.csv
```

### 清空业务数据

```bash
curl -X DELETE http://localhost:3000/api/admin/business-data \
  -H "content-type: application/json" \
  -d '{"confirmation":"清空数据"}'
```

---

## 环境变量说明

| 变量名 | 必填 | 说明 | 示例 |
|---|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 数据库连接串 | `postgresql://postgres:pass@localhost:5432/eye_store?schema=public` |
| `ADMIN_ACCOUNT` | ✅ | 首个全局管理员账号，仅系统无管理员时自动创建 | `admin` |
| `ADMIN_PASSWORD` | ✅ | 首个全局管理员密码，仅系统无管理员时自动创建 | `change-me` |

> ⚠️ 请勿将 `.env` 文件提交到 Git 仓库，仓库中仅保留 `.env.example` 模板文件。

---

## 测试

```bash
pnpm test
```

当前单元测试覆盖：
- 顾客字段处理与手机号合并逻辑
- 空姓名占位处理
- 验光记录中文字段备注迁移
- 孤立验光记录跳过处理
- CSV BOM 头与引号特殊字符解析

---

## 项目结构

```
.
├── .github/workflows/       # GitHub Actions CI/CD 配置
│   └── docker-publish.yml   # Docker 镜像自动构建工作流
├── components/              # Vue 全局组件
├── pages/                   # Nuxt 路由页面
│   ├── index.vue            # 仪表盘首页
│   ├── imports.vue          # CSV 数据导入页面
│   └── customers/           # 顾客管理页面
├── prisma/
│   └── schema.prisma        # 数据库模型定义
├── server/
│   ├── api/                 # 后端 API 路由
│   └── utils/               # 服务端工具函数（租户解析、Prisma 实例）
├── src/lib/                 # 核心业务逻辑库
│   ├── importService.js     # CSV 导入服务（核心）
│   ├── importRules.mjs      # 导入转换规则
│   ├── csv.mjs              # CSV 解析工具
│   ├── pinyin.js            # 拼音首字母生成（用于顾客检索）
│   ├── prisma.js            # Prisma 共享实例
│   └── auth.js              # 租户鉴权工具
├── scripts/
│   └── import-csv.mjs       # 命令行 CSV 导入脚本
├── tests/
│   └── importRules.test.mjs # 单元测试
├── Dockerfile               # 多阶段 Docker 构建配置
├── docker-compose.yml       # Docker Compose 生产部署配置
└── .env.example             # 环境变量模板
```

---

## License

MIT

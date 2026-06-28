# ===== 阶段 1: 构建 =====
# 使用完整 node:20 镜像（已内置 python3、make、g++、openssl 等所有原生模块编译工具链）
FROM node:20 AS builder

WORKDIR /app

# 使用 corepack 激活与 package.json packageManager 字段完全一致的 pnpm 版本
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate

# 先复制依赖配置（利用 Docker 层缓存加速重复构建）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma

# 安装依赖（跨平台构建时不锁定 lockfile，允许 Linux 平台重新解析原生二进制）
RUN pnpm install --no-frozen-lockfile

# 生成适配 Linux 平台的 Prisma Client
RUN pnpm prisma generate

# 复制全量源码并构建 Nuxt standalone 生产包
COPY . .
RUN pnpm run build

# ===== 阶段 2: 运行 =====
# 运行阶段使用 slim 镜像保持体积轻量
FROM node:20-slim AS runner

WORKDIR /app

# 仅需 openssl（Prisma 运行时依赖）
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# 从构建阶段复制生产运行所需的产物
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

EXPOSE 3000

# 启动时自动同步数据库 schema，再启动 Web 服务
CMD ["sh", "-c", "node_modules/.bin/prisma db push && node .output/server/index.mjs"]

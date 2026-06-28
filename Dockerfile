# ===== 阶段 1: 构建 =====
FROM node:20-slim AS builder

WORKDIR /app

# 安装系统依赖：
# - openssl: Prisma query engine 必须
# - python3 / make / g++: esbuild、@parcel/watcher 等原生模块编译所需
RUN apt-get update -y && \
    apt-get install -y openssl python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# 安装与 package.json 中 packageManager 字段一致的 pnpm 版本
RUN npm install -g pnpm@11.5.3

# 先复制依赖配置文件（利用 Docker 层缓存，依赖未变时跳过此步）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma

# 安装全部依赖
# 注意：使用 --frozen-lockfile 确保与锁文件严格一致
RUN pnpm install --frozen-lockfile

# 生成适配 Linux 平台的 Prisma Client 二进制
RUN pnpm prisma generate

# 复制全部源代码
COPY . .

# 编译 Nuxt 3 standalone 生产包（输出到 .output/）
RUN pnpm run build

# ===== 阶段 2: 运行 =====
FROM node:20-slim AS runner

WORKDIR /app

# 运行时同样需要 openssl（Prisma 运行依赖）
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# 只复制生产运行所需的产物
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

EXPOSE 3000

# 启动时自动同步数据库 schema，再启动 Web 服务
CMD ["sh", "-c", "node_modules/.bin/prisma db push && node .output/server/index.mjs"]


# ===== 阶段 1: 构建 =====
FROM node:20-slim AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 安装 OpenSSL（Prisma 的 query engine 依赖）
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 复制依赖配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# 复制 Prisma schema（generate 阶段需要）
COPY prisma ./prisma

# 安装所有依赖（含 devDependencies，用于编译）
RUN pnpm install --frozen-lockfile

# 生成 Linux 平台的 Prisma Client 二进制
RUN pnpm prisma generate

# 复制全部源代码
COPY . .

# 编译 Nuxt 3 standalone 生产包（输出到 .output/）
RUN pnpm run build

# ===== 阶段 2: 运行 =====
FROM node:20-slim AS runner

WORKDIR /app

# 安装 OpenSSL（运行阶段 Prisma 同样需要）
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# 只复制生产运行所需的文件
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

EXPOSE 3000

# 启动时先同步数据库 schema，再启动 Web 服务
CMD ["sh", "-c", "node_modules/.bin/prisma db push && node .output/server/index.mjs"]

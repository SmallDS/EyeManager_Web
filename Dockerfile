# ===== 阶段 1: 构建 =====
FROM node:22 AS builder

WORKDIR /app

# 使用 npm 全局安装 pnpm（稳定可靠，无需 corepack 联网下载）
RUN npm install -g pnpm@11.5.3

# 复制全部源文件（.dockerignore 已排除 node_modules/.git/.output 等）
COPY . .

# 删除可能含有 Windows 平台二进制的本地 node_modules（容器里需要重新装 Linux 版）
RUN rm -rf node_modules

# 安装所有依赖（容器内全新安装，与 Windows 的 pnpm-lock.yaml 无关）
RUN pnpm install --no-frozen-lockfile

# 生成适配 Linux 平台的 Prisma Client
RUN pnpm prisma generate

# 编译 Nuxt 3 standalone 生产包
RUN pnpm run build

# ===== 阶段 2: 运行 =====
# 运行阶段使用 slim 镜像保持体积轻量
FROM node:22-slim AS runner

WORKDIR /app

RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

EXPOSE 3000

CMD ["sh", "-c", "node_modules/.bin/prisma db push && node .output/server/index.mjs"]

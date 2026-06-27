# 眼镜店管理系统

Nuxt 3 + Element Plus + PostgreSQL + Prisma 的眼镜店管理系统首版，当前聚焦顾客档案、验光记录、CSV 导入、检索、新增、编辑和删除。微信小程序首版只预留 API，不创建小程序界面。

## 主要能力

- 多门店租户模型：Tenant、User、Customer、OptometryExam、ImportBatch、ImportIssue。
- 顾客导入：忽略指定无用字段，`c_addr` 进入备注，手机号优先 `c_passno`，`c_tele` 作为备用电话或备注。
- 验光导入：按字段映射保存文本数据；非备注字段中出现中文时，移动到 `c_comment` 尾部并标注字段中文名。
- 数据追溯：顾客和验光记录都保留原始 `rawRow`。
- 导入报告：空姓名警告、孤立验光跳过并记录错误。

## WSL 原生运行

请在 WSL 的 Linux 文件系统中运行本项目，不要在 `/mnt/c/...` 目录里安装依赖或启动服务。当前推荐目录：

```bash
cd /home/smallds/eye
```

项目内置了 Node.js 和 pnpm 到 `.tools`，进入项目后先加载本地工具：

```bash
export TMPDIR=/tmp
export TEMP=/tmp
export TMP=/tmp
export PATH="$PWD/.tools/node-v22.13.1-linux-x64/bin:$PWD/.tools/pnpm/bin:$PATH"
node -v
pnpm -v
```

首次安装和初始化：

```bash
cp .env.example .env
pnpm install
pnpm db:generate
sudo service postgresql start
pnpm db:migrate
```

启动开发服务：

```bash
pnpm dev --host 0.0.0.0 --port 3000
```

设置 `.env` 中的 `DATABASE_URL` 和 `ADMIN_API_KEY`。不要把真实密钥提交到仓库。

Windows 浏览器访问：

```text
http://localhost:3000
```

如果 Windows 访问不到，先在 WSL 里确认服务监听：

```bash
curl -I http://127.0.0.1:3000
```

每次打开新的 WSL 终端，都需要重新执行上面的 `export TMPDIR=...` 和 `export PATH=...`，或把它们追加到 `~/.bashrc`。

## 导入 CSV

后台页面支持通过浏览器选择 `顾客 CSV` 和 `验光 CSV` 上传导入。上传成功后接口会立即创建 `RUNNING` 导入批次并返回，后台继续写入顾客和验光数据，页面会自动刷新导入状态。重导前可勾选“导入前清空业务数据”，确认词为：

```text
清空数据
```

命令行仍可先做 dry run，确认统计和问题列表：

```bash
pnpm import:csv
```

写入数据库：

```bash
pnpm import:csv -- --write --tenant=main --customers=t_customer.csv --optometry=t_optometry.csv
```

也可以通过 API 上传触发，成功时返回 `202 Accepted`：

```bash
curl -X POST http://localhost:3000/api/imports \
  -H "x-api-key: $ADMIN_API_KEY" \
  -H "x-tenant-code: main" \
  -F "customerFile=@t_customer.csv" \
  -F "optometryFile=@t_optometry.csv"
```

清空当前门店业务数据：

```bash
curl -X DELETE http://localhost:3000/api/admin/business-data \
  -H "content-type: application/json" \
  -d '{"confirmation":"清空数据"}'
```

## API 预留

- `GET /api/customers?q=&tenant=main`
- `POST /api/customers`
- `GET /api/customers/:id?tenant=main`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`
- `POST /api/customers/:id/exams`
- `PUT /api/optometry/:id`
- `DELETE /api/optometry/:id`
- `GET /api/imports?tenant=main`
- `POST /api/imports`，multipart 上传顾客 CSV 和验光 CSV，需要 `x-api-key`
- `DELETE /api/admin/business-data`，清空当前租户业务数据

## 测试

```bash
pnpm test
```

当前单元测试覆盖顾客字段处理、手机号合并、空姓名占位、验光中文备注迁移、孤立验光跳过和 CSV BOM/引号解析。

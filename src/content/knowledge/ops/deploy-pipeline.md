---
title: 构建、上传与切换
summary: '一次可回滚的发布由构建、上传、原子切换与健康检查组成。本文给出 releases/current 的目录结构、rsync 上传、软链切换与数据库迁移的顺序。'
category: ops
node: ops-deploy-pipeline
order: 1
level: 进阶
tags: [发布, 部署, symlink, rsync, 健康检查]
updated: 2026-11-26
terms: []
sources:
  - title: rsync Manual
    url: https://rsync.samba.org/documentation.html
    note: 增量同步与常用参数。
  - title: systemd.exec Manual
    url: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
    note: 服务启动、工作目录与权限。
---

发布的目标不是“把文件传上去”，而是“可上线、可观测、可回滚”。关键在原子切换：新版本准备好之前，线上仍跑旧版本；切换失败能立刻切回。

```mermaid
flowchart LR
  A["构建产物"] --> B["上传到 releases/时间戳"]
  B --> C["安装依赖 / 迁移"]
  C --> D["健康检查"]
  D --> E["切换 current 软链"]
  E --> F["重载服务"]
  F --> G["验证并保留旧版本"]
```

## 目录结构

```text
/opt/app/
├── releases/
│   ├── 20261126-0100/
│   └── 20261125-2300/
├── current -> releases/20261126-0100
└── shared/
    ├── logs/
    └── env
```

每次发布一个独立目录，`current` 指向当前版本。回滚只需要把软链指回上一个目录，再重载服务。

## 构建

- 构建在 CI 或本机完成，产物带版本号；
- 构建环境与运行环境分离，不在服务器上编译前端；
- 产物包含依赖锁文件或 `node_modules`，确保可复现；
- 构建失败直接停止，不上传半成品。

## 上传

```bash
rsync -az --delete \
  --exclude '.git' --exclude 'logs' \
  dist/ app@10.0.0.12:/opt/app/releases/20261126-0100/
```

- `-a` 保留权限与时间，`-z` 压缩；
- 先传到临时目录，完成后再改名为正式版本，避免切换读到半份文件；
- 上传账号只保留目标目录权限。

## 切换

```bash
ln -sfn /opt/app/releases/20261126-0100 /opt/app/current
systemctl reload app
```

软链替换是原子的，读请求要么看到旧目录，要么看到新目录。重载失败时把软链切回并再次重载。

## 数据库迁移

迁移与代码发布的顺序取决于兼容性：

- **向后兼容**：先迁移，再发代码；
- **不兼容**：先发兼容代码，再迁移，最后清理旧字段；
- 迁移脚本要可重复执行，失败能停；
- 发布前备份，迁移前在从库或临时库演练。

## 健康检查

```bash
curl -fsS http://127.0.0.1:3000/health
```

健康检查要验证：

- 进程能响应；
- 关键依赖可用（数据库、缓存）；
- 返回版本号，便于确认切换成功。

不要用首页做健康检查，首页可能依赖外部服务，抖动会误判。

## 常见坑

- **直接覆盖 current 目录**：切换过程中文件不一致；
- **发布前不备份**：回滚没有依据；
- **迁移与代码强耦合**：旧代码在新表结构上直接报错；
- **健康检查只查端口**：进程活着但依赖不可用；
- **不保留旧版本**：出问题只能重新构建。

## 小结

- 发布由构建、上传、切换、验证四步组成；
- 每次发布独立目录，软链原子切换；
- 迁移顺序由兼容性决定，发布前备份；
- 健康检查覆盖依赖与版本；
- 保留最近几个版本，回滚才有意义。

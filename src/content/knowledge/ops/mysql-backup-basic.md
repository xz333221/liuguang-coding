---
title: 逻辑备份与物理备份
summary: '逻辑备份导出 SQL，物理备份复制数据文件。前者灵活、适合小库与单表恢复，后者快、适合大库与整实例恢复。本文给出 mysqldump 与 XtraBackup 的可执行参数和一致性保证。'
category: ops
node: ops-mysql-backup-basic
order: 1
level: 进阶
tags: [MySQL, 备份, mysqldump, XtraBackup, binlog]
updated: 2026-11-24
terms: []
sources:
  - title: MySQL 8.4 Reference Manual · Backup and Recovery
    url: https://dev.mysql.com/doc/refman/8.4/en/backup-and-recovery.html
    note: 备份类型、一致性与恢复流程的总览。
  - title: MySQL 8.4 Reference Manual · mysqldump
    url: https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
    note: 逻辑备份参数、事务一致性与 GTID 选项。
  - title: Percona XtraBackup 8.4 Documentation
    url: https://docs.percona.com/percona-xtrabackup/8.4/
    note: 物理备份、增量备份与恢复步骤。
---

备份要回答两个问题：能恢复到什么时间点（RPO），恢复需要多久（RTO）。逻辑备份与物理备份在这两个指标上取舍不同，成熟方案通常两者都保留，再叠加 binlog 做时间点恢复。

```mermaid
flowchart LR
  A["每周全量"] --> B["每日增量 / binlog"]
  B --> C["异地存储"]
  C --> D["定期恢复演练"]
  D --> E["可用的 RPO / RTO"]
```

## 逻辑备份

`mysqldump` 导出建表语句与数据，产物是 SQL 文本：

```bash
mysqldump -h 127.0.0.1 -u backup -p \
  --single-transaction \
  --source-data=2 \
  --routines --triggers --events \
  --set-gtid-purged=OFF \
  shop > shop-20261124.sql
```

- `--single-transaction` 在 InnoDB 上开启一致性快照，不锁表；但它不保证 DDL 期间的一致性，备份窗口内应禁止改表；
- `--source-data=2` 记录 binlog 位置，用于时间点恢复。8.0.26 起 `--master-data` 更名为 `--source-data`；
- `--routines/--triggers/--events` 把存储过程、触发器与事件一并导出；
- `--set-gtid-purged=OFF` 适合迁移到非 GTID 环境，主从环境要按目标实例决定；
- 备份账号只需要 `SELECT`、`SHOW VIEW`、`TRIGGER` 与 `RELOAD` 等最小权限。

适合场景：中小数据库、跨版本迁移、单表/单库恢复。缺点是恢复慢，大库导入时间长。

## 物理备份

物理备份直接复制数据文件与日志，恢复快，适合大库：

- **XtraBackup**：热备 InnoDB，支持全量与增量，Percona 提供 8.4 对应版本；
- **文件系统快照**：云盘快照、LVM 快照，需要保证文件系统与 InnoDB 一致；
- **冷备**：停实例后复制数据目录，最简单但需要停机。

XtraBackup 基本流程：

```bash
xtrabackup --backup --target-dir=/backup/full \
  --user=backup --password='...'

xtrabackup --prepare --target-dir=/backup/full
xtrabackup --copy-back --target-dir=/backup/full
```

`--prepare` 让数据文件达到一致状态，恢复前必须执行。版本必须与 MySQL 大版本匹配，8.4 的数据目录不能直接交给旧版 XtraBackup。

## binlog 与时间点恢复

全量备份只能恢复到备份时刻。要恢复到误操作之前，还需要 binlog：

```ini
[mysqld]
log_bin = mysql-bin
binlog_format = ROW
binlog_expire_logs_seconds = 1209600
```

- `binlog_format=ROW` 是 8.0 之后的默认值，记录行变更，复制与恢复都更可靠；
- `binlog_expire_logs_seconds` 控制保留时长，默认 30 天，按 RPO 与磁盘容量调整；
- 备份 binlog 与备份数据同等重要，只备数据不备日志，时间点恢复无从谈起。

## 备份策略

1. 每周一次全量，每日一次增量或全量；
2. binlog 保留至少覆盖两次全量之间的窗口；
3. 备份文件加密后传到异地或对象存储；
4. 每次备份后校验文件可读、大小合理；
5. 每月至少一次真实恢复演练，记录耗时。

## 常见坑

- **`--single-transaction` 期间执行 DDL**：快照会失效，备份可能不一致；
- **XtraBackup 版本不匹配**：8.4 的数据目录不能用 8.0 的工具恢复；
- **备份成功但从未恢复**：文件损坏、权限错误、字符集问题只有演练才能发现；
- **只备份业务库**：系统库、账号与授权也需要纳入备份范围；
- **备份目录与数据目录同盘**：磁盘故障时两者一起丢失。

## 小结

- 逻辑备份灵活但慢，物理备份快但依赖版本与工具；
- `--single-transaction` 提供 InnoDB 一致性，备份窗口内禁止 DDL；
- 全量 + binlog 才能做时间点恢复；
- 备份的价值由恢复演练证明，不由文件大小证明。

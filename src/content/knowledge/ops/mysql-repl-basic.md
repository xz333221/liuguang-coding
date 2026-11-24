---
title: 复制原理与主从搭建
summary: '主库把变更写进 binlog，从库用 IO 线程拉取、SQL 线程回放。本文说明 ROW 格式、GTID 与 8.4 的复制命令，并给出一套可验证的主从搭建步骤。'
category: ops
node: ops-mysql-repl-basic
order: 1
level: 进阶
tags: [MySQL, 主从复制, binlog, GTID, 读写分离]
updated: 2026-11-24
terms: []
sources:
  - title: MySQL 8.4 Reference Manual · Replication
    url: https://dev.mysql.com/doc/refman/8.4/en/replication.html
    note: 复制架构、binlog 格式与复制线程。
  - title: MySQL 8.4 Reference Manual · Using GTID-based Replication
    url: https://dev.mysql.com/doc/refman/8.4/en/replication-gtids.html
    note: GTID 模式、自动定位与故障切换。
  - title: MySQL 8.4 Reference Manual · CHANGE REPLICATION SOURCE TO
    url: https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html
    note: 8.0.23 之后的复制配置语法。
---

复制解决三件事：读扩展、备份从库、故障切换。它的本质是把主库的 binlog 传到从库并重新执行。理解这条链路，才能判断延迟发生在哪一段，以及切换时会不会丢数据。

```mermaid
flowchart LR
  C["应用写"] --> M["主库"]
  M --> B["binlog"]
  B --> IO["从库 IO 线程"]
  IO --> R["relay log"]
  R --> S["从库 SQL 线程"]
  S --> D["从库数据"]
```

## binlog 格式

| 格式 | 内容 | 适用 |
| --- | --- | --- |
| `ROW` | 记录行的前后值 | 默认，复制与恢复最可靠 |
| `STATEMENT` | 记录 SQL 语句 | 部分函数与上下文可能导致不一致 |
| `MIXED` | 自动切换 | 兼容旧场景 |

8.0 之后默认 `ROW`。它让从库回放不依赖函数、时间与自增的上下文，但大事务会生成大量行事件，影响延迟。`binlog_row_image=MINIMAL` 可以减少日志量，但要确认下游工具能处理。

## GTID

GTID（全局事务标识）让每个事务有唯一编号，从库可以自动定位起点，切换时不必手工计算 binlog 文件与位置：

```ini
[mysqld]
gtid_mode = ON
enforce_gtid_consistency = ON
```

开启 GTID 后，复制使用 `SOURCE_AUTO_POSITION=1`。它与传统“文件 + 位置”方式不兼容，切换前要统一。

## 搭建步骤

主库配置：

```ini
[mysqld]
server_id = 1
log_bin = mysql-bin
binlog_format = ROW
gtid_mode = ON
enforce_gtid_consistency = ON
```

创建复制账号：

```sql
CREATE USER 'repl'@'10.0.%' IDENTIFIED BY 'replace-with-strong-password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'10.0.%';
```

用备份初始化从库（避免直接热拷贝正在写入的数据目录）：

```bash
mysqldump -u backup -p --single-transaction --source-data=2 \
  --set-gtid-purged=ON --all-databases > full.sql
```

从库配置：

```ini
[mysqld]
server_id = 2
relay_log = relay-bin
read_only = ON
super_read_only = ON
```

配置并启动复制（8.0.23 之后的语法）：

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '10.0.0.11',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl',
  SOURCE_PASSWORD = '...',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;
```

验证：

```sql
SHOW REPLICA STATUS\G
```

关键字段：

- `Replica_IO_Running: Yes`：能从主库拉取日志；
- `Replica_SQL_Running: Yes`：能回放；
- `Seconds_Behind_Source`：粗略延迟，大事务下不准；
- `Last_Error`：中断原因。

## 半同步与一致性

默认异步复制下，主库提交成功不代表从库已收到。对一致性要求高的场景可开启半同步：

```sql
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';
SET GLOBAL rpl_semi_sync_source_enabled = ON;
```

半同步能降低“主库宕机后从库缺数据”的概率，但会增加写延迟，网络抖动时可能退化为异步。是否启用取决于业务对 RPO 的要求。

## 读写分离

- 应用层路由：写主库、读从库，按事务或一致性要求切换；
- 中间件代理：对应用透明，但故障转移与延迟控制更复杂；
- 刚写入立刻读取的场景要走主库，避免“写后读不到”；
- 从库只读（`read_only` + `super_read_only`），防止误写。

## 常见坑

- **server_id 重复**：复制链路会异常，集群内必须唯一；
- **GTID 未开却用自动定位**：复制无法启动；
- **复制账号网段过宽**：安全风险，按从库网段授权；
- **从库可写**：应用误写导致主从不一致；
- **直接拷贝数据目录**：未做一致性处理，从库可能损坏。

## 小结

- 复制链路是 binlog → relay log → 回放；
- ROW 格式是默认，GTID 让定位与切换更简单；
- 8.4 使用 `CHANGE REPLICATION SOURCE TO` 与 `SHOW REPLICA STATUS`；
- 从库设置只读，半同步按 RPO 需求选择；
- 切换与延迟问题在下一篇展开。

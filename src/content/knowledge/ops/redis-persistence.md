---
title: Redis 持久化：RDB、AOF 与备份恢复
summary: 'Redis 数据驻留内存,进程终止即丢失。持久化提供两种机制:RDB 快照与 AOF 追加日志,可单独或同时启用。本文说明两者的工作原理、fsync 策略、AOF 重写,以及备份与恢复的操作步骤。'
category: ops
node: ops-redis-persistence
order: 3
level: 进阶
tags: [Redis, RDB, AOF, 备份, 恢复]
updated: 2026-11-21
terms: []
sources:
  - title: Redis docs · Persistence
    url: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
    note: RDB 与 AOF 的机制、fsync 三档策略、多部分 AOF,以及备份与恢复流程的官方说明。
  - title: Redis docs · BGSAVE
    url: https://redis.io/docs/latest/commands/bgsave/
    note: 后台生成 RDB 快照的命令定义。
  - title: Redis docs · BGREWRITEAOF
    url: https://redis.io/docs/latest/commands/bgrewriteaof/
    note: 后台重写 AOF 的命令定义。
  - title: Redis docs · INFO
    url: https://redis.io/docs/latest/commands/info/
    note: persistence 与 replication 段落中各监控字段的出处。
---

Redis 将数据保存在内存中,进程终止或主机断电后,未持久化的数据会全部丢失。当 Redis 仅作为缓存时,数据可以从数据库重建;一旦用于会话、计数或队列,就必须明确持久化策略:重启后数据是否仍然存在。

Redis 提供两种持久化机制:RDB 快照与 AOF 追加日志,两者可独立或同时启用。本文说明各自机制与取舍,并给出可执行的备份和恢复流程。

## RDB 快照

RDB 将某一时刻的完整数据集序列化为二进制文件,默认文件名为 `dump.rdb`。触发方式分为定时与手动:

```conf
# redis.conf:60 秒内发生 1000 次写入时生成快照
save 60 1000
```

```bash
BGSAVE          # 后台生成快照,立即返回
SAVE            # 前台生成,期间阻塞其他命令,生产环境不应使用
```

`BGSAVE` 通过 `fork` 创建子进程,由子进程将数据写入临时文件,完成后原子替换旧文件。父进程继续处理请求,并依靠操作系统的写时复制(copy-on-write)保证子进程读取到 fork 时刻的数据视图。

RDB 的优点是文件紧凑,适合整体复制与归档;加载时直接解析二进制,大数据量下恢复速度快于回放日志。代价是两次快照之间的写入不受保护,主机断电可能丢失最近数分钟的数据;数据量较大时,`fork` 引起的停顿也更明显。

## AOF 追加日志

AOF 记录的是写命令而非数据本身。启用后,每条写命令追加到日志末尾,重启时按顺序重放:

```conf
appendonly yes
appendfsync everysec
```

`appendfsync` 决定刷盘时机:

- `always`:每条命令执行 `fsync`,数据最安全,性能开销最大;
- `everysec`:每秒执行一次,默认值,最多丢失一秒数据;
- `no`:由操作系统决定刷盘时机,性能最高,丢失窗口不可控。

多数业务使用 `everysec`。若要求任何一条写入都不能丢失,应选择具备事务日志的关系型数据库,而不是将 Redis 调整为 `always`。

Redis 7.0 起,AOF 采用多部分结构:一个 base 文件(创建时为全量数据,格式可以是 RDB 或 AOF)加多个 incr 增量文件,由 manifest 清单统一管理。该设计使重写失败不会损坏完整日志,备份与清理也可以按文件进行。

## AOF 重写

AOF 会随写入持续增长。同一计数器自增一万次,日志中存在一万条 `INCR`,而恢复只需要最终值。重写根据当前内存数据生成最短命令序列:

```bash
BGREWRITEAOF
```

重写同样由 `fork` 的子进程完成,父进程继续处理请求,并将新写入记录到新的增量文件。7.0 之后重写失败会自动重试并退避,不会持续占用磁盘。可配置自动触发:

```conf
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

含义是:AOF 大小较上次重写后增长一倍,且超过 64MB 时触发重写。阈值应根据写入量调整。

## 策略选择

- 纯缓存、可从数据库重建:可以关闭持久化,重启后为空实例;
- 会话、计数等丢失影响较大的数据:启用 AOF,使用 `everysec`;
- 接近主存储:同时启用 RDB 与 AOF。AOF 保证秒级数据完整,RDB 用于冷备与快速恢复;
- 不建议只启用 AOF。保留周期性 RDB 有助于备份、迁移与故障排查。

## 备份

RDB 文件生成后不再被修改,服务运行期间直接复制是安全的:

```bash
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%F-%H%M).rdb
sha1sum /backup/redis-*.rdb
```

生产环境通常写入定时任务:每小时保留一份、保留 48 小时;每天保留一份、保留一个月;并每日向另一台主机或对象存储传输一份。单机备份不构成有效备份,磁盘故障时会一并丢失。

AOF 备份需要额外注意。7.0 之后应复制 `appenddirname` 指向的整个目录,且不能在重写过程中复制,否则可能得到不完整的文件集合。标准流程是先关闭自动重写,确认没有进行中的重写,再打包目录:

```bash
redis-cli CONFIG SET auto-aof-rewrite-percentage 0
redis-cli INFO persistence | grep aof_rewrite_in_progress
# 确认结果为 0 后,打包 appenddirname 目录
```

Redis 8.10 起提供 `BACKUP START / LIST / SEAL / CLEANUP` 命令组,将快照与封存分离,无需手动关闭重写。版本满足要求时应优先使用。

## 恢复

恢复前必须先将当前文件另存一份,再执行替换。流程为:停止服务、替换文件、启动服务、核对数据:

```bash
systemctl stop redis
cp /backup/redis-2026-11-21-0300.rdb /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb
systemctl start redis
redis-cli INFO keyspace
```

使用 RDB 恢复时,需确认 `dir` 与 `dbfilename` 指向的位置。AOF 尾部截断通常可以自动恢复,日志中会出现 `AOF loaded anyway`;若文件中间损坏,使用 `redis-check-aof --fix` 修复,修复前应保留副本,因为该操作会丢弃损坏点之后的内容。

8.10 之后还可以通过 `preload-file` 指定备份文件启动,适合在不改动目录结构的前提下演练恢复流程。

## 监控指标

持久化异常通常不会立即影响读写,往往在故障恢复时才暴露。日常巡检应关注以下指标:

```bash
redis-cli INFO persistence
```

- `rdb_last_bgsave_status`:最近一次快照是否成功;
- `rdb_last_save_time`:最近一次成功保存的时间,长时间未更新需排查;
- `aof_last_write_status`:AOF 写入是否正常;
- `aof_rewrite_in_progress`:是否存在进行中的重写;
- `aof_last_bgrewrite_status`:最近一次重写的结果。

同时应配置磁盘空间告警。AOF 写入失败通常先由磁盘写满引起,随后 Redis 拒绝写入,业务层才会出现明显错误。

## 要点

- RDB 是定时快照,文件紧凑、恢复快,但会丢失最近数分钟数据;AOF 记录写命令,`everysec` 下最多丢失一秒;
- Redis 7.0 起 AOF 为多部分结构,重写由后台子进程完成;
- 数据重要时同时启用 RDB 与 AOF,纯缓存场景可以关闭持久化;
- 备份必须离机并校验,仅保留在本机不构成有效备份;
- 恢复前备份当前文件,恢复后用 `INFO keyspace` 核对键数量。

下一篇讨论高可用:主从复制、Sentinel 故障转移,以及数据量超过单机容量时的 Cluster 方案。

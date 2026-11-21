---
title: Redis 高可用：主从复制、Sentinel 与 Cluster
summary: '单机 Redis 故障会导致依赖它的服务不可用。高可用分为三层:主从复制提供数据副本,Sentinel 完成自动故障转移,Cluster 解决单机容量上限。本文说明三者的职责、配置方式与上线后的监控指标。'
category: ops
node: ops-redis-ha
order: 4
level: 深入
tags: [Redis, 主从复制, Sentinel, Cluster, 高可用]
updated: 2026-11-21
terms: []
sources:
  - title: Redis docs · Replication
    url: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
    note: 主从复制、PSYNC、复制 ID 与偏移量、min-replicas-to-write 的官方说明。
  - title: Redis docs · Scale with Redis Cluster
    url: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
    note: 16384 个哈希槽、集群总线端口、3 主 3 从部署与故障转移的官方说明。
  - title: Redis docs · Sentinel
    url: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
    note: Sentinel 的监控、主观下线与客观下线判定、选举流程的官方说明。
  - title: Redis docs · WAIT
    url: https://redis.io/docs/latest/commands/wait/
    note: 等待指定数量的副本确认写入,以及其不提供强一致保证的说明。
---

单机 Redis 的可用性受限于单台主机:主机故障、进程崩溃或重启都会导致服务中断。缓存可以回源,但会话、队列与计数器会同时失效,业务能够感知。

高可用方案分为三层:主从复制提供数据副本,Sentinel 负责自动故障转移,Cluster 解决单机容量上限。三者不是互斥选择,而是按容量与可用性要求逐级叠加。

## 主从复制

在副本节点的配置中指定主节点即可建立复制关系:

```conf
replicaof 10.0.0.11 6379
```

也可以在运行时执行:

```bash
redis-cli REPLICAOF 10.0.0.11 6379
```

副本连接主节点后,主节点将持续传播后续写命令。复制为异步模式:主节点向客户端返回成功后,才将写命令发送给副本,不等待副本确认。断线重连时,副本通过 `PSYNC` 携带复制 ID 与偏移量请求续传;主节点若能找到对应的复制积压缓冲区,则执行部分重同步,否则执行全量重同步。

副本默认只读,写请求会被拒绝。这可以减少误写,但不应作为安全边界,管理类命令仍然可用。

需要特别注意一种配置组合:主节点关闭持久化,同时启用进程崩溃后自动重启。主节点重启后数据为空,副本重新同步时会清空自身数据。数据重要的场景应为主节点和副本都启用持久化;确实无法启用时,至少关闭自动重启,由人工确认后启动。

可以要求主节点在存在足够副本时才接受写入:

```conf
min-replicas-to-write 1
min-replicas-max-lag 10
```

该配置将可能丢失写入的时间窗口限制在 10 秒内,但仍属于尽力而为,不提供强一致保证。

## Sentinel

主从复制只提供副本,不负责故障转移。主节点失效后,需要将某个副本提升为主节点,并通知客户端更新地址。这一职责由 Sentinel 承担。

Sentinel 是独立的 Redis 进程,使用单独配置文件启动:

```conf
# sentinel.conf
port 26379
sentinel monitor mymaster 10.0.0.11 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
```

`2` 为法定票数(quorum):至少两个 Sentinel 判定主节点不可达,才会标记客观下线并启动选举。Sentinel 应部署奇数个,通常为 3 个,分布在不同主机。

客户端不直接配置主节点地址,而是先向 Sentinel 查询:

```bash
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

获取当前主节点地址后再建立连接。主流客户端库已内置该流程,配置中提供 Sentinel 地址列表即可。

Sentinel 适用于数据量可容纳于单机的场景:它只负责主从切换,不做数据分片,写入能力仍受单机限制。

## Cluster

当数据量或写入吞吐超过单机上限时,应部署 Cluster。Cluster 将键空间划分为 16384 个哈希槽,按键的 CRC16 结果取模分配,每个节点负责一部分槽:

```conf
# 各节点配置相同,端口不同
port 7000
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
```

启动六个实例(三主三从)后执行:

```bash
redis-cli --cluster create \
  10.0.0.21:7000 10.0.0.22:7000 10.0.0.23:7000 \
  10.0.0.24:7000 10.0.0.25:7000 10.0.0.26:7000 \
  --cluster-replicas 1
```

`--cluster-replicas 1` 表示为每个主节点配置一个副本。输出 `All 16384 slots covered` 表示槽分配完成。

运维中需要明确以下几点:

- 每个节点需要开放两个端口:客户端端口(如 7000)与集群总线端口(默认端口加 10000,即 17000),两者都必须在防火墙放行;
- 多键命令、事务与 Lua 脚本涉及的键必须位于同一槽。可通过 `{}` 哈希标签强制同槽,例如 `user:{1001}:profile` 与 `user:{1001}:account`;
- 扩容通过迁移槽完成,无需停机。`redis-cli --cluster reshard` 可在运行中迁移;
- 升级主节点时,先执行 `CLUSTER FAILOVER` 将主节点切换至副本,升级后再切回,影响较小;
- Cluster 不提供强一致。异步复制下,主节点回复客户端后、完成副本同步前发生故障,该段写入可能丢失。`WAIT` 可以降低概率,但不改变一致性模型。

## 方案选择

| 场景 | 方案 |
| --- | --- |
| 本地开发,允许数据丢失 | 单机 |
| 数据可容纳于单机,要求自动切换 | 主从 + 3 个 Sentinel |
| 数据量或写入超过单机 | Cluster,至少 3 主 3 从 |
| 仅需读扩展,可接受手动切换 | 一主多从,读请求分发至副本 |

应先评估单机容量,再决定高可用方案。容量不足时,仅增加 Sentinel 无法解决问题。

## 运行监控

```bash
redis-cli INFO replication
redis-cli ROLE
redis-cli CLUSTER INFO
```

主从与 Sentinel 环境重点检查 `master_link_status`(必须为 `up`)和 `master_last_io_seconds_ago`(持续增大说明同步中断)。Cluster 环境检查 `cluster_state` 是否为 `ok`、`cluster_known_nodes` 是否符合预期、`cluster_slots_ok` 是否覆盖 16384 个槽。

复制延迟应配置告警。复制中断不会立即影响读写,但在故障转移时会直接体现为数据回退:副本落后过多时,提升为主节点意味着丢失中间写入。

## 要点

- 主从复制仅提供数据副本,复制为异步模式,可能丢失最后一段写入;
- Sentinel 负责监控与自动故障转移,应部署 3 个奇数节点,客户端通过 Sentinel 获取主节点地址;
- Cluster 使用 16384 个哈希槽分片,至少 3 主 3 从,两个端口均需放行;
- 主节点关闭持久化并启用自动重启,会导致副本数据被清空,这是风险最高的配置组合;
- 先完成容量评估,再选择 Sentinel 或 Cluster;上线后持续监控复制状态与槽覆盖情况。

至此 Redis 四篇完成:部署与基本操作、数据类型与选型、持久化与备份、高可用架构。后续可继续运维主线中的 Nginx、发布流程与可观测性。

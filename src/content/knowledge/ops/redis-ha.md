---
title: 高可用：主从、哨兵与集群
summary: '单机 Redis 一挂,依赖它的接口全挂。要扛住机器故障和数据增长,有三层方案:主从复制解决数据副本,哨兵解决自动切换,集群解决单机装不下。这篇讲清三者的分工、配置命令和上线后该盯的指标。'
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
    note: 主从复制、PSYNC、复制 ID 与偏移量、min-replicas-to-write、只读副本的官方说明。
  - title: Redis docs · Scale with Redis Cluster
    url: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
    note: 16384 个哈希槽、集群总线端口、3 主 3 从部署与故障切换的官方说明。
  - title: Redis docs · Sentinel
    url: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
    note: 哨兵监控、主观/客观下线与选举切换的官方说明。
  - title: Redis docs · WAIT
    url: https://redis.io/docs/latest/commands/wait/
    note: 等待指定数量的副本确认写入,以及它不提供强一致的说明。
---

单机 Redis 的所有问题最后都指向一句话:这台机器挂了怎么办。缓存还能回源,但会话、队列、计数器跟着一起没,业务就会有感知。

解决思路分三层,从简单到复杂:主从复制、哨兵、集群。它们不是三选一,而是按数据量和可用性要求逐层加码。先把它们的分工说清楚。

## 主从:先把数据复制一份

在主库的配置文件里不用写什么,在从库上加一行就行:

```conf
replicaof 10.0.0.11 6379
```

或者运行时直接执行:

```bash
redis-cli REPLICAOF 10.0.0.11 6379
```

从库连上主库后,主库会把后续的写命令持续发给它。复制是异步的:主库回完客户端就继续处理下一条,不等从库确认。断线重连时,从库用 `PSYNC` 带上自己记录的复制 ID 和偏移量,主库如果还能找到那段积压,就只补差异(部分重同步);找不到就整份重传(全量重同步)。

从库默认只读,写请求会被拒绝。这能挡住误写,但别把它当安全边界,管理命令仍然可用。

这里有个很容易踩的坑:主库关闭了持久化,又配置了进程崩溃自动重启。主库重启后是空库,从库一连上来同步,自己的数据也会被清空。所以只要数据重要,主库和从库都该开持久化;实在不能开,至少关掉自动重启,让人先看一眼再启动。

还可以要求「至少有 N 个从库跟上,才接受写」:

```conf
min-replicas-to-write 1
min-replicas-max-lag 10
```

它把可能丢数据的窗口限制在 10 秒内,但仍然是尽力而为,不是强一致。

## 哨兵:主库挂了自动换

主从只解决了副本,主库真挂了,还得有人把某个从库提升为主库,并通知客户端改地址。这件事由 Sentinel 做。

哨兵本身也是 Redis 进程,用单独的配置文件启动:

```conf
# sentinel.conf
port 26379
sentinel monitor mymaster 10.0.0.11 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
```

最后那个 `2` 是法定票数(quorum):至少两个哨兵认为主库失联,才判定客观下线并开始选举。哨兵要部署奇数个,通常 3 个,分别放在不同机器上。

客户端不再直连主库地址,而是先问哨兵:

```bash
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

拿到当前主库地址再连接。主流客户端库都内置了这个流程,配置里给一组哨兵地址即可。

哨兵适合「数据能装进一台机器」的场景:它只做主从切换,不做数据分片,写能力仍然受单机限制。

## 集群:数据分片到多台

数据量或写入量超过一台机器时,上 Cluster。它把整个键空间切成 16384 个哈希槽,按键的 CRC16 取模分配,每个节点负责一部分槽:

```conf
# 每个节点都这样配,端口各不相同
port 7000
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
```

启动六个实例(三主三从),再执行:

```bash
redis-cli --cluster create \
  10.0.0.21:7000 10.0.0.22:7000 10.0.0.23:7000 \
  10.0.0.24:7000 10.0.0.25:7000 10.0.0.26:7000 \
  --cluster-replicas 1
```

`--cluster-replicas 1` 表示每个主节点配一个从节点。看到 `All 16384 slots covered` 就建好了。

几个必须记住的点:

- 每个节点要开两个端口:客户端端口 7000,以及集群总线端口 17000(默认是端口加 10000),两个都要在防火墙放行;
- 多键命令、事务、Lua 脚本涉及的键必须在同一个槽。用 `{}` 做 hash tag 可以强制同槽,比如 `user:{1001}:profile` 和 `user:{1001}:account`;
- 扩容是移动槽,不是停服迁移。`redis-cli --cluster reshard` 可以在运行中搬;
- 升级主节点先用 `CLUSTER FAILOVER` 手动切到从库,升完再切回来,业务基本无感;
- Cluster 不保证强一致。异步复制下,主库回复客户端之后、把写同步给从库之前挂掉,这段写就可能丢。`WAIT` 能降低概率,但不改变这个事实。

## 怎么选

| 情况 | 方案 |
| --- | --- |
| 本地开发、丢了无所谓 | 单机 |
| 数据能装进一台机器,要求自动切换 | 主从 + 3 哨兵 |
| 数据量或写入超过单机 | Cluster(至少 3 主 3 从) |
| 只要读扩展,能接受手动切换 | 一主多从,读走从库 |

顺序别搞反:先确认单机容量够不够,再谈高可用。数据装不下,哨兵切来切去也没用。

## 上线后盯什么

```bash
redis-cli INFO replication
redis-cli ROLE
redis-cli CLUSTER INFO
```

主从和哨兵环境重点看 `master_link_status`(必须是 `up`)和 `master_last_io_seconds_ago`(太久说明同步断了)。集群环境看 `cluster_state` 是否为 `ok`、`cluster_known_nodes` 数量对不对、`cluster_slots_ok` 是否覆盖 16384。

再给主从延迟配一条告警。复制断了不会立刻影响读写,但故障切换时就会暴露:从库数据落后太多,切过去等于回退。

## 小结

- 主从只提供副本,异步复制,可能丢最后一段写;
- 哨兵负责监控和自动切换,部署 3 个奇数节点,客户端通过哨兵拿主库地址;
- Cluster 用 16384 个槽分片,至少 3 主 3 从,两个端口都要放行;
- 主库关持久化又自动重启,会把从库一起清空,这是最危险的一种配置;
- 容量先算清,再决定用哨兵还是集群;上线后盯复制状态和槽覆盖。

到这里 Redis 的四篇就齐了:能装、会用、存得住、挂不了。接下来可以回到运维主线,继续看 Nginx、发布和可观测性。

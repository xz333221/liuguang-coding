---
title: 数据类型与选型：五种基础结构
summary: 'Redis 的 key 都是字符串,值可以是 string、hash、list、set、zset 五种基础结构,外加 Stream 这类消息结构。这篇把每种结构的常用命令跑一遍,给一张选型表,再说清大 key 和过期策略这两个运维最常遇到的问题。'
category: ops
node: ops-redis-types
order: 2
level: 入门
tags: [Redis, 数据结构, zset, Stream, 内存淘汰]
updated: 2026-11-21
terms: []
sources:
  - title: Redis docs · Data types
    url: https://redis.io/docs/latest/develop/data-types/
    note: 五种基础类型与 Stream、位图、HyperLogLog 等扩展类型的官方定义和适用场景。
  - title: Redis docs · SET
    url: https://redis.io/docs/latest/commands/set/
    note: SET 的 EX / NX 选项与返回值定义,缓存互斥锁写法出自这里。
  - title: Redis docs · EXPIRE
    url: https://redis.io/docs/latest/commands/expire/
    note: 过期时间与 TTL 返回值的官方说明。
---

Redis 的键永远是字符串,值才有类型之分。选错类型不会让程序报错,但会让某类操作变得很别扭,或者让内存翻几倍。这篇把五种基础结构过一遍,每种给两三条最常用的命令,最后给一张按场景选的表。

## string:最基础的一种

字符串能存文本、数字和二进制,最大 512MB。除了 `SET` / `GET`,最常用的是三个变体:

```bash
SET page:46:views 0
INCR page:46:views              # 原子加一,返回新值
SET lock:job "1" NX EX 30       # 不存在才设置,30 秒后自动过期
```

`INCR` 适合计数,多个客户端同时加也不会丢。`SET NX EX` 是分布式锁最常见的写法:只有键不存在才能设置成功,过期时间兜住进程崩溃没释放的情况。

位图也挂在 string 上。签到、活跃用户这种「一天一个标记」的场景,用 `SETBIT` 比存一堆布尔值省内存:

```bash
SETBIT sign:2026-11:u1001 20 1   # 第 21 天签到
BITCOUNT sign:2026-11:u1001      # 本月签了几天
```

## hash:存一个对象

一个 hash 就是一张小的字段表,适合存用户资料、商品属性这种「整体读写、偶尔改一个字段」的数据:

```bash
HSET user:1001 name "徐泽" city "杭州" level 3
HGET user:1001 name
HINCRBY user:1001 level 1
HGETALL user:1001
```

比把对象序列化成 JSON 存 string 的好处是:改一个字段只写一个字段,不用整段读出来再写回去。字段不多时内存也更省。

注意:`HGETALL` 会把整个 hash 拉回来,字段上千的大对象要分页或用 `HSCAN`。

## list:两端进出的队列

list 是按插入顺序排的字符串序列,左边和右边都能进出:

```bash
LPUSH queue:mail "job-1"        # 左边进
RPOP queue:mail                 # 右边出,先进先出
BRPOP queue:mail 5              # 阻塞等 5 秒,没数据就返回 nil
```

`BRPOP` 是轻量队列的常用写法:消费者阻塞等待,有任务立刻拿到。缺点是消息取走就没了,消费者处理到一半崩溃,这条消息就丢了。要可靠消费,用下面的 Stream。

## set:去重与集合运算

set 是无序不重复的集合,适合标签、关注列表、抽奖池这类需要判重或求交并的场景:

```bash
SADD tag:redis u1001 u1002
SISMEMBER tag:redis u1001        # 1 = 在集合里
SINTER tag:redis tag:ops         # 交集:同时关注两个标签的人
```

集合元素多时,`SINTER` 这类运算会在主线程里算完。元素上万要先估算耗时,别在高峰期跑。

## zset:带分数的排行榜

有序集合给每个元素配一个分数,按分数排序,分数相同再按元素字典序:

```bash
ZADD rank:2026-11 120 u1001 98 u1002
ZREVRANGE rank:2026-11 0 9 WITHSCORES   # 前 10 名
ZINCRBY rank:2026-11 5 u1001            # 加分
```

排行榜、延迟队列(分数存执行时间戳,到点取出来)、按时间范围查历史,都是 zset 的典型用法。它比 list 多了一个「按分数取范围」的能力,这也是它最值钱的地方。

## Stream:能确认的消息队列

Stream 是追加日志式的结构,支持消费组和 ACK:

```bash
XADD events * type "signup" uid 1001
XGROUP CREATE events g1 0
XREADGROUP GROUP g1 c1 COUNT 10 STREAMS events >
XACK events g1 <消息ID>
```

消息进了 Stream 不会因为被读走就消失,消费者处理完显式 `XACK`,崩溃后还能用 `XPENDING` 找到没确认的消息重新处理。轻量异步任务用它比 list 稳。

## 按场景选

| 场景 | 选什么 | 理由 |
| --- | --- | --- |
| 缓存一段 JSON / HTML | string | 整段读写,最简单 |
| 对象,常改单个字段 | hash | 单字段更新,不用整段回写 |
| 计数、限流 | string + `INCR` | 原子自增,配过期就是滑动窗口 |
| 简单队列 | list + `BRPOP` | 够用,但消息可能丢 |
| 可靠消息 | Stream | 消费组 + ACK + 重投 |
| 去重、标签 | set | 判重和交并差都是内置操作 |
| 排行榜、延时任务 | zset | 按分数取范围 |
| 签到、活跃标记 | string 位图 | 一个用户一个月只占几个字节 |

## 大 key 与热 key

运维排查 Redis 变慢,十次有八次是这两个问题:

- **大 key**:单个 string 几 MB,或者 hash / list / set 有几十万元素。读写它要占住主线程,网络也要传很久。用 `redis-cli --bigkeys` 扫一遍,把大 key 拆小或移到别处。
- **热 key**:某个键每秒被访问几十万次,所有请求都压到同一个节点。加本地缓存、把 key 加随机后缀分散到多个键,都能缓解。

注意:`--bigkeys` 也是扫描,低峰期跑,别在业务高峰执行。

## 过期与淘汰

过期是键级别的:`EXPIRE key 60`。淘汰是内存级别的:内存到 `maxmemory` 后按策略删键。

```conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

常用策略:

- `noeviction`:不淘汰,写入直接报错。适合当数据库用、不能丢数据的场景;
- `allkeys-lru`:所有键里挑最久没用的删。纯缓存首选;
- `volatile-lru`:只在设了过期时间的键里淘汰。缓存和持久数据混在一个实例时用;
- `allkeys-random`:随机删。访问分布很均匀时可以,一般不推荐。

设了 `maxmemory` 却没设策略,等于把「内存满了怎么办」交给默认值,线上很容易踩到写入报错。

## 小结

- key 是字符串,值有 string / hash / list / set / zset 五种基础结构,消息用 Stream;
- 计数用 `INCR`,`SET NX EX` 做锁,对象用 hash,排行用 zset,可靠队列用 Stream;
- 大 key 拖慢主线程,热 key 压垮单节点,上线前先扫一遍;
- `maxmemory` 和淘汰策略必须一起配,只配一个等于没配。

下一篇讲数据怎么落盘: RDB 快照、AOF 日志,以及备份和恢复该怎么做。

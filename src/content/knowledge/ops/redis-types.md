---
title: Redis 数据类型与选型
summary: 'Redis 的键始终为字符串,值的类型决定可执行操作与内存开销。本文介绍 string、hash、list、set、zset 五种基础结构及 Stream,并给出选型表、大 key 与内存淘汰的处理方式。'
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
    note: 五种基础类型与 Stream、位图、HyperLogLog 等扩展类型的官方定义与适用场景。
  - title: Redis docs · SET
    url: https://redis.io/docs/latest/commands/set/
    note: SET 的 EX / NX 选项与返回值定义。
  - title: Redis docs · EXPIRE
    url: https://redis.io/docs/latest/commands/expire/
    note: 过期时间设置与 TTL 返回值的官方说明。
---

Redis 的键始终是字符串,类型差异体现在值上。值类型决定了可执行的操作、编码方式与内存开销。选型不当通常不会引发错误,但会导致操作复杂化或内存占用显著增加。

## string

字符串可存储文本、整数与二进制数据,单个值上限 512MB。除 `SET` / `GET` 外,常用变体如下:

```bash
SET page:46:views 0
INCR page:46:views              # 原子自增,返回新值
SET lock:job "1" NX EX 30       # 仅当键不存在时设置,30 秒后过期
```

`INCR` 为原子操作,多个客户端并发自增不会丢失更新。`SET NX EX` 是分布式锁的常见写法:仅当键不存在时设置成功,过期时间用于处理持有者崩溃后未主动释放的情况。

位图属于 string 的位操作,适用于签到、活跃标记等二值状态:

```bash
SETBIT sign:2026-11:u1001 20 1   # 记录第 21 天已签到
BITCOUNT sign:2026-11:u1001      # 统计本月签到天数
```

相比为每个用户保存布尔数组,位图显著降低内存占用。

## hash

hash 表示字段与值的映射,适合存储用户资料、商品属性等对象:

```bash
HSET user:1001 name "徐泽" city "杭州" level 3
HGET user:1001 name
HINCRBY user:1001 level 1
HGETALL user:1001
```

与将对象序列化为 JSON 后存入 string 相比,hash 支持单字段更新,无需读出整个对象再写回。字段数量较少时,内存占用也更低。

`HGETALL` 会返回全部字段。字段数量达到上千时,应使用 `HSCAN` 分批遍历。

## list

list 是按插入顺序排列的字符串序列,支持两端进出:

```bash
LPUSH queue:mail "job-1"        # 左端插入
RPOP queue:mail                 # 右端取出,先进先出
BRPOP queue:mail 5              # 阻塞等待 5 秒,超时返回 nil
```

`BRPOP` 常用于轻量队列:消费者阻塞等待,任务到达后立即返回。其限制在于消息取出即从列表移除,消费者处理过程中崩溃会导致消息丢失。需要可靠投递时应使用 Stream。

## set

set 是无序且不重复的字符串集合,适用于标签、关注关系、抽奖池等需要判重或集合运算的场景:

```bash
SADD tag:redis u1001 u1002
SISMEMBER tag:redis u1001        # 返回 1 表示存在
SINTER tag:redis tag:ops         # 交集
```

集合运算在主线程内完成。元素数量达到数万时,应先评估耗时,避免在流量高峰期执行。

## zset

有序集合为每个元素关联一个分数,按分数排序,分数相同时按元素字典序排列:

```bash
ZADD rank:2026-11 120 u1001 98 u1002
ZREVRANGE rank:2026-11 0 9 WITHSCORES   # 取前 10 名
ZINCRBY rank:2026-11 5 u1001            # 增加分数
```

zset 的典型用途包括排行榜、延迟队列(以执行时间戳作为分数)以及按时间范围查询。相较 list,它额外支持按分数取范围,这是其核心价值。

## Stream

Stream 是追加日志结构,支持消费组与消息确认:

```bash
XADD events * type "signup" uid 1001
XGROUP CREATE events g1 0
XREADGROUP GROUP g1 c1 COUNT 10 STREAMS events >
XACK events g1 <消息ID>
```

消息被读取后不会立即删除。消费者处理完成后显式执行 `XACK`,崩溃后可通过 `XPENDING` 查找未确认消息并重新投递。轻量异步任务使用 Stream 比 list 更可靠。

## 选型

| 场景 | 类型 | 说明 |
| --- | --- | --- |
| 缓存 JSON / HTML 片段 | string | 整段读写,实现简单 |
| 对象,单字段更新频繁 | hash | 避免整对象回写 |
| 计数、限流 | string + `INCR` | 原子自增,配合过期实现窗口 |
| 轻量队列 | list + `BRPOP` | 实现简单,但可能丢消息 |
| 可靠消息 | Stream | 消费组、ACK 与重投 |
| 判重、标签 | set | 内置交并差运算 |
| 排行榜、延迟任务 | zset | 按分数取范围 |
| 签到、活跃标记 | string 位图 | 内存占用低 |

## 大 key 与热 key

Redis 性能下降通常可归因于两类键:

- **大 key**:单个 string 达到数 MB,或 hash、list、set 包含数十万元素。读写此类键会长时间占用主线程,并产生较大的网络传输。可用 `redis-cli --bigkeys` 扫描,随后拆分或迁移。
- **热 key**:单个键的 QPS 极高,请求集中到同一节点。可通过本地缓存或为键增加随机后缀分散访问。

`--bigkeys` 本身也是扫描操作,应在低峰期执行。

## 过期与淘汰

过期作用于单个键:`EXPIRE key 60`。淘汰作用于内存:达到 `maxmemory` 后按策略删除键。

```conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

常用策略:

- `noeviction`:不淘汰,写入返回错误。适用于不允许丢失数据的场景;
- `allkeys-lru`:在全部键中淘汰最久未使用的键,纯缓存场景首选;
- `volatile-lru`:仅在设置了过期时间的键中淘汰,适用于缓存与持久数据混部的实例;
- `allkeys-random`:随机淘汰,仅在访问分布均匀时可用。

只设置 `maxmemory` 而不设置策略,内存达到上限后写入将持续报错。

## 要点

- 键为字符串,值有 string、hash、list、set、zset 五种基础结构,消息使用 Stream;
- 计数用 `INCR`,互斥用 `SET NX EX`,对象用 hash,排行用 zset,可靠队列用 Stream;
- 大 key 阻塞主线程,热 key 造成单节点过载,上线前应完成扫描;
- `maxmemory` 与淘汰策略需同时配置。

下一篇讨论持久化机制:RDB 快照、AOF 日志,以及备份与恢复流程。

---
title: Redis 是什么：装一份、连上去、用起来
summary: 'Redis 是把数据放在内存里的键值数据库,读写都在内存完成,再按策略落盘。这篇从装一份单机 Redis 开始,用 redis-cli 连上去,把 SET / GET / EXPIRE 跑一遍,最后说清它适合放什么、不适合放什么。'
category: ops
node: ops-redis-intro
order: 1
level: 入门
tags: [Redis, 缓存, redis-cli, 安装, TTL]
updated: 2026-11-21
terms: []
sources:
  - title: Redis docs · Data types
    url: https://redis.io/docs/latest/develop/data-types/
    note: Redis 是数据结构服务器、内置类型与各自适用场景的官方说明。
  - title: Redis docs · Persistence
    url: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
    note: RDB / AOF / 不持久化三种选择的官方定义,后一篇展开。
  - title: Redis docs · Replication
    url: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
    note: 主从复制的基本机制,高可用一篇会用到。
---

后端项目里第一次出现 Redis,通常是为了一个很具体的问题:某个页面每次请求都要查三次数据库,太慢。把结果放进 Redis,第二次请求直接从内存拿,问题就没了。用顺手之后,会话、计数器、排行榜、简单队列也会慢慢搬进来。

这篇文章只做三件事:装一份能跑的 Redis,连上去把常用命令敲一遍,再说清它的边界。持久化和高可用放在后面两篇,先把单机跑通。

## 装一份

本地练手最省事的是 Docker:

```bash
docker run -d --name redis -p 6379:6379 redis:8
docker logs -f redis
```

镜像 tag 跟着官方发布走,`redis:8` 拉不到就换成 `redis:latest`。日志里出现 `Ready to accept connections` 就说明起来了。

不想用 Docker 的话,Linux 上直接装包:

```bash
sudo apt install redis-server        # Debian / Ubuntu
sudo systemctl enable --now redis    # 开机自启并立刻启动
```

Windows 没有官方长期维护的服务端版本,本地学习建议用 Docker 或 WSL。生产环境基本都在 Linux 上,这一点不用纠结。

## 连上去看看

装完先用自带的客户端连一下:

```bash
redis-cli -h 127.0.0.1 -p 6379
127.0.0.1:6379> PING
PONG
```

`PONG` 就代表网络和进程都正常。接着把最常用的几个命令跑一遍:

```bash
127.0.0.1:6379> SET site "flowdash"
OK
127.0.0.1:6379> GET site
"flowdash"
127.0.0.1:6379> EXPIRE site 60
(integer) 1
127.0.0.1:6379> TTL site
(integer) 57
```

`EXPIRE` 给键设一个存活时间,单位是秒,到点自动删除。`TTL` 查还剩多少秒,返回 `-1` 表示没设过期,`-2` 表示键已经不存在。缓存场景几乎每个键都要带过期时间,否则内存只会涨不会落。

查看当前有哪些键:

```bash
127.0.0.1:6379> KEYS *
```

注意:`KEYS` 会一次性扫描整个库,键多了会阻塞其他命令。生产环境不要用它,改用 `SCAN`,它分批返回游标,不会长时间占住主线程。

## Redis 适合放什么

Redis 的定位是「数据结构服务器」,不只是字符串缓存。常见的几类用法:

- 缓存:数据库查询结果、页面片段、接口返回,配上过期时间;
- 会话:登录态的 token 到用户 id 的映射,天然支持过期;
- 计数:文章阅读量、接口调用次数,`INCR` 是原子操作;
- 排行榜:有序集合按分数排序,取前 N 名很快;
- 简单队列:列表两端进出,或者用 Stream 做带消费组的消息队列;
- 限流与去重:集合判重、计数器加过期,挡住重复请求。

共同点是数据量可控、访问频繁、允许放在内存里。至于它内部怎么存这几种结构,下一篇单独讲。

## 不适合放什么

Redis 不是万能的,以下几种情况要绕开:

- **当作唯一的数据账本。** 订单、账目这类不能丢的数据,主库应该是 MySQL / PostgreSQL。Redis 可以做缓存或加速层,但不能是唯一副本。
- **复杂查询。** 按多个条件过滤、联表、聚合,这些是关系型数据库的活。Redis 只擅长按 key 取,或者按分数 / 范围取。
- **超大 value。** 单个 key 动辄几 MB,网络传输和删除都会变慢,还会拖累主线程。大文件放对象存储,Redis 里只存地址。
- **强一致的多步事务。** Redis 的事务和 Lua 能保证一段命令连续执行,但它不是关系库那种隔离级别,别拿它当分布式事务的底座。

## 上线前先改三处配置

单机默认配置是给本地开发用的,直接暴露到公网会出事。上线前至少确认这三项:

```conf
# redis.conf
bind 127.0.0.1 -::1
protected-mode yes
requirepass 换成一个足够长的密码
maxmemory 2gb
maxmemory-policy allkeys-lru
```

- `bind` 只监听内网地址,外网要访问就走跳板机或内网代理;
- `requirepass` 设密码,客户端用 `AUTH` 或连接串里的密码字段;
- `maxmemory` 必须设。不设上限,Redis 会把机器内存吃光,最后被系统 OOM 杀掉。淘汰策略按业务选,纯缓存常用 `allkeys-lru`。

改完配置记得重启或用 `CONFIG SET` 热改,热改之后还要 `CONFIG REWRITE` 写回文件,否则下次重启又回到旧值。

## 小结

- Redis 是内存键值数据库,读写快,持久化是可选项;
- 装一份用 Docker 最快,连上用 `redis-cli`,`PING` 返回 `PONG` 就算通了;
- 缓存键要带过期时间,查键用 `SCAN` 不用 `KEYS`;
- 它适合缓存、会话、计数、排行和简单队列,不适合当唯一账本或做复杂查询;
- 上线前设好 `bind`、`requirepass`、`maxmemory`,三样缺一不可。

下一篇看它内置的五种基础结构,以及每种结构该用在什么地方。

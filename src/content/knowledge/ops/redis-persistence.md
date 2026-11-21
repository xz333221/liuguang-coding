---
title: 持久化与备份：RDB、AOF 与恢复
summary: 'Redis 的数据在内存里,进程一停就没了。要留下来只有两条路:RDB 定时快照和 AOF 追加日志,也可以两个一起开。这篇讲清两者的取舍、fsync 策略和 AOF 重写,再给出备份与恢复的实际步骤。'
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
    note: RDB 与 AOF 的优缺点、fsync 三档策略、多部分 AOF、备份与恢复流程的官方说明。
  - title: Redis docs · BGSAVE
    url: https://redis.io/docs/latest/commands/bgsave/
    note: 后台生成 RDB 快照的命令定义。
  - title: Redis docs · BGREWRITEAOF
    url: https://redis.io/docs/latest/commands/bgrewriteaof/
    note: 后台重写 AOF 的命令定义。
  - title: Redis docs · INFO
    url: https://redis.io/docs/latest/commands/info/
    note: persistence 与 replication 段落里各监控字段的出处。
---

上一篇把 Redis 当缓存用,键过期就过期,丢了重新查库也能补回来。但只要它开始存会话、计数、队列,或者干脆被当成主存储,就得回答一个问题:进程重启之后,数据还在不在。

Redis 提供两种持久化方式:RDB 快照和 AOF 日志。它们可以单开,也可以一起开。这篇先讲清各自在做什么,再给一套能落地的备份和恢复步骤。

## RDB:定时拍一张照片

RDB 是把当前整个数据集打包成一个二进制文件,默认叫 `dump.rdb`。触发方式有两种,定时和手动:

```conf
# redis.conf:60 秒内有 1000 次写入就拍一张
save 60 1000
```

```bash
BGSAVE          # 后台拍一张,立刻返回
SAVE            # 前台拍,期间不处理其他命令,生产别用
```

`BGSAVE` 的工作方式是 `fork` 一个子进程,子进程把数据写进临时文件,写完再原子替换旧文件。父进程继续处理请求,靠操作系统的写时复制(copy-on-write)保证子进程看到的是 fork 那一刻的数据。

这样做的好处很直接:文件紧凑,适合整份拷走做备份;恢复时直接加载,大数据量下比回放日志快。代价是两次快照之间的写入没有保护,机器断电最多会丢最近几分钟的数据。数据量大时 `fork` 也会停顿一下,内存越大越明显。

## AOF:把写命令记成流水账

AOF 记的不是数据,是「改了数据的命令」。打开之后,每条写命令都会追加到日志末尾,重启时按顺序重放:

```conf
appendonly yes
appendfsync everysec
```

`appendfsync` 决定什么时候真正刷到磁盘,有三档:

- `always`:每条命令都 `fsync`。最安全,也最慢;
- `everysec`:每秒刷一次。默认值,最多丢一秒的数据,性能仍然很好;
- `no`:交给操作系统,通常几十秒才落盘一次。最快,但丢多少不好估。

绝大多数业务用 `everysec`。真要一笔都不能丢,应该换数据库,而不是把 Redis 调成 `always`。

Redis 7.0 起 AOF 改成了多部分结构:一个 base 文件(创建时是全量快照,可以是 RDB 或 AOF 格式)加若干 incr 增量文件,外面再用一个 manifest 清单管理。好处是重写失败不会把整份日志弄坏,清理和备份也按文件来。

## AOF 重写

流水账会越来越长。同一个计数器加了一万次,日志里就有一万条 `INCR`,但恢复只需要最后的值。重写就是根据当前内存里的数据,生成一份最短的命令序列:

```bash
BGREWRITEAOF
```

重写也是 `fork` 子进程去做,父进程继续接请求,同时把新写入记到新的增量文件里。7.0 之后重写失败会自动退避重试,不会反复拖垮磁盘。日常可以让它自动触发:

```conf
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

意思是 AOF 比上次重写后翻了一倍、且超过 64MB 就重写一次。具体阈值按写入量调。

## 怎么选

- 纯缓存、丢了能回源:可以关掉持久化,重启就是空库,反而干净;
- 会话、计数这类丢了很麻烦:开 AOF,`everysec`;
- 接近主存储:两个都开。AOF 保证秒级不丢,RDB 留着做冷备和快速恢复;
- 只开 AOF 不推荐。偶尔留一份 RDB,备份、迁移和排查都方便。

## 备份

RDB 文件生成后不会再被修改,所以服务运行期间直接拷走是安全的:

```bash
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%F-%H%M).rdb
sha1sum /backup/redis-*.rdb
```

实际做法是写进 cron:每小时留一份、保留 48 小时,每天再留一份、保留一个月,并且每天至少往另一台机器或对象存储传一份。只留在本机不算备份,磁盘坏了就一起没。

AOF 的备份要小心一点。7.0 之后要拷的是 `appenddirname` 指向的整个目录,而且不能在重写过程中拷,否则可能拿到半套文件。标准步骤是先关自动重写,确认没有正在进行的重写,再拷贝:

```bash
redis-cli CONFIG SET auto-aof-rewrite-percentage 0
redis-cli INFO persistence | grep aof_rewrite_in_progress
# 确认是 0 之后再打包 appenddirname 目录
```

Redis 8.10 起提供了 `BACKUP START / LIST / SEAL / CLEANUP` 一组命令,把「拍快照」和「封存」分开,不用手动关重写。版本够新就优先用它。

## 恢复

恢复的第一步永远是:先把当前坏掉的文件备份一份,再动手。然后停服务、替换文件、启动、核对:

```bash
systemctl stop redis
cp /backup/redis-2026-11-21-0300.rdb /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb
systemctl start redis
redis-cli INFO keyspace
```

用 RDB 恢复时注意 `dir` 和 `dbfilename` 两个配置,文件要放到它们指向的位置。AOF 尾部被截断通常能自动恢复,日志里会有 `AOF loaded anyway`;如果中间损坏,用 `redis-check-aof --fix` 修,修之前先留副本,因为修复可能丢掉损坏点之后的所有内容。

8.10 之后还可以用 `preload-file` 直接指定一份备份启动,适合演练恢复流程,不用改目录结构。

## 日常该看哪几个数

持久化出问题不会立刻影响读写,最容易在真出事时才发现备份是坏的。巡检时盯这几项:

```bash
redis-cli INFO persistence
```

- `rdb_last_bgsave_status`:最近一次快照成功还是失败;
- `rdb_last_save_time`:上次成功保存的时间,太久没变要查;
- `aof_last_write_status`:AOF 写入是否正常;
- `aof_rewrite_in_progress`:是否有重写在进行;
- `aof_last_bgrewrite_status`:上次重写结果。

再配一条磁盘空间告警。AOF 写不进去通常先是磁盘满,然后 Redis 拒绝写入,业务才开始报错,那时已经晚了。

## 小结

- RDB 是定时快照,紧凑、恢复快,但会丢最后几分钟;AOF 是命令日志,`everysec` 最多丢一秒;
- 7.0 起 AOF 是多部分结构,重写是 `fork` 子进程在后台做的;
- 数据重要就两个都开,纯缓存可以不开;
- 备份要离机、要校验,只留本机等于没备;
- 恢复前先备份坏文件,恢复后用 `INFO keyspace` 核对键数量。

下一篇把单机变成一组:主从复制、哨兵切换,以及数据装不下一台机器时的集群方案。

---
title: 锁、死锁与排查
summary: 'InnoDB 的行锁建立在索引之上：记录锁、间隙锁与 next-key lock 共同决定并发写入的阻塞范围。本文说明加锁规则、死锁成因与两种可用的排查入口。'
category: ops
node: ops-mysql-lock
order: 2
level: 深入
tags: [MySQL, 行锁, 间隙锁, 死锁, next-key lock]
updated: 2026-11-24
terms: []
sources:
  - title: MySQL 8.4 Reference Manual · InnoDB Locking
    url: https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html
    note: 共享锁、排他锁、记录锁、间隙锁与 next-key lock。
  - title: MySQL 8.4 Reference Manual · InnoDB Deadlocks
    url: https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks.html
    note: 死锁检测、回滚策略与最小化死锁的方法。
  - title: MySQL 8.4 Reference Manual · Performance Schema Data Locks
    url: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-locks-table.html
    note: 8.0 起用 data_locks 查看当前锁。
---

锁问题通常表现为“接口突然变慢”“某些更新一直等”，但根因往往不在锁本身，而在事务太长、索引缺失或访问顺序不一致。先把锁的类型与加锁范围弄清楚，排查才有方向。

```mermaid
flowchart LR
  T1["事务 A: 锁行 1"] --> T2["事务 B: 锁行 2"]
  T2 --> T3["A 请求行 2, 等待"]
  T3 --> T4["B 请求行 1, 等待"]
  T4 --> D["死锁检测: 回滚代价小的事务"]
```

## 锁的类型

| 锁 | 作用范围 | 说明 |
| --- | --- | --- |
| 全局锁 | 整个实例 | `FLUSH TABLES WITH READ LOCK`，备份时短时使用 |
| 表锁 | 整张表 | `LOCK TABLES`，InnoDB 日常很少用 |
| 记录锁 | 索引记录 | 锁住具体索引项 |
| 间隙锁 | 索引区间 | 锁住记录之间的空隙，防止插入 |
| next-key lock | 记录 + 间隙 | RR 下的默认加锁方式 |
| 意向锁 | 表级标记 | 表示事务将在某些行上加锁 |

共享锁（S）允许并发读，排他锁（X）互斥。`SELECT ... FOR UPDATE` 加 X 锁，`LOCK IN SHARE MODE` 加 S 锁。

## 加锁范围由索引决定

```sql
-- id 是主键，等值命中唯一记录：记录锁
UPDATE orders SET status = 1 WHERE id = 10;

-- 非唯一索引上的范围：next-key lock，锁住区间与间隙
UPDATE orders SET status = 1 WHERE user_id BETWEEN 100 AND 200;
```

关键点：

- 没有索引时，`UPDATE/DELETE` 可能扫描全表并锁住大量记录；
- 唯一索引等值命中时退化为记录锁，范围条件才会产生间隙锁；
- `SELECT ... FOR UPDATE` 同样遵循这套规则，不是“只锁这一行”；
- RC 隔离级别下间隙锁基本关闭，锁范围更小，但幻读需要应用层处理。

## 死锁

死锁是两个以上事务互相等待对方持有的锁。InnoDB 默认开启死锁检测（`innodb_deadlock_detect=ON`），检测到后回滚其中一个事务，报错 `Deadlock found when trying to get lock`。

常见成因：

- 两个事务按不同顺序更新同一组行；
- 范围更新与插入交错，间隙锁互相等待；
- 事务内先查后改，锁顺序随查询结果变化；
- 缺少索引导致锁范围扩大。

## 排查入口

```sql
SHOW ENGINE INNODB STATUS\G
```

输出中的 `LATEST DETECTED DEADLOCK` 会给出两个事务的 SQL、持有与等待的锁。8.0 起也可以用 performance_schema：

```sql
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_waits;
```

`data_locks` 看当前锁，`data_waits` 看谁在等谁。结合 `information_schema.innodb_trx` 找到对应连接与 SQL。

查看锁等待超时：

```sql
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';
```

默认 50 秒。超时时间太长会让请求堆积，太短则容易误伤正常等待，需要按业务调整。

## 降低锁冲突

1. 事务尽量短，提交后再做日志、通知与其他 IO；
2. 固定访问顺序，例如都按主键升序更新；
3. 给过滤条件建索引，避免锁范围扩大；
4. 批量更新拆小批，控制单次锁定行数；
5. 读多写少的场景评估 RC，减少间隙锁；
6. 业务允许时用乐观锁（版本号）替代长事务。

## 小结

- InnoDB 行锁加在索引上，索引缺失会放大锁范围；
- RR 下范围条件产生 next-key lock，RC 基本关闭间隙锁；
- 死锁由访问顺序与间隙锁导致，检测后回滚代价小的事务；
- `SHOW ENGINE INNODB STATUS` 与 `data_locks` 是两个直接入口；
- 减少锁冲突的核心是短事务、固定顺序与正确索引。

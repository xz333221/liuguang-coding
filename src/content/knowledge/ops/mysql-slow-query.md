---
title: 慢查询与 SQL 调优
summary: '慢查询治理是一条闭环：采集、归类、看执行计划、改写或加索引、复测。本文覆盖深分页、大表统计、JOIN 顺序与大表 DDL 的常见处理方式。'
category: ops
node: ops-mysql-slow-query
order: 2
level: 深入
tags: [MySQL, 慢查询, SQL 调优, 深分页, 在线 DDL]
updated: 2026-11-24
terms: []
sources:
  - title: MySQL 8.4 Reference Manual · Optimization
    url: https://dev.mysql.com/doc/refman/8.4/en/optimization.html
    note: 查询优化、索引与执行计划的总览。
  - title: MySQL 8.4 Reference Manual · LIMIT Query Optimization
    url: https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html
    note: LIMIT 与深分页的执行方式。
  - title: MySQL 8.4 Reference Manual · Online DDL Operations
    url: https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html
    note: 在线加索引与改表时的锁与并发行为。
---

慢查询治理不是“看到慢就加索引”。先归类：是扫描行数太多、排序落盘、锁等待，还是返回了不需要的数据。不同类型的处理方式完全不同。

```mermaid
flowchart LR
  A["采集慢查询"] --> B["归类: 扫描/排序/锁/网络"]
  B --> C["EXPLAIN 与真实执行"]
  C --> D["加索引或改写"]
  D --> E["复测并回归"]
  E --> A
```

## 采集与归类

- 开启慢查询日志，阈值按业务调整；
- 用 `pt-query-digest` 或 `performance_schema.events_statements_summary_by_digest` 聚合同类 SQL；
- 按总耗时排序，而不是单次最慢；
- 区分高频小慢与低频大慢，前者优先。

## 深分页

```sql
-- 慢：扫描并丢弃前 100000 行
SELECT * FROM orders ORDER BY id LIMIT 100000, 20;

-- 快：先按索引取主键，再关联取整行
SELECT o.*
FROM orders o
JOIN (SELECT id FROM orders ORDER BY id LIMIT 100000, 20) t
  ON t.id = o.id;
```

更好的方式是游标分页：把上一页最后一个 id 作为下一页起点。

```sql
SELECT * FROM orders WHERE id > 123456 ORDER BY id LIMIT 20;
```

游标分页要求排序键稳定且唯一，适合“下一页”而不是“跳页”。

## 大表统计

```sql
SELECT COUNT(*) FROM orders WHERE status = 1;
```

- `COUNT(*)` 在 InnoDB 上需要扫描，不能依赖缓存；
- 高频统计应使用汇总表或近似值；
- 给过滤条件建索引，但低选择性列的索引可能仍要扫大量行；
- 实时性要求不高时，用定时任务维护计数。

## JOIN 与子查询

- 小表驱动大表通常更优；
- 关联列必须有索引，否则每行都可能触发全表扫描；
- `LEFT JOIN` 后把条件写在 `WHERE` 里会退化成内连接语义，注意条件位置；
- 子查询在部分场景会被改写成半连接，最终以 `EXPLAIN` 为准。

## 排序与临时表

`Using filesort` 表示需要额外排序，`Using temporary` 表示需要临时表。处理方向：

- 让 `ORDER BY` 的列顺序与索引一致；
- 减少 `SELECT *`，避免把大字段带入排序；
- 控制 `GROUP BY` 的结果规模；
- 必要时调大 `tmp_table_size`，但根本仍是减少数据量。

## 大表 DDL

加索引、改字段在大表上可能长时间占用资源：

- 8.0 起许多操作支持 Online DDL，但仍需评估锁与复制延迟；
- 大表加索引优先低峰期，并观察从库延迟；
- 复杂变更使用 `gh-ost` 或 `pt-online-schema-change`；
- DDL 期间禁止同时跑重查询，避免锁与 IO 叠加。

## 调优闭环

1. 取一条具体 SQL 与真实参数；
2. `EXPLAIN` 看 `type/key/rows/Extra`；
3. 用 `EXPLAIN ANALYZE` 对照真实行数与耗时；
4. 只改一个变量（索引或 SQL 写法）；
5. 在接近生产的数据量上复测；
6. 上线后观察慢查询数量与延迟。

## 常见误区

- **给每个 WHERE 列都建单列索引**：优化器只能选一个，联合索引更有效；
- **用 `LIKE '%x%'` 做搜索**：B+ 树无法前缀匹配，考虑全文或搜索引擎；
- **在应用里循环查库**：N+1 查询，改成批量；
- **只优化 SQL 不看锁**：等待锁的查询在慢日志里同样很慢；
- **在从库上做重统计**：拖慢复制回放。

## 小结

- 慢查询先归类再优化，索引不是唯一答案；
- 深分页用游标或延迟关联，避免扫描丢弃；
- 统计走汇总或近似，不在线扫大表；
- 大表 DDL 与从库延迟一起评估；
- 调优以真实数据量复测，并回到慢查询监控验证。

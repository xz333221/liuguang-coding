---
title: EXPLAIN 与慢查询定位
summary: '先开慢查询日志拿到问题 SQL，再用 EXPLAIN 看访问类型、命中索引、扫描行数与额外排序，最后用 EXPLAIN ANALYZE 对照真实执行。'
category: ops
node: ops-mysql-explain
order: 2
level: 进阶
tags: [MySQL, EXPLAIN, 慢查询, 索引下推, filesort]
updated: 2026-11-24
terms: []
sources:
  - title: MySQL 8.4 Reference Manual · Using EXPLAIN
    url: https://dev.mysql.com/doc/refman/8.4/en/using-explain.html
    note: EXPLAIN 输出各列的含义与访问类型。
  - title: MySQL 8.4 Reference Manual · The Slow Query Log
    url: https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html
    note: 慢查询日志的开启、阈值与输出格式。
  - title: MySQL 8.4 Reference Manual · EXPLAIN ANALYZE
    url: https://dev.mysql.com/doc/refman/8.4/en/explain-analyze.html
    note: 8.0.18 起的真实执行计划与耗时统计。
---

慢查询排查有一个固定顺序：先确认日志开着、拿到 SQL；再看执行计划；最后才改 SQL 或加索引。跳过任何一步，都可能把时间花在错误的优化上。

```mermaid
flowchart LR
  A["慢查询日志"] --> B["拿到 SQL 与耗时"]
  B --> C["EXPLAIN 看计划"]
  C --> D["EXPLAIN ANALYZE 看真实耗时"]
  D --> E["改索引 / 改 SQL"]
  E --> F["复测"]
```

## 开启慢查询日志

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 0.5;
SET GLOBAL log_queries_not_using_indexes = ON;
SHOW VARIABLES LIKE 'slow_query_log_file';
```

- `long_query_time` 以秒为单位，支持小数；
- `log_queries_not_using_indexes` 会把没走索引的查询也记下来，但可能产生大量日志；
- 生产建议写配置文件持久化，而不是只改全局变量；
- 高频写入的实例要注意日志轮转，避免磁盘被写满。

## 读 EXPLAIN

```sql
EXPLAIN SELECT id, amount
FROM orders
WHERE user_id = 1001 AND created_at >= '2026-01-01'
ORDER BY created_at DESC
LIMIT 20;
```

重点看四列：

| 列 | 含义 | 判断 |
| --- | --- | --- |
| `type` | 访问类型 | 从好到差：const、eq_ref、ref、range、index、ALL |
| `key` | 实际使用的索引 | 为空说明没走索引 |
| `rows` | 预估扫描行数 | 越大越危险，结合 `filtered` 看有效比例 |
| `Extra` | 额外动作 | `Using filesort`、`Using temporary` 要警惕 |

`type=ALL` 是全表扫描，`type=index` 是扫整个索引，二者在大表上都要处理。`Using index` 是覆盖索引，`Using index condition` 表示索引下推生效。

## EXPLAIN ANALYZE

8.0.18 起支持真实执行：

```sql
EXPLAIN ANALYZE
SELECT COUNT(*) FROM orders WHERE user_id = 1001;
```

输出里每个节点都有实际耗时与行数。`actual rows` 与 `estimated rows` 差距很大时，说明统计信息失真，需要 `ANALYZE TABLE` 或检查索引设计。

## 索引下推

```sql
ALTER TABLE orders ADD KEY idx_user_status (user_id, status);
SELECT * FROM orders WHERE user_id = 1001 AND status = 1;
```

索引下推（ICP）把 `status` 的过滤下推到存储引擎层，减少回表次数。`Extra` 显示 `Using index condition` 表示生效。它不改变“用哪个索引”，只减少无效回表。

## 常见执行计划问题

- **有索引但没用**：隐式类型转换、函数包裹、前导通配符；
- **用了索引但扫描行数大**：索引选择性差，或范围条件太宽；
- **`Using filesort`**：排序字段不在索引顺序里，大结果集需要额外排序；
- **`Using temporary`**：GROUP BY 或 DISTINCT 需要临时表，先检查索引能否覆盖分组列；
- **关联顺序不理想**：小表驱动大表通常更优，可用 `STRAIGHT_JOIN` 验证但不要长期依赖。

## 排查流程模板

1. 从慢查询日志取 SQL、耗时、扫描行数；
2. `EXPLAIN` 看 `type/key/rows/Extra`；
3. 对关键 SQL 用 `EXPLAIN ANALYZE` 对照预估与实际；
4. 调整索引或改写 SQL，保留改写前后的执行计划；
5. 在接近生产的数据量上复测，不要只在开发库验证。

## 小结

- 慢查询日志是入口，阈值与轮转要提前配置；
- `type` 看访问方式，`rows` 看扫描量，`Extra` 看排序与临时表；
- `EXPLAIN ANALYZE` 能暴露统计信息失真；
- 索引下推减少回表，但不解决索引选择错误；
- 优化必须用真实数据量复测。

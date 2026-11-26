---
title: 文件格式与压缩：Parquet、ORC 与 Avro
summary: '列式格式让分析查询只读需要的列，行式格式适合整行写入与流式传输。本文对比 Parquet、ORC、Avro 的结构与压缩，给出格式与压缩算法的选择矩阵。'
category: bigdata
node: bigdata-file-format
order: 3
level: 进阶
tags: [Parquet, ORC, Avro, 压缩, 列式存储]
updated: 2026-11-26
terms: []
sources:
  - title: Apache Parquet Documentation
    url: https://parquet.apache.org/docs/
    note: 列式存储、Row Group 与编码。
  - title: Apache ORC Documentation
    url: https://orc.apache.org/docs/
    note: 列式格式、Stripe 与索引。
  - title: Apache Avro Documentation
    url: https://avro.apache.org/docs/
    note: 行式格式与 Schema 演进。
---

文件格式决定“读多少数据”和“花多少 CPU 解压”。分析型查询读少量列、扫大量行，列式格式能把无关列直接跳过；流式写入与整行消费则更适合行式格式。

```mermaid
flowchart LR
  A["写入"] --> B{"消费方式"}
  B -->|按列聚合| C["Parquet / ORC"]
  B -->|整行/流式| D["Avro / JSON"]
  C --> E["谓词下推 + 列裁剪"]
  D --> F["Schema 演进"]
```

## 列式与行式

- **列式**：同一列的数据连续存放，压缩率高，读取时只加载需要的列；
- **行式**：一行记录连续存放，适合整行写入、消息传输与逐条处理；
- 列式格式通常带统计信息（min/max、null 数），支持谓词下推；
- 行式格式更适合作为消息与落地缓冲，而不是大范围分析。

## Parquet

- 按 Row Group 划分，每个 Group 内按列存；
- 支持嵌套结构、字典编码、RLE/位打包；
- 与 Spark、Hive、Trino、Flink 生态兼容最好；
- 文件尾部存元数据，读取时需要先读 footer。

```sql
CREATE TABLE logs
USING parquet
PARTITIONED BY (dt)
AS SELECT * FROM raw_logs;
```

## ORC

- 按 Stripe 划分，内置轻量索引；
- 对 Hive 生态优化明显，压缩与谓词下推效果好；
- 支持 ACID（Hive 事务表）；
- 与 Parquet 功能接近，选择更多取决于生态与团队习惯。

## Avro

- 行式格式，Schema 随文件保存；
- Schema 演进能力强，适合消息与长期存储；
- 常与 Kafka、Flink 搭配；
- 不适合大规模列裁剪分析。

## 压缩算法

| 算法 | 压缩率 | 速度 | 适用 |
| --- | --- | --- | --- |
| Snappy | 中 | 快 | 热数据、交互查询 |
| Zstd | 高 | 中 | 冷数据、湖仓通用 |
| Gzip | 高 | 慢 | 归档、不常读 |
| LZ4 | 中 | 很快 | 低延迟流处理 |

压缩在文件内部按块进行，块越小并行度越高、压缩率越低。Parquet/ORC 默认使用 Snappy 或 Zstd，按查询频率与存储成本调整。

## 选择矩阵

| 场景 | 格式 | 压缩 |
| --- | --- | --- |
| 数仓明细与聚合 | Parquet | Snappy/Zstd |
| Hive 生态、ACID 表 | ORC | Zstd |
| Kafka / 流式消息 | Avro | Snappy |
| 临时交换与调试 | JSON/CSV | 不压缩 |
| 归档冷数据 | Parquet | Gzip/Zstd |

## 常见问题

- **小文件过多**：每个文件都有元数据与打开开销，先合并；
- **分区粒度过细**：目录数量爆炸，查询规划变慢；
- **Schema 漂移**：上游加字段导致读取失败，使用兼容演进；
- **压缩算法不匹配**：CPU 成为瓶颈时换更快的算法；
- **直接读 CSV 做分析**：无列裁剪、无统计信息，成本高。

## 小结

- 列式格式适合分析，行式格式适合整行与流式；
- Parquet 生态最广，ORC 对 Hive 友好，Avro 适合消息；
- 压缩在压缩率与 CPU 之间取舍，热数据优先速度；
- 小文件与分区粒度对性能的影响常大于格式本身；
- 格式选择要与计算引擎、表格式一起考虑。

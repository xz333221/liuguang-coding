---
title: 对象存储与存算分离
summary: '对象存储用 HTTP API 提供海量、按量的文件服务，让计算与存储独立扩缩。本文讲清桶与对象、一致性与延迟、小文件与元数据成本，以及 S3A/OSS 的常见用法。'
category: bigdata
node: bigdata-object-storage
order: 2
level: 进阶
tags: [对象存储, S3, 存算分离, 数据湖]
updated: 2026-11-26
terms: []
sources:
  - title: Amazon S3 User Guide
    url: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
    note: 桶、对象、一致性与生命周期。
  - title: Hadoop AWS Module
    url: https://hadoop.apache.org/docs/current/hadoop-aws/tools/hadoop-aws/index.html
    note: S3A 连接器与性能注意事项。
---

存算分离把“存数据”和“算数据”拆成两个独立资源池：数据放在对象存储，计算集群按需创建与释放。它降低了闲置成本，也把延迟与小文件问题带到了前台。

```mermaid
flowchart LR
  A["计算集群(按需)"] --> B["对象存储"]
  A --> C["元数据 / Catalog"]
  C --> B
  D["多引擎: Spark / Flink / Trino"] --> A
```

## 对象存储模型

- **桶（Bucket）**：命名空间与权限边界；
- **对象（Object）**：键 + 数据 + 元数据，整体读写；
- 不支持随机修改与文件追加，更新通常重写整个对象；
- 通过 HTTP API 访问，天然适合多语言与多集群；
- 按存储量、请求次数与流量计费。

对象存储的“强一致”在现代服务中已基本具备（新对象读后可见、覆盖与删除也一致），但具体云厂商仍有差异，设计前要核对文档。

## 存算分离的收益

- 存储按量增长，不必为峰值预留磁盘；
- 计算集群可以弹性扩缩，任务结束即释放；
- 多引擎共享同一份数据；
- 备份、生命周期与跨区复制由存储层负责；
- 数据不再绑定某一套 Hadoop 集群。

## 代价与限制

- **延迟高于本地磁盘**：元数据与首字节延迟更明显；
- **小文件成本高**：每次请求都计费，Listing 也慢；
- **重命名代价大**：对象存储没有目录，重命名是复制 + 删除；
- **追加写不友好**：需要表格式（Iceberg/Hudi）支持；
- **带宽成为瓶颈**：计算与存储跨区时，流量费用与延迟上升。

## 连接器

Hadoop/Spark 通过 S3A 或厂商连接器访问对象存储：

```properties
fs.s3a.access.key=...
fs.s3a.secret.key=...
fs.s3a.endpoint=https://s3.example.com
fs.s3a.path.style.access=true
fs.s3a.fast.upload=true
fs.s3a.multipart.size=128M
```

要点：

- 凭证使用实例角色或密钥服务，不写进配置文件；
- 开启多部分上传与快速上传，减少大文件写入开销；
- 合理设置并发与超时，避免请求风暴；
- 通过 Catalog 管理表，而不是直接 Listing 目录。

## 与 HDFS 的选择

| 场景 | 优先 |
| --- | --- |
| 已有 Hadoop 集群、本地磁盘充足 | HDFS |
| 存算分离、弹性计算 | 对象存储 |
| 多引擎共享数据 | 对象存储 + 湖仓表格式 |
| 低延迟随机读写 | 本地盘 / 数据库 |
| 海量小文件 | 合并后再入湖 |

## 常见问题

- **小文件堆积**：写入端做合并，定期 compaction；
- **重命名慢**：Spark 的 `_SUCCESS` 与临时目录会产生大量重命名，改用提交协议；
- **Listing 慢**：元数据操作按前缀扫描，改用分区与 Catalog；
- **跨区流量**：计算集群与存储同区域部署；
- **权限过宽**：桶策略按前缀与角色收敛。

## 小结

- 对象存储按桶与对象组织，适合海量、按量与多引擎共享；
- 存算分离提升弹性与成本效率，代价是延迟与小文件成本；
- 表格式与 Catalog 弥补对象存储缺少目录与事务的问题；
- S3A 配置要关注上传、超时与凭证安全；
- 小文件与跨区流量是存算分离最常见的两个坑。

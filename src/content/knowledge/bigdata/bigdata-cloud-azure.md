---
title: Azure：Data Lake、HDInsight 与 Synapse
summary: 'Azure 用 ADLS Gen2 存数据，HDInsight 提供托管 Hadoop，Synapse 承担数仓与分析。HDInsight 已宣布退役计划，新项目应优先评估 Fabric、Databricks 与 Synapse。'
category: bigdata
node: bigdata-cloud-azure
order: 2
level: 进阶
tags: [Azure, ADLS, HDInsight, Synapse, Databricks]
updated: 2026-11-27
terms: []
sources:
  - title: Azure Data Lake Storage Gen2
    url: https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-introduction
    note: 分层命名空间与大数据存储。
  - title: Azure HDInsight Documentation
    url: https://learn.microsoft.com/en-us/azure/hdinsight/
    note: 托管 Hadoop/Spark 集群与生命周期状态。
  - title: Azure Synapse Analytics
    url: https://learn.microsoft.com/en-us/azure/synapse-analytics/overview-what-is
    note: 专用/无服务器 SQL 池与集成分析。
---

Azure 的大数据栈以 ADLS Gen2 为存储、Synapse 为分析中枢，HDInsight 曾是托管 Hadoop 的主要入口，但已进入退役周期。选型时要把“历史包袱”和“新项目”分开看。

```mermaid
flowchart LR
  A["业务数据 / 日志"] --> B["ADLS Gen2"]
  B --> C["Synapse: 无服务器 SQL"]
  B --> D["Databricks / Fabric"]
  B --> E["HDInsight (存量)"]
  C --> F["Power BI"]
  D --> F
```

## ADLS Gen2

- 基于 Blob Storage，开启分层命名空间（HNS）；
- 支持目录语义与 POSIX 权限，适合 Hadoop 生态；
- 与 Synapse、Databricks、HDInsight 共享存储；
- 生命周期管理冷热分层；
- 仍需控制小文件与请求成本。

## HDInsight

- 托管 Hadoop、Spark、Hive、HBase、Kafka、Storm；
- 与 ADLS、Synapse 集成；
- **已宣布退役计划**，官方建议迁移到 Microsoft Fabric、Azure Databricks 或 Synapse；
- 存量集群可以继续运行，但新项目不应再以 HDInsight 为首选；
- 迁移时重点核对 HBase/Kafka 等组件的替代方案。

## Synapse Analytics

- 统一工作区：SQL 池、Spark 池、数据集成与 BI；
- **专用 SQL 池**：预置资源，适合稳定数仓负载；
- **无服务器 SQL 池**：按查询扫描计费，适合探索与轻量查询；
- 支持 OPENROWSET 直接查 ADLS 文件；
- 与 Power BI 集成紧密。

## Azure Databricks

- 基于 Spark 的托管平台，Notebook、作业与 Delta Lake；
- 适合数据工程、机器学习与湖仓；
- 与 ADLS、Synapse、Power BI 集成；
- 成本按集群与 DBU 计费，需要治理闲置集群。

## Microsoft Fabric

- 统一 SaaS 分析平台：OneLake、数据工厂、数仓、实时分析；
- 适合希望减少自建集群的团队；
- 与 Power BI 深度整合；
- 迁移 HDInsight 时作为候选之一。

## 典型链路

1. 数据落到 ADLS Gen2；
2. Databricks 或 Synapse Spark 清洗，写回 Delta/Parquet；
3. Synapse SQL 池对外提供查询；
4. Power BI 做展现；
5. 存量 HDInsight 集群逐步迁移。

## 成本与治理

- 专用 SQL 池按 DWU 计费，闲置也会产生成本；
- 无服务器 SQL 按扫描量计费，分区与列存能降低成本；
- Databricks 集群要设置自动终止；
- ADLS 生命周期把冷数据转低频；
- 统一用 Unity Catalog 或 Purview 管理元数据与权限。

## 常见问题

- **新项目继续选 HDInsight**：生命周期风险高；
- **专用 SQL 池长期空转**：成本远高于无服务器查询；
- **ADLS 小文件**：查询与请求费用上升；
- **多套元数据**：Synapse、Databricks、HDInsight 各维护一份；
- **权限模型割裂**：存储、工作区与 BI 各自授权。

## 小结

- ADLS Gen2 是 Azure 大数据存储底座，支持目录与权限；
- HDInsight 已宣布退役，存量迁移、新项目选 Fabric/Databricks/Synapse；
- Synapse 提供专用与无服务器 SQL 池，按负载选择；
- Databricks 适合湖仓与机器学习，Fabric 适合 SaaS 化分析；
- 元数据与权限要跨服务统一，避免多套口径。

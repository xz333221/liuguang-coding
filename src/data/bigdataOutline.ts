// 大数据的章节目录树。
//
// 与 pythonOutline.ts / opsOutline.ts 同一套约定:编号由树位置推导,
// 节点一律 status: 'active',是否「筹备中」由子树里的文章数推导;
// 文章靠 frontmatter 的 `node` 指到叶子节点,`category` 仍是 bigdata。
import type { Category } from './catalog'

interface OutlineNode {
  id: string
  name: string
  /** 章节落地页上的一句话说明;叶子节点省略 */
  intro?: string
  children?: OutlineNode[]
}

const outline: OutlineNode[] = [
  {
    id: 'bigdata-overview',
    name: '全景与选型',
    intro: '先看清存储、计算、调度与查询各自解决什么问题,再决定批、流与湖仓的组合。',
    children: [
      { id: 'bigdata-stack', name: '大数据技术栈全景' },
      { id: 'bigdata-batch-stream', name: '批处理与流处理: 有界、无界与 Lambda/Kappa' },
      { id: 'bigdata-architecture-choice', name: '数仓、湖仓与 OLAP 的边界与选型' },
    ],
  },
  {
    id: 'bigdata-storage',
    name: '存储底座',
    intro: '大数据的第一层是存得下、读得快:分布式文件系统、对象存储与列式文件格式。',
    children: [
      { id: 'bigdata-hdfs', name: 'HDFS: NameNode、DataNode 与副本' },
      { id: 'bigdata-object-storage', name: '对象存储与存算分离' },
      { id: 'bigdata-file-format', name: '文件格式与压缩: Parquet、ORC 与 Avro' },
    ],
  },
  {
    id: 'bigdata-batch',
    name: '批处理',
    intro: '从 MapReduce 到 Spark:把大数据的计算下沉到集群,并控制 Shuffle 的成本。',
    children: [
      { id: 'bigdata-mapreduce-yarn', name: 'MapReduce 与 YARN' },
      { id: 'bigdata-spark-arch', name: 'Spark 架构: Driver、Executor 与 Stage' },
      { id: 'bigdata-spark-sql', name: 'Spark SQL 与 DataFrame' },
      { id: 'bigdata-spark-tuning', name: 'Shuffle、分区与数据倾斜调优' },
    ],
  },
  {
    id: 'bigdata-stream',
    name: '流处理',
    intro: '流处理的核心是时间、状态与一致性:Flink 如何做到低延迟与 Exactly-once。',
    children: [
      { id: 'bigdata-flink-arch', name: 'Flink 架构: JobManager 与 TaskManager' },
      { id: 'bigdata-event-time', name: '事件时间、水位线与迟到数据' },
      { id: 'bigdata-state-checkpoint', name: '状态、Checkpoint 与 Exactly-once' },
      { id: 'bigdata-realtime-dw', name: 'Flink SQL 与实时数仓' },
    ],
  },
  {
    id: 'bigdata-warehouse',
    name: '数据仓库',
    intro: '数仓解决“指标从哪来、口径是否一致”:分层、维度建模与指标治理。',
    children: [
      { id: 'bigdata-layered-model', name: '分层建模: ODS、DWD、DWS 与 ADS' },
      { id: 'bigdata-dimensional-model', name: '维度建模: 事实表、维度表与星型模型' },
      { id: 'bigdata-metrics', name: '指标与口径: 原子指标与派生指标' },
    ],
  },
  {
    id: 'bigdata-lakehouse',
    name: '湖仓与表格式',
    intro: '湖仓把数仓能力建在对象存储上:Iceberg、Hudi、Delta 与维护任务。',
    children: [
      { id: 'bigdata-iceberg', name: 'Iceberg: 快照、Manifest 与隐藏分区' },
      { id: 'bigdata-hudi-delta', name: 'Hudi 与 Delta Lake: COW、MoR 与时间旅行' },
      { id: 'bigdata-compaction', name: '小文件与 Compaction' },
    ],
  },
  {
    id: 'bigdata-nosql',
    name: 'NoSQL 数据库',
    intro: '文档型与列式数据库:按访问模式选择数据模型、索引与一致性策略。',
    children: [
      { id: 'bigdata-mongodb-model', name: 'MongoDB: 文档模型与 CRUD' },
      { id: 'bigdata-mongodb-index', name: 'MongoDB: 索引、聚合与事务' },
      { id: 'bigdata-mongodb-cluster', name: 'MongoDB: 副本集、分片与运维' },
      { id: 'bigdata-hbase-model', name: 'HBase: 表模型、RowKey 与 Region' },
      { id: 'bigdata-hbase-readwrite', name: 'HBase: 读写路径与性能' },
      { id: 'bigdata-hbase-ops', name: 'HBase: 集群运维与故障' },
    ],
  },
  {
    id: 'bigdata-integration',
    name: '数据集成',
    intro: '数据怎么进湖仓:CDC、离线同步与消息链路的取舍。',
    children: [
      { id: 'bigdata-cdc', name: 'CDC: binlog 捕获与 Flink CDC' },
      { id: 'bigdata-sync-choice', name: '离线批同步与实时同步的选型' },
    ],
  },
  {
    id: 'bigdata-governance',
    name: '调度与治理',
    intro: '任务按时跑、数据可信、权限可控,平台才算可用。',
    children: [
      { id: 'bigdata-scheduling', name: '调度: Airflow、DolphinScheduler 与 DAG' },
      { id: 'bigdata-quality', name: '数据质量: 规则、校验与告警' },
      { id: 'bigdata-metadata-security', name: '元数据、血缘、权限与脱敏' },
    ],
  },
  {
    id: 'bigdata-olap',
    name: 'OLAP 查询',
    intro: '面向分析的查询引擎:列存、MPP 与联邦查询各自的适用边界。',
    children: [
      { id: 'bigdata-clickhouse', name: 'ClickHouse: MergeTree 与物化视图' },
      { id: 'bigdata-doris', name: 'Doris / StarRocks: MPP 与数据模型' },
      { id: 'bigdata-trino', name: 'Trino / Presto: 联邦查询与连接器' },
    ],
  },
  {
    id: 'bigdata-cloud',
    name: '云上大数据',
    intro: 'AWS、Azure 与 GCP 的托管大数据服务:对象存储、批流计算与成本边界。',
    children: [
      { id: 'bigdata-cloud-aws', name: 'AWS: S3、EMR 与 Glue' },
      { id: 'bigdata-cloud-azure', name: 'Azure: Data Lake、HDInsight 与 Synapse' },
      { id: 'bigdata-cloud-gcp', name: 'GCP: GCS、Dataproc 与 BigQuery' },
      { id: 'bigdata-cloud-choice', name: '云上选型、成本与迁移' },
    ],
  },
  {
    id: 'bigdata-platform',
    name: '平台运维与成本',
    intro: '集群规划、监控告警与成本优化:让数据平台长期稳定运行。',
    children: [
      { id: 'bigdata-cluster-plan', name: '集群规划与资源调度' },
      { id: 'bigdata-monitor-cost', name: '监控、故障与成本优化' },
    ],
  },
]

function toCategory(node: OutlineNode): Category {
  return {
    id: node.id,
    name: node.name,
    intro: node.intro,
    status: 'active',
    children: node.children?.map(toCategory),
  }
}

/** 挂到 catalog 里 bigdata 分类的 children 上 */
export const bigdataChapters: Category[] = outline.map(toCategory)

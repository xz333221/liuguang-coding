// 运维的章节目录树(12 章)。
//
// 与 javaOutline.ts / frontendOutline.ts 同一套约定:编号不写进数据,由树位置推导
// (catalog.outlineNumber);节点一律 status: 'active',空不空由「子树里有几篇文章」推导,
// 补上内容后「筹备中」自动消失。文章靠 frontmatter 的 `node` 指到这里的某个 id,
// `category` 仍是 ops。
//
// 编排顺序:主机与 Shell → 网络排障 → 服务与网关 → 发布与容器 → 可观测性 →
// 中间件 → 安全与容量。中间件先写 Redis,因为缓存、会话、队列与限流都会用到它。
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
    id: 'ops-intro',
    name: '走进运维',
    intro: '运维的职责范围:主机、服务、数据与变更。先明确职责边界与排查顺序,再引入具体工具。',
  },
  {
    id: 'ops-linux',
    name: 'Linux 基础',
    intro: '登录服务器后最常用的操作:查看文件、进程与系统资源。',
    children: [
      { id: 'ops-linux-files', name: '文件、权限与目录结构' },
      { id: 'ops-linux-process', name: '进程、端口与系统资源' },
      { id: 'ops-linux-log', name: '日志与常见报错定位' },
    ],
  },
  {
    id: 'ops-shell',
    name: 'Shell 与自动化',
    intro: '将重复操作脚本化,并通过 cron 或 systemd timer 调度。',
    children: [
      { id: 'ops-shell-basics', name: '管道、重定向与常用命令' },
      { id: 'ops-shell-script', name: '编写可维护的运维脚本' },
      { id: 'ops-shell-cron', name: '定时任务:cron 与 systemd timer' },
    ],
  },
  {
    id: 'ops-network',
    name: '网络与排障',
    intro: '服务不可达时,按域名、端口、链路的顺序逐层排查,先确认边界再定位代码。',
    children: [
      { id: 'ops-network-dns', name: 'DNS 与域名解析' },
      { id: 'ops-network-tcp', name: 'TCP、端口与连接状态' },
      { id: 'ops-network-debug', name: '抓包与连通性排查' },
    ],
  },
  {
    id: 'ops-service',
    name: '服务运行',
    intro: '进程常驻、开机自启,以及异常退出后的自动拉起。',
    children: [
      { id: 'ops-service-systemd', name: 'systemd 管理服务' },
      { id: 'ops-service-pm2', name: 'Node 服务的 PM2 与日志' },
    ],
  },
  {
    id: 'ops-nginx',
    name: 'Nginx 与反向代理',
    intro: '统一入口:域名、静态资源、接口与 HTTPS。',
    children: [
      { id: 'ops-nginx-config', name: 'server / location 与常见配置' },
      { id: 'ops-nginx-tls', name: 'HTTPS、证书与跳转' },
      { id: 'ops-nginx-trouble', name: '502 / 504 的排查方法' },
    ],
  },
  {
    id: 'ops-deploy',
    name: '发布与回滚',
    intro: '一次发布应满足三个条件:可上线、可观测、可回滚。',
    children: [
      { id: 'ops-deploy-pipeline', name: '构建、上传与切换' },
      { id: 'ops-deploy-rollback', name: '回滚与灰度' },
    ],
  },
  {
    id: 'ops-container',
    name: '容器与镜像',
    intro: '使用 Docker 将运行环境与代码一同交付。',
    children: [
      { id: 'ops-container-docker', name: '镜像、容器与数据卷' },
      { id: 'ops-container-compose', name: 'Docker Compose 编排' },
    ],
  },
  {
    id: 'ops-observability',
    name: '可观测性',
    intro: '故障排查依赖日志、指标与链路数据;告警应覆盖关键指标。',
    children: [
      { id: 'ops-observability-log', name: '日志收集与检索' },
      { id: 'ops-observability-metric', name: '指标、看板与告警' },
    ],
  },
  {
    id: 'ops-database',
    name: '数据库',
    intro: '关系型数据库的安装、SQL、索引、事务、备份、复制与高可用,以 MySQL 为主线。',
    children: [
      {
        id: 'ops-mysql',
        name: 'MySQL',
        intro: '从安装与 SQL,到索引、事务、备份、复制与高可用:按运维视角维护关系型数据库。',
        children: [
          {
            id: 'ops-mysql-basics',
            name: '安装与连接',
            intro: '选对版本,把实例装起来,连上并完成最小初始化。',
            children: [
              { id: 'ops-mysql-intro', name: 'MySQL 的定位与版本选择' },
              { id: 'ops-mysql-install', name: '单机安装与 Docker 部署' },
              { id: 'ops-mysql-connect', name: '连接、字符集与最小初始化' },
            ],
          },
          {
            id: 'ops-mysql-sql',
            name: 'SQL 与表设计',
            intro: '会写增删改查,也知道字段类型与约束怎么选。',
            children: [
              { id: 'ops-mysql-sql-basic', name: '库表与增删改查' },
              { id: 'ops-mysql-schema', name: '数据类型、约束与表设计' },
            ],
          },
          {
            id: 'ops-mysql-index',
            name: '索引与执行计划',
            intro: '理解 B+ 树索引,能用 EXPLAIN 与慢查询把 SQL 定位到具体环节。',
            children: [
              { id: 'ops-mysql-index-btree', name: 'B+ 树与索引类型' },
              { id: 'ops-mysql-explain', name: 'EXPLAIN 与慢查询定位' },
              { id: 'ops-mysql-index-design', name: '索引设计原则与失效场景' },
            ],
          },
          {
            id: 'ops-mysql-tx',
            name: '事务、锁与隔离',
            intro: 'ACID、MVCC 与锁共同决定并发行为,也是死锁排查的基础。',
            children: [
              { id: 'ops-mysql-transaction', name: '事务、隔离级别与 MVCC' },
              { id: 'ops-mysql-lock', name: '锁、死锁与排查' },
            ],
          },
          {
            id: 'ops-mysql-backup',
            name: '备份与恢复',
            intro: '逻辑与物理两条备份路线,以及可验证的恢复流程。',
            children: [
              { id: 'ops-mysql-backup-basic', name: '逻辑备份与物理备份' },
              { id: 'ops-mysql-restore', name: '恢复演练与误删处理' },
            ],
          },
          {
            id: 'ops-mysql-replication',
            name: '主从复制',
            intro: 'binlog 如何驱动复制,以及延迟与不一致的排查。',
            children: [
              { id: 'ops-mysql-repl-basic', name: '复制原理与主从搭建' },
              { id: 'ops-mysql-repl-lag', name: '复制延迟与故障排查' },
            ],
          },
          {
            id: 'ops-mysql-ha',
            name: '高可用',
            intro: '从外部编排到 InnoDB Cluster,关注切换与脑裂。',
            children: [
              { id: 'ops-mysql-ha-basic', name: '高可用方案与 InnoDB Cluster' },
              { id: 'ops-mysql-failover', name: '故障切换与脑裂防范' },
            ],
          },
          {
            id: 'ops-mysql-tuning',
            name: '容量与性能',
            intro: '参数、慢查询与容量规划:让实例在压力下保持稳定。',
            children: [
              { id: 'ops-mysql-config', name: '关键参数与容量规划' },
              { id: 'ops-mysql-slow-query', name: '慢查询与 SQL 调优' },
            ],
          },
          {
            id: 'ops-mysql-security',
            name: '安全与权限',
            intro: '最小授权、注入防护与加密,覆盖账号、传输与备份。',
            children: [
              { id: 'ops-mysql-account', name: '账号、权限与最小授权' },
              { id: 'ops-mysql-security-basic', name: '注入防护、审计与加密' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ops-middleware',
    name: '中间件',
    intro: '缓存、消息等外部组件,运维关注容量、持久化与故障转移。',
    children: [
      {
        id: 'ops-redis',
        name: 'Redis',
        intro: '从单机部署与基本操作,到数据类型、持久化、备份与高可用架构。',
        children: [
          { id: 'ops-redis-intro', name: '单机部署与基本操作' },
          { id: 'ops-redis-types', name: '数据类型与选型' },
          { id: 'ops-redis-persistence', name: '持久化与备份: RDB、AOF 与恢复' },
          { id: 'ops-redis-ha', name: '高可用: 主从、Sentinel 与 Cluster' },
        ],
      },
    ],
  },
  {
    id: 'ops-security',
    name: '安全与权限',
    intro: '最小权限、密钥管理、防火墙与备份加密。',
  },
  {
    id: 'ops-capacity',
    name: '容量与成本',
    intro: '磁盘、内存、带宽与成本:容量规划与扩容时机。',
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

/** 挂到 catalog 里 ops 分类的 children 上 */
export const opsChapters: Category[] = outline.map(toCategory)

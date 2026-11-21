// 运维的章节目录树(12 章)。
//
// 与 javaOutline.ts / frontendOutline.ts 同一套约定:编号不写进数据,由树位置推导
// (catalog.outlineNumber);节点一律 status: 'active',空不空由「子树里有几篇文章」推导,
// 补上内容后「筹备中」自动消失。文章靠 frontmatter 的 `node` 指到这里的某个 id,
// `category` 仍是 ops。
//
// 编排顺序按「先能登机器,再能跑服务,最后能兜住故障」走:
// Linux 与 Shell → 网络 → 服务与网关 → 发布与容器 → 观测 → 中间件 → 安全与容量。
// 中间件先写 Redis,因为它是缓存、会话、队列、限流都用得上的一块基石。
import type { Category } from './catalog'

interface OutlineNode {
  id: string
  name: string
  /** 章节落地页上的一句话说明;叶子节点省略(名字已经说清了) */
  intro?: string
  children?: OutlineNode[]
}

const outline: OutlineNode[] = [
  {
    id: 'ops-intro',
    name: '走进运维',
    intro: '运维到底在管什么:机器、服务、数据和变更。先弄清职责边界与排查顺序,再往下学工具。',
  },
  {
    id: 'ops-linux',
    name: 'Linux 基础',
    intro: '登录一台服务器之后最常用的几件事:看文件、看进程、看资源。',
    children: [
      { id: 'ops-linux-files', name: '文件、权限与目录结构' },
      { id: 'ops-linux-process', name: '进程、端口与系统资源' },
      { id: 'ops-linux-log', name: '日志与常见报错定位' },
    ],
  },
  {
    id: 'ops-shell',
    name: 'Shell 与自动化',
    intro: '把重复操作写成脚本,再用 cron 或 systemd timer 交给机器。',
    children: [
      { id: 'ops-shell-basics', name: '管道、重定向与常用命令' },
      { id: 'ops-shell-script', name: '写一个能用的运维脚本' },
      { id: 'ops-shell-cron', name: '定时任务：cron 与 systemd timer' },
    ],
  },
  {
    id: 'ops-network',
    name: '网络与排障',
    intro: '服务连不上时,从域名、端口、链路逐层往下查,而不是先怀疑代码。',
    children: [
      { id: 'ops-network-dns', name: 'DNS 与域名解析' },
      { id: 'ops-network-tcp', name: 'TCP、端口与连接状态' },
      { id: 'ops-network-debug', name: '抓包与连通性排查' },
    ],
  },
  {
    id: 'ops-service',
    name: '服务运行',
    intro: '进程怎么常驻、开机怎么自启、挂了怎么自动拉起。',
    children: [
      { id: 'ops-service-systemd', name: 'systemd 管理服务' },
      { id: 'ops-service-pm2', name: 'Node 服务的 PM2 与日志' },
    ],
  },
  {
    id: 'ops-nginx',
    name: 'Nginx 与反向代理',
    intro: '把域名、静态资源、接口和 HTTPS 收在一个入口上。',
    children: [
      { id: 'ops-nginx-config', name: 'server / location 与常见配置' },
      { id: 'ops-nginx-tls', name: 'HTTPS、证书与跳转' },
      { id: 'ops-nginx-trouble', name: '502 / 504 怎么查' },
    ],
  },
  {
    id: 'ops-deploy',
    name: '发布与回滚',
    intro: '一次发布要能上得去、看得见、退得回。',
    children: [
      { id: 'ops-deploy-pipeline', name: '构建、上传与切换' },
      { id: 'ops-deploy-rollback', name: '回滚与灰度' },
    ],
  },
  {
    id: 'ops-container',
    name: '容器与镜像',
    intro: '用 Docker 把运行环境连同代码一起交付。',
    children: [
      { id: 'ops-container-docker', name: '镜像、容器与数据卷' },
      { id: 'ops-container-compose', name: 'Docker Compose 编排' },
    ],
  },
  {
    id: 'ops-observability',
    name: '可观测性',
    intro: '出问题时先看数据:日志、指标、链路,以及告警该盯哪几个数。',
    children: [
      { id: 'ops-observability-log', name: '日志收集与检索' },
      { id: 'ops-observability-metric', name: '指标、看板与告警' },
    ],
  },
  {
    id: 'ops-middleware',
    name: '中间件运维',
    intro: '缓存、消息与数据库这些「别人写的服务」,运维要管的是容量、持久化和故障切换。',
    children: [
      {
        id: 'ops-redis',
        name: 'Redis',
        intro: '从装一份能用的 Redis 开始,到数据类型、持久化、备份与高可用部署。',
        children: [
          { id: 'ops-redis-intro', name: 'Redis 是什么：装一份、连上去、用起来' },
          { id: 'ops-redis-types', name: '数据类型与选型：五种基础结构' },
          { id: 'ops-redis-persistence', name: '持久化与备份：RDB、AOF 与恢复' },
          { id: 'ops-redis-ha', name: '高可用：主从、哨兵与集群' },
        ],
      },
    ],
  },
  {
    id: 'ops-security',
    name: '安全与权限',
    intro: '最小权限、密钥管理、防火墙与备份加密,先把底线守住。',
  },
  {
    id: 'ops-capacity',
    name: '容量与成本',
    intro: '磁盘、内存、带宽和账单:容量规划与扩容时机。',
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

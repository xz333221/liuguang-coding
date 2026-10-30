// MySQL 连接层:连接池 + 建库建表 + 启动重试。
//
// 连接信息走环境变量(系统环境或仓库根 .env,见 index.mjs 顶部的 loadEnvFile):
//   DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME(默认 liuguang_coding)
// 库里四张表:users(账号)、sessions(登录态)、game_progress(闯关进度)、
// model_configs(按用户存的模型配置,密钥同全局仓库一样只放服务端)。
//
// 连不上不拖垮站点:static 部分照发,需要库的接口回 503,后台每 5s 重试一次
// (pm2/systemd 起来得比 mysqld 快是常态,home2026 那边也是这么处理的)。

export const DB_NAME = process.env.DB_NAME?.trim() || 'liuguang_coding'

const config = {
  host: process.env.DB_HOST?.trim() || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER?.trim() || 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 8,
  connectTimeout: 5000,
  charset: 'utf8mb4',
}

/** 数据库没就绪时抛这个,路由层翻译成 503 */
export class DatabaseUnavailableError extends Error {
  constructor() {
    super('数据库还没就绪')
    this.code = 'DB_UNAVAILABLE'
  }
}

/** null = 还没连上;连上之后所有查询都走这个池 */
let pool = null
let lastError = ''

export function dbReady() {
  return Boolean(pool)
}

export function dbStatus() {
  if (pool) return 'mysql'
  return lastError ? 'error' : 'connecting'
}

export function dbError() {
  return lastError
}

/** 建库(不带 database 连一次) + 建表 + 开池,全部就绪才置 ready */
async function initDatabase() {
  const mysql = await import('mysql2/promise')
  const admin = await mysql.createConnection({ ...config, database: undefined })
  try {
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
  } finally {
    await admin.end()
  }
  const next = mysql.createPool(config)
  for (const ddl of TABLES) await next.query(ddl)
  pool = next
  lastError = ''
  return pool
}

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
     id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
     email VARCHAR(190) NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     display_name VARCHAR(80) NOT NULL DEFAULT '',
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY uk_users_email (email)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token VARCHAR(80) NOT NULL,
     user_id BIGINT UNSIGNED NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (token),
     KEY idx_sessions_user (user_id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS game_progress (
     user_id BIGINT UNSIGNED NOT NULL,
     progress JSON NOT NULL,
     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     PRIMARY KEY (user_id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS model_configs (
     id VARCHAR(40) NOT NULL,
     user_id BIGINT UNSIGNED NOT NULL,
     endpoint VARCHAR(255) NOT NULL,
     model_name VARCHAR(120) NOT NULL,
     display_name VARCHAR(120) NOT NULL DEFAULT '',
     api_key VARCHAR(500) NOT NULL DEFAULT '',
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY uk_model_user (user_id, endpoint, model_name)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
]

/** 后台重试到就绪为止;attempts 次还不行就停,等下一次重启或手动重试 */
export function startDatabaseWithRetry({ attempts = 60, intervalMs = 5000 } = {}) {
  let left = attempts
  const tick = async () => {
    try {
      await initDatabase()
      console.log(`[db] MySQL 就绪:${config.host}:${config.port}/${config.database}`)
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      left -= 1
      if (left <= 0) {
        console.error(`[db] 重试 ${attempts} 次仍连不上 MySQL:${lastError}`)
        return
      }
      console.warn(`[db] 连不上 MySQL(${lastError}),${intervalMs / 1000}s 后重试,还剩 ${left} 次`)
      setTimeout(tick, intervalMs)
    }
  }
  void tick()
}

/** 统一查询入口。没连上库时直接抛,路由层 catch 成 503 */
export async function query(sql, params) {
  if (!pool) throw new DatabaseUnavailableError()
  return pool.query(sql, params)
}

/** 供日志/健康检查用:连接信息(不带密码) */
export function dbInfo() {
  return { host: config.host, port: config.port, database: config.database, user: config.user }
}

export const __testables = { initDatabase, config, TABLES }

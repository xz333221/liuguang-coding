// 账号与会话:scrypt 密码哈希 + 服务端会话表。
//
// 为什么用 scrypt 而不是明文/MD5:Node 内置 crypto 就有,不用引第三方,
// 参数编进哈希串(和 home2026 的 auth.js 一个格式),以后想调参数老哈希照样能验。
// token 为什么不签 JWT:本站就一个服务、一个库,不打算做多端互信,
// 会话落库反而能主动失效(退出登录即删),丢了库也就是重新登录一次的事。
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { query } from './db.mjs'

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 }
/** 验哈希时允许的最大 N,防着被人塞一条巨量参数的行把服务端算死 */
const MAX_N = 1 << 16

export async function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(String(plain), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 64 * 1024 * 1024,
  })
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt}$${key.toString('hex')}`
}

export async function passwordMatches(stored, input) {
  const record = String(stored ?? '')
  const password = String(input ?? '')
  if (!record.startsWith('scrypt$') || !password) return false
  const [, N, r, p, salt, keyHex] = record.split('$')
  if (!/^\d+$/.test(N) || !/^\d+$/.test(r) || !/^\d+$/.test(p)) return false
  const n = Number(N)
  const rr = Number(r)
  const pp = Number(p)
  if (n < 1024 || n > MAX_N || rr < 1 || rr > 32 || pp < 1 || pp > 16) return false
  const expected = Buffer.from(keyHex, 'hex')
  if (expected.length !== SCRYPT.keylen) return false
  const actual = scryptSync(password, salt, SCRYPT.keylen, {
    N: n,
    r: rr,
    p: pp,
    maxmem: 128 * 1024 * 1024,
  })
  return timingSafeEqual(expected, actual)
}

export async function findUserByEmail(email) {
  const [rows] = await query(
    'SELECT id, email, password_hash, display_name, created_at FROM users WHERE email = ? LIMIT 1',
    [email],
  )
  return rows[0] ?? null
}

export async function createUser({ email, password, displayName }) {
  const passwordHash = await hashPassword(password)
  const [result] = await query('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)', [
    email,
    passwordHash,
    displayName,
  ])
  return { id: result.insertId, email, display_name: displayName }
}

export async function issueToken(userId) {
  const token = `lg_${userId}_${randomBytes(24).toString('hex')}`
  await query('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, userId])
  return token
}

export async function revokeToken(token) {
  if (!token) return
  await query('DELETE FROM sessions WHERE token = ?', [token])
}

/** 带 token 查用户;token 无效/过期(被删)都返回 null */
export async function userForToken(token) {
  if (!token) return null
  const [rows] = await query(
    `SELECT u.id, u.email, u.display_name, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ? LIMIT 1`,
    [token],
  )
  return rows[0] ?? null
}

/** 给浏览器的形状:永远别把 password_hash 带出去 */
export function publicUser(row) {
  return { id: row.id, email: row.email, displayName: row.display_name }
}

function bearerOf(req) {
  const header = String(req.headers.authorization ?? '')
  return header.replace(/^Bearer\s+/i, '').trim()
}

/** 必须登录:没有 token 或 token 失效都 401 */
export function requireAuth(req, res, next) {
  const token = bearerOf(req)
  if (!token) return res.status(401).json({ message: '还没登录' })
  userForToken(token)
    .then((user) => {
      if (!user) return res.status(401).json({ message: '登录状态已失效,重新登录一下' })
      req.user = user
      req.token = token
      next()
    })
    .catch((error) => {
      if (error?.code === 'DB_UNAVAILABLE') return res.status(503).json({ message: '服务端数据库还没就绪' })
      next(error)
    })
}

/** 有登录态就带上 user,没有也不拦(模型配置:匿名照旧存全局仓库) */
export async function optionalUser(req) {
  const token = bearerOf(req)
  if (!token) return null
  try {
    return await userForToken(token)
  } catch {
    // 库没就绪就按匿名处理,不影响全局那套老行为
    return null
  }
}

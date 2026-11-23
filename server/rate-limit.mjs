// 进程内滑动窗口限流。
//
// 前提:单进程内存计数。本站由 pm2 常驻一个 node 进程,计数放内存里够用;
// 一旦多开实例或多机负载,额度会各算各的,得换成 Redis 之类的共享存储。
//
// 结构是 key → 时间戳数组。判断额度时惰性清掉窗口外的记录;
// 键数超过上限时顺手把所有过期键清一遍,避免被随机 key 撑爆内存。

/** 清理过期键时使用的最大窗口(注册是 1 小时,登录锁是 15 分钟) */
const MAX_WINDOW_MS = 60 * 60 * 1000
const MAX_KEYS = 5000

const buckets = new Map()

function prune(list, windowMs, now) {
  let drop = 0
  while (drop < list.length && now - list[drop] >= windowMs) drop++
  if (drop) list.splice(0, drop)
}

function sweep(now) {
  for (const [key, list] of buckets) {
    prune(list, MAX_WINDOW_MS, now)
    if (!list.length) buckets.delete(key)
  }
}

/** 只判断额度够不够,不占额度 */
export function allowed(key, limit, windowMs) {
  const list = buckets.get(String(key))
  if (!list || !list.length) return true
  const now = Date.now()
  prune(list, windowMs, now)
  return list.length < limit
}

/** 记一次(调用方自己决定什么时候记,比如建号成功才记) */
export function note(key) {
  const name = String(key)
  let list = buckets.get(name)
  if (!list) {
    list = []
    buckets.set(name, list)
  }
  list.push(Date.now())
  if (buckets.size > MAX_KEYS) sweep(Date.now())
}

/** 清空某个 key 的计数(登录成功时用) */
export function reset(key) {
  buckets.delete(String(key))
}

/**
 * 客户端标识。
 * nginx 用 $proxy_add_x_forwarded_for,会把自己看到的来源追加到末尾;
 * 前面的段是客户端自己传的、可以伪造,所以只认最后一段。
 * 没有该头时退回 TCP 对端地址。
 */
export function clientKeyOf(req) {
  const header = String(req?.headers?.['x-forwarded-for'] ?? '')
  const parts = header.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length) return parts[parts.length - 1]
  return String(req?.socket?.remoteAddress ?? req?.ip ?? 'unknown')
}

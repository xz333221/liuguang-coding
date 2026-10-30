// 闯关进度的服务端校验与合并。
// 形状和前端 src/data/game/types.ts 的 GameProgress 严格对齐 ——
// 浏览器爱传什么传什么,入库前只认这里列出的字段。

/**
 * @typedef {{ stars: number, best: number, cleared: boolean }} LevelProgress
 * @typedef {{ answered: number, correct: number, streak: number, bestStreak: number }} GameStats
 * @typedef {{ levels: Record<string, LevelProgress>, wrong: string[], stats: GameStats }} GameProgress
 */

function asInt(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

function asRate(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(Math.max(n, 0), 1)
}

function asId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 100 ? value : ''
}

/** 收拢成合法进度;字段缺失按空进度补。返回 null 表示整个不合法 */
export function normalizeGameProgress(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null

  /** @type {Record<string, LevelProgress>} */
  const levels = {}
  const rawLevels = input.levels
  if (rawLevels && typeof rawLevels === 'object' && !Array.isArray(rawLevels)) {
    for (const [id, record] of Object.entries(rawLevels)) {
      if (!asId(id) || !record || typeof record !== 'object') continue
      levels[id] = {
        stars: Math.min(asInt(record.stars), 3),
        best: asRate(record.best),
        cleared: Boolean(record.cleared),
      }
    }
  }

  const wrong = Array.isArray(input.wrong)
    ? [...new Set(input.wrong.map(asId).filter(Boolean))].slice(0, 2000)
    : []

  const rawStats = input.stats && typeof input.stats === 'object' ? input.stats : {}
  const stats = {
    answered: asInt(rawStats.answered),
    correct: asInt(rawStats.correct),
    streak: asInt(rawStats.streak),
    bestStreak: asInt(rawStats.bestStreak),
  }

  return { levels, wrong, stats }
}

/** 两份进度逐项取优:关卡按星/正确率/通关取最大,错题取并集,计数取最大 */
export function mergeGameProgress(a, b) {
  const left = normalizeGameProgress(a) ?? { levels: {}, wrong: [], stats: { answered: 0, correct: 0, streak: 0, bestStreak: 0 } }
  const right = normalizeGameProgress(b) ?? left
  const levels = { ...left.levels }
  for (const [id, record] of Object.entries(right.levels)) {
    const old = levels[id]
    levels[id] = old
      ? {
          stars: Math.max(old.stars, record.stars),
          best: Math.max(old.best, record.best),
          cleared: old.cleared || record.cleared,
        }
      : record
  }
  return {
    levels,
    wrong: [...new Set([...left.wrong, ...right.wrong])],
    stats: {
      answered: Math.max(left.stats.answered, right.stats.answered),
      correct: Math.max(left.stats.correct, right.stats.correct),
      // 当前连对只认本机:另一台设备上断掉的连对不算读者的
      streak: left.stats.streak,
      bestStreak: Math.max(left.stats.bestStreak, right.stats.bestStreak),
    },
  }
}

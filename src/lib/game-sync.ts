// 闯关进度的云端存取。登录了才走这些接口;没登录时游戏只用 localStorage,
// 这些函数根本不会被调用(见 GameApp)。
import type { GameProgress } from '../data/game'
import { apiFetch } from './auth'

export async function fetchGameProgress(): Promise<GameProgress | null> {
  const data = await apiFetch<{ progress: GameProgress | null }>('/api/game/progress')
  return data.progress
}

export async function saveGameProgress(progress: GameProgress): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/game/progress', {
    method: 'PUT',
    body: JSON.stringify({ progress }),
  })
}

/**
 * 两份进度逐项取优:关卡按星/正确率/通关取最大,错题取并集,计数取最大。
 * 首台设备登录时把本地进度"捐"上去;换设备登录时把云端进度"取"下来。
 * 和服务端 server/game.mjs 的 mergeGameProgress 是同一条规则。
 */
export function mergeProgress(local: GameProgress, remote: GameProgress): GameProgress {
  const levels = { ...local.levels }
  for (const [id, record] of Object.entries(remote.levels)) {
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
    wrong: [...new Set([...local.wrong, ...remote.wrong])],
    stats: {
      answered: Math.max(local.stats.answered, remote.stats.answered),
      correct: Math.max(local.stats.correct, remote.stats.correct),
      // 当前连对只认本机:另一台设备上断掉的连对不算读者的
      streak: local.stats.streak,
      bestStreak: Math.max(local.stats.bestStreak, remote.stats.bestStreak),
    },
  }
}

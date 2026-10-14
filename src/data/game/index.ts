// 题库的唯一入口。页面、组件都从这里取数据。
//
// 这个模块只放"纯数据 + 纯函数":它会被 astro 页面在构建期 import,
// 也可能被 Node 侧的脚本用到,所以不碰 localStorage、不碰浏览器 API。
// 进度的读写放 src/components/game/GameApp.tsx 里。

import { aiLevels } from './ai'
import type { Level, LevelProgress, Question } from './types'

export type { GameProgress, Level, LevelProgress, Question, QuestionKind } from './types'

/** 目前只有 AI 一个题库,以后别的分类按同一套结构补 */
export const levels: Level[] = aiLevels

const levelById = new Map(levels.map((level) => [level.id, level]))

export function findLevel(id: string): Level | undefined {
  return levelById.get(id)
}

/** 一关里的题目。order 字段暂时没有,按书写顺序出 */
export function questionsOf(levelId: string): Question[] {
  return findLevel(levelId)?.questions ?? []
}

/** 全部题目,错题本复查时按 id 找回来用 */
export function allQuestions(): Question[] {
  return levels.flatMap((level) => level.questions)
}

const questionById = new Map(allQuestions().map((question) => [question.id, question]))

export function findQuestion(id: string): Question | undefined {
  return questionById.get(id)
}

/** 正确率换星:全对 3 星,过半 2 星,过关线 1 星 */
export function starsFor(accuracy: number): number {
  if (accuracy >= 1) return 3
  if (accuracy >= 0.5) return 2
  return 1
}

/** 过关线:六成正确率算过 */
export const PASS_LINE = 0.6

export function passed(accuracy: number): boolean {
  return accuracy >= PASS_LINE
}

/** 上一关没过,下一关锁着 */
export function isLevelUnlocked(
  levelId: string,
  progress: Record<string, LevelProgress>,
): boolean {
  const index = levels.findIndex((level) => level.id === levelId)
  if (index <= 0) return true
  const previous = levels[index - 1]
  return Boolean(progress[previous.id]?.cleared)
}

export function nextLevelId(levelId: string): string | undefined {
  const index = levels.findIndex((level) => level.id === levelId)
  if (index < 0 || index + 1 >= levels.length) return undefined
  return levels[index + 1].id
}

/** 整库一共有多少题,首页上显示用 */
export function totalQuestions(): number {
  return allQuestions().length
}

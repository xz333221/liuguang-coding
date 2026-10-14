// 题库的唯一入口。页面、组件都从这里取数据。
//
// 这个模块只放"纯数据 + 纯函数":它会被 astro 页面在构建期 import,
// 也可能被 Node 侧的脚本用到,所以不碰 localStorage、不碰浏览器 API。
// 进度的读写放 src/components/game/GameApp.tsx 里。

import { aiLevels } from './ai'
import { pythonLevels } from './python'
import type { Deck, Level, LevelProgress, Question } from './types'

export type { Deck, GameProgress, Level, LevelProgress, Question, QuestionKind } from './types'

/**
 * 题库清单。AI 应用开发与 Python 各占一个,地图上并列,互不锁定 ——
 * 刷 Python 不用先把 AI 全通关。
 * 以后加 Java / 算法,在这里加一条、把 levels 指向新文件即可,组件不用动。
 */
export const decks: Deck[] = [
  {
    id: 'ai',
    name: 'AI 应用开发',
    intro: '面试知识地图上的主干:提示词、检索、工具调用、多智能体与微调。',
    levels: aiLevels,
  },
  {
    id: 'python',
    name: 'Python',
    intro: '数据模型与工程习惯:变量、迭代协议、装饰器、并发与内存。',
    levels: pythonLevels,
  },
]

const deckById = new Map(decks.map((deck) => [deck.id, deck]))
const levelById = new Map<string, { level: Level; deck: Deck }>()
for (const deck of decks) {
  for (const level of deck.levels) levelById.set(level.id, { level, deck })
}

export function findDeck(id: string): Deck | undefined {
  return deckById.get(id)
}

export function levelsOf(deckId: string): Level[] {
  return deckById.get(deckId)?.levels ?? []
}

/** 这一关属于哪个题库;解锁与"下一关"都按它算 */
export function deckOfLevel(levelId: string): Deck | undefined {
  return levelById.get(levelId)?.deck
}

export function findLevel(id: string): Level | undefined {
  return levelById.get(id)?.level
}

/** 一关里的题目。order 字段暂时没有,按书写顺序出 */
export function questionsOf(levelId: string): Question[] {
  return findLevel(levelId)?.questions ?? []
}

/** 全部题目,错题本复查时按 id 找回来用 */
export function allQuestions(): Question[] {
  return decks.flatMap((deck) => deck.levels.flatMap((level) => level.questions))
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

/** 同一题库里上一关没过,这一关锁着;题库之间不互相锁 */
export function isLevelUnlocked(
  levelId: string,
  progress: Record<string, LevelProgress>,
): boolean {
  const found = levelById.get(levelId)
  if (!found) return false
  const index = found.deck.levels.findIndex((level) => level.id === levelId)
  if (index <= 0) return true
  const previous = found.deck.levels[index - 1]
  return Boolean(progress[previous.id]?.cleared)
}

/** 下一个关卡,只在同一个题库里找;刷完一个题库就到此为止 */
export function nextLevelId(levelId: string): string | undefined {
  const found = levelById.get(levelId)
  if (!found) return undefined
  const index = found.deck.levels.findIndex((level) => level.id === levelId)
  if (index < 0 || index + 1 >= found.deck.levels.length) return undefined
  return found.deck.levels[index + 1].id
}

/** 一个题库通关了几关 / 共几关,地图标签上显示 */
export function deckProgress(
  deckId: string,
  progress: Record<string, LevelProgress>,
): { cleared: number; total: number } {
  const levels = levelsOf(deckId)
  return {
    cleared: levels.filter((level) => progress[level.id]?.cleared).length,
    total: levels.length,
  }
}

/** 全部题库一共有多少题,首页上显示用 */
export function totalQuestions(): number {
  return allQuestions().length
}

/** 全部题库一共有多少关 */
export function totalLevels(): number {
  return decks.reduce((sum, deck) => sum + deck.levels.length, 0)
}

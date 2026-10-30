// 闯关游戏的数据形状。
//
// 一个"题库"就是若干关卡,每关围绕一个主题出一组题。
// 题型分两类交互:
//   选一项就行    —— 单选(名词/场景/代码阅读)、判断、填空
//   要点完整再交卷 —— 多选、排序
// 两类都是先选后交:点选项只改勾选,按「确定」才判对错。
// 每题答完都要有一段解析 —— 只判对错不解释,背下来的只是个答案。

/** 题型,决定题干怎么写、选项怎么排、怎么判分 */
export type QuestionKind =
  /** 给术语,选它的解释 */
  | 'term2def'
  /** 给解释,选术语 */
  | 'def2term'
  /** 判断题:一句说法,判断对不对 */
  | 'judge'
  /** 面试场景题:一段情境,选最合适的做法 */
  | 'scenario'
  /** 多选题:选项里有两项以上正确,勾齐了再提交 */
  | 'multi'
  /** 排序题:选项在数据里按正确顺序写,界面上打散,按顺序点出来 */
  | 'order'
  /** 代码填空:code 里留一处 ____,从候选片段里挑一个填进去 */
  | 'blank'

export interface Choice {
  text: string
  /** 是否正确。单选类题目只有一个 true,多选有多个 */
  correct: boolean
  /**
   * 正确顺序里的名次。只在排序题里由 prepare 层生成 ——
   * 数据里按正确顺序书写,打散之后靠它把顺序找回来。
   */
  rank?: number
}

/** 题目想串起来的知识点,答完题给一条站内去处 */
export interface QuestionLink {
  /** 术语表锚点 id,见 src/data/glossary/ */
  term?: string
  /** 知识点地址,写成 <分类>/<文件名>,例如 ai/temperature-and-sampling */
  see?: string
}

export interface Question {
  /** 全题库唯一,错题本按它记账 */
  id: string
  kind: QuestionKind
  /** 题干 */
  prompt: string
  /** 代码片段:给了就按等宽块显示在题干下面,`____` 处是待填的横线 */
  code?: string
  /** 代码块右上角的小标签,写 python / js / sql 这类,纯装饰 */
  lang?: string
  /** 选项,2~6 个 */
  choices: Choice[]
  /** 答完给的解析:为什么这个对,以及容易踩的坑 */
  explain: string
  link?: QuestionLink
}

export interface Level {
  id: string
  name: string
  /** 这一关在讲什么,地图卡片上显示 */
  intro: string
  questions: Question[]
}

/**
 * 一个题库(deck):一串围绕同一方向的关卡。
 * AI 应用开发、Python 各是一个题库,在地图上并列成两个入口,互不锁定 ——
 * 刷 Python 不用先把 AI 全通关。
 */
export interface Deck {
  id: string
  name: string
  /** 题库的一句话说明,切换标签下面显示 */
  intro: string
  levels: Level[]
}

/** 一关的进度 */
export interface LevelProgress {
  /** 1~3,按历史最好正确率算 */
  stars: number
  /** 历史最好正确率,0~1 */
  best: number
  /** 是否通关 */
  cleared: boolean
}

export interface GameStats {
  answered: number
  correct: number
  /** 当前连续答对 */
  streak: number
  /** 历史最长连续答对 */
  bestStreak: number
}

export interface GameProgress {
  levels: Record<string, LevelProgress>
  /** 错题本里躺着的题目 id */
  wrong: string[]
  stats: GameStats
}

/** 玩家在界面上的位置 */
export type GameView =
  | { name: 'map' }
  | { name: 'play'; levelId: string; index: number }
  | { name: 'review'; index: number }
  | { name: 'result'; levelId: string }

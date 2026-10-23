// 出题前的现场加工:把题目打散成"这一次看到的样子"。
//
// 题库是手写的,写的时候顺手就把正确项放在了第一个 —— 254 道题里有 221 道正确答案在
// A,玩家连着点几关就能摸出规律,题目再难也没意义了。位置偏置这种东西不该靠人力对齐,
// 交给这一层:每开一关现场洗牌,正确答案轮流落在 A/B/C/D。
//
// 纯函数,不碰 localStorage。Math.random 在这里够用:它只影响展示顺序,不影响判分。

import type { Choice, Question } from './types'

function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

/**
 * 正确答案的位置袋子:装满一轮 [0..n-1] 再随机抽,抽空才补下一轮。
 * 这样一关下来 A/B/C/D 各摊到差不多的次数,而不是纯随机里常见的"连着四题都是 C"。
 */
class PositionBag {
  private bag: number[] = []
  private size = 0

  draw(n: number): number {
    if (this.size !== n || this.bag.length === 0) {
      this.size = n
      this.bag = shuffle([...Array(n).keys()])
    }
    return this.bag.pop() ?? 0
  }
}

/** 单选类题:正确的那项挪到 target 位,其余选项打散后依次填空位 */
function placeCorrect(question: Question, target: number): Question {
  const correct = question.choices.filter((choice) => choice.correct)
  const rest = shuffle(question.choices.filter((choice) => !choice.correct))
  // 数据写错(一个正确答案都没有 / 有好几个)时不硬凑,原样洗一下
  if (correct.length !== 1) return { ...question, choices: shuffle(question.choices) }

  const slot = Math.min(Math.max(target, 0), question.choices.length - 1)
  const choices: Choice[] = []
  for (let index = 0; index < question.choices.length; index += 1) {
    choices.push(index === slot ? correct[0] : (rest.shift() as Choice))
  }
  return { ...question, choices }
}

/** 一道题:按题型决定怎么打散 */
export function prepareQuestion(question: Question, target: number): Question {
  if (question.choices.length < 2) return question

  // 判断题就"对 / 错"两项,固定这个顺序读着才顺
  if (question.kind === 'judge') return question

  // 多选不关心正确项落在哪一位,整体洗开就行
  if (question.kind === 'multi') return { ...question, choices: shuffle(question.choices) }

  // 排序题:数据按正确顺序写,先记名次再洗;洗出来恰好还是原序就整体转一位
  if (question.kind === 'order') {
    const ranked = question.choices.map((choice, index) => ({ ...choice, rank: index }))
    const next = shuffle(ranked)
    const untouched = next.every((choice, index) => choice.rank === index)
    return { ...question, choices: untouched ? [...next.slice(1), next[0]] : next }
  }

  return placeCorrect(question, target)
}

/** 一关的题目:逐题加工,位置袋子跨题共用,保证一轮下来字母摊匀 */
export function prepareQuestions(questions: readonly Question[]): Question[] {
  const bag = new PositionBag()
  return questions.map((question) => prepareQuestion(question, bag.draw(question.choices.length)))
}

/** 判分。picked 是选项下标:单选/填空一项,多选是一组,排序题按点击先后 */
export function verdictOf(question: Question, picked: readonly number[]): boolean {
  if (question.kind === 'multi') {
    const correct = question.choices
      .map((choice, index) => (choice.correct ? index : -1))
      .filter((index) => index >= 0)
    return picked.length === correct.length && correct.every((index) => picked.includes(index))
  }

  if (question.kind === 'order') {
    if (picked.length !== question.choices.length) return false
    return picked.every((choiceIndex, position) => question.choices[choiceIndex]?.rank === position)
  }

  return Boolean(question.choices[picked[0]]?.correct)
}

/** 排序题的正确顺序,结算和解析里展示用 */
export function correctOrderOf(question: Question): Choice[] {
  return question.choices.slice().sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
}

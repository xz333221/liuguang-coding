// 温度演示用的样例数据与计算。文章里的对照表、页面首屏、浏览器里的交互共用同一份实现。
//
// 注意:candidates 是**示例数据**,用来演示温度对分布的影响,不代表任何具体模型的真实输出。

export interface Candidate {
  token: string
  /** 模型给出的原始分数,可正可负,不是概率 */
  logit: number
}

export const candidates: Candidate[] = [
  { token: '走', logit: 4.2 },
  { token: '玩', logit: 3.1 },
  { token: '吃', logit: 2.4 },
  { token: '看看', logit: 1.6 },
  { token: '睡', logit: 0.9 },
  { token: '买', logit: 0.3 },
]

/** 温度缩放 + softmax,返回归一化后的概率 */
export function softmax(items: Candidate[], temperature: number): number[] {
  const t = Math.max(temperature, 0.01)
  // 先减最大值,避免 exp 溢出(对结果没有影响)
  const max = Math.max(...items.map((item) => item.logit))
  const exps = items.map((item) => Math.exp((item.logit - max) / t))
  const sum = exps.reduce((acc, value) => acc + value, 0)
  return exps.map((value) => value / sum)
}

/** 按概率抽一次签,返回命中候选的下标 */
export function sample(probabilities: number[], random: () => number = Math.random): number {
  let acc = 0
  const roll = random()
  for (let index = 0; index < probabilities.length; index += 1) {
    acc += probabilities[index] ?? 0
    if (roll <= acc) return index
  }
  return probabilities.length - 1
}

export function formatPercent(probability: number): string {
  const percent = probability * 100
  if (percent >= 10) return `${percent.toFixed(0)}%`
  if (percent >= 1) return `${percent.toFixed(1)}%`
  if (percent < 0.05) return '0%'
  return `${percent.toFixed(1)}%`
}

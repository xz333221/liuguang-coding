import type { Term } from './types'

/** 算法:复杂度这条线上的名词。 */
export const algorithmTerms: Term[] = [
  {
    id: 'time-complexity',
    term: '时间复杂度',
    en: 'time complexity',
    group: 'algorithm',
    plain: '输入变大时，工作量涨得多快。它回答的是"规模翻倍会怎样"。',
    formal:
      '描述算法执行的基本操作次数随输入规模增长的量级，用渐进记号表示，忽略常数因子与低阶项。',
    related: ['big-o', 'space-complexity', 'growth-rate'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'space-complexity',
    term: '空间复杂度',
    en: 'space complexity',
    group: 'algorithm',
    plain: '输入变大时，额外占的内存涨得多快。递归写法还得把调用栈算进去。',
    formal:
      '算法除输入本身外所需的额外存储随输入规模增长的量级。递归深度为 n 的写法，栈空间就是 O(n)。',
    related: ['time-complexity', 'call-stack'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'big-o',
    term: 'O 记号',
    en: 'Big-O notation',
    aliases: ['大 O', '大O'],
    group: 'algorithm',
    plain: '一个"上界":不管输入怎么变，工作量再糟也不会超过这个量级。它给的是承诺，实际次数可以更少。',
    formal:
      'f(n) = O(g(n)) 表示存在常数 c 与 n₀，使 n ≥ n₀ 时 f(n) ≤ c·g(n)。只给上界，不保证紧。',
    related: ['big-omega', 'big-theta', 'asymptotic-analysis'],
    see: 'algorithm/complexity-is-about-growth',
    source: {
      title: '算法导论（CLRS）· 第 3 章:函数的增长',
      url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
    },
  },
  {
    id: 'big-omega',
    term: 'Ω 记号',
    en: 'Big-Omega notation',
    aliases: ['Ω'],
    group: 'algorithm',
    plain: '一个"下界":至少是这个量级，再快也快不过它。',
    formal:
      'f(n) = Ω(g(n)) 表示存在常数 c 与 n₀，使 n ≥ n₀ 时 f(n) ≥ c·g(n)。',
    related: ['big-o', 'big-theta'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'big-theta',
    term: 'Θ 记号',
    en: 'Big-Theta notation',
    aliases: ['Θ'],
    group: 'algorithm',
    plain: '上下界一致，也就是"恰好是这个量级"。日常口语里说 O，心里想的往往是它。',
    formal:
      '同时满足 O 与 Ω，即存在常数 c₁、c₂ 使 c₁·g(n) ≤ f(n) ≤ c₂·g(n)。',
    related: ['big-o', 'big-omega'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'asymptotic-analysis',
    term: '渐近分析',
    en: 'asymptotic analysis',
    group: 'algorithm',
    plain: '只看"n 很大时"的样子，把机器快慢、常数大小统统撇开 —— 这样得出的结论才跨得过机器。',
    formal:
      '研究函数在自变量趋于无穷时的增长行为，是复杂度分析的理论基础。',
    related: ['big-o', 'growth-rate'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'growth-rate',
    term: '增长率',
    en: 'growth rate',
    group: 'algorithm',
    plain: '输入翻倍，工作量涨几倍 —— 这个"倍数的规律"就是增长率，也是复杂度真正在比的东西。',
    formal: '函数随自变量增大而变化的相对速度。复杂度比较的是增长率，也就是两个规模之间取值的相对变化。',
    related: ['time-complexity', 'asymptotic-analysis'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'input-size',
    term: '输入规模',
    en: 'input size',
    group: 'algorithm',
    plain: '通常记作 n:数组有几个元素、图有几个点。说复杂度时，说的都是"相对它"。',
    formal:
      '衡量输入大小的量，取法视问题而定（元素个数、位数、顶点与边数），选择不同会得到不同结论。',
    related: ['time-complexity', 'growth-rate'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'basic-operation',
    term: '基本操作',
    en: 'basic operation',
    group: 'algorithm',
    plain: '挑一个"最能代表耗时"的动作来数，比如比较、赋值、交换。数它就等于数工作量。',
    formal: '复杂度分析中被计数的原子操作，要求与具体实现无关，且能反映算法的主要开销。',
    related: ['time-complexity', 'input-size'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'worst-average-case',
    term: '最坏与平均情况',
    en: 'worst / average case',
    aliases: ['最坏情况', '平均情况', '最好情况'],
    group: 'algorithm',
    plain:
      '同一段代码，运气不同次数差很多。日常说"这个算法是 O(n)"默认指最坏情况 —— 因为它是对使用者的承诺。',
    formal:
      '分别对应给定输入分布下操作次数的上确界与期望值。最坏情况是保证，平均情况依赖对输入分布的假设。',
    related: ['time-complexity', 'basic-operation'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'constant-factor',
    term: '常数因子',
    en: 'constant factor',
    group: 'algorithm',
    plain:
      '复杂度相同不代表一样快，差的那几倍就是常数因子。数据量小的时候，它说了算。',
    formal:
      '渐进记号中被忽略的乘法与加法常数。在实际数据规模下，它可能主导真实耗时，因此 O(1) 未必比 O(n) 快。',
    related: ['big-o', 'asymptotic-analysis'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'binary-search',
    term: '二分查找',
    en: 'binary search',
    group: 'algorithm',
    plain: '每次砍一半。100 万个数最多看 20 次 —— 数据每多一倍，才多花一步。',
    formal:
      '在有序序列上每次将候选区间减半的查找算法，时间复杂度 O(log n)，要求随机访问与有序性。',
    related: ['big-o', 'input-size'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'recursion',
    term: '递归',
    en: 'recursion',
    group: 'algorithm',
    plain: '函数自己调自己，把大问题拆成同形的小问题。必须有个"到底了"的终止条件，否则会一直拆下去。',
    formal:
      '通过函数自调用求解问题的方法，须有基准情形终止。每次调用占用一个栈帧，深度受栈空间限制。',
    related: ['call-stack', 'space-complexity'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'call-stack',
    term: '调用栈',
    en: 'call stack',
    group: 'algorithm',
    plain: '记录"现在跑到哪一层函数了"的那摞纸。每进一个函数压一张，函数返回就撕掉。',
    formal:
      '存放活动函数调用帧的后进先出结构。递归深度即为栈帧数量，是递归算法空间复杂度的来源。',
    related: ['recursion', 'space-complexity', 'stack-and-heap'],
    see: 'algorithm/complexity-is-about-growth',
  },
  {
    id: 'in-place-algorithm',
    term: '原地算法',
    en: 'in-place algorithm',
    group: 'algorithm',
    plain: '不额外开一大块内存，就在原数据上折腾，输出直接盖在输入上。',
    formal: '只用 O(1)（或 O(log n)）额外空间的算法，输出通常覆盖输入。堆排序是典型例子。',
    related: ['space-complexity', 'in-place'],
    see: 'algorithm/complexity-is-about-growth',
  },
]

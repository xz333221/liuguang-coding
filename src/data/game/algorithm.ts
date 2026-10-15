// 算法面试题库。
//
// 顺序按"怎么衡量 → 常用范式 → 具体结构"排:先复杂度(站点里那篇讲的就是这条线),
// 再排序、二分、递归回溯、动态规划、贪心,最后是图、数据结构与双指针。
// 题目以"判断做法对不对、量级算得对不对"为主,不考具体代码背诵。

import type { Level } from './types'

export const algorithmLevels: Level[] = [
  // ------------------------------------------------------------------
  {
    id: 'alg-complexity',
    name: '复杂度分析',
    intro: 'O 记号在数什么、怎么数基本操作、最坏与平均的差别。',
    questions: [
      {
        id: 'a-cx-1',
        kind: 'term2def',
        prompt: 'O 记号给出的是:',
        choices: [
          { text: '工作量的上界,输入变大时最多涨到多少', correct: true },
          { text: '精确的执行次数', correct: false },
          { text: '下界,至少需要多少操作', correct: false },
          { text: '程序占用的内存大小', correct: false },
        ],
        explain:
          'O 是上界承诺,实际可以更少;要"恰好是这个量级"得用 Θ。日常口语说 O,心里想的常是 Θ。',
        link: { term: 'big-o', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-cx-2',
        kind: 'judge',
        prompt: '一段代码是 O(n²),说它"比 O(n log n) 慢"在任何输入规模下都成立。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '渐进记号说的是 n 很大时的趋势。n 很小的时候,常数因子说了算,O(n²) 完全可能更快。',
        link: { term: 'constant-factor', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-cx-3',
        kind: 'scenario',
        prompt: '一个算法"外层 n 次循环,内层循环次数随 i 减半",总次数是:',
        choices: [
          { text: 'O(log n)', correct: true },
          { text: 'O(n)', correct: false },
          { text: 'O(n log n)', correct: false },
          { text: 'O(n²)', correct: false },
        ],
        explain:
          '这类"每次把范围砍一半"的结构是对数级的。二分查找正是这个形状,所以一百万个数最多看 20 次。',
        link: { term: 'binary-search', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-cx-4',
        kind: 'term2def',
        prompt: '递归函数的空间复杂度,除了辅助变量还要算:',
        choices: [
          { text: '调用栈的深度', correct: true },
          { text: '返回值的大小', correct: false },
          { text: '参数个数', correct: false },
          { text: '不需要额外计算', correct: false },
        ],
        explain:
          '每层调用压一个栈帧,深度 n 的递归栈空间就是 O(n)。尾递归优化能把它压成 O(1),但要看语言与编译器的支持。',
        link: { term: 'call-stack', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-cx-5',
        kind: 'judge',
        prompt: '说"这个算法是 O(n)"时,默认指的是最坏情况。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '最坏情况是对使用者的保证,不依赖输入分布假设。平均情况更接近日常体验,但得先说清"平均"是哪种分布下的平均。',
        link: { term: 'worst-average-case', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-cx-6',
        kind: 'scenario',
        prompt: '同一个 O(n log n) 的排序,实现 A 比 B 快 3 倍。这说明:',
        choices: [
          { text: '复杂度相同,差距来自常数因子与缓存等工程细节', correct: true },
          { text: 'A 的复杂度其实更低', correct: false },
          { text: 'B 写错了', correct: false },
          { text: 'O 记号不适用于排序', correct: false },
        ],
        explain:
          '同量级比的是工程实现:比较开销、内存访问模式、分支预测。数据量小时这 3 倍比量级更值得关注。',
        link: { term: 'growth-rate', see: 'algorithm/complexity-is-about-growth' },
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'alg-sorting',
    name: '排序',
    intro: '几种排序的量级、稳定性,以及怎么按场景选。',
    questions: [
      {
        id: 'a-so-1',
        kind: 'term2def',
        prompt: '基于比较的排序,时间复杂度下界是:',
        choices: [
          { text: 'O(n log n)', correct: true },
          { text: 'O(n)', correct: false },
          { text: 'O(n²)', correct: false },
          { text: 'O(log n)', correct: false },
        ],
        explain:
          'n 个元素有 n! 种排列,比较排序每次二分决策,最少要 log(n!) ≈ n log n 次。要更快得跳出比较模型,比如计数排序。',
        link: { term: 'big-omega', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-so-2',
        kind: 'judge',
        prompt: '快速排序的最坏情况复杂度是 O(n²)。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '每次划分都极度不均(比如已有序又取端点做 pivot)时会退化。随机化 pivot 或三数取中能把最坏变成概率上极 rare。',
        link: { term: 'worst-average-case', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-so-3',
        kind: 'term2def',
        prompt: '「稳定排序」指的是:',
        choices: [
          { text: '相等元素的相对顺序在排序后保持不变', correct: true },
          { text: '排序结果在所有输入下都一样', correct: false },
          { text: '最坏与平均复杂度相同', correct: false },
          { text: '排序过程不会修改原数组', correct: false },
        ],
        explain:
          '多轮排序(先按分数再按姓名)时稳定性很关键。归并、计数、冒泡稳定;快排、堆排、选择排序不稳定。',
      },
      {
        id: 'a-so-4',
        kind: 'scenario',
        prompt: '对一百万个 0 到 99 之间的整数排序,最合适的是:',
        choices: [
          { text: '计数排序,O(n + k)', correct: true },
          { text: '快速排序,O(n log n)', correct: false },
          { text: '堆排序,O(n log n)', correct: false },
          { text: '冒泡排序,O(n²)', correct: false },
        ],
        explain:
          '取值范围小且已知时,计数排序线性时间搞定。它是非比较排序,不适用下界结论。',
      },
      {
        id: 'a-so-5',
        kind: 'judge',
        prompt: '归并排序需要 O(n) 额外空间,堆排序是原地排序。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '归并要一块临时数组做合并;堆排直接在原数组上建堆、交换,额外空间 O(1)。所以内存敏感又要求稳定最坏 O(n log n) 时,归并与堆排各有取舍。',
        link: { term: 'in-place-algorithm', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-so-6',
        kind: 'scenario',
        prompt: '数据量很小(几十个元素)却要频繁排序。更务实的选择是:',
        choices: [
          { text: '插入排序,常数小且实现简单', correct: true },
          { text: '归并排序,保证 O(n log n)', correct: false },
          { text: '堆排序,保证最坏情况', correct: false },
          { text: '快速排序,平均最快', correct: false },
        ],
        explain:
          '小规模下常数因子主导,插入排序的简单循环往往最快。工业实现(如 TimSort)也会在小分段上切插入排序。',
        link: { term: 'constant-factor', see: 'algorithm/complexity-is-about-growth' },
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'alg-binary-search',
    name: '二分查找',
    intro: '有序是前提、区间怎么缩、左右边界怎么处理。',
    questions: [
      {
        id: 'a-bs-1',
        kind: 'judge',
        prompt: '二分查找要求被查找的序列有序,且能随机访问。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '砍一半的前提是"知道目标在哪一侧",这需要有序。链表做不到随机访问,二分也就失去意义。',
        link: { term: 'binary-search', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-bs-2',
        kind: 'scenario',
        prompt: '在长度为 1000 的有序数组里二分查找,最多比较几次:',
        choices: [
          { text: '10 次左右', correct: true },
          { text: '1000 次', correct: false },
          { text: '100 次', correct: false },
          { text: '500 次', correct: false },
        ],
        explain:
          'log₂(1000) ≈ 10。数据每翻一倍才多一次比较,这正是它值钱的地方。',
        link: { term: 'binary-search', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-bs-3',
        kind: 'term2def',
        prompt: '查找"第一个大于等于 target 的位置",二分写法上对应:',
        choices: [
          { text: '找左边界,mid 命中时收紧右端', correct: true },
          { text: '找右边界,mid 命中时收紧左端', correct: false },
          { text: '只能线性扫描', correct: false },
          { text: '先排序再二分', correct: false },
        ],
        explain:
          '这类"lower_bound"是最常考的变体。关键是循环条件用 `left < right` 还是 `<=`,以及 mid 命中后往哪边收,写错就死循环或漏边界。',
      },
      {
        id: 'a-bs-4',
        kind: 'judge',
        prompt: '二分查找也适用于"答案具有单调性"的问题,不只是有序数组。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '能在答案空间上二分:可行与不可行之间有条明确分界,就能对答案猜中点、验证、缩区间。这类"二分答案"是常见套路。',
      },
      {
        id: 'a-bs-5',
        kind: 'scenario',
        prompt: '二分查找写成死循环,最常见的原因是:',
        choices: [
          { text: '区间收缩时 left/right 更新写反,或没有保证区间一定变小', correct: true },
          { text: '数组长度是偶数', correct: false },
          { text: 'target 不在数组里', correct: false },
          { text: '用了 int 而不是 long', correct: false },
        ],
        explain:
          '`mid = (left + right) / 2` 若配 `right = mid` 而不减一,区间可能不再收缩。固定用一套模板能避开这类坑。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'alg-recursion',
    name: '递归与回溯',
    intro: '怎么拆子问题、回溯的三件事、以及什么时候改写循环。',
    questions: [
      {
        id: 'a-re-1',
        kind: 'term2def',
        prompt: '一个正确的递归必须包含:',
        choices: [
          { text: '基准情形(终止条件)与向基准推进的递归式', correct: true },
          { text: '至少两次自我调用', correct: false },
          { text: '返回值类型与入参相同', correct: false },
          { text: '用数组做缓存', correct: false },
        ],
        explain:
          '少了终止条件就是无限递归,最后栈溢出。写递归先写"什么时候停",再写"怎么变小"。',
        link: { term: 'recursion', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-re-2',
        kind: 'term2def',
        prompt: '回溯算法的典型结构是:',
        choices: [
          { text: '做选择 → 递归 → 撤销选择,沿一条路径试到底再回退', correct: true },
          { text: '把问题分成两半分别求解再合并', correct: false },
          { text: '每步都选当前最优', correct: false },
          { text: '按层扩展所有可能状态', correct: false },
        ],
        explain:
          '回溯就是带撤销的深度优先搜索,用于组合、排列、切割、N 皇后这类"穷举但要剪枝"的问题。',
      },
      {
        id: 'a-re-3',
        kind: 'judge',
        prompt: '递归深度过深时,改成显式栈的迭代写法可以避免栈溢出。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '把状态压进自己管理的堆结构,内存上限从线程栈变成堆空间。代价是代码可读性下降,要确有必要才做。',
        link: { term: 'call-stack', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-re-4',
        kind: 'scenario',
        prompt: '回溯搜索排列问题时,剪枝最直接的手段是:',
        choices: [
          { text: '在递归前就排除不可能的分支,比如已用元素不再选', correct: true },
          { text: '把递归改成多线程', correct: false },
          { text: '增大数组容量', correct: false },
          { text: '改用广度优先搜索', correct: false },
        ],
        explain:
          '回溯的效率几乎全看剪枝。越早排除无效分支,少展开的子树越多。',
      },
      {
        id: 'a-re-5',
        kind: 'judge',
        prompt: '分治算法的子问题之间通常互不重叠,动态规划的子问题往往大量重叠。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '这正是动态规划能用备忘录把指数级降到多项式的原因:同样的子状态只算一次。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'alg-dp',
    name: '动态规划',
    intro: '状态怎么定义、转移方程怎么写、以及它和贪心的分界。',
    questions: [
      {
        id: 'a-dp-1',
        kind: 'term2def',
        prompt: '动态规划适用的两个核心性质是:',
        choices: [
          { text: '最优子结构与重叠子问题', correct: true },
          { text: '有序输入与随机访问', correct: false },
          { text: '贪心选择与后无效性', correct: false },
          { text: '分治与合并', correct: false },
        ],
        explain:
          '最优子结构让大问题能由小问题拼出来,重叠子问题让缓存有意义。缺任何一条,DP 都不成立。',
      },
      {
        id: 'a-dp-2',
        kind: 'judge',
        prompt: '01 背包问题里,每个物品选或不选,用一维 DP 时内层循环要倒序遍历容量。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '倒序保证每个物品只被用一次(用的是上一层状态)。正序会变成完全背包,同一物品可重复取。',
      },
      {
        id: 'a-dp-3',
        kind: 'scenario',
        prompt: '求"最长递增子序列长度",O(n²) 的 DP 之外更优的做法是:',
        choices: [
          { text: '贪心 + 二分维护尾元素表,O(n log n)', correct: true },
          { text: '排序后一次遍历,O(n)', correct: false },
          { text: '分治,O(n log n) 但更复杂', correct: false },
          { text: '没有更优做法', correct: false },
        ],
        explain:
          '维护每个长度下的最小结尾值,新元素二分找位置。这体现了"DP 状态定义得当,转移就能更快"。',
        link: { term: 'binary-search', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-dp-4',
        kind: 'term2def',
        prompt: '动态规划与贪心的关键差别是:',
        choices: [
          { text: 'DP 考虑所有子问题的组合再选最优,贪心每步直接选当前最优', correct: true },
          { text: 'DP 一定更快', correct: false },
          { text: '贪心一定正确', correct: false },
          { text: '两者只是写法不同', correct: false },
        ],
        explain:
          '贪心靠"局部最优能导出全局最优"的性质(如活动安排、霍夫曼编码);没有这个性质时贪心会错,得用 DP。',
      },
      {
        id: 'a-dp-5',
        kind: 'judge',
        prompt: '把递归加备忘录改成自底向上的循环 DP,通常能省掉递归栈开销。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '自底向上按状态依赖顺序填表,不需要调用栈,也更容易做空间压缩(如滚动数组把二维降到一维)。',
        link: { term: 'call-stack', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-dp-6',
        kind: 'scenario',
        prompt: '写 DP 时状态定义"想不出来",通常卡在:',
        choices: [
          { text: '没找到能描述子问题的最省参数(维度选错)', correct: true },
          { text: '数组开得不够大', correct: false },
          { text: '语言不支持多维数组', correct: false },
          { text: '输入规模太小', correct: false },
        ],
        explain:
          'DP 的难点几乎都在状态设计:多一维可能多一个数量级,少一维可能丢信息。先想清楚"要决策什么、受什么约束"。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'alg-graph',
    name: '图算法',
    intro: '遍历、最短路、最小生成树,以及它们的适用前提。',
    questions: [
      {
        id: 'a-gr-1',
        kind: 'term2def',
        prompt: 'BFS 用队列、DFS 用栈,这个差别直接导致:',
        choices: [
          { text: 'BFS 按层扩散,适合求无权图最短路;DFS 沿一条路径走到底', correct: true },
          { text: 'BFS 更快', correct: false },
          { text: 'DFS 只能用于有向图', correct: false },
          { text: 'BFS 需要图是有向无环图', correct: false },
        ],
        explain:
          'BFS 第一次到达某点就是最短跳数。DFS 适合连通性、拓扑排序、找环这类"走到底"的问题。',
      },
      {
        id: 'a-gr-2',
        kind: 'judge',
        prompt: 'Dijkstra 求单源最短路时,边的权重不能为负。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '它依赖"已确定最短的点不会再变",负权会打破这个假设。有负权要用 Bellman-Ford 或 SPFA。',
      },
      {
        id: 'a-gr-3',
        kind: 'term2def',
        prompt: '拓扑排序存在的必要条件是:',
        choices: [
          { text: '图是有向无环图(DAG)', correct: true },
          { text: '图是连通的', correct: false },
          { text: '图是无向图', correct: false },
          { text: '每个点入度都为 1', correct: false },
        ],
        explain:
          '有环就排不出线性的先后顺序。Kahn 算法用入度表做,剩不下入度 0 的点就说明有环。',
      },
      {
        id: 'a-gr-4',
        kind: 'scenario',
        prompt: '要给 n 个村庄铺网线使总长度最短,选:',
        choices: [
          { text: '最小生成树(Prim / Kruskal)', correct: true },
          { text: 'Dijkstra 最短路', correct: false },
          { text: 'BFS', correct: false },
          { text: '拓扑排序', correct: false },
        ],
        explain:
          'MST 求"连通全部点的最小总边权",最短路求"两点之间最小路径",目标不同不能混用。',
      },
      {
        id: 'a-gr-5',
        kind: 'judge',
        prompt: '判断有向图有没有环,用 DFS 加三色标记是常见做法。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '白(未访问)/ 灰(在栈中)/ 黑(已完成)。DFS 遇到灰点就是遇到回边,说明有环。',
      },
      {
        id: 'a-gr-6',
        kind: 'term2def',
        prompt: '稀疏图(V 大、E 少)存图更合适的方式是:',
        choices: [
          { text: '邻接表', correct: true },
          { text: '邻接矩阵', correct: false },
          { text: '位图', correct: false },
          { text: '哈希集合', correct: false },
        ],
        explain:
          '邻接表空间 O(V + E),矩阵是 O(V²)。只有需要 O(1) 判断两点是否相连时才值得用矩阵。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'alg-structures',
    name: '数据结构',
    intro: '哈希表、堆、栈队列、链表与树,以及各自的操作量级。',
    questions: [
      {
        id: 'a-ds-1',
        kind: 'term2def',
        prompt: '哈希表平均 O(1) 查找的前提是:',
        choices: [
          { text: '哈希分布均匀且负载因子受控,冲突不多', correct: true },
          { text: '键的数量固定', correct: false },
          { text: '键是可比较的', correct: false },
          { text: '使用开放寻址法', correct: false },
        ],
        explain:
          '冲突扎堆就退化成链式 O(k)。负载因子过高会触发扩容,这也是 HashMap 容量设计成 2 的幂的原因。',
        link: { term: 'hash-table' },
      },
      {
        id: 'a-ds-2',
        kind: 'judge',
        prompt: '优先队列(堆)能在 O(log n) 内取到最大或最小元素。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '插入和弹出堆顶都是 O(log n),看堆顶是 O(1)。它不适合"查任意元素",那是平衡树或哈希表的活。',
      },
      {
        id: 'a-ds-3',
        kind: 'term2def',
        prompt: '用栈的典型场景是:',
        choices: [
          { text: '括号匹配、表达式求值、DFS、函数调用', correct: true },
          { text: '按到达顺序处理任务', correct: false },
          { text: '找第 k 大的数', correct: false },
          { text: '维护滑动窗口最值', correct: false },
        ],
        explain:
          '后进先出的场景都归栈管。按到达顺序是队列;第 k 大用堆;滑动窗口最值用单调队列。',
      },
      {
        id: 'a-ds-4',
        kind: 'scenario',
        prompt: '要在 O(1) 时间知道"最近最少使用的"的键,用什么组合:',
        choices: [
          { text: '哈希表 + 双向链表', correct: true },
          { text: '数组 + 排序', correct: false },
          { text: '栈 + 队列', correct: false },
          { text: '二叉搜索树', correct: false },
        ],
        explain:
          '哈希表 O(1) 定位节点,双向链表 O(1) 摘除与插到头部。LRU 缓存是这套组合的标准答案。',
        link: { term: 'hash-table' },
      },
      {
        id: 'a-ds-5',
        kind: 'judge',
        prompt: '平衡二叉搜索树(如 AVL、红黑树)的查找、插入、删除都是 O(log n)。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '靠旋转维持高度平衡。普通 BST 在有序输入下会退化成链表,O(n),这是它必须被平衡化的原因。',
      },
      {
        id: 'a-ds-6',
        kind: 'term2def',
        prompt: '单向链表相比数组的主要优势是:',
        choices: [
          { text: '插入删除不用移动后续元素,长度可动态增长', correct: true },
          { text: '随机访问更快', correct: false },
          { text: '更省内存', correct: false },
          { text: '缓存命中率更高', correct: false },
        ],
        explain:
          '链表每个节点都带指针,实际更占内存、缓存也更不友好。它的价值就在"改结构便宜"。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'alg-two-pointers',
    name: '双指针与滑动窗口',
    intro: '有序数组上的对撞指针、同向滑窗,以及怎么避免写成 O(n²)。',
    questions: [
      {
        id: 'a-tp-1',
        kind: 'term2def',
        prompt: '在有序数组里找"和等于 target 的两个数",双指针的做法是:',
        choices: [
          { text: '一头一尾,和大就右指针左移,和小就左指针右移', correct: true },
          { text: '两个指针都从左往右', correct: false },
          { text: '固定一个数,另一个二分', correct: false },
          { text: '两层循环枚举', correct: false },
        ],
        explain:
          '有序让"和大了该往哪收"变得确定,于是一次遍历 O(n) 就能扫完,不用两层循环。',
      },
      {
        id: 'a-tp-2',
        kind: 'judge',
        prompt: '滑动窗口能生效的前提是:窗口扩大时目标单调变化,缩小亦然。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '正是这种单调性让左右指针都只前进不后退,整体 O(n)。没有单调性就得回到哈希或 DP。',
      },
      {
        id: 'a-tp-3',
        kind: 'scenario',
        prompt: '求"最长无重复字符子串",合适的方法是:',
        choices: [
          { text: '滑动窗口 + 哈希表记录字符上次出现的位置', correct: true },
          { text: '枚举所有子串再判重,O(n²)', correct: false },
          { text: '排序后双指针', correct: false },
          { text: '动态规划', correct: false },
        ],
        explain:
          '右指针扩窗,遇到重复就把左指针直接跳到重复字符的下一位。每个字符进出窗口各一次,O(n)。',
      },
      {
        id: 'a-tp-4',
        kind: 'term2def',
        prompt: '快排的一次划分(partition)本质上用的是:',
        choices: [
          { text: '对撞双指针,把比 pivot 小的换到左边', correct: true },
          { text: '同向滑动窗口', correct: false },
          { text: '广度优先搜索', correct: false },
          { text: '单调栈', correct: false },
        ],
        explain:
          '左右指针相向而行、遇错就换,一趟把数组分成两部分。理解了这个,快排的原地性就好解释了。',
      },
      {
        id: 'a-tp-5',
        kind: 'judge',
        prompt: '「接雨水」这类问题用双指针做,关键是用左右两侧的最大高度做决策。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '每一格能存多少水由左右最大值里较小的那个决定。双指针从矮的一侧推进,边走边更新最大值,O(n) 且 O(1) 额外空间。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'alg-engineering',
    name: '工程判断',
    intro: '面试里更常问的:这个做法该不该用、代价在哪。',
    questions: [
      {
        id: 'a-eg-1',
        kind: 'scenario',
        prompt: '接口 P99 突然变高,日志显示某处排序耗时涨了。最先查:',
        choices: [
          { text: '数据量是否变了大一个量级,或者排序键的选择变了', correct: true },
          { text: '换更快的排序算法', correct: false },
          { text: '加缓存把结果存起来', correct: false },
          { text: '扩容机器', correct: false },
        ],
        explain:
          '先定位是输入规模还是常数因子变了。数据量跨过量级时,O(n log n) 与 O(n²) 的差距会突然显形。',
        link: { term: 'growth-rate', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-eg-2',
        kind: 'judge',
        prompt: '能用哈希表 O(1) 查找时,就不必再上二分或树。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '哈希表给的是精确键查找,不带顺序。要"第 k 小"、区间查询、顺序遍历,还得靠树或有序结构。',
        link: { term: 'hash-table' },
      },
      {
        id: 'a-eg-3',
        kind: 'term2def',
        prompt: '「时间换空间」的典型手法是:',
        choices: [
          { text: '预处理建索引 / 缓存,把重复计算收掉', correct: true },
          { text: '减少循环层数', correct: false },
          { text: '用更紧凑的数据类型', correct: false },
          { text: '把递归改成循环', correct: false },
        ],
        explain:
          '反过来"空间换时间"也常见:把中间结果存下来。两者都要先看哪个是瓶颈,别默认省内存就是好。',
        link: { term: 'space-complexity', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-eg-4',
        kind: 'scenario',
        prompt: '一段 O(n²) 的代码在测试环境跑 2 秒,上线后要处理十倍数据。估算耗时:',
        choices: [
          { text: '约 200 秒,平方级下十倍数据是一百倍工作量', correct: true },
          { text: '约 20 秒,线性增长', correct: false },
          { text: '约 20 秒,有缓存所以不变', correct: false },
          { text: '无法估算', correct: false },
        ],
        explain:
          '这正是要先算复杂度的理由:量级决定了扩容时会发生什么。O(n²) 在数据量上去之后是最常见的性能悬崖。',
        link: { term: 'time-complexity', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-eg-5',
        kind: 'judge',
        prompt: '递归能写出更清晰的解法时,即使有迭代等价写法也值得优先用递归。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '树的分层遍历、分治这类问题递归更贴近问题结构。确认深度可控(不会爆栈)即可,不必一律改循环。',
        link: { term: 'recursion', see: 'algorithm/complexity-is-about-growth' },
      },
      {
        id: 'a-eg-6',
        kind: 'term2def',
        prompt: '「均摊 O(1)」的典型例子是:',
        choices: [
          { text: '动态数组扩容:偶尔一次 O(n),摊到每次插入是 O(1)', correct: true },
          { text: '二分查找', correct: false },
          { text: '堆排序的一次建堆', correct: false },
          { text: '哈希表的查找', correct: false },
        ],
        explain:
          '扩容复制的代价被此前若干次廉价插入摊薄。判断这类复杂度要看"一段操作的总代价",不是单次最坏。',
        link: { term: 'worst-average-case', see: 'algorithm/complexity-is-about-growth' },
      },
    ],
  },
]

---
title: 复杂度与 Big-O:怎么估一个写法贵不贵
summary: '复杂度衡量的是代价随输入规模 n 的增长趋势,不是某台机器上的耗时;Big-O 给上界、Big-Ω 给下界、Big-Θ 给紧确界,日常只写 Big-O;估算时只留最高阶项、丢掉常数,数循环嵌套、写递推式即可;内层固定次数仍是 O(n),循环里拼字符串是隐式 O(n²),递归深度占 O(n) 栈空间。'
category: java
node: java-algorithm-complexity
order: 89
level: 进阶
tags: [复杂度, Big-O, 渐进分析, 性能]
updated: 2026-11-20
mindmap: complexity.mindmap.json
terms: ["time-complexity", "space-complexity", "growth-rate", "input-size"]
sources:
  - title: Algorithms, 4th Edition · Analysis of Algorithms
    url: https://algs4.cs.princeton.edu/home/
    note: 增长阶、上界下界与常见量级的教材定义。
  - title: OI Wiki · 复杂度
    url: https://oi-wiki.org/basic/complexity/
    note: 渐进记号、主定理与均摊分析的入门整理。
  - title: Java SE 21 API · StringBuilder
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html
    note: 字符串拼接为何是 O(n²) 的类库依据。
---

前四章一直在讲「代码怎么组织」。这一章开始换问题:同一件事有两种写法,哪个更快?答案不该靠跑一遍计时,而该靠一眼估算。这就是复杂度。

## 复杂度量的是趋势

`for` 循环一万次耗时 3 毫秒,这是**事实**,不是复杂度。复杂度回答的是:输入从一万变成十万,耗时会变成多少倍?

- 3 倍 → 线性,O(n);
- 10 倍 → 线性,O(n);
- 100 倍 → 平方,O(n²)。

所以复杂度描述的是**增长趋势**,与机器、语言、编译器优化都无关。两台机器跑同一个算法,绝对时间不同,趋势相同。这也是为什么面试只问复杂度,不问「你这台电脑跑多久」。

## 三个记号

| 记号 | 读法 | 含义 |
| --- | --- | --- |
| O(f(n)) | Big-O | 上界:最坏不超过这个量级 |
| Ω(f(n)) | Big-Omega | 下界:至少是这个量级 |
| Θ(f(n)) | Big-Theta | 紧确界:上下界一致 |

平时只说 Big-O,因为它回答「最坏情况要多久」——工程上最关心这个。说「快排是 O(n log n)」其实是省略了「平均」二字:快排最坏是 O(n²)。

## 怎么估

三步就够:

1. **找 n**。n 是输入规模,数组长度、字符串长度、节点数、行数。有两个独立规模时(O(n·m))要分别标出;
2. **数循环**。单层循环 O(n),两层嵌套 O(n²),循环里 `i *= 2` 是 O(log n);
3. **丢掉低阶项和常数**。`3n² + 5n + 100` 就是 O(n²)——n 大了以后,平方项压倒一切。

```java
// O(n)
for (int i = 0; i < n; i++) sum += a[i];

// O(n²)
for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)
        if (a[i] + a[j] == target) return true;

// O(log n):每轮把范围砍一半
while (lo < hi) {
    int mid = (lo + hi) >>> 1;
    if (a[mid] < target) lo = mid + 1; else hi = mid;
}

// O(n log n):外层 n,内层 log n
for (int i = 1; i < n; i *= 2)
    for (int j = 0; j < n; j++) work();
```

递归要写递推式,或者画递归树。归并排序 `T(n) = 2T(n/2) + O(n)`,每层总代价 O(n),共 log n 层,合计 O(n log n)。

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 300" role="img" aria-label="五种常见复杂度随输入规模增长的曲线对比">
    <rect x="6" y="6" width="748" height="288" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <line x1="70" y1="240" x2="352" y2="240" stroke="var(--line-strong)" stroke-width="1.2" />
    <line x1="70" y1="240" x2="70" y2="48" stroke="var(--line-strong)" stroke-width="1.2" />
    <text x="356" y="244" font-size="11" fill="var(--muted)">n</text>
    <text x="40" y="44" font-size="11" fill="var(--muted)">代价</text>
    <path d="M70 214 L340 214" stroke="var(--muted)" stroke-width="2" fill="none" />
    <path d="M70 214 C150 198 240 182 340 172" stroke="var(--accent)" stroke-opacity="0.45" stroke-width="2" fill="none" />
    <path d="M70 214 L340 110" stroke="var(--accent)" stroke-width="2" fill="none" />
    <path d="M70 214 C160 200 260 150 340 84" stroke="var(--highlight)" stroke-width="2" fill="none" />
    <path d="M70 214 C120 210 220 150 285 58" stroke="var(--wrong)" stroke-width="2" fill="none" />
    <g font-size="11.5">
      <line x1="392" y1="80" x2="416" y2="80" stroke="var(--muted)" stroke-width="2" />
      <text x="426" y="84" fill="var(--ink)">O(1) 常数:数组下标、哈希查找</text>
      <line x1="392" y1="116" x2="416" y2="116" stroke="var(--accent)" stroke-opacity="0.45" stroke-width="2" />
      <text x="426" y="120" fill="var(--ink)">O(log n) 二分、平衡树高度</text>
      <line x1="392" y1="152" x2="416" y2="152" stroke="var(--accent)" stroke-width="2" />
      <text x="426" y="156" fill="var(--ink)">O(n) 一次遍历</text>
      <line x1="392" y1="188" x2="416" y2="188" stroke="var(--highlight)" stroke-width="2" />
      <text x="426" y="192" fill="var(--ink)">O(n log n) 排序、分治</text>
      <line x1="392" y1="224" x2="416" y2="224" stroke="var(--wrong)" stroke-width="2" />
      <text x="426" y="228" fill="var(--ink)">O(n²) 双重循环、冒泡</text>
    </g>
    <text x="32" y="278" font-size="12" fill="var(--muted)">n 从 10³ 涨到 10⁶,O(n²) 从 10⁶ 涨到 10¹²,差六个数量级;O(n log n) 只涨了约 6.7 倍。</text>
  </svg>
  <figcaption>曲线陡不陡,决定数据量涨十倍时你是「多跑一会儿」还是「直接超时」。</figcaption>
</figure>

## 常见量级与直觉

| 量级 | n = 10⁶ 时的操作数 | 典型来源 |
| --- | --- | --- |
| O(1) | 1 | 数组下标、哈希查找(平均) |
| O(log n) | 20 | 二分、平衡树高度 |
| O(n) | 10⁶ | 一次遍历 |
| O(n log n) | 2×10⁷ | 排序、分治 |
| O(n²) | 10¹² | 双重循环、冒泡 |
| O(2ⁿ) | 天文数字 | 子集枚举、朴素递归 |

一条实用的换算:现代 CPU 一秒大约能跑 10⁸ 次简单操作。所以 n = 10⁵ 时,O(n²) 是 10¹⁰ 次,必然超时;n = 10³ 时 O(n²) 完全没问题。力扣题目给的 n 范围,本质上是在告诉你「允许什么复杂度」。

## 空间与递归

空间复杂度统计**额外**申请的内存,不算输入本身:

```java
int[] copy = new int[n];        // 额外 O(n)
```

递归不申请数组,但每层调用都在栈上占一帧,深度 d 的递归空间是 O(d)。归并排序要额外 O(n) 数组,快排递归深度平均 O(log n)、最坏 O(n)。

「原地」(in-place)指额外空间 O(1),冒泡、插入、快排的分区都是原地;归并不是。

## 两个高频误区

**一、内层循环固定次数,整体仍是 O(n)。**

```java
for (int i = 0; i < n; i++)
    for (int j = 0; j < 100; j++)       // 100 是常数,不是 n
        work();
```

这是 O(100n) = O(n)。只有内层次数与 n 相关时才是平方。

**二、循环里拼字符串是 O(n²)。**

```java
String s = "";
for (int i = 0; i < n; i++) s += i;    // 每次 += 都新建一个 String 并复制
```

`String` 不可变,每次 `+=` 都要复制已有内容,总代价 1 + 2 + … + n = O(n²)。用 `StringBuilder` 追加是均摊 O(1),整体 O(n)。这个坑在数据量上万时才暴露,那时已经上线了。

## 小结

- 复杂度量增长趋势,不量绝对耗时;两台机器跑同一算法,趋势一致;
- Big-O 上界、Big-Ω 下界、Big-Θ 紧确界,日常只写 Big-O;
- 估算三步:找 n、数循环、丢低阶项;递归写递推式或画递归树;
- 10⁸ 次操作约一秒,拿它和题目给的 n 范围对一下就知道会不会超时;
- 空间算额外申请,递归深度占 O(n) 栈;
- 内层固定次数是 O(n),循环里 `+=` 拼字符串是 O(n²),换 `StringBuilder`。

下一篇看最基础的几种结构:数组、链表、栈、队列,以及它们各自的代价。

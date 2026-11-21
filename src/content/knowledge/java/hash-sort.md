---
title: 哈希与排序:从 HashMap 到快排 / 归并
summary: '哈希表用哈希函数把 key 定位到桶，平均 O(1)；冲突用链地址法或开放寻址解决，JDK 8 起链表长度超过 8 且容量够就转红黑树；负载因子 0.75，超过阈值容量翻倍并 rehash，所以初始容量要预估。排序从 O(n²) 的冒泡、选择、插入到 O(n log n) 的快排与归并，Java 对基本类型用双轴快排、对对象用稳定的 TimSort。'
category: java
node: java-algorithm-hash-sort
order: 92
level: 进阶
tags: [哈希表, 排序, 快速排序, 归并排序, 二分查找]
updated: 2026-11-20
mindmap: hash-sort.mindmap.json
terms: ["hash-table", "hash-collision", "in-place", "binary-search"]
sources:
  - title: Algorithms, 4th Edition · Hash Tables
    url: https://algs4.cs.princeton.edu/home/
    note: 哈希函数、冲突处理与负载因子的分析。
  - title: Java SE 21 API · HashMap
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html
    note: 默认容量、负载因子与扩容行为的官方说明。
  - title: Java SE 21 API · Arrays
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html
    note: sort 对基本类型与对象的算法差异。
---

上一篇的树靠比较定位，O(log n)。如果不用比较，而是**算出一个位置直接跳过去**，就是 O(1)。哈希表这么干，排序则是另一个方向：把无序变成有序，让后续的查找能用二分。

## 哈希表：算位置，不比较

思路三步：

1. 用哈希函数把 key 算成一个整数；
2. 对数组长度取模，得到桶下标；
3. 把 value 放进那个桶。

理想情况下每个 key 落到不同的桶，查找一次就够。但不同 key 可能算出同一个下标，这叫**哈希冲突**，必须处理。

## 冲突的两种解法

**链地址法**:每个桶挂一条链表，冲突的 key 依次挂上去。`HashMap` 用的就是这个。

```java
// 简化示意
Node[] table;

void put(int key, String value) {
    int idx = hash(key) & (table.length - 1);
    for (Node n = table[idx]; n != null; n = n.next) {
        if (n.key == key) { n.value = value; return; }
    }
    table[idx] = new Node(key, value, table[idx]);
}
```

JDK 8 起做了两处优化：链表长度超过 8 且数组容量 ≥ 64 时，链表转成红黑树，最坏从 O(n) 变 O(log n)；容量小于 64 时优先扩容而不是转树，因为小表扩容更划算。

**开放寻址法**:冲突了就按规则找下一个空位(线性探测、二次探测)。`ThreadLocalMap` 用的是这种，优势是没有链表节点、缓存友好，缺点是删除要用墓碑标记，装得太满时性能急剧下降。

## 负载因子与扩容

桶被占满后冲突概率飙升。衡量指标是负载因子 = 元素数 / 桶数。

- `HashMap` 默认初始容量 16，负载因子 0.75，即 12 个元素时扩容；
- 扩容容量翻倍，所有元素重新计算下标(`rehash`)，代价 O(n);
- 0.75 的取舍：低了浪费空间，高了冲突多。这是空间与时间的平衡点，一般不要改。

```java
// 已知要放 1000 个元素:预分配,避免多次 rehash
Map<String, User> map = new HashMap<>(1024);
```

`HashMap` 要求 key 正确实现 `hashCode` 与 `equals`:前者决定落在哪个桶，后者决定桶内是否同一个 key。只重写一个是最常见的 bug——第 3 章 `hashCode` 那篇讲过后果。

注意：`HashMap` 不是线程安全的。并发写可能导致数据丢失甚至死循环(JDK 7 的头插法)，并发场景用 `ConcurrentHashMap`。

## O(n²) 的三个排序

| 算法 | 思路 | 特点 |
| --- | --- | --- |
| 冒泡 | 相邻逆序就交换，每轮把最大的推到末尾 | 稳定，几乎不用 |
| 选择 | 每轮选出最小的放到前面 | 交换次数最少，不稳定 |
| 插入 | 把当前元素插到前面已排好的位置 | 稳定，接近有序时 O(n) |

插入排序有个别的方法比不了的优势：**数据接近有序时退化成 O(n)**。所以快排在小区间(通常是长度 ≤ 47)会切换成插入排序，而不是继续递归。

## 快排与归并

**快速排序**:选一个基准，把数组分成「小于基准」和「大于基准」两段，再递归两段。

- 平均 O(n log n)，最坏 O(n²)(每次选到最值作基准，比如对已排序数组取首元素);
- 原地，额外空间 O(log n)(递归栈);
- 不稳定；
- 规避最坏情况：随机选基准，或三数取中。

**归并排序**:把数组对半分，分别排好再合并。

- 稳定 O(n log n)，任何输入都一样；
- 需要 O(n) 辅助数组；
- 适合链表(不需要随机访问)和外部排序(数据放不下内存)。

```java
void mergeSort(int[] a, int lo, int hi, int[] tmp) {
    if (hi - lo <= 1) return;
    int mid = (lo + hi) >>> 1;
    mergeSort(a, lo, mid, tmp);
    mergeSort(a, mid, hi, tmp);

    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
    while (i < mid) tmp[k++] = a[i++];
    while (j < hi)  tmp[k++] = a[j++];
    System.arraycopy(tmp, lo, a, lo, hi - lo);
}
```

`a[i] <= a[j]` 里的 `<=` 是稳定性的关键：相等时先取左边，相对顺序才不变。写成 `<` 就不稳定了。

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 262" role="img" aria-label="快排先分区再递归，归并先分半再合并">
    <defs>
      <marker id="sortArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" />
      </marker>
    </defs>
    <rect x="6" y="6" width="748" height="250" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <text x="32" y="36" font-size="12.5" font-weight="700" fill="var(--ink)">快排：先分区，再递归两段</text>
    <rect x="60" y="48" width="150" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
    <text x="135" y="75" font-size="12" fill="var(--ink)" text-anchor="middle">&lt; 基准</text>
    <rect x="218" y="48" width="90" height="44" rx="8" fill="var(--canvas)" stroke="var(--line)" />
    <text x="263" y="75" font-size="12" fill="var(--ink)" text-anchor="middle">基准</text>
    <rect x="316" y="48" width="170" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
    <text x="401" y="75" font-size="12" fill="var(--ink)" text-anchor="middle">≥ 基准</text>
    <text x="506" y="75" font-size="11.5" fill="var(--muted)">一次分区 O(n)，原地交换</text>
    <text x="32" y="118" font-size="11.5" fill="var(--muted)">平均分 log n 层 → O(n log n)；基准总选到最值时退化成 O(n²)。</text>
    <text x="32" y="166" font-size="12.5" font-weight="700" fill="var(--ink)">归并：先分半，再合并</text>
    <rect x="60" y="178" width="150" height="44" rx="8" fill="var(--canvas)" stroke="var(--line)" />
    <text x="135" y="205" font-size="12" fill="var(--ink)" text-anchor="middle">前半：已有序</text>
    <rect x="218" y="178" width="150" height="44" rx="8" fill="var(--canvas)" stroke="var(--line)" />
    <text x="293" y="205" font-size="12" fill="var(--ink)" text-anchor="middle">后半：已有序</text>
    <line x1="374" y1="200" x2="414" y2="200" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#sortArrow)" />
    <rect x="420" y="178" width="180" height="44" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
    <text x="510" y="205" font-size="12" fill="var(--ink)" text-anchor="middle">合并：整体有序</text>
    <text x="614" y="205" font-size="11.5" fill="var(--muted)">需 O(n) 辅助数组</text>
    <text x="32" y="246" font-size="11.5" fill="var(--muted)">两者都是 O(n log n)；快排空间省但不稳定，归并稳定但费内存——对象排序要稳定，所以 JDK 用 TimSort。</text>
  </svg>
  <figcaption>一个「先切开再各自处理」，一个「先各自排好再合」；方向相反，量级相同。</figcaption>
</figure>

## Java 的 sort 用的是哪个

`Arrays.sort` 对**基本类型**用双轴快速排序(Dual-Pivot Quicksort):不用稳定，因为 `int` 相等的元素没有区别，不稳定也不影响结果，而快排更省空间。

对**对象数组**用 TimSort(归并 + 插入的混合):对象需要稳定排序——先按年龄排、再按部门排，稳定的算法能保住前一次的顺序。`Collections.sort` 和 `List.sort` 也是 TimSort，而且会检查是否已接近有序，最好情况 O(n)。

排序的另一个坑：比较器写错会抛 `IllegalArgumentException: Comparison method violates its general contract!`。原因通常是 `(a, b) -> a.x - b.x` 溢出，或比较器不满足传递性。用 `Comparator.comparingInt(...)` 更安全。

## 二分查找：有序才有用

```java
int lowerBound(int[] a, int target) {     // 第一个 >= target 的下标
    int lo = 0, hi = a.length;            // 左闭右开
    while (lo < hi) {
        int mid = (lo + hi) >>> 1;
        if (a[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;                            // 可能等于 a.length,表示没找到
}
```

三个易错点：区间写左闭右开(`hi = a.length` 而不是 `length - 1`)就统一用 `lo < hi`;`mid` 用 `>>> 1` 避免溢出；循环结束 `lo == hi`，返回谁都一样。

`Arrays.binarySearch` 也能用，但它找不到时返回的是 `-(插入点) - 1`，不是 `-1`，很多人第一次用都会踩。

## 小结

- 哈希表用哈希函数算桶下标，平均 O(1)；冲突用链地址法或开放寻址；
- JDK 8 的 `HashMap`:链表超过 8 且容量 ≥ 64 转红黑树；负载因子 0.75，超阈值翻倍 rehash;
- 已知规模就预分配容量，`HashMap` 非线程安全，并发用 `ConcurrentHashMap`;
- 冒泡、选择、插入是 O(n²)，插入在接近有序时是 O(n)，所以快排小区间会切它；
- 快排平均 O(n log n) 最坏 O(n²)、原地、不稳定；归并稳定 O(n log n)、需 O(n) 空间；
- `Arrays.sort` 基本类型用双轴快排、对象用 TimSort；比较器别用减法，防溢出；
- 二分必须有序，区间统一左闭右开；`binarySearch` 找不到返回的是 `-(插入点) - 1`。

下一篇是这一章的最后一步：怎么用这些知识去刷题，以及力扣、洛谷、Exercism 各适合练什么。

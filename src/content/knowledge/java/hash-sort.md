---
title: 哈希与排序:从 HashMap 到快排 / 归并
summary: '哈希表用哈希函数把 key 映射到桶,靠链地址法或开放寻址处理冲突,负载因子控制扩容,平均查找 O(1);排序从 O(n²) 的插入、选择、冒泡到 O(n log n) 的快排与归并,Java 对基本类型用双轴快排、对对象用稳定的 TimSort,二分查找则要求数据有序。'
category: java
node: java-algorithm-hash-sort
order: 92
level: 进阶
tags: [哈希表, 排序, 快速排序, 归并排序, 二分查找]
updated: 2026-11-19
mindmap: hash-sort.mindmap.json
terms: ["hash-table", "hash-collision", "in-place-algorithm", "binary-search"]
sources:
  - title: Algorithms, 4th Edition · Hash Tables
    url: https://algs4.cs.princeton.edu/home/
    note: 哈希函数、冲突处理与负载因子的分析。
  - title: Java SE 21 API · HashMap
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html
    note: 默认容量、负载因子与扩容行为的官方说明。
  - title: OI Wiki · 排序与二分
    url: https://oi-wiki.org/
    note: 各排序算法的复杂度、稳定性与二分边界写法。
---

上一篇的 PriorityQueue 靠堆维护最值,取最小是 O(log n)。这一篇换一条路径:不比较大小,而是用哈希直接算出位置;再把几种排序放在一起,比较它们的代价与稳定性。

## 哈希:从 key 到桶

哈希表(hash table)用一个哈希函数把 key 映射成整数,再对数组长度取模,得到存放位置,这个位置叫桶(bucket)。查找时用同样的计算直接跳到桶,不需要逐个比较,所以平均代价 O(1)。

String 的 hashCode 按字符序列计算,公式为 `s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]`。得到的 int 可能是负数,HashMap 先做一次扰动 `h ^ (h >>> 16)` 让高位参与运算,再用 `(n - 1) & hash` 取下标,前提是数组长度是 2 的幂。

```java
Map<String, Integer> map = new HashMap<>();
map.put("java", 1995);
System.out.println(map.get("java"));        // 1995,一次定位
```

## 冲突处理

不同的 key 可能算出同一个桶,这叫哈希冲突(hash collision)。两种主流处理方式:

- **链地址法**:每个桶挂一条链表,冲突的元素依次追加。JDK 8 的 HashMap 在链表长度达到 8 且数组容量不小于 64 时,把链表转成红黑树,退到 6 时转回链表,避免极端情况下查找退化成 O(n);
- **开放寻址法**:冲突时按固定规则找下一个空位,比如线性探测。ThreadLocalMap 用的就是这种方式,省掉节点对象,但删除要特殊标记。

冲突不可避免:int 只有 42 亿个取值,key 却可以无限多。哈希表的设计从一开始就预设了冲突,冲突处理的质量决定平均性能。

## 负载因子与扩容

负载因子是元素数与桶数之比,HashMap 默认 0.75。元素超过阈值(容量 × 0.75)时,数组扩容为两倍,所有元素重新计算下标,这一步叫 rehash,代价 O(n)。

负载因子高,空间省但冲突多;低则冲突少但浪费空间。0.75 是时间与空间的经验平衡点。能预估元素数量时,创建时传入容量,避免反复扩容。

平均 O(1) 的前提是哈希函数分布均匀。如果所有 key 都落到同一个桶,查找退化为遍历链表,最坏 O(n)。

## 三种 O(n²) 排序

冒泡排序反复交换相邻的逆序对;选择排序每轮从未排序区间选出最小值;插入排序把当前元素插入前面已排好的部分。三者平均与最坏都是 O(n²),适合小数组。

插入排序在数据接近有序时退化为 O(n),这个特性让它成为很多混合排序在小规模区间的收尾手段:

```java
static void insertionSort(int[] a) {
    for (int i = 1; i < a.length; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {         // 比 key 大的元素逐个后移
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}
```

## 快排与归并

快速排序选一个基准值,把数组分成小于基准和大于基准两部分,再对两部分递归。核心是分区:

```java
static void quickSort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quickSort(a, lo, p - 1);
    quickSort(a, p + 1, hi);
}

static int partition(int[] a, int lo, int hi) {   // 以 a[hi] 为基准
    int pivot = a[hi];
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) {
            int t = a[i]; a[i] = a[j]; a[j] = t;
            i++;
        }
    }
    int t = a[i]; a[i] = a[hi]; a[hi] = t;
    return i;                                      // 基准的最终位置
}
```

分区原地完成,递归深度平均 log n,总代价 O(n log n)。最坏情况是每次选到最大或最小值,比如对已有序数组固定取末元素,分区退化成 n 层,代价 O(n²)。随机选基准或三数取中可以规避。

归并排序把数组对半切,分别排好再合并。合并需要一个等长辅助数组,空间 O(n),但代价稳定在 O(n log n),且相等元素保持原有顺序,是稳定排序:

```java
static void mergeSort(int[] a, int lo, int hi, int[] tmp) {
    if (lo >= hi) return;
    int mid = (lo + hi) >>> 1;
    mergeSort(a, lo, mid, tmp);
    mergeSort(a, mid + 1, hi, tmp);
    int i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    System.arraycopy(tmp, lo, a, lo, hi - lo + 1);
}
```

## Java 标准库怎么排

`Arrays.sort(int[])` 对基本类型用双轴快速排序,原地、不稳定,平均 O(n log n);`Arrays.sort(Object[])` 与 `List.sort` 对对象用 TimSort,稳定,最坏 O(n log n),本质是归并排序与插入排序的混合。

稳定性的意义:相等元素在排序后保持原有相对顺序。先按年龄排、再按姓名排时,稳定排序能保留年龄的顺序;不稳定排序则需要把两个字段合成一个比较器。

Comparator 必须满足自反、传递与反对称,并且与 equals 保持一致,否则排序结果未定义,TimSort 还可能抛出「比较器违反总序」的异常。

## 二分查找

二分查找(binary search)要求数据有序。每轮比较中间元素,排除一半区间,代价 O(log n)。边界写法容易出错,推荐统一用左闭右开区间:

```java
static int lowerBound(int[] a, int target) {   // 第一个 >= target 的下标
    int lo = 0, hi = a.length;                 // 区间 [lo, hi)
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;          // 避免 lo + hi 溢出
        if (a[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;                                 // 可能等于 a.length,表示没有
}
```

左闭右开的好处是:循环条件统一为 `lo < hi`,区间长度就是 `hi - lo`,退出时 lo 与 hi 相等且就是答案位置,不需要在循环内单独判断命中。

`Arrays.binarySearch` 找到时返回下标,找不到时返回 `-(插入点) - 1`,调用方根据正负判断。

## 小结

- 哈希表用哈希函数定位桶,平均 O(1),冲突多时退化到 O(n);
- 链地址法挂链表或红黑树,开放寻址法探测下一个空位;
- 负载因子 0.75 触发两倍扩容,rehash 是 O(n);
- 冒泡、选择、插入都是 O(n²),插入排序对接近有序的数据是 O(n);
- 快排平均 O(n log n)、最坏 O(n²),归并稳定但需要 O(n) 辅助空间;
- Java 基本类型用双轴快排,对象用 TimSort;二分查找要求有序,统一用左闭右开区间。

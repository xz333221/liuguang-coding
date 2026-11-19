---
title: Map:HashMap / TreeMap
summary: 'HashMap 用哈希桶定位键,平均 O(1),JDK8 桶内链表过长转红黑树;key 须正确覆写 hashCode/equals;TreeMap 红黑树按键有序,LinkedHashMap 保持插入序。'
category: java
node: java-collections-map
order: 41
level: 入门
tags: [Map, HashMap, TreeMap, 哈希桶, 红黑树]
updated: 2026-11-18
mindmap: java-collections-map.mindmap.json
terms: ["hashcode", "equals", "hash-table", "hash-collision", "time-complexity"]
sources:
  - title: 菜鸟教程 · Java HashMap
    url: https://www.runoob.com/java/java-hashmap.html
    note: HashMap 用法与遍历的对照。
  - title: Oracle Java 教程 · The Map Interface
    url: https://docs.oracle.com/javase/tutorial/collections/interfaces/map.html
    note: Map 语义与三种实现类定位的依据。
---

List 按位置找元素,Map 按**键**找值。这一篇讲 Map 的语义,重点拆 HashMap 的内部结构——它正是第 3 章 hashCode/equals 契约的用武之地。

## Map 的语义

Map 存放键值对(key → value),键唯一、值可重复:

```java
Map<String, Integer> scores = new HashMap<>();
scores.put("alice", 90);
scores.put("bob", 85);
scores.put("alice", 95);          // 同键覆盖
System.out.println(scores.get("alice"));   // 95
System.out.println(scores.getOrDefault("carol", 0));   // 0
```

put 返回旧值(无则 null);get 找不到返回 null,因此"值为 null"与"键不存在"需用 containsKey 区分,或用 getOrDefault。

## HashMap:哈希桶 + 链表/红黑树

内部结构(JDK8+):一个 Node 数组,每个数组槽位叫**桶**(bucket)。put/get 流程:

1. 对 key 调 hashCode,再经**扰动函数**(高 16 位异或低 16 位)混合,减少冲突;
2. 用 `(n-1) & hash` 定位桶下标(n 为数组长度,恒为 2 的幂);
3. 桶为空直接放;桶非空则沿链表/红黑树用 equals 逐个比较 key:相等则覆盖,不等则追加。

get 同理:定位桶 → 桶内 equals 比对 → 命中返回 value。

**桶内结构转换**:链表长度 ≥ 8 且数组长度 ≥ 64 时,链表转**红黑树**(一种自平衡二叉查找树),把桶内查找从 O(n) 降到 O(log n);元素减少到 ≤ 6 时退化回链表。

**扩容**:元素数超过 容量 × 装载因子(load factor,默认 0.75)时,数组翻倍并 rehash。装载因子是空间与时间的权衡:越小冲突越少但越占空间。

平均 put/get O(1);最坏(全部冲突)O(log n)(树化后)。

## key 的契约:hashCode 与 equals

HashMap 依赖第 3 章的契约:equals 相等的 key 必须 hashCode 相等。用自定义类作 key 时务必同时覆写两者,且**作 key 期间不要修改参与 hashCode 的字段**,否则定位到的桶变了,存得进取不出。

```java
Map<Point, String> m = new HashMap<>();
Point p = new Point(1, 2);
m.put(p, "x");
p.setX(9);                 // 修改了参与 hashCode 的字段
System.out.println(m.get(p));   // null:桶已对不上
```

优先用不可变对象(String、Integer、record)作 key。

## TreeMap:按键有序

TreeMap 基于红黑树,按键的自然顺序或传入 Comparator 排序:

```java
Map<String, Integer> tm = new TreeMap<>();
tm.put("b", 2); tm.put("a", 1); tm.put("c", 3);
System.out.println(tm.keySet());   // [a, b, c]
```

put/get/remove O(log n)。需要范围查询(firstKey/lastKey/subMap/headMap/tailMap)或有序遍历时用 TreeMap。key 必须可比较(实现 Comparable 或提供 Comparator),且同样要求 equals 与比较结果一致。

## LinkedHashMap:保持插入序

LinkedHashMap 在 HashMap 基础上加一条双向链表维护顺序,默认**插入序**;构造时传 accessOrder=true 则变为**访问序**(可用于 LRU 缓存)。迭代顺序稳定,代价是略多内存。

## 选型

| 实现 | 顺序 | 复杂度 | 适用 |
| --- | --- | --- | --- |
| HashMap | 无序 | 平均 O(1) | 默认键值查找 |
| LinkedHashMap | 插入/访问序 | 平均 O(1) | 需稳定迭代序 / LRU |
| TreeMap | 按键排序 | O(log n) | 范围查询 / 有序 |

## 小结

- Map 键唯一值可重复;get 的 null 有二义,用 containsKey/getOrDefault 区分;
- HashMap:扰动 + 位运算定位桶,桶内链表/红黑树 equals 比对,0.75 装载因子扩容;
- key 须覆写 hashCode/equals 且作 key 期间不可变;
- TreeMap 红黑树有序 O(log n);LinkedHashMap 维护插入/访问序;
- 默认 HashMap,需有序选 TreeMap,需稳定序选 LinkedHashMap。

下一篇讲 Set 与 Queue/Deque。
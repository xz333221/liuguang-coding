---
title: List:ArrayList / LinkedList
summary: 'List 有序可重复按索引访问;ArrayList 是动态数组,随机访问 O(1)、中间插入 O(n),默认首选;LinkedList 是双向链表,头尾操作 O(1)、索引访问 O(n)。'
category: java
node: java-collections-list
order: 40
level: 入门
tags: [List, ArrayList, LinkedList, Iterator]
updated: 2026-11-18
mindmap: java-collections-list.mindmap.json
terms: ["reference-type", "time-complexity", "big-o"]
sources:
  - title: 菜鸟教程 · Java ArrayList
    url: https://www.runoob.com/java/java-arraylist.html
    note: ArrayList 用法与动态扩容的对照。
  - title: Oracle Java 教程 · The List Interface
    url: https://docs.oracle.com/javase/tutorial/collections/interfaces/list.html
    note: List 语义与两个实现类定位的依据。
---

数组长度固定,增删要手动搬移元素。集合框架里的 List 解决了"长度可变、按位置存取"的需求。这一篇讲 List 的语义,以及 ArrayList 与 LinkedList 两种实现的结构差异与选型。

## List 的语义

List 是**有序、可重复、按索引访问**的序列:

- 有序:元素按插入顺序排列,索引稳定;
- 可重复:允许相同元素多次出现;
- 索引:get(i) / set(i, e) / add(i, e) / remove(i)。

```java
List<String> list = new ArrayList<>();
list.add("a");
list.add("b");
list.add(1, "x");        // [a, x, b]
System.out.println(list.get(1));   // x
```

注意 `List` 是接口,`ArrayList`/`LinkedList` 是实现。声明用接口类型,便于替换实现。

## ArrayList:动态数组

内部是一个 Object 数组。容量不够时**扩容**:新建一个约 1.5 倍容量的数组,把旧元素复制过去。

- 随机访问 get(i):O(1),直接下标;
- 尾部 add:均摊 O(1)(偶尔触发扩容复制);
- 中间插入/删除 add(i,e)/remove(i):O(n),要搬移其后元素;
- 按值查找 contains/indexOf:O(n)。

```java
List<Integer> nums = new ArrayList<>(100);   // 预估容量,减少扩容次数
```

已知大致规模时传入初始容量,可避免多次扩容复制。

## LinkedList:双向链表

内部是节点链,每个节点持有前驱与后继引用。

- 头尾 addFirst/addLast/removeFirst/removeLast:O(1);
- 索引 get(i):O(n),要从头或尾遍历到 i;
- 中间插入/删除:定位 O(n),但**已持有节点引用**时改指针 O(1);
- 额外内存:每个节点两个引用开销,比 ArrayList 更占空间。

LinkedList 同时实现了 Deque,可当队列/双端队列用(第 3 篇讲)。

## 选型:默认 ArrayList

| 操作 | ArrayList | LinkedList |
| --- | --- | --- |
| get(i) | O(1) | O(n) |
| 尾部 add | 均摊 O(1) | O(1) |
| 中间 insert/remove | O(n) 搬移 | O(n) 定位 + O(1) 改指针 |
| 内存 | 紧凑数组 | 节点 + 双引用 |

绝大多数业务场景是"尾部追加 + 随机读取",ArrayList 更合适且缓存友好。LinkedList 仅在频繁头尾操作、且不需要索引访问时考虑;而那种场景往往 ArrayDeque 更优(第 3 篇)。

## 遍历:for-each 与 Iterator

```java
for (String s : list) {
    System.out.println(s);
}

Iterator<String> it = list.iterator();
while (it.hasNext()) {
    String s = it.next();
    if (s.isEmpty()) it.remove();   // 遍历中安全删除的唯一方式
}
```

for-each 底层就是 Iterator。**遍历过程中直接 list.remove 会触发 fail-fast**(第 4 篇),要删只能用 iterator.remove 或 removeIf。

## 小结

- List 有序、可重复、按索引;声明用接口类型;
- ArrayList 动态数组:随机 O(1)、中间增删 O(n)、扩容约 1.5 倍,默认首选;
- LinkedList 双向链表:头尾 O(1)、索引 O(n),兼作 Deque;
- 预估容量减少扩容;
- 遍历中删除用 iterator.remove / removeIf,避免 fail-fast。

下一篇讲 Map:HashMap 的桶结构与 TreeMap 的有序性。
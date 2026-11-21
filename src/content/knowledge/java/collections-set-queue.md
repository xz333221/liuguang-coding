---
title: Set 与 Queue / Deque
summary: 'Set 不重复：HashSet 基于 HashMap、TreeSet 有序、LinkedHashSet 插入序；Queue/Deque 用 ArrayDeque 作栈与队列(优于 Stack),PriorityQueue 是堆；offer/poll/peek 失败返回特殊值，add/remove/element 失败抛异常。'
category: java
node: java-collections-set-queue
order: 42
level: 进阶
tags: [Set, Queue, Deque, ArrayDeque, PriorityQueue]
updated: 2026-11-18
mindmap: java-collections-set-queue.mindmap.json
terms: ["hashcode", "equals", "hash-table", "time-complexity"]
sources:
  - title: Oracle Java 教程 · The Set Interface
    url: https://docs.oracle.com/javase/tutorial/collections/interfaces/set.html
    note: Set 语义与三种实现的依据。
  - title: Oracle Java 教程 · The Queue and Deque Interfaces
    url: https://docs.oracle.com/javase/tutorial/collections/interfaces/queue.html
    note: Queue/Deque 双套 API 与 ArrayDeque 定位的参照。
---

List 允许重复、Map 按键取值，Set 与 Queue 则分别解决"去重"与"按次序进出"两类需求。这一篇讲它们的实现与 API 差异。

## Set:不重复的集合

Set 语义：元素不重复(按 equals 判定)，多数实现无序。

- **HashSet**:内部就是一个 HashMap，元素作 key、一个固定 Object 作 value。add/get 复杂度与 HashMap 相同(平均 O(1))。要求元素正确覆写 hashCode/equals;
- **LinkedHashSet**:HashSet + 双向链表，保持**插入序**;
- **TreeSet**:红黑树，按自然顺序或 Comparator **排序**,O(log n)；元素须可比较。

```java
Set<String> set = new HashSet<>();
set.add("a");
set.add("a");          // 重复,add 返回 false
System.out.println(set.size());   // 1
```

去重原理与 HashMap 的 key 唯一完全一致：先 hashCode 定位桶，再 equals 确认。

## Queue:单向队列

Queue 是 FIFO(先进先出)。它提供**两套 API**，区别在失败时的行为：

| 操作 | 抛异常版 | 返回特殊值版 |
| --- | --- | --- |
| 入队 | add(e) | offer(e) |
| 出队 | remove() | poll() |
| 查看队头 | element() | peek() |

失败指：容量受限队列满(add 抛 IllegalStateException)、队列空(remove/element 抛 NoSuchElementException)。返回特殊值版则 offer 返回 false、poll/peek 返回 null。**优先用 offer/poll/peek**，避免用异常做流程控制。

## Deque:双端队列，兼作栈

Deque 两端都可进出：offerFirst/offerLast、pollFirst/pollLast、peekFirst/peekLast。它也能当**栈**用：push(e) = offerFirst,pop() = pollFirst。

**ArrayDeque** 是 Deque 的首选实现：循环数组，头尾操作 O(1)，无容量上限(自动扩容)，比 LinkedList 更省内存、缓存更友好，也比遗留的 Stack 类更好(Stack 继承 Vector、方法带 synchronized，性能差且设计陈旧)。

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
System.out.println(stack.pop());   // 2

Deque<Integer> queue = new ArrayDeque<>();
queue.offer(1);
queue.offer(2);
System.out.println(queue.poll());  // 1
```

需要阻塞/并发语义时用 BlockingQueue 系列(第 10 章)，而非 ArrayDeque。

## PriorityQueue:堆

PriorityQueue 是**优先队列**:出队顺序不按插入而按优先级(最小堆默认，队头是最小元素)。内部是二叉堆数组，offer/poll O(log n),peek O(1)。

```java
Queue<Integer> pq = new PriorityQueue<>();
pq.offer(5); pq.offer(1); pq.offer(3);
System.out.println(pq.poll());   // 1
System.out.println(pq.poll());   // 3
```

注意：**迭代 PriorityQueue 不保证有序**，只有反复 poll 才按优先级出。需要"排序后遍历"应另用 TreeSet 或排序列表。

## 小结

- Set 不重复：HashSet(基于 HashMap)、LinkedHashSet(插入序)、TreeSet(排序);
- Queue 两套 API:优先 offer/poll/peek(失败返回特殊值)，少用 add/remove/element(失败抛异常);
- Deque 双端；ArrayDeque 作栈与队列的首选，优于 Stack/LinkedList;
- PriorityQueue 是堆，poll 按优先级，迭代不有序。

下一篇讲 fail-fast:为什么遍历集合时直接 remove 会抛 ConcurrentModificationException。
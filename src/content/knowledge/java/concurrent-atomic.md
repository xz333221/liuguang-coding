---
title: 并发集合与原子类
summary: 'ConcurrentHashMap 分段/CAS+synchronized 桶级锁实现高并发读写；CopyOnWriteArrayList 写时复制适合读多写少；AtomicInteger 用 CAS 无锁自增但有 ABA 问题；LongAdder 分段累加高竞争更优；BlockingQueue 支撑生产者消费者。'
category: java
node: java-concurrency-atomic
order: 60
level: 深入
tags: [ConcurrentHashMap, CAS, ABA, LongAdder, BlockingQueue]
updated: 2026-11-18
mindmap: java-concurrency-atomic.mindmap.json
terms: ["hash-table", "runtime"]
sources:
  - title: java.util.concurrent 包 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html
    note: 并发集合与原子类的官方总览。
  - title: java.util.concurrent.atomic.AtomicInteger javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html
    note: CAS 语义与原子操作清单的参照。
---

synchronized 是通用互斥，但粒度粗、有阻塞开销。java.util.concurrent 提供了一批**低锁/无锁**的线程安全工具：并发集合、原子类、阻塞队列。这一篇讲它们的原理与选型。

## ConcurrentHashMap

HashMap 非线程安全(并发 put 可能丢数据/死循环，JDK7 头插法扩容);Hashtable 全表 synchronized 太粗。ConcurrentHashMap 的演进：

- **JDK7**:Segment 分段锁，默认 16 段，不同段可并发写；
- **JDK8**:取消 Segment，改为 **CAS + synchronized 锁单个桶头节点**。空桶 CAS 插入，非空桶 synchronized 锁头节点；读全程无锁(volatile + Unsafe 可见性)。并发度 = 桶数量，远高于分段。

注意：复合操作仍需原子 API:`putIfAbsent`、`compute`、`merge`、`replace`，不要"先 get 再 put"。size() 是估算值(分段计数累加)，弱一致。

```java
ConcurrentHashMap<String, Integer> m = new ConcurrentHashMap<>();
m.merge("k", 1, Integer::sum);   // 原子累加,等价线程安全计数
```

## CopyOnWriteArrayList

写时复制：每次写(add/set/remove)复制整个底层数组，在新数组上改，再替换引用；读无锁读旧/新数组快照。适合**读多写极少**(监听器列表、配置缓存)；写频繁则复制开销大、内存翻倍，且读有弱一致(可能读到旧快照)。迭代器是快照，不抛 ConcurrentModificationException。

## 原子类与 CAS

AtomicInteger/AtomicLong/AtomicReference 等用 **CAS**(Compare-And-Swap)无锁更新：比较当前值与预期值，相等才写入新值，否则重试(自旋)。硬件指令保证比较+交换原子。

```java
AtomicInteger n = new AtomicInteger();
n.incrementAndGet();          // 无锁自增,线程安全
n.compareAndSet(0, 1);        // 预期 0 才设 1
```

CAS 的三个问题：

- **ABA**:值 A→B→A,CAS 见仍是 A 认为没变。用 AtomicStampedReference(版本号)解决；
- **自旋开销**:高竞争下反复失败重试浪费 CPU;
- **单变量**:CAS 只保证一个变量，多变量需锁或 AtomicReference 封装对象。

## LongAdder:高竞争计数

AtomicLong 高竞争下所有线程 CAS 同一个值，失败率高。LongAdder **分段累加**:内部 Cell 数组，不同线程哈希到不同 Cell 各自 CAS，读时 sum() 累加。竞争分散，吞吐高；代价是 sum 弱一致、占内存多于 AtomicLong。统计计数(监控 QPS)用 LongAdder，需要精确瞬时值/compareAndSet 用 AtomicLong。

## BlockingQueue:生产者消费者

阻塞队列 put/take 在满/空时阻塞线程，天然支撑生产者-消费者模型，免去手写 wait/notify:

- ArrayBlockingQueue:有界数组；
- LinkedBlockingQueue:可选有界链表；
- SynchronousQueue:不存元素，直接交接；
- PriorityBlockingQueue:无界优先堆；
- DelayQueue:延迟到期才可取。

线程池的 workQueue 就是 BlockingQueue。offer/poll 带超时版本避免永久阻塞。

## 选型速查

| 场景 | 选择 |
| --- | --- |
| 高并发 Map | ConcurrentHashMap + 原子 API |
| 读多写极少 List | CopyOnWriteArrayList |
| 单变量原子更新 | AtomicInteger/Long/Reference |
| 高竞争计数 | LongAdder |
| 生产者消费者 | BlockingQueue |
| 多变量一致 | synchronized / Lock |

## 小结

- ConcurrentHashMap JDK8 CAS+桶级 synchronized，读无锁；复合操作用 merge/compute;
- CopyOnWrite 写复制读无锁，读多写少；
- CAS 无锁自增，注意 ABA(版本号)、自旋开销、单变量；
- LongAdder 分段累加高竞争优，sum 弱一致；
- BlockingQueue 阻塞 put/take 支撑生产者消费者；
- 按场景选型，多变量一致仍需锁。

第 10 章到此。下一章 JVM 基础：内存区域、类加载、GC 与排查命令。
---
title: 并发集合与原子类
summary: 'ConcurrentHashMap 用桶级 CAS 与首节点锁提升并发,computeIfAbsent 提供原子初始化;CopyOnWriteArrayList 适合读多写少,BlockingQueue 支撑生产者-消费者。原子类基于 CAS,AtomicStampedReference 解决 ABA,LongAdder 用分段 Cell 降低高竞争下的重试。'
category: java
node: java-concurrency-atomic
order: 60
level: 深入
tags: [ConcurrentHashMap, BlockingQueue, CAS, LongAdder]
updated: 2026-11-19
mindmap: concurrent-atomic.mindmap.json
terms: ["hash-table", "hashing", "runtime"]
sources:
  - title: java.util.concurrent 包说明
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html
    note: 并发集合、阻塞队列与同步器的总体说明。
  - title: ConcurrentHashMap javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html
    note: 桶级并发、computeIfAbsent 与原子更新方法的契约。
  - title: java.util.concurrent.atomic 包说明
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html
    note: CAS、原子变量与 LongAdder 的官方说明。
---

上一篇的线程池限制了同时执行的任务数,任务内部仍可能并发读写同一份数据。用 synchronized 包住整个集合可以保证安全,代价是并发度降到一次一个线程。java.util.concurrent 提供了一组并发集合与原子类,在内部把锁拆得更细,或用 CAS 避免阻塞。

## ConcurrentHashMap

ConcurrentHashMap 是线程安全的哈希表,根据 key 的哈希值定位到桶。Java 8 起取消了 Segment 分段锁,改为桶级并发:

- 目标桶为空时,用 CAS 放入首节点,不需要加锁;
- 目标桶非空时,对桶的首节点 synchronized,只锁住这一个桶;
- 扩容时多个线程可以协助迁移节点;
- 读操作基本不加锁,依赖 volatile 与节点的不变状态。

常用原子方法包括 putIfAbsent、computeIfAbsent、compute 与 merge,它们把“读、判断、写回”合并为一次原子操作:

```java
ConcurrentHashMap<String, Integer> wordCount = new ConcurrentHashMap<>();
for (String word : List.of("a", "b", "a")) {
    wordCount.merge(word, 1, Integer::sum);
}
System.out.println(wordCount);   // {a=2, b=1}
```

computeIfAbsent 适合初始化映射值,同一个 key 的映射函数在原子操作内最多执行一次:

```java
ConcurrentHashMap<String, List<String>> groups = new ConcurrentHashMap<>();
groups.computeIfAbsent("fruit", k -> new ArrayList<>()).add("apple");
groups.computeIfAbsent("fruit", k -> new ArrayList<>()).add("banana");
System.out.println(groups);   // {fruit=[apple, banana]}
```

映射函数返回的 ArrayList 本身不是线程安全的。多个线程同时向同一个 List 添加元素时,仍需外部同步或改用线程安全的容器;computeIfAbsent 只保证“创建并放入”这一步原子。

## CopyOnWriteArrayList

CopyOnWriteArrayList 的写操作先复制一份底层数组,在副本上修改,再用新数组替换旧数组;读操作直接读当前数组,不加锁。迭代器拿到的是创建时刻的快照,迭代期间的修改不影响本次遍历,也不会抛 ConcurrentModificationException。

```java
CopyOnWriteArrayList<String> listeners = new CopyOnWriteArrayList<>();
listeners.add("logger");
for (String listener : listeners) {
    listeners.add("metrics");   // 迭代器基于旧快照,不抛 ConcurrentModificationException
}
System.out.println(listeners);   // [logger, metrics]
```

写时复制的代价是每次写都要复制整个数组,时间复杂度 O(n),并且新旧数组同时占用内存。它适合读多写少、集合较小的场景,例如监听器列表、配置快照;频繁写入或元素很多时不适合。迭代器只读,不支持 remove。

## BlockingQueue 与生产者-消费者

BlockingQueue 是带阻塞语义的队列:put 在队列满时阻塞,take 在队列空时阻塞;offer 与 poll 支持超时,add 与 remove 在失败时直接抛异常。

- ArrayBlockingQueue:有界数组队列,容量固定,内存可控;
- LinkedBlockingQueue:链表队列,可选容量,默认容量为 Integer.MAX_VALUE;
- 二者内部都用锁与 Condition 等待,不会忙等。

```java
BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(10);

Thread producer = new Thread(() -> {
    try {
        for (int i = 0; i < 5; i++) {
            queue.put(i);   // 队列满时阻塞
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

Thread consumer = new Thread(() -> {
    try {
        for (int i = 0; i < 5; i++) {
            System.out.println(queue.take());   // 输出 0 到 4,队列空时阻塞
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

producer.start();
consumer.start();
```

生产者在队列满时暂停,消费者在队列空时暂停,两边由队列的锁与条件队列协调,不需要手写 wait/notify。

## 原子类与 CAS

CAS(compare-and-swap,比较并交换)是一条 CPU 原子指令:仅当内存中的当前值等于期望值时才写入新值,否则返回失败。AtomicInteger 的递增就是不断重试 CAS,直到成功:

```java
AtomicInteger counter = new AtomicInteger();
counter.incrementAndGet();
System.out.println(counter.get());   // 1

int expect;
do {
    expect = counter.get();
} while (!counter.compareAndSet(expect, expect + 1));
System.out.println(counter.get());   // 2
```

CAS 不需要加锁,失败时循环重试。低竞争下开销小;竞争激烈时大量线程重复失败,重试本身消耗 CPU。

CAS 存在 ABA 问题:线程一读到 A,线程二把值改成 B 再改回 A,线程一执行 CAS 时看到仍是 A,误以为没有变化。AtomicStampedReference 在值之外附带版本号,比较时同时检查版本:

```java
AtomicStampedReference<String> ref = new AtomicStampedReference<>("A", 0);
int stamp = ref.getStamp();
String value = ref.getReference();
System.out.println(ref.compareAndSet(value, "C", stamp, stamp + 1));   // true
System.out.println(ref.getReference() + ", stamp=" + ref.getStamp());  // C, stamp=1
```

## LongAdder

AtomicLong 的所有线程都在同一个变量上做 CAS,高竞争下失败重试严重。LongAdder 把累加分散到多个 Cell,每个线程更新自己的 Cell,求和时再把各 Cell 相加:

```java
LongAdder adder = new LongAdder();
adder.increment();
adder.add(10);
System.out.println(adder.sum());   // 11
```

分散更新显著降低 CAS 冲突,写吞吐高于 AtomicLong。代价是 sum 返回的是调用时刻的近似值,遍历 Cell 期间仍有线程在更新,不构成原子快照。计数器、监控指标这类只关心总量的场景适合 LongAdder;需要精确读取或依赖当前值做判断时仍用 AtomicLong。

## 小结

- ConcurrentHashMap 用桶级 CAS 与首节点锁,读多写少时并发度高;
- computeIfAbsent、merge 提供原子更新,但返回的容器本身未必线程安全;
- CopyOnWriteArrayList 写时复制,适合读多写少的小集合,迭代器基于快照;
- BlockingQueue 用 put/take 阻塞实现生产者-消费者,ArrayBlockingQueue 有界更可控;
- 原子类基于 CAS,ABA 问题用 AtomicStampedReference 加版本号解决;
- LongAdder 分段累加降低竞争,sum 不是原子快照。

下一篇进入 JVM:字节码、类加载、内存区域与垃圾回收,解释这些并发工具在运行时依赖的内存可见性与对象布局。

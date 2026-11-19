---
title: 线程池与 Executor
summary: 'ThreadPoolExecutor 用核心线程数、最大线程数、空闲存活时间、任务队列、线程工厂与拒绝策略管理并发;提交任务按核心线程、队列、最大线程、拒绝的顺序处理。工厂方法 newFixedThreadPool 与 newCachedThreadPool 分别使用无界队列和无限线程,生产环境应直接构造有界线程池。'
category: java
node: java-concurrency-pool
order: 59
level: 进阶
tags: [线程池, ThreadPoolExecutor, 拒绝策略, Executor]
updated: 2026-11-19
mindmap: thread-pool.mindmap.json
terms: ["jvm", "runtime"]
sources:
  - title: ThreadPoolExecutor javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html
    note: 七个构造参数、任务处理顺序与拒绝策略的官方说明。
  - title: java.util.concurrent 包说明
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html
    note: Executor 体系、队列与并发工具的总体参照。
  - title: JEP 444 · Virtual Threads
    url: https://openjdk.org/jeps/444
    note: JDK 21 虚拟线程的定位与适用范围。
---

上一篇的 volatile 只保证单个变量的可见性,无法保护一段复合操作。要限制同时执行的任务数量,仍然需要互斥与调度;线程本身也不应按请求随意创建,创建与销毁的开销、无上限的线程数都会耗尽内存与调度能力。线程池把线程的复用与排队集中到一个对象里。

## 为什么需要线程池

一条线程需要独立的调用栈,创建与销毁涉及操作系统调用,线程数超过 CPU 核数后上下文切换开始占用时间。请求量大时,为每个任务新建线程会让内存与调度迅速饱和。

线程池维护一组可复用的工作线程,任务提交后进入队列,由空闲线程取出执行。它同时提供并发上限、排队缓冲、拒绝策略与运行统计,是服务端处理并发任务的标准做法。

## ThreadPoolExecutor 的七个参数

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
        4,                              // corePoolSize
        8,                              // maximumPoolSize
        60, TimeUnit.SECONDS,           // keepAliveTime 与单位
        new ArrayBlockingQueue<>(100),  // workQueue
        Executors.defaultThreadFactory(),
        new ThreadPoolExecutor.AbortPolicy()
);
```

七个参数的含义:

1. corePoolSize:核心线程数,默认即使空闲也保留;
2. maximumPoolSize:线程总数上限;
3. keepAliveTime:超出核心数量的线程空闲多久后回收;
4. unit:keepAliveTime 的时间单位;
5. workQueue:存放等待任务的阻塞队列;
6. threadFactory:创建线程的工厂,可以统一命名与设置优先级;
7. handler:队列与线程都满时的拒绝策略。

## 任务提交后的处理顺序

提交一个任务后,线程池按固定顺序处理:

1. 当前线程数小于 corePoolSize,创建核心线程执行任务;
2. 核心线程已满,任务放入 workQueue 排队;
3. 队列已满且线程数小于 maximumPoolSize,创建非核心线程;
4. 队列已满且线程数达到 maximumPoolSize,执行拒绝策略。

队列在最大线程之前判断,这是容易忽略的细节。使用无界队列时,任务永远能入队,maximumPoolSize 不会生效,线程数停在 corePoolSize,积压的任务一直增长。

```java
for (int i = 0; i < 20; i++) {
    int taskId = i;
    pool.execute(() -> System.out.println(
            "task " + taskId + " on " + Thread.currentThread().getName()));
}
pool.shutdown();
```

execute 提交无返回值的 Runnable。输出顺序不固定,由调度决定;线程名来自 threadFactory,统一命名后便于日志排查。

## 四种拒绝策略

- AbortPolicy:抛出 RejectedExecutionException,默认策略;
- CallerRunsPolicy:由提交任务的线程直接执行该任务,形成反压,降低提交速度;
- DiscardPolicy:静默丢弃新任务,不抛异常;
- DiscardOldestPolicy:丢弃队列中最旧的任务,再尝试提交当前任务。

丢弃类策略会静默丢失任务,只适合可容忍丢失的统计、日志场景。核心业务应使用 AbortPolicy 或 CallerRunsPolicy,让过载暴露出来。

## 队列的选择

- ArrayBlockingQueue:有界数组队列,容量必须指定,内存可控;
- LinkedBlockingQueue:链表队列,默认容量 Integer.MAX_VALUE,等同于无界,使用时应显式传入容量;
- SynchronousQueue:不存储元素,提交时直接交给空闲线程;没有空闲线程时由线程池创建新线程,达到上限才拒绝,通常配合较大的 maximumPoolSize。

有界队列才能让 maximumPoolSize 与拒绝策略发挥作用。无界队列把过载转化为任务堆积,任务对象持续占用堆内存,最终触发内存溢出(OutOfMemoryError)。

## 为什么不用 Executors 的工厂方法

Executors 提供了几个便捷工厂方法,参数被隐藏,风险也藏在默认值里:

- newFixedThreadPool 与 newSingleThreadExecutor 使用无界 LinkedBlockingQueue,任务积压可导致 OOM;
- newCachedThreadPool 使用 SynchronousQueue,maximumPoolSize 为 Integer.MAX_VALUE,线程数没有实际上限;
- newScheduledThreadPool 使用无界的 DelayedWorkQueue,同样存在积压风险。

生产环境应直接 `new ThreadPoolExecutor(...)`,显式指定核心数、最大数、有界队列与拒绝策略,让容量边界可见。

## 线程数估算

CPU 密集型任务的线程数接近 CPU 核数,常用 N+1,N 为核数,额外一条用于在偶发缺页或等待时填补空隙。IO 密集型任务的线程在等待网络或磁盘,线程数可以高于核数,常用 `N * (1 + 等待时间 / 计算时间)` 估算。公式只是起点,队列长度、下游容量与超时都需要结合压测调整。

```java
int cpus = Runtime.getRuntime().availableProcessors();
System.out.println("CPU 核数: " + cpus);
```

## shutdown 与 shutdownNow

shutdown 停止接收新任务,已经提交的任务继续执行,包括队列中的任务;线程全部结束后线程池进入 TERMINATED。shutdownNow 停止接收新任务,尝试中断正在执行的任务,并返回队列中尚未执行的任务列表。中断是协作式的,不响应中断的任务仍会继续运行。

关闭后可以调用 awaitTermination 等待一段时间,确认任务收尾,再释放数据库连接、文件句柄等资源。

## 虚拟线程

JDK 21 引入虚拟线程(JEP 444):由 JVM 调度,把大量阻塞任务映射到少量平台线程,适合高并发 IO 场景;本篇不展开。

## 小结

- 线程池复用线程、限制并发、缓冲任务,避免按请求创建线程;
- ThreadPoolExecutor 的七个参数共同决定容量与过载行为;
- 提交顺序为核心线程、队列、最大线程、拒绝,队列在最大线程之前判断;
- 拒绝策略中 AbortPolicy 暴露过载,CallerRunsPolicy 形成反压,丢弃策略只适合可丢失任务;
- 使用有界队列,直接构造 ThreadPoolExecutor,避免工厂方法的无界队列与无限线程;
- shutdown 保留已提交任务,shutdownNow 尝试中断并返回未执行任务。

下一篇看并发集合与原子类:线程池控制任务数量,任务内部共享数据的读写还需要更细粒度的并发容器与 CAS。

---
title: 线程池与 Executor
summary: 'ThreadPoolExecutor 七参数决定任务流转:核心线程→队列→最大线程→拒绝策略;Executors 快捷工厂有 OOM 隐患(无界队列/无限线程),生产应手动构造并按 CPU/IO 密集配置。'
category: java
node: java-concurrency-pool
order: 59
level: 进阶
tags: [线程池, ThreadPoolExecutor, 拒绝策略, Executor]
updated: 2026-11-18
mindmap: java-concurrency-pool.mindmap.json
terms: ["runtime", "call-stack"]
sources:
  - title: java.util.concurrent.ThreadPoolExecutor javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html
    note: 七参数、任务流转与拒绝策略的官方依据。
  - title: Oracle Java 教程 · Thread Pools
    url: https://docs.oracle.com/javase/tutorial/essential/concurrency/pools.html
    note: Executor 框架与池化收益的参照。
---

裸 new Thread 的问题:创建/销毁开销大、数量不可控(可能耗尽资源)、缺乏统一管理。线程池复用一组线程执行提交的任务,控制并发度、缓冲任务、统一生命周期。这一篇讲 ThreadPoolExecutor 的参数与任务流转。

## 为什么池化

- 复用线程,摊薄创建/销毁成本;
- 限制并发线程数,防止资源耗尽;
- 任务队列缓冲突发流量;
- 统一提交、监控、关闭。

Executor 框架把"任务提交"与"线程执行"解耦:execute(Runnable) / submit(Callable) 提交,池内部调度。

## 七参数

```java
new ThreadPoolExecutor(
    corePoolSize,      // 核心线程数,常驻
    maximumPoolSize,   // 最大线程数
    keepAliveTime,     // 非核心线程空闲存活时间
    unit,              // 时间单位
    workQueue,         // 任务阻塞队列
    threadFactory,     // 线程工厂(命名,便于排查)
    handler);          // 拒绝策略
```

## 任务流转顺序

提交任务时:

1. 运行线程 < corePoolSize → 新建核心线程执行;
2. 核心满 → 入 workQueue 排队;
3. 队列满 且 运行线程 < maximumPoolSize → 新建非核心线程执行;
4. 队列满 且 线程达 max → 触发拒绝策略。

注意顺序是**先排队再扩线程**,不是先扩线程再排队。因此无界队列会让 maximumPoolSize 失效(队列永远不满,不扩线程)。

## 四种拒绝策略

| 策略 | 行为 |
| --- | --- |
| AbortPolicy(默认) | 抛 RejectedExecutionException |
| CallerRunsPolicy | 由提交任务的线程自己执行(反压) |
| DiscardPolicy | 静默丢弃 |
| DiscardOldestPolicy | 丢弃队头最旧任务,重试提交 |

生产慎用 Discard(丢任务无感知);CallerRuns 可作反压但会拖慢提交方。

## Executors 快捷工厂的隐患

- `newFixedThreadPool` / `newSingleThreadExecutor`:LinkedBlockingQueue **无界**,任务堆积 → OOM;
- `newCachedThreadPool`:maximumPoolSize = Integer.MAX_VALUE,突发创建大量线程 → OOM;
- `newScheduledThreadPool`:DelayedWorkQueue 无界,同样隐患。

阿里规约等明确禁止用 Executors 快捷工厂,要求手动 new ThreadPoolExecutor 显式指定有界队列与合理 max,让拒绝策略暴露过载而非 OOM。

## 配置经验

- **CPU 密集**:线程数 ≈ CPU 核数 + 1,减少上下文切换;
- **IO 密集**:线程数 ≈ 核数 × (1 + 等待时间/计算时间),常见 2×核数 起步,压测调整;
- 队列有界,容量按可接受延迟与内存估算;
- 线程工厂命名(如 order-pool-%d),便于 jstack 定位;
- 优雅关闭:shutdown() 停接收新任务、等存量完成;shutdownNow() 尝试中断。

## 小结

- 池化复用线程、控并发、缓冲任务、统一管理;
- 七参数;流转:核心→队列→最大→拒绝;
- 无界队列使 max 失效;Executors 工厂有 OOM 隐患,手动构造;
- 拒绝策略默认 Abort,慎用 Discard;
- CPU 密集 ≈ 核数+1,IO 密集 ≈ 2×核数 起步压测;命名线程、优雅关闭。

下一篇讲并发集合与原子类:无锁/低锁的线程安全工具。
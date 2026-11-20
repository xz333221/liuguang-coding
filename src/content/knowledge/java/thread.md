---
title: 线程的创建与状态
summary: '线程可经 Thread/Runnable/Callable+FutureTask 创建;start 才真正开线程,run 只是普通调用;状态 NEW→RUNNABLE→BLOCKED/WAITING/TIMED_WAITING→TERMINATED;interrupt 是协作式中断信号。'
category: java
node: java-concurrency-thread
order: 56
level: 进阶
tags: [线程, Thread, Runnable, 状态, 中断]
updated: 2026-11-18
mindmap: java-concurrency-thread.mindmap.json
terms: ["runtime", "call-stack", "reference-type"]
sources:
  - title: Oracle Java 教程 · Concurrency
    url: https://docs.oracle.com/javase/tutorial/essential/concurrency/
    note: 线程创建、状态与中断的依据。
  - title: java.lang.Thread javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html
    note: Thread.State 六态与 start/run 区别的官方描述。
---

到目前为止程序都是单线程:一条执行流从头跑到尾。并发让多条执行流同时推进,提高吞吐与响应。这一篇讲线程怎么创建、有哪些状态、如何协作式停止。

## 三种创建方式

```java
// 1. 继承 Thread(不推荐,占用唯一继承名额)
class MyThread extends Thread {
    public void run() { System.out.println("run"); }
}
new MyThread().start();

// 2. 实现 Runnable(推荐,任务与线程解耦)
Runnable task = () -> System.out.println("run");
new Thread(task).start();

// 3. Callable + FutureTask(需要返回值/抛异常)
Callable<Integer> call = () -> 42;
FutureTask<Integer> ft = new FutureTask<>(call);
new Thread(ft).start();
int result = ft.get();   // 阻塞等待结果
```

Runnable 无返回值不能抛 checked 异常;Callable 有返回值可抛异常,配合 FutureTask/Future 取结果。业务中更常用线程池提交(第 4 篇),而非裸 new Thread。

## start 与 run 的区别

**start()** 通知 JVM 创建新线程并在新线程里执行 run;**run()** 只是普通方法调用,在当前线程执行,没有并发:

```java
Thread t = new Thread(() -> System.out.println(Thread.currentThread().getName()));
t.run();    //  main(当前线程)
t.start();  //  Thread-0(新线程)
```

一个 Thread 只能 start 一次,重复 start 抛 IllegalThreadStateException。

## 线程状态:六态

Thread.State 枚举:

| 状态 | 含义 |
| --- | --- |
| NEW | 已创建未 start |
| RUNNABLE | 可运行(含正在运行与就绪等待 CPU) |
| BLOCKED | 等待 monitor 锁(synchronized) |
| WAITING | 无限期等待(Object.wait / Thread.join / LockSupport.park) |
| TIMED_WAITING | 限期等待(sleep(ms) / wait(ms) / join(ms)) |
| TERMINATED | 执行结束 |

注意 Java 把"就绪"与"运行中"合并为 RUNNABLE;BLOCKED 专指等 synchronized 锁,等 Lock 是 WAITING。

## sleep / join / yield

- `sleep(ms)`:当前线程限期等待,**不释放锁**;
- `join()`:当前线程等待目标线程结束;
- `yield()`:提示调度器让出 CPU,仅建议,不保证。

sleep 与 wait 的关键区别:sleep 不释放锁,wait 释放锁且需在 synchronized 内调用。

## 中断:协作式信号

Java 不强制杀线程(stop 已废弃,不安全)。中断是**协作式**:interrupt() 设置中断标志,由线程自己检查并决定退出:

```java
Thread t = new Thread(() -> {
    while (!Thread.currentThread().isInterrupted()) {
        // 工作
    }
    // 清理后退出
});
t.start();
t.interrupt();   // 置标志,线程下轮检查后退出
```

若线程正阻塞在 sleep/wait/join,interrupt 会使其抛 InterruptedException 并**清除标志**;捕获后应恢复标志(`Thread.currentThread().interrupt()`)或退出,不要吞掉。

## 小结

- 创建:Thread / Runnable / Callable+FutureTask;推荐 Runnable 或线程池;
- start 开新线程,run 只是当前线程调用;start 仅一次;
- 六态:NEW/RUNNABLE/BLOCKED/WAITING/TIMED_WAITING/TERMINATED;
- sleep 不释放锁,wait 释放;join 等待结束;
- interrupt 是协作信号,阻塞中抛 InterruptedException 并清标志,需恢复或退出。

下一篇讲 synchronized 与锁:如何保证共享变量的互斥访问。
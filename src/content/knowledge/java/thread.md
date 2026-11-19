---
title: 线程的创建与状态
summary: 'Thread 与 Runnable 描述任务,Callable+FutureTask 带回返回值;start 让 JVM 创建新线程并调用 run,直接调用 run 只是普通方法。线程在 NEW、RUNNABLE、BLOCKED、WAITING、TIMED_WAITING、TERMINATED 六种状态间转换,协作依赖 sleep、join 与 interrupt 中断标志。'
category: java
node: java-concurrency-thread
order: 56
level: 进阶
tags: [Thread, Runnable, Callable, 线程状态]
updated: 2026-11-19
mindmap: thread.mindmap.json
terms: ["jvm", "stack-and-heap"]
sources:
  - title: Oracle Java 教程 · Concurrency
    url: https://docs.oracle.com/javase/tutorial/essential/concurrency/
    note: 线程定义、生命周期与中断机制的参照。
  - title: Thread javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html
    note: Thread.State 六种状态与 start/interrupt/setDaemon 的官方契约。
---

上一篇的 Socket 默认阻塞:accept 等待连接、read 等待数据,当前线程只能停在调用处。要让程序在等待网络数据的同时继续处理其他任务,就需要把工作拆到多条线程上。这一篇从线程的创建讲起,再看它的状态与协作方法。

## Thread 与 Runnable

Java 用 Thread 表示线程,用 Runnable 描述线程要执行的任务。两种写法:

```java
class Worker extends Thread {
    @Override
    public void run() {
        System.out.println("worker: " + Thread.currentThread().getName());
    }
}

public class Demo {
    public static void main(String[] args) {
        new Worker().start();   // 输出 worker: Thread-0

        Runnable task = () -> System.out.println("task: " + Thread.currentThread().getName());
        new Thread(task, "worker-1").start();   // 输出 task: worker-1
    }
}
```

继承 Thread 把任务与线程绑定,Java 只支持单继承,任务类往往还要继承别的类。实现 Runnable 把任务独立出来,同一个任务可以交给多条线程执行,更常用。Thread 本身也实现了 Runnable。

## Callable 与 FutureTask

Runnable.run 没有返回值,也不能抛受检异常。需要结果时用 Callable:

```java
Callable<Integer> callable = () -> {
    Thread.sleep(100);
    return 42;
};

FutureTask<Integer> future = new FutureTask<>(callable);
new Thread(future).start();

System.out.println(future.get());   // 42,任务未完成时 get 阻塞
```

Callable 的 call 返回 V 并允许抛异常。FutureTask 同时实现 Runnable 和 Future,既能交给 Thread 执行,又能通过 get 取结果、isDone 判断完成、cancel 取消。get 带超时的重载可以避免无限等待。

## start 与 run

start 和 run 的区别是线程模型的基础:

```java
Thread t = new Thread(() -> System.out.println(Thread.currentThread().getName()));
t.run();     // 输出 main,当前线程直接调用普通方法
t.start();   // 输出 Thread-0,JVM 创建新线程后在其中调用 run
```

start 通知 JVM 创建一条新线程,新线程进入就绪队列,获得 CPU 后执行 run。直接调 run 等同于普通方法调用,仍在当前线程执行,没有并发效果。同一条 Thread 的 start 只能调用一次,第二次抛 IllegalThreadStateException。

## 六种状态

Thread.State 枚举定义了六种状态:

| 状态 | 含义 |
| --- | --- |
| NEW | 已创建,尚未 start |
| RUNNABLE | 正在 JVM 中执行,包含就绪与运行中 |
| BLOCKED | 等待获取监视器锁 |
| WAITING | 无限期等待,如 wait、join、LockSupport.park |
| TIMED_WAITING | 带超时等待,如 sleep、带超时的 join |
| TERMINATED | run 正常结束或异常退出 |

```java
Thread t = new Thread(() -> {
    try {
        Thread.sleep(500);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

System.out.println(t.getState());   // NEW
t.start();
System.out.println(t.getState());   // RUNNABLE 或 TIMED_WAITING,取决于调度
t.join();
System.out.println(t.getState());   // TERMINATED
```

状态转换围绕 RUNNABLE 展开:start 后从 NEW 进入 RUNNABLE;竞争锁失败进入 BLOCKED,拿到锁回到 RUNNABLE;调用 wait、join 进入 WAITING,被 notify、中断或目标线程结束唤醒;sleep 与带超时的等待进入 TIMED_WAITING,超时后回到 RUNNABLE;run 结束进入 TERMINATED,不可复用。

## sleep、join 与 interrupt

- sleep 让当前线程暂停指定时间,不释放已持有的锁;
- join 等待目标线程结束,内部基于 wait 实现;
- interrupt 设置线程的中断标志。线程阻塞在 sleep、wait、join 时抛 InterruptedException 并清除标志;线程在运行,需要自行检查标志。

```java
Thread worker = new Thread(() -> {
    while (!Thread.currentThread().isInterrupted()) {
        // 执行一段可中断的任务
    }
    System.out.println("收到中断,退出循环");
});

worker.start();
worker.interrupt();   // 设置中断标志,并唤醒阻塞中的线程
worker.join();        // 等待 worker 结束
System.out.println("main 结束");
```

不要用已废弃的 stop。stop 会立即终止线程并释放它持有的锁,临界区可能停在中间状态,其他线程随后读到不一致的数据。中断是协作式的,由被中断线程决定何时退出。

## 守护线程

守护线程(daemon thread)是不阻止 JVM 退出的线程。所有非守护线程结束后,JVM 直接退出,不再等待守护线程:

```java
Thread daemon = new Thread(() -> {
    while (true) {
        // 后台清理或监控
    }
});
daemon.setDaemon(true);   // 必须在 start 之前设置
daemon.start();
// main 结束后,JVM 退出,守护线程被强制结束
```

setDaemon 必须在 start 前调用,否则抛 IllegalThreadStateException。守护线程适合做后台监控、心跳等可随时中断的工作;写文件、提交事务这类必须完成的操作不要放在守护线程里,它可能在任意时刻被终止,finally 也不保证执行。

## 线程的开销

线程共享堆,但各自持有独立的调用栈,HotSpot 在 64 位平台默认栈大小约 1MB(可用 -Xss 调整);创建与销毁涉及操作系统调用;线程数超过 CPU 核数后,上下文切换开始消耗时间。为每个请求创建一条线程,在并发升高时会迅速耗尽内存与调度能力。

线程池复用固定数量的线程,把任务放入队列排队执行,同时限制并发上限。下一篇先解决共享数据的互斥问题,线程池留到第 4 篇。

## 小结

- Thread 表示线程,Runnable 描述任务,Callable + FutureTask 支持返回值与异常;
- start 创建新线程并由 JVM 调用 run,直接调 run 仍在当前线程;
- 六种状态以 RUNNABLE 为中心,BLOCKED、WAITING、TIMED_WAITING 是不同原因的等待;
- sleep 不释放锁,join 等待结束,interrupt 只设置标志,由线程自行响应;
- 守护线程不阻止 JVM 退出,适合后台工作;
- 线程有栈内存与切换开销,高并发下应使用线程池。

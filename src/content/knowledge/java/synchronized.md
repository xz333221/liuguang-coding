---
title: synchronized 与锁
summary: '每个对象有一把监视器锁,synchronized 实例方法锁 this,静态方法锁 Class 对象,同步块锁指定对象;同一线程可重入。wait/notify 必须在同一把锁上调用,死锁需要破坏互斥、请求并保持、不可剥夺、循环等待之一,无特殊需求优先使用 synchronized。'
category: java
node: java-concurrency-synchronized
order: 57
level: 进阶
tags: [synchronized, 对象锁, 死锁, ReentrantLock]
updated: 2026-11-19
mindmap: synchronized.mindmap.json
terms: ["jvm", "object"]
sources:
  - title: Oracle Java 教程 · Concurrency
    url: https://docs.oracle.com/javase/tutorial/essential/concurrency/
    note: 同步方法、同步块、活跃性问题与 wait/notify 的参照。
  - title: ReentrantLock javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html
    note: 可重入、公平性、tryLock 与可中断加锁的官方说明。
---

上一篇的线程可以同时读写同一份数据,若没有协调,结果取决于调度顺序。要让一段代码一次只被一条线程执行,最基本的工具是 synchronized。

## 竞态条件

```java
public class Counter {
    private int count;

    public void increment() {
        count++;   // 读取、加一、写回,三步可能交错
    }

    public static void main(String[] args) throws InterruptedException {
        Counter counter = new Counter();
        Thread[] threads = new Thread[4];
        for (int i = 0; i < threads.length; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 1000; j++) {
                    counter.increment();
                }
            });
            threads[i].start();
        }
        for (Thread t : threads) {
            t.join();
        }
        System.out.println(counter.count);   // 通常小于 4000
    }
}
```

count++ 不是一步操作:先读 count,加一,再写回。两条线程可能同时读到同一个旧值,各自加一后写回,其中一次更新被覆盖,这叫丢失更新。多个线程访问同一状态,最终结果依赖执行时序,就是竞态条件。把 increment 声明为 `public synchronized void increment()`,结果稳定为 4000。

## 对象锁与类锁

每个 Java 对象都关联一把监视器锁(monitor)。synchronized 的三种写法锁不同的对象:

```java
class Account {
    private int balance;

    public synchronized void deposit(int amount) {   // 锁 this
        balance += amount;
    }

    public static synchronized void resetAll() {     // 锁 Account.class
        // ...
    }

    private final Object lock = new Object();

    public void withdraw(int amount) {
        synchronized (lock) {                        // 锁 lock 对象
            balance -= amount;
        }
    }
}
```

实例方法锁的是 this,同一对象上的多个 synchronized 实例方法互斥,不同对象之间互不影响。静态方法锁的是 Class 对象,所有实例共享同一把类锁。实例方法与静态方法锁的不是同一个对象,二者不会互斥。同步块显式指定锁对象,临界区可以小于整个方法。

锁对象不要用 String 字面量或 Integer 的缓存值。它们可能被其他代码共享,无关的逻辑会意外地互相阻塞。专用锁对象声明为 `private final Object`,只服务于自己的临界区。

## 可重入

同一个线程已经持有某把锁,再次进入由该锁保护的 synchronized 代码,可以直接通过。JVM 为每把锁记录持有线程与重入次数,退出一层减一,归零才释放。可重入避免了自死锁:同步方法调用同一个对象上的另一个同步方法,不会把自己挡在门外。子类同步方法调用父类同步方法也依赖这一性质。

## wait / notify / notifyAll

wait、notify、notifyAll 是 Object 的方法,调用前必须持有该对象的锁,否则抛 IllegalMonitorStateException。三个方法的语义:

- wait 释放锁并进入 WAITING,被唤醒后重新竞争锁,拿到锁才从 wait 返回;
- notify 从等待队列中选一条线程唤醒,被唤醒的线程转入 BLOCKED 竞争锁;
- notifyAll 唤醒全部等待线程。

```java
class Buffer {
    private final Queue<Integer> queue = new ArrayDeque<>();
    private final int capacity = 10;

    public synchronized void put(int value) throws InterruptedException {
        while (queue.size() == capacity) {
            wait();               // 队列满,释放锁并等待
        }
        queue.add(value);
        notifyAll();              // 唤醒等待取数据的线程
    }

    public synchronized int take() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();
        }
        int value = queue.remove();
        notifyAll();
        return value;
    }
}
```

条件判断必须用 while,不能用 if。线程被唤醒到真正返回之间还要重新竞争锁,这段时间条件可能再次不成立,if 只判断一次会直接越过检查。wait 写在 synchronized 内,锁对象与 wait 的调用对象必须是同一个。

## 死锁

死锁是两条或多条线程互相等待对方持有的锁,永久停住。发生需要同时满足四个条件:

1. 互斥:资源一次只能被一条线程占用;
2. 请求并保持:持有锁的同时请求另一把锁;
3. 不可剥夺:锁只能由持有者释放;
4. 循环等待:存在线程与锁的环形等待链。

破坏任一条件即可避免。工程上常用的做法是固定加锁顺序,让所有线程按同一顺序获取多把锁,消除循环等待;或者使用带超时的 tryLock,拿不到就放弃并释放已持有的锁:

```java
if (lockA.tryLock(1, TimeUnit.SECONDS)) {
    try {
        if (lockB.tryLock(1, TimeUnit.SECONDS)) {
            try {
                // 临界区
            } finally {
                lockB.unlock();
            }
        }
    } finally {
        lockA.unlock();
    }
}
```

减少嵌套锁、缩短持锁时间、把多个锁合并为一个,也能降低死锁概率。死锁发生后线程状态多为 BLOCKED,用 jstack 可以看到互相等待的持有者与等待者。

## synchronized 与 ReentrantLock

ReentrantLock 是 java.util.concurrent.locks 提供的显式锁,内部基于 AQS(AbstractQueuedSynchronizer,一个用 int 状态位与 FIFO 等待队列实现同步器的框架)。

- synchronized 由 JVM 实现,进入自动加锁,退出或异常自动释放,代码简洁,非公平;
- ReentrantLock 需要手动 lock,并在 finally 中 unlock;支持公平锁、tryLock、可中断的 lockInterruptibly 与多个 Condition 条件队列。

没有超时、可中断、公平性或多条件队列的需求时,优先用 synchronized。它的释放由 JVM 保证,不会因为漏写 unlock 导致永久占用。

## 小结

- synchronized 保证互斥与可见性,count++ 这类复合操作必须置于锁内;
- 实例方法锁 this,静态方法锁 Class 对象,同步块锁指定对象,三者范围不同;
- 锁可重入,JVM 按线程记录重入次数,支持同步方法之间的嵌套调用;
- wait/notify 必须持有同一把锁,条件判断用 while,唤醒后重新检查;
- 死锁需满足四个条件,固定加锁顺序与 tryLock 超时是常用规避手段;
- 无特殊需求优先 synchronized,需要公平、超时或可中断时用 ReentrantLock。

下一篇看 volatile 与 JMM:只要求单个变量的可见性、不需要互斥时,用更轻量的 volatile,但要先理解主内存、工作内存与 happens-before。

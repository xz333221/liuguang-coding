---
title: volatile 与 JMM 入门
summary: 'JMM 把共享变量放在主内存、线程副本放在工作内存,通过 happens-before 规定跨线程可见性;volatile 保证单次读写的可见性并禁止重排序,不保证复合操作原子。双重检查单例的静态实例字段必须 volatile,避免其他线程看到初始化未完成的对象。'
category: java
node: java-concurrency-volatile
order: 58
level: 深入
tags: [volatile, JMM, happens-before, 双重检查单例]
updated: 2026-11-19
mindmap: volatile-jmm.mindmap.json
terms: ["jvm", "runtime", "compile-time"]
sources:
  - title: Oracle Java 教程 · Concurrency
    url: https://docs.oracle.com/javase/tutorial/essential/concurrency/
    note: 内存一致性错误、同步与 volatile 变量的参照。
  - title: Java 语言规范 · Chapter 17 Threads and Locks
    url: https://docs.oracle.com/javase/specs/jls/se21/html/index.html
    note: JMM、happens-before 与 volatile 语义的规范定义。
---

上一篇的 synchronized 既保证互斥,也保证一个线程的修改对下一个进入临界区的线程可见。若只需要后者,不需要互斥,可以用更轻量的 volatile。

## JMM 的抽象

JMM(Java 内存模型)是 Java 语言规范对多线程读写共享变量行为的抽象规则。它把所有线程共享的变量放在主内存,每条线程另有工作内存,保存该线程使用到的变量副本。线程对变量的读写先经过工作内存,再由 JMM 规定何时同步回主内存。主内存与工作内存是概念模型,不对应某块具体的物理内存。

工作内存的存在带来两个问题:一条线程改了共享变量,另一条线程可能仍在使用旧副本,这是可见性问题;编译器与 CPU 为优化性能调整指令顺序,多线程下可能观察到与源码顺序不同的结果,这是有序性问题。

## 可见性、有序性与原子性

- **可见性**:一条线程对共享变量的修改,何时能被其他线程看到;
- **有序性**:编译器在编译期、CPU 在运行时都可能重排序指令。单线程内遵守 as-if-serial,结果与顺序执行一致;多线程下缺少同步时,重排序可能暴露;
- **原子性**:一次操作不可分割。JLS 允许非 volatile 的 long、double 读写被拆成两次 32 位操作,其余基本类型的读写是原子的;count++ 由读、加、写三步组成,不具备原子性。

锁同时处理三个性质:synchronized 保证临界区互斥,退出时把修改刷新到主内存,并禁止临界区内的部分重排。volatile 只处理单个变量的可见性与有序性。

## happens-before

happens-before 是 JMM 定义的两个操作之间的可见性偏序关系:如果 A happens-before B,那么 A 的结果对 B 可见,并且 A 在 B 之前发生。常用规则:

1. **程序顺序**:同一线程内,前面的操作 happens-before 后面的操作;
2. **监视器锁**:对同一把锁的 unlock happens-before 后续的 lock;
3. **volatile**:对同一 volatile 变量的写 happens-before 后续的读;
4. **线程启动**:Thread.start happens-before 新线程中的任何操作;
5. **线程终止**:线程中的所有操作 happens-before 其他线程从 join 返回;
6. **传递性**:A happens-before B 且 B happens-before C,则 A happens-before C。

这些规则是判断“写完的值能否被看到”的依据,比逐个分析缓存与指令顺序可靠。

## volatile 的语义

对 volatile 变量的写,JVM 会把工作内存中的新值刷新到主内存,并在写之后插入写屏障,禁止写与后续读写重排;对 volatile 变量的读,会从主内存重新读取,不使用可能过期的副本,并在读之后插入读屏障。它保证单次读、单次写的可见性与原子性,不保证多个操作的组合原子。

```java
public class VisibilityDemo {
    private static volatile boolean running = true;

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            while (running) {
                // 空循环
            }
            System.out.println("worker 退出");
        });
        worker.start();
        Thread.sleep(100);
        running = false;   // 没有 volatile 时,worker 可能一直看不到修改
        worker.join();
        System.out.println("main 退出");   // 先输出 worker 退出,再输出 main 退出
    }
}
```

没有 volatile,编译器可能把 running 的读取提升到循环外,worker 永远看不到修改。加了 volatile,每次循环都重新读取主内存,循环能够退出。

volatile 不能保证 count++ 这类复合操作的原子性:

```java
public class VolatileCounter {
    private static volatile int count;

    public static void main(String[] args) throws InterruptedException {
        Thread[] threads = new Thread[4];
        for (int i = 0; i < threads.length; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 1000; j++) {
                    count++;   // 读、加、写三步,volatile 无法保证整体原子
                }
            });
            threads[i].start();
        }
        for (Thread t : threads) {
            t.join();
        }
        System.out.println(count);   // 通常小于 4000
    }
}
```

每条线程读到的可能都是最新值,但两条线程仍可同时读到同一个值,各自加一后写回,丢失更新依旧发生。需要原子递增时用 AtomicInteger 或加锁。

## 双重检查单例

双重检查锁定把同步限制在第一次创建对象时,实例字段必须声明为 volatile:

```java
public class Singleton {
    private static volatile Singleton instance;   // 必须 volatile
    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {                   // 第一次检查,避免每次加锁
            synchronized (Singleton.class) {
                if (instance == null) {           // 第二次检查,防止重复创建
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

`new Singleton()` 可拆成三步:分配内存、调用构造器初始化对象、把引用赋给 instance。步骤 2 与 3 之间可能重排。另一条线程在第一次检查时看到 instance 非 null,拿到的却是构造器尚未执行完的对象,字段仍是默认值。volatile 禁止这一重排,并保证构造器写入的字段对读线程可见。

## 与 synchronized 的对比

- volatile 不互斥、不阻塞,适合状态标志、一次性发布这类单变量场景;
- synchronized 互斥且可见,适合保护多步复合操作或多个变量之间的一致性;
- 多个 volatile 变量之间不构成原子整体,不能替代锁;
- volatile 的读写成本低于锁,但高竞争下仍可能因缓存一致性流量降低吞吐。

## 小结

- JMM 用主内存与工作内存描述共享变量的读写,主内存与工作内存是抽象概念;
- 并发问题归结为可见性、有序性、原子性,锁同时处理三者,volatile 只处理前两者;
- happens-before 是判断跨线程可见性的规则,包含程序顺序、锁、volatile、start、join 与传递性;
- volatile 保证单次读写可见并禁止重排序,不保证 count++ 的原子性;
- 双重检查单例的静态实例字段必须 volatile,防止半初始化对象逸出。

下一篇讲线程池:线程的创建与销毁有成本,复用一组线程并限制并发数量,才能支撑大量任务。

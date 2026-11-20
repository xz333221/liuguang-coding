---
title: volatile 与 JMM 入门
summary: 'JMM 定义主内存与工作内存的交互规则;volatile 保证可见性与禁止重排序,但不保证复合操作原子性;happens-before 是判断可见性的依据;双重检查单例须 volatile 防半初始化对象逸出。'
category: java
node: java-concurrency-volatile
order: 58
level: 深入
tags: [volatile, JMM, happens-before, 重排序, 单例]
updated: 2026-11-18
mindmap: java-concurrency-volatile.mindmap.json
terms: ["runtime", "reference-type"]
sources:
  - title: Oracle Java 教程 · Concurrency(内存一致性)
    url: https://docs.oracle.com/javase/tutorial/essential/concurrency/atomic.html
    note: 原子访问与可见性问题的参照。
  - title: Java 语言规范 · 17.4 Memory Model
    url: https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17.4
    note: happens-before 与 volatile 语义的规范依据。
---

synchronized 能解决竞态,但有些场景只需"一个线程改了,别的线程立刻看见",不需要互斥。volatile 就是为此而生。要理解它,先要理解 Java 内存模型(JMM)为什么会让"看见"成为问题。

## JMM:主内存与工作内存

JMM(Java Memory Model)规定:所有共享变量在**主内存**;每个线程有自己的**工作内存**(缓存/寄存器的抽象),读写先在工作内存进行,再同步回主内存。由此产生三类问题:

- **可见性**:线程 A 改了变量,线程 B 的工作内存还是旧值,看不见;
- **有序性**:编译器/CPU 会**重排序**指令以优化,单线程语义不变,但多线程下可能观察到乱序;
- **原子性**:long/double 的读写在 32 位 JVM 上可能拆成两次(现代 JVM 基本保证),复合操作(i++)天然非原子。

## volatile 的两条保证

给变量加 volatile:

1. **可见性**:写立即刷回主内存,读直接从主内存取,其它线程立刻可见;
2. **禁止重排序**:volatile 写之前的操作不会重排到写之后,读之后的操作不会重排到读之前(内存屏障)。

**不保证原子性**:`volatile int i; i++` 仍会丢失更新,因为 i++ 是读-改-写复合操作。需要原子自增用 AtomicInteger(第 5 篇)或 synchronized。

```java
volatile boolean running = true;   // 一个线程写,其它线程读,合适
// 线程A: running = false;
// 线程B: while (running) { ... }   // 能立刻看见 false 退出
```

典型适用:状态标志、一次性发布的安全引用。

## happens-before:可见性的判据

JMM 用 happens-before 关系定义"一个操作的结果对另一个操作可见"。常用规则:

- 程序顺序:同线程内前面的操作 happens-before 后面的;
- monitor 锁:unlock happens-before 后续对同一锁的 lock;
- volatile:写 happens-before 后续对它的读;
- 线程:start() happens-before 该线程内任何动作;线程内动作 happens-before 其它线程从 join() 返回;
- 传递性:A hb B、B hb C ⇒ A hb C。

满足 happens-before 才保证可见;否则即使"时间上先发生"也不保证看见。这是判断并发代码正确性的形式化工具。

## 双重检查单例:为什么必须 volatile

```java
class Singleton {
    private static volatile Singleton instance;   // volatile 不可省
    public static Singleton get() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

`new Singleton()` 实际三步:分配内存 → 初始化对象 → 把引用指向内存。步骤 2/3 可能重排为 1→3→2:引用已非 null 但对象未初始化。另一线程第一次检查见非 null 直接返回,拿到**半初始化对象**。volatile 禁止该重排,保证看到非 null 时对象已初始化完成。

## 小结

- JMM 主内存/工作内存导致可见性、有序性、原子性问题;
- volatile 保证可见性 + 禁重排,不保证复合操作原子性;
- happens-before 是可见性判据:锁、volatile、start/join、传递性;
- 双重检查单例的 instance 必须 volatile,防半初始化对象逸出;
- 状态标志用 volatile,原子自增用 AtomicInteger/锁。

下一篇讲线程池:为什么业务里不该裸 new Thread。
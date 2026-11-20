---
title: synchronized 与锁
summary: 'synchronized 以对象 monitor 保证互斥与可见性:实例方法锁 this、静态方法锁 Class、同步块锁指定对象;可重入;锁升级偏向→轻量→重量;死锁需互斥/持有等待/不剥夺/循环等待四条件同时成立。'
category: java
node: java-concurrency-synchronized
order: 57
level: 进阶
tags: [synchronized, monitor, 可重入, 锁升级, 死锁]
updated: 2026-11-18
mindmap: java-concurrency-synchronized.mindmap.json
terms: ["runtime", "reference-type"]
sources:
  - title: Oracle Java 教程 · Synchronization
    url: https://docs.oracle.com/javase/tutorial/essential/concurrency/sync.html
    note: 互斥与可见性、 intrinsic lock 的依据。
  - title: Oracle Java 教程 · Deadlock
    url: https://docs.oracle.com/javase/tutorial/essential/concurrency/deadlock.html
    note: 死锁四条件与示例的参照。
---

多线程同时读写共享变量会产生竞态:两个线程各自读-改-写,结果丢失更新。synchronized 用**互斥**保证同一时刻只有一个线程进入临界区,并附带可见性保证。这一篇讲它的锁对象、可重入性与死锁。

## 竞态示例

```java
class Counter {
    private int count;
    public void increment() { count++; }   // 读-改-写,非原子
}
```

count++ 实际是三步(读、加、写),两线程交错会丢失更新。加 synchronized:

```java
public synchronized void increment() { count++; }
```

## 锁对象:锁的是对象,不是代码

synchronized 的互斥范围由**锁对象**决定,同一锁对象才互斥:

| 形式 | 锁对象 |
| --- | --- |
| 实例同步方法 | this(当前实例) |
| 静态同步方法 | 该类的 Class 对象 |
| synchronized(obj) 块 | obj |

```java
synchronized (lock) {   // 显式指定锁对象
    count++;
}
```

两个不同实例的同步方法不互斥(锁不同 this);静态与实例同步方法也不互斥(锁 Class vs this)。选择锁对象时要确保所有访问共享状态的线程用**同一个**锁。

## 可重入

synchronized 是**可重入锁**:同一线程已持有锁时,再次进入该锁的同步块不会死锁,内部计数加一,退出减一,归零释放。这允许同步方法调用本类其它同步方法:

```java
public synchronized void a() { b(); }   // 同线程重入,不死锁
public synchronized void b() { ... }
```

## 可见性保证

synchronized 不仅互斥,还保证可见性:释放锁前把修改刷回主内存,获取锁时从主内存重读。因此临界区内的修改对后续持锁线程可见(呼应下一篇 JMM)。

## 锁升级(简述)

JDK6 起 monitor 锁按竞争程度升级:**偏向锁**(单线程反复进入,几乎无开销)→ **轻量级锁**(交替执行,CAS 自旋)→ **重量级锁**(激烈竞争,操作系统互斥量,线程挂起)。升级不可逆。目的是无竞争时低成本、有竞争时才付出挂起代价。JDK15 起偏向锁默认废弃,了解概念即可。

## 死锁:四条件

死锁需同时满足:互斥、持有并等待、不可剥夺、循环等待。经典示例:

```java
// 线程1: synchronized(a){ synchronized(b){...} }
// 线程2: synchronized(b){ synchronized(a){...} }
```

破坏任一条件即可预防,最常用:**按固定全局顺序加锁**(所有线程都先 a 后 b),破坏循环等待;或用 tryLock 超时放弃,破坏持有并等待。

## synchronized vs Lock

ReentrantLock 提供可中断、可超时、公平锁、多 Condition 等灵活能力,但需手动 unlock(finally);synchronized 由 JVM 自动释放、更简洁。默认 synchronized,需要高级能力才用 Lock。

## 小结

- synchronized 保证互斥 + 可见性;锁对象决定互斥范围(this / Class / 指定 obj);
- 可重入:同线程重复进入计数增减;
- 锁升级:偏向→轻量→重量,无竞争低成本;
- 死锁四条件,固定加锁顺序或 tryLock 预防;
- 默认 synchronized,需可中断/超时/公平才用 ReentrantLock。

下一篇讲 volatile 与 JMM:可见性与有序性的底层规则。
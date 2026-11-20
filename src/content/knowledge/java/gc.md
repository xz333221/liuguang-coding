---
title: GC 与常见收集器
summary: '可达性分析判死(GC Roots),引用计数不用于 JVM;分代假说驱动新生代复制/老年代标记整理;Serial/Parallel/CMS/G1/ZGC 的取舍;STW 与调优目标(吞吐/延迟)。'
category: java
node: java-jvm-gc
order: 63
level: 深入
tags: [GC, 可达性, 分代, G1, ZGC, STW]
updated: 2026-11-18
mindmap: java-jvm-gc.mindmap.json
terms: ["garbage-collection", "stack-and-heap"]
sources:
  - title: Oracle JDK 21 · Garbage Collection Tuning Guide
    url: https://docs.oracle.com/en/java/javase/21/gctuning/
    note: 收集器选型与调优参数的官方指南。
  - title: Oracle JDK · G1 Garbage Collector
    url: https://docs.oracle.com/en/java/javase/21/gctuning/garbage-first-g1-garbage-collector.html
    note: G1 分区与停顿目标模型的参照。
---

GC 自动回收不可达对象,但"怎么判死、怎么回收、停顿多久"决定了应用延迟与吞吐。这一篇讲判活算法、分代回收与主流收集器取舍。

## 判活:可达性分析

JVM 用**可达性分析**:从一组 **GC Roots**(栈帧局部变量、静态变量、常量引用、JNI 引用、活跃线程等)出发沿引用链遍历,不可达的对象判死。引用计数法(对象带计数器)无法处理循环引用,JVM 不用。

判死后还有一次"自救":若对象覆写 finalize 且未执行过,放入 F-Queue 由低优先级线程执行 finalize,期间重新建立引用可复活(不推荐依赖,finalize 已废弃,JDK9+ 用 Cleaner/try-with-resources)。

四种引用强度:强(不回收)、软(SoftReference,内存不足才回收,缓存)、弱(WeakReference,下次 GC 必回收,WeakHashMap/ThreadLocal key)、虚(PhantomReference,仅跟踪回收通知)。

## 分代假说与回收算法

- **弱分代假说**:绝大多数对象朝生夕死 → 新生代频繁 Minor GC,用**复制算法**(Eden + 2 Survivor,8:1:1,存活对象复制到另一 Survivor,无碎片);
- **强分代假说**:熬过多次 GC 的对象难死 → 老年代 Major/Full GC,用**标记-清除**(有碎片)或**标记-整理**(移动存活对象,无碎片,成本高)。

对象晋升:年龄阈值(-XX:MaxTenuringThreshold,默认 15)、大对象直接进老年代、动态年龄判断(Survivor 同年龄总和超一半)。

## 收集器取舍

| 收集器 | 区域/算法 | 特点 | 适用 |
| --- | --- | --- | --- |
| Serial | 新生代复制,单线程 | 简单,STW | 客户端/小内存 |
| Parallel Scavenge/Old | 新生代复制/老年代标记整理,多线程 | 吞吐优先 | 后台计算 |
| CMS | 老年代标记清除,并发 | 低停顿但有碎片/并发失败 | 已废弃(JDK14 移除) |
| G1 | 整堆分区(Region),复制+标记整理 | 可预测停顿(-XX:MaxGCPauseMillis),JDK9 默认 | 大堆通用 |
| ZGC | 着色指针+读屏障,并发标记整理 | 停顿 <1ms 级,TB 级堆 | 超低延迟 |
| Shenandoah | 转发指针,并发 | 低停顿,RedHat | 低延迟 |

G1 把堆划成等大 Region(Eden/Survivor/Old/Humongous),按"回收收益/成本"排序选 Region 回收(Garbage First),用停顿目标模型控制每次回收范围。ZGC 几乎全并发,停顿不随堆增大。

## STW 与调优目标

Stop-The-World:GC 某些阶段暂停所有应用线程。调优两目标互斥:**吞吐**(应用时间/总时间,Parallel)vs **延迟**(单次停顿短,G1/ZGC)。先定目标再选收集器与参数,不要盲目调。常见参数:-Xms/-Xmx 设相同避免扩缩抖动、-XX:+UseG1GC、-XX:MaxGCPauseMillis=200、-Xlog:gc* 观察日志。

## 小结

- 可达性分析(GC Roots)判死,引用计数不用;软/弱/虚引用强度;
- 分代:新生代复制(朝生夕死),老年代标记整理(难死);
- Serial/Parallel 吞吐、G1 可预测停顿(默认)、ZGC 超低延迟;CMS 已移除;
- STW 不可避免,吞吐与延迟取舍;先定目标再调参,看 gc 日志。

下一篇讲排查命令:jps/jstack/jmap/jstat 与常用参数,把前面的内存/GC 知识用起来。
---
title: GC 与常见收集器
summary: 'JVM 用可达性分析从 GC Roots 出发判定对象存活,并按分代假设把堆分为新生代与老年代,分别采用复制与标记-整理算法;从 Serial 到 G1、ZGC,收集器的演进主线是缩短停顿,JDK 9 起 G1 为默认,线上应配合 GC 日志观察停顿与 Full GC 频率。'
category: java
node: java-jvm-gc
order: 63
level: 深入
tags: [GC, 可达性分析, G1, 垃圾收集器]
updated: 2026-11-19
mindmap: gc.mindmap.json
terms: ["jvm", "garbage-collection", "runtime", "stack-and-heap"]
sources:
  - title: Oracle JDK 21 GC Tuning Guide
    url: https://docs.oracle.com/en/java/javase/21/gctuning/
    note: 各收集器的目标、停顿控制与调优参数。
  - title: The Java Virtual Machine Specification, Java SE 21 · Chapter 2
    url: https://docs.oracle.com/javase/specs/jvms/se21/html/index.html
    note: 堆与栈的规范划分,GC Roots 相关概念的基础。
---

上一篇的类加载把类元数据放进元空间;程序运行时不断创建的对象落在堆里,堆容量有限,回收不再使用的对象由垃圾收集(GC)负责。这一篇讲 GC 如何判断对象存活、使用哪些算法,以及各代收集器的取舍。

## 可达性分析与 GC Roots

引用计数实现简单,但无法处理循环引用。主流 JVM 采用可达性分析(reachability analysis):从一组称为 GC Roots 的对象出发,沿引用链遍历,不可达的对象判定为可回收。

GC Roots 主要包括:

- 虚拟机栈中局部变量表里的引用;
- 方法区中静态字段引用的对象;
- 方法区中常量引用的对象(如字符串常量池);
- 本地方法栈中 JNI 引用的对象;
- 所有活动线程;
- 被 synchronized 持有的对象;
- 系统类加载器加载的类等虚拟机内部引用。

判定依据是引用链是否连通,与引用计数无关:一组对象即使互相循环引用,只要整组都不可达,仍会被回收。

## 分代假设与跨代引用

分代收集基于弱分代假说:绝大多数对象朝生夕灭,熬过多次回收的对象更可能继续存活。据此把堆分为:

- **新生代**:Eden 与两个 Survivor(S0、S1),新对象在 Eden 分配,Minor GC 时存活对象复制到 Survivor,年龄加一;
- **老年代**:年龄达到阈值(默认 15)或体积过大的对象直接进入老年代。

跨代引用指老年代对象引用新生代对象,它会让 Minor GC 不得不扫描整个老年代。解决方式是卡表(card table):把老年代划分为固定大小的卡页,对象引用写入时把对应卡标记为脏,Minor GC 只扫描脏卡。

## 三种基本算法

- **标记-清除**(mark-sweep):标记存活对象后清除未标记对象。实现简单,但产生内存碎片,标记与清除的效率随对象数增长;
- **复制**(copying):把存活对象复制到另一块空间,再整体清空原空间。无碎片、分配快,但浪费一半空间,适合存活率低的新生代;
- **标记-整理**(mark-compact):标记后把存活对象向一端移动,再清理边界外的内存。无碎片,但移动成本高,适合存活率高的老年代。

实际收集器组合使用:新生代用复制,老年代用标记-清除或标记-整理。

## Minor GC、Major GC 与 Full GC

- **Minor GC / Young GC**:只回收新生代,触发频繁、停顿短;
- **Major GC / Old GC**:只回收老年代,通常伴随至少一次 Minor GC;
- **Full GC**:回收整个堆,包含元空间,停顿最长,应尽量避免。

Eden 满触发 Minor GC;老年代空间不足、元空间不足、显式调用 System.gc() 等可能触发 Full GC。

## 常见收集器

- **Serial / Serial Old**:单线程,STW(Stop The World,暂停所有应用线程),适合客户端或小内存场景;
- **ParNew**:Serial 的多线程版本,配合 CMS 回收新生代;
- **Parallel Scavenge / Parallel Old**:多线程、吞吐量优先,JDK 8 的默认组合;
- **CMS**:以最短停顿为目标,标记与清除大部分阶段与应用线程并发,但产生碎片、存在并发模式失败风险,JDK 9 起废弃、JDK 14 移除;
- **G1**:把堆划分为大小相等的 Region,优先回收垃圾最多的 Region,可用 -XX:MaxGCPauseMillis 做停顿预测,兼顾吞吐与停顿,JDK 9 起为默认;
- **ZGC / Shenandoah**:以极低停顿为目标,ZGC 通过染色指针与读屏障把停顿控制在毫秒级,适合大堆,JDK 21 的 ZGC 支持分代。

G1 的 Region 让新生代与老年代不再物理连续,每个 Region 动态扮演 Eden、Survivor 或 Old 角色,这打破了传统分代的固定边界。

## JDK 各版本的默认收集器

- JDK 8:Parallel Scavenge + Parallel Old(服务端);
- JDK 9 起:G1 成为默认;
- JDK 21:仍以 G1 为默认,ZGC 提供分代模式,通过 -XX:+UseZGC 启用。

选型上,常规 Web 服务用 G1 即可;堆特别大且停顿要求严格时评估 ZGC。

## GC 日志怎么读

JDK 9 起统一日志(-Xlog)取代了 -XX:+PrintGCDetails:

```bash
java -Xlog:gc*:file=gc.log:time,uptime,level,tags -jar app.jar
```

典型片段:

```text
[2026-11-19T10:12:03.512+0800][2.315s][info][gc] Using G1
[2026-11-19T10:12:05.827+0800][4.630s][info][gc] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 24M->3M(256M) 5.219ms
```

字段依次为:时间戳、启动后的秒数、日志级别、标签、GC 编号、停顿类型与原因、回收前堆占用、回收后堆占用、堆总容量、停顿毫秒数。判断 GC 是否健康主要看单次停顿时长与 Full GC 频率,回收量本身不是问题。

## 不要调用 System.gc()

System.gc() 只是建议虚拟机执行 Full GC,不保证立即执行;它会带来一次长停顿,并打乱收集器的自适应策略。生产环境一般加 -XX:+DisableExplicitGC 让该调用失效,把回收时机交给收集器。

## 小结

- 主流 JVM 用可达性分析判定存活,GC Roots 包括栈上引用、静态字段、常量、JNI 引用与活动线程;
- 分代假设把堆分为新生代与老年代,卡表记录跨代引用,避免 Minor GC 扫描整个老年代;
- 复制适合新生代,标记-清除与标记-整理适合老年代,实际收集器组合使用;
- 收集器从 Serial、Parallel、CMS 演进到 G1、ZGC,主线是降低停顿;
- JDK 9 起 G1 为默认;GC 日志关注停顿时长与 Full GC 频率,不要依赖 System.gc()。

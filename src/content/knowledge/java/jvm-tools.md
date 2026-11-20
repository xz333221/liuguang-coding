---
title: 排查命令与常用参数
summary: 'jps 列进程、jstack 看线程栈(死锁/阻塞)、jmap 看堆与 dump、jstat 看 GC 统计、jinfo 看改参数;MAT/Arthas 进阶;OOM 自动 dump 与 GC 日志参数是线上必备。'
category: java
node: java-jvm-tools
order: 64
level: 深入
tags: [jstack, jmap, jstat, Arthas, OOM, 排查]
updated: 2026-11-18
mindmap: java-jvm-tools.mindmap.json
terms: ["garbage-collection", "runtime"]
sources:
  - title: Oracle JDK · Troubleshooting Guide(监控与排查工具)
    url: https://docs.oracle.com/en/java/javase/21/troubleshoot/
    note: jps/jstack/jmap/jstat/jinfo 的官方用法。
  - title: Arthas 官方文档
    url: https://arthas.aliyun.com/doc/
    note: 在线诊断 dashboard/thread/trace/watch 的参照。
---

线上 CPU 飙高、内存泄漏、线程阻塞,靠日志往往不够,要用 JDK 自带工具直接看 JVM 内部。这一篇把常用命令与参数串成排查流程。

## jps:找进程

```bash
jps -l        # 列出 Java 进程 pid 与主类/jar
jps -v        # 附带 JVM 参数
```

后续命令都要 pid,先 jps 定位。

## jstack:线程栈

```bash
jstack <pid>            # 打印所有线程栈
jstack -l <pid>         # 附加锁信息(owned/waiting)
```

用途:

- **CPU 飙高**:top -Hp <pid> 找高 CPU 线程 tid,转 16 进制,jstack 里 nid=0x… 定位代码行;
- **死锁**:jstack 末尾直接报 "Found one Java-level deadlock";
- **阻塞/等待**:看线程状态 BLOCKED/WAITING 与持锁/等锁关系。

## jmap:堆与 dump

```bash
jmap -heap <pid>               # 堆配置与使用概览
jmap -histo:live <pid>         # 存活对象直方图(类/实例数/字节),触发 Full GC
jmap -dump:live,format=b,file=heap.hprof <pid>   # 堆 dump
```

dump 用 **MAT**(Eclipse Memory Analyzer)或 JVisualVM 分析:支配树找最大保留对象、泄漏嫌疑报告、GC Roots 引用链定位谁持有不该持有的对象。线上 dump 会 STW 且文件大,谨慎。

## jstat:GC 统计

```bash
jstat -gcutil <pid> 1000 10    # 每秒一次共 10 次,各区使用率与 GC 次数/耗时
```

列:S0/S1/E/O/M 使用百分比,YGC/YGCT(新生代次数/秒)、FGC/FGCT( Full GC)。FGC 频繁且 O 区回收后仍高 → 疑似泄漏或堆不足。

## jinfo:看/改参数

```bash
jinfo -flags <pid>             # 当前生效参数
jinfo -flag +HeapDumpOnOutOfMemoryError <pid>   # 部分参数可动态改
```

## 线上必备参数

```
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/data/dump/
-Xlog:gc*:file=/data/log/gc.log:time,uptime,level,tags:filecount=5,filesize=20m
```

OOM 自动留 dump、GC 日志滚动保留,事后才有得分析。-Xms=-Xmx 避免扩缩抖动。

## Arthas:在线诊断

不停机 attach:dashboard(线程/内存/GC 总览)、thread -n 3(最忙线程栈)、trace 类 方法(调用链耗时)、watch(观察入参返回)、jad(反编译确认线上版本)、ognl(执行表达式)。比 jstack+jmap 组合更交互,生产排查首选之一。

## 排查流程速查

| 症状 | 第一步 | 深入 |
| --- | --- | --- |
| CPU 高 | top -Hp + jstack nid | Arthas thread -n |
| 内存涨/OOM | jstat -gcutil + jmap histo | dump + MAT 支配树 |
| 卡死/慢 | jstack 看 BLOCKED/死锁 | Arthas trace 耗时 |
| GC 频繁 | jstat FGC + gc 日志 | 调堆/收集器/查泄漏 |

## 小结

- jps 定位 pid;jstack 线程栈(CPU/死锁/阻塞);jmap 堆/dump;jstat GC 统计;jinfo 参数;
- dump 用 MAT 支配树与引用链找泄漏;
- 线上必配 OOM 自动 dump + GC 日志滚动;
- Arthas 在线 dashboard/thread/trace/watch 交互排查;
- 按症状选工具,先观察再动手。

第 11 章到此。下一章工程化与构建:Maven 把依赖、构建、测试串起来。